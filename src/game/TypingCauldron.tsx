import { useCallback, useEffect, useRef, useState } from "react";
import { GameAudio } from "./audio";
import { WordReservoir } from "./reservoir";
import { supabase } from "../lib/supabase";
import { AdSlot } from "../components/ad-slot";

type Phase = "menu" | "countdown" | "playing" | "result" | "failed";
const SEED_TEXTS = [
  "Na madrugada em que o sino da torre parou, Lia encontrou uma chave azul dentro do velho livro do avô. A chave abriu uma porta escondida sob a oficina e revelou um corredor cheio de mapas, frascos vazios e pequenas estrelas desenhadas na pedra. No fim do corredor havia um recipiente transparente ligado a uma torneira antiga. O avô chamava aquele lugar de sala das palavras, porque cada frase guardava um grão de memória. Lia decidiu continuar a história antes que o relógio marcasse meia noite. Ela escreveu sobre a vila adormecida, sobre o rio que brilhava sob a lua e sobre a coragem de quem escolhe seguir uma luz desconhecida. A cada caractere, um grão atravessava o bico da torneira, caía no fundo e encontrava equilíbrio entre os outros. Quando a pilha cresceu, o peso abriu novos caminhos e os grãos deslizaram pelas laterais, formando uma pequena montanha cor de cobre. Lia entendeu então que nenhuma palavra desaparece: algumas ficam no alto, outras encontram abrigo no fundo, mas todas participam da mesma paisagem. Ao amanhecer, o sino voltou a tocar. Ela fechou o livro, guardou a chave e prometeu retornar na noite seguinte para descobrir o que havia depois da última página.",
  "No primeiro dia do inverno, Tomás recebeu uma carta sem assinatura, selada com cera vermelha. O mapa desenhado no verso levava até a estufa abandonada atrás da estação, onde as plantas cresciam em silêncio e o vidro refletia um céu cheio de nuvens. Sobre a mesa central havia um recipiente claro, uma torneira de bronze e uma frase incompleta esperando por ele. Tomás começou a escrever devagar, descrevendo o trem que cruzava a serra, a raposa que observava os trilhos e a promessa de voltar para casa antes da neve. Cada caractere liberava um grão pequeno, que caía, batia nos vizinhos e se acomodava no lugar mais estável. Aos poucos, o fundo se encheu e a pilha ganhou uma inclinação suave. Ele percebeu que o mapa não indicava um tesouro escondido, mas o caminho de uma história que precisava ser terminada. Quando a última palavra encontrou a página, a torneira silenciou e a estufa se iluminou por dentro. Tomás dobrou a carta com cuidado e saiu para contar a descoberta a alguém que ainda acreditasse em caminhos impossíveis.",
]; 
const ENGLISH_SEED_TEXTS = [
  "On the night the old clock stopped, Maya found a blue key inside her grandfather's book. It opened a hidden door below the workshop and revealed a room of maps, empty jars, and tiny stars painted on stone. At the end stood a clear container connected to an antique faucet. Every sentence held one grain of memory. Maya typed about the sleeping village, the river shining beneath the moon, and the courage it takes to follow an unknown light. With every character, one small grain passed through the faucet, fell to the bottom, and found a steady place among the others.",
  "On the first day of winter, Theo received a letter sealed with red wax. A map on the back led to an abandoned greenhouse behind the station. On the central table sat a clear container, a bronze faucet, and an unfinished sentence. Theo typed slowly, describing the train crossing the hills, the fox watching the rails, and a promise to return home before the snow. Each character released a grain that landed, touched its neighbors, and settled into the most stable place. Little by little, the bottom filled and the pile took on a gentle slope.",
];
const estimateParticleCapacity = (width: number, height: number) => {
  const usableWidth = width * .8 + 17;
  const usableHeight = height * .665 - 4;
  // A real sand pile leaves voids between grains; target 82% of the grid's volume.
  return Math.max(240, Math.floor((usableWidth / 4) * (usableHeight / 4) * .82));
};
const makePassage = (seed: string, targetLength: number) => {
  let passage = "";
  while (passage.length < targetLength) passage += `${seed}\n\n`;
  return passage.slice(0, targetLength);
};
const TEXTS = SEED_TEXTS.map((seed) => makePassage(seed, 9000));
const PLAYER_SESSION_KEY = "caldeirao-player-session";
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;
const isLetter = (character: string | undefined) => Boolean(character && /\p{L}/u.test(character));
const matchesComposedCharacter = (expected: string, typed: string, hasDeadKey: boolean) => {
  if (typed.toLocaleLowerCase("pt-BR") === expected.toLocaleLowerCase("pt-BR")) return true;
  if (!hasDeadKey) return false;
  const decomposed = expected.normalize("NFD");
  const baseCharacter = decomposed[0];
  const hasAccent = decomposed.length > 1;
  return hasAccent && typed.toLocaleLowerCase("pt-BR") === baseCharacter.toLocaleLowerCase("pt-BR");
};
const countWords = (text: string) => text.match(/\p{L}+/gu)?.length ?? 0;
function formatTime(seconds: number) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function TypingCauldron() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typingCardRef = useRef<HTMLDivElement>(null);
  const typedPassageRef = useRef<HTMLParagraphElement>(null);
  const audioRef = useRef(new GameAudio());
  const reservoirRef = useRef(new WordReservoir());
  const phaseRef = useRef<Phase>("menu");
  const passageRef = useRef("");
  const charIndexRef = useRef(0);
  const pendingDeadKeyRef = useRef(false);
  const completedWordsRef = useRef(0);
  const mistakesRef = useRef(0);
  const submittedScoreRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("menu");
  const [passage, setPassage] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [mistakeIndices, setMistakeIndices] = useState<number[]>([]);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [completedWords, setCompletedWords] = useState(0);
  const [wordGoal, setWordGoal] = useState(() => countWords(TEXTS[0]));
  const [timeLeft, setTimeLeft] = useState(420);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<{ words: number; accuracy: number } | null>(null);
  const [globalRank, setGlobalRank] = useState<{ username: string; words: number }[]>([]);
  const [rankLoaded, setRankLoaded] = useState(false);
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState<"en" | "pt">("en");
  const isPortuguese = language === "pt";
  const [showCreateUser, setShowCreateUser] = useState(true);
  const [createUserError, setCreateUserError] = useState("");
  const playerIdRef = useRef<string | null>(null);
  useEffect(() => {
    try { const session = JSON.parse(localStorage.getItem(PLAYER_SESSION_KEY) ?? "null") as { username?: string; lastActive?: number; playerId?: string } | null; if (session?.username && session.lastActive && Date.now() - session.lastActive < SESSION_TTL) { playerIdRef.current = session.playerId ?? null; setUsername(session.username); setShowCreateUser(false); } else localStorage.removeItem(PLAYER_SESSION_KEY); } catch { /* storage unavailable */ }
  }, []);
  const createUser = useCallback(async () => {
    if (username.trim().length < 2) return;
    setCreateUserError("");
    const { data, error } = await supabase.from("typing_players").insert({ username: username.trim() }).select("id").single();
    if (error) { console.error("Supabase player creation failed", error); setCreateUserError(`We couldn't create your player: ${error.message}`); return; }
    if (!data?.id) { setCreateUserError("Supabase did not return a player ID. Please try again."); return; }
    playerIdRef.current = data.id; localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify({ username: username.trim(), lastActive: Date.now(), playerId: playerIdRef.current })); setShowCreateUser(false);
  }, [username]);
  useEffect(() => {
    if (showCreateUser || !username) return;
    const touch = () => localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify({ username, playerId: playerIdRef.current, lastActive: Date.now() }));
    window.addEventListener("pointerdown", touch); window.addEventListener("keydown", touch);
    return () => { window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); };
  }, [showCreateUser, username]);
  const setPhaseBoth = (next: Phase) => { phaseRef.current = next; setPhase(next); };

  const prepareRound = useCallback(() => {
    const seeds = language === "en" ? ENGLISH_SEED_TEXTS : SEED_TEXTS;
    const seed = seeds[Math.floor(Math.random() * seeds.length)];
    const canvas = canvasRef.current;
    const targetLength = estimateParticleCapacity(canvas?.clientWidth ?? 360, canvas?.clientHeight ?? 535);
    const nextPassage = makePassage(seed, targetLength);
    passageRef.current = nextPassage; charIndexRef.current = 0; pendingDeadKeyRef.current = false; completedWordsRef.current = 0; mistakesRef.current = 0;
    submittedScoreRef.current = false;
    reservoirRef.current.clear(); setPassage(nextPassage); setCharIndex(0); setMistakeIndices([]); setMistakeCount(0); setCompletedWords(0); setWordGoal(countWords(nextPassage)); setTimeLeft(420); setResult(null);
  }, [language]);
  const start = useCallback(async () => {
    try { await audioRef.current.unlock(); } catch { /* audio is optional */ }
    prepareRound(); setCountdown(3); setPhaseBoth("countdown"); rootRef.current?.focus();
  }, [prepareRound]);
  const finish = useCallback((won: boolean) => {
    const completed = completedWordsRef.current;
    setResult({ words: completed, accuracy: Math.round((completed / Math.max(1, completed + mistakesRef.current)) * 100) });
    setPhaseBoth(won ? "result" : "failed");
    const player = username.trim().slice(0, 24);
    if (player.length >= 2 && !submittedScoreRef.current) {
      submittedScoreRef.current = true;
      void supabase.from("typing_scores").insert({ player_id: playerIdRef.current, username: player, words: completed, accuracy: Math.round((completed / Math.max(1, completed + mistakesRef.current)) * 100) });
    }
  }, [username]);

  useEffect(() => {
    if (phase !== "menu") return;
    setRankLoaded(false);
    void supabase.from("typing_scores").select("username,words").order("words", { ascending: false }).order("accuracy", { ascending: false }).order("created_at", { ascending: true }).limit(10).then(({ data, error }) => { if (!error && data) setGlobalRank(data as { username: string; words: number }[]); setRankLoaded(true); });
  }, [phase]);

  useEffect(() => {
    if (phase !== "menu") return;
    const preview = makePassage((language === "en" ? ENGLISH_SEED_TEXTS : SEED_TEXTS)[0], 9000);
    passageRef.current = preview;
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % 260;
      setPassage(preview); setCharIndex(index);
      if (index % 3 === 0) reservoirRef.current.addParticle();
    }, 105);
    return () => window.clearInterval(timer);
  }, [language, phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    let value = 3;
    const timer = window.setInterval(() => { value -= 1; if (value > 0) setCountdown(value); else { window.clearInterval(timer); setPhaseBoth("playing"); } }, 550);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => setTimeLeft((value) => { const next = Math.max(0, value - 0.1); if (next === 0) finish(false); return next; }), 100);
    return () => window.clearInterval(timer);
  }, [phase, finish]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (showCreateUser) {
        if (event.key === "Enter") { event.preventDefault(); void createUser(); }
        return;
      }
      if (phaseRef.current === "menu" || phaseRef.current === "result" || phaseRef.current === "failed") {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void start(); } return;
      }
      if (phaseRef.current === "countdown") { event.preventDefault(); setPhaseBoth("playing"); return; }
      if (phaseRef.current !== "playing") return;
      if (event.key === "Backspace") return;
      // On Portuguese keyboards, accents such as ã arrive as a dead key followed by a letter.
      if (event.key === "Dead" || event.key === "Process") { pendingDeadKeyRef.current = true; return; }
      const typedCharacter = event.key === "Enter" ? "\n" : event.key;
      if (typedCharacter.length !== 1) return;
      event.preventDefault();
      const expected = passageRef.current[charIndexRef.current];
      const matches = expected === "\n" ? typedCharacter === "\n" : expected && matchesComposedCharacter(expected, typedCharacter, pendingDeadKeyRef.current);
      pendingDeadKeyRef.current = false;
      if (!matches) { mistakesRef.current += 1; setMistakeCount(mistakesRef.current); setMistakeIndices((current) => [...current, charIndexRef.current]); setTimeLeft((value) => Math.max(0, value - 1)); audioRef.current.miss(); return; }
      const index = charIndexRef.current;
      charIndexRef.current += 1;
      setCharIndex(charIndexRef.current);
      audioRef.current.tick(0.96 + Math.min((index % 8) * 0.025, 0.16));
      reservoirRef.current.addParticle();
      const next = passageRef.current[index + 1];
      if (expected === "\n" && next === "\n") setTimeLeft((value) => value + 10);
      if (isLetter(expected) && !isLetter(next)) {
        audioRef.current.tok();
        completedWordsRef.current += 1;
        setCompletedWords(completedWordsRef.current);
      }
      if (charIndexRef.current >= passageRef.current.length) finish(true);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [createUser, finish, showCreateUser, start]);
  useEffect(() => {
    if (charIndex <= 0) return;
    const card = typingCardRef.current;
    const character = typedPassageRef.current?.querySelector(`[data-typed-index="${charIndex - 1}"]`) as HTMLElement | null;
    if (!card || !character) return;
    const cardRect = card.getBoundingClientRect();
    const characterRect = character.getBoundingClientRect();
    const target = card.scrollTop + (characterRect.top - cardRect.top) - card.clientHeight * .42;
    card.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [charIndex]);
  useEffect(() => {
    const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (!canvas || !context) return;
    let previous = performance.now(); let raf = 0;
    const resize = () => { const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.max(1, Math.floor(canvas.clientWidth * ratio)); canvas.height = Math.max(1, Math.floor(canvas.clientHeight * ratio)); context.setTransform(ratio, 0, 0, ratio, 0, 0); };
    resize(); const observer = new ResizeObserver(resize); observer.observe(canvas);
    const frame = (now: number) => { const delta = Math.min(0.05, (now - previous) / 1000); previous = now; reservoirRef.current.update(delta, canvas.clientWidth, canvas.clientHeight); reservoirRef.current.draw(context, canvas.clientWidth, canvas.clientHeight); raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame); return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);

  const completed = completedWords;
  return <div ref={rootRef} tabIndex={0} onPointerDown={() => rootRef.current?.focus()} className={`min-h-dvh bg-bg text-ink outline-none ${showCreateUser ? "is-creating-user" : ""}`}>
    {showCreateUser && <div className="game-overlay" style={{ zIndex: 50, background: "var(--color-bg)" }}><div className="game-dialog"><p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{isPortuguese ? "Caldeirão de Palavras" : "Cauldron of Words"}</p><h2 className="mt-3 text-3xl font-semibold text-ink">{isPortuguese ? "Crie seu usuário" : "Create your player"}</h2><p className="mt-3 text-sm leading-6 text-muted">{isPortuguese ? "Escolha um nome para salvar suas pontuações." : "Choose a name to save your scores."}</p><input autoFocus value={username} maxLength={24} onChange={(event) => setUsername(event.target.value)} placeholder={isPortuguese ? "Nome de usuário" : "Player name"} className="mt-5 h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-ink outline-none focus:border-accent" /><button type="button" disabled={username.trim().length < 2} onClick={() => void createUser()} className="mt-5 min-h-11 rounded-xl bg-accent px-5 font-semibold text-bg disabled:opacity-50">{isPortuguese ? "Criar usuário" : "Create player"}</button></div></div>}
    {showCreateUser && <div className="language-switch" aria-label="Language"><button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button><button type="button" aria-pressed={language === "pt"} onClick={() => setLanguage("pt")}>Português</button></div>}
    {showCreateUser && createUserError && <p className="create-user-error" role="alert">{createUserError}</p>}
    <div className="reservoir-layout">
      <section className="reservoir-stage" aria-label="Word container">
        <canvas ref={canvasRef} onPointerMove={(event) => { if (event.buttons) { const rect = event.currentTarget.getBoundingClientRect(); reservoirRef.current.disturb(event.clientX - rect.left, event.clientY - rect.top); } }} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5"><div><p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">Container</p><p className="mt-1 text-sm font-medium text-ink">Words falling</p></div><div className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs tabular-nums text-accent">{completed}/{wordGoal}</div></div>
      </section>
      <main className="reservoir-copy">
        <AdSlot slot="7517008804" />
        <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{isPortuguese ? "Caldeirão de Palavras" : "Cauldron of Words"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{isPortuguese ? "Encha o recipiente." : "Fill the container."}</h1></div><div className="flex items-center gap-4"><div className={`font-mono text-sm font-semibold tabular-nums ${mistakeCount > 0 ? "text-danger" : "text-muted"}`}>{isPortuguese ? "Erros" : "Mistakes"} {mistakeCount} · −1s</div><div className={`font-mono text-2xl font-semibold tabular-nums ${timeLeft < 12 ? "text-danger" : "text-accent"}`}>{formatTime(timeLeft)}</div></div></header>
        <div ref={typingCardRef} className="typing-card mt-8 min-w-0 rounded-3xl border border-border bg-surface p-5 sm:p-7"><p className="text-sm leading-7 text-muted">{isPortuguese ? "Digite o texto exatamente como aparece: espaços, acentos e pontuação também contam. Cada erro custa um segundo; terminar um parágrafo ganha dez segundos. Cada letra correta abre a torneira e deixa um grão cair." : "Type the text exactly as it appears: spaces, accents and punctuation all count. Every mistake costs one second; finishing a paragraph earns ten seconds. Every correct letter opens the faucet and releases one grain."}</p><p ref={typedPassageRef} className="typing-passage mt-5 text-lg leading-9 text-ink" aria-live="polite">{passage.split("").map((character, index) => <span data-typed-index={index} key={`${character}-${index}`} className={mistakeIndices.includes(index) ? "word-mistake" : index < charIndex ? "word-filled" : "word-dim"}>{character}</span>)}</p></div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-5 text-sm text-muted"><span>{completed} of {wordGoal} words</span><span>Goal: fill before 07:00</span></div><AdSlot slot="3358271946" format="autorelaxed" />
      </main>
    </div>
    {phase === "menu" && <div className="game-overlay"><div className="game-dialog game-dialog--rank"><p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{isPortuguese ? "Desafio de digitação" : "Typing challenge"}</p><h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{isPortuguese ? "Palavra por palavra." : "Word by word."}</h2><p className="mt-4 max-w-md text-base leading-7 text-muted">{isPortuguese ? "Complete a história antes de 07:00. Cada caractere libera um grão e o recipiente continua vivo ao fundo." : "Complete the story before 07:00. Every character releases a grain while the container stays alive in the background."}</p><label className="mt-6 block text-sm font-medium text-ink">{isPortuguese ? "Nome no ranking" : "Ranking name"}<input value={username} maxLength={24} onChange={(event) => setUsername(event.target.value)} placeholder={isPortuguese ? "Digite seu nome" : "Enter your name"} className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-ink outline-none focus:border-accent" /></label><button type="button" disabled={username.trim().length < 2} onClick={() => void start()} className="mt-6 min-h-12 rounded-xl bg-accent px-6 text-sm font-semibold text-bg transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">{isPortuguese ? "Começar a escrever" : "Start writing"}</button><div className="mt-8 border-t border-border pt-5"><p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{isPortuguese ? "Ranking global" : "Global ranking"}</p>{!rankLoaded ? <p className="mt-2 text-sm text-muted">{isPortuguese ? "Carregando pontuações..." : "Loading scores..."}</p> : globalRank.length === 0 ? <p className="mt-2 text-sm text-muted">{isPortuguese ? "Ainda não há pontuações." : "No scores yet."}</p> : <ol className="mt-2 space-y-1 text-sm text-muted">{globalRank.map((score, index) => <li key={`${score.username}-${index}`} className="flex justify-between"><span>#{index + 1} {score.username}</span><span className="font-mono text-ink">{score.words}</span></li>)}</ol>}</div></div></div>}
    {phase === "countdown" && <div className="countdown-overlay" aria-live="assertive">{countdown}</div>}
    {(phase === "result" || phase === "failed") && <div className="game-overlay"><div className="game-dialog"><p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{phase === "result" ? "Container full" : "Time is up"}</p><h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{phase === "result" ? "You filled the container." : "Almost there."}</h2><div className="mt-6 grid grid-cols-2 gap-3 text-left"><div className="rounded-2xl bg-surface-raised p-4"><p className="text-xs text-muted">Words</p><p className="mt-1 font-mono text-2xl text-ink">{result?.words ?? 0}</p></div><div className="rounded-2xl bg-surface-raised p-4"><p className="text-xs text-muted">Accuracy</p><p className="mt-1 font-mono text-2xl text-ink">{result?.accuracy ?? 0}%</p></div></div><button type="button" onClick={() => void start()} className="mt-8 min-h-12 rounded-xl bg-accent px-6 text-sm font-semibold text-bg transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-95">Play again</button></div></div>}
  </div>;
}
