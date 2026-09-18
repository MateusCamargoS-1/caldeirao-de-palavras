import { createFileRoute } from "@tanstack/react-router";
import { EditorialPage } from "@/components/editorial-page";

export const Route = createFileRoute("/recursos/digitacao")({
  head: () => ({
    meta: [
      { title: "Typing practice guide | Cauldron of Words" },
      { name: "description", content: "Practical, original guidance for improving typing accuracy, rhythm, posture, and reading while practicing online." },
    ],
  }),
  component: TypingGuidePage,
});

function TypingGuidePage() {
  return (
    <EditorialPage
      eyebrow="Practice notes"
      title="How to improve typing without sacrificing accuracy"
      description="Speed is a useful result of practice, but accuracy, rhythm, and comfortable repetition are the skills that make typing dependable in everyday work."
      showAd
    >
      <h2>Start with a readable rhythm</h2>
      <p>Many typing exercises encourage people to chase a high number immediately. A more sustainable approach is to keep your hands moving at a pace where you can anticipate the next word. Read a few characters ahead, keep your eyes on the passage, and let your fingers follow the rhythm of the sentence.</p>
      <p>Short sessions work well because they preserve concentration. Five to ten minutes of deliberate practice can be more useful than a long session where every mistake becomes frustrating. Stop when your accuracy starts to fall and return later with a fresh passage.</p>
      <h2>Accuracy creates speed</h2>
      <p>Every correction interrupts the sentence you are trying to form. Practicing accurate keystrokes reduces the need to stop, look down, and repair a word. In Cauldron of Words, the timer makes this visible: a mistake costs a second, while a completed paragraph rewards consistency.</p>
      <p>When you miss a key, do not repeatedly hammer the same letter. Pause, identify whether the issue was reading, hand position, or a keyboard layout, and continue. This keeps practice informative instead of turning it into random repetition.</p>
      <h2>Use real punctuation and accents</h2>
      <p>Everyday writing includes commas, quotation marks, paragraph breaks, and accented characters. Exercises that use only lowercase words can build a narrow form of muscle memory. Stories provide a more useful mix because they ask you to change rhythm as the sentence changes.</p>
      <h2>Make your setup comfortable</h2>
      <p>Keep the keyboard at a height that lets your shoulders relax. Place the screen where you can read without bending your neck, and use light keystrokes instead of pressing harder when you make a mistake. Comfort is not a cosmetic detail: it is what makes regular practice possible.</p>
      <h2>Measure the right things</h2>
      <p>Words per minute can be motivating, but compare it with accuracy and how you felt during the session. A slightly slower round with fewer corrections is often a better foundation than a fast round that required constant backtracking. Use the result screen as a guide for the next session, not as a judgment.</p>
    </EditorialPage>
  );
}
