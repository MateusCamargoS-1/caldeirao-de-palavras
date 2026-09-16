export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;

  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.48;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  private tone(freq: number, type: OscillatorType, dur: number, vol: number, slide?: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur * 0.75);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  tick(pitch = 1) {
    this.tone(700 * pitch + Math.random() * 28, "sine", 0.05, 0.085);
  }
  tok() {
    this.tone(360, "triangle", 0.11, 0.16, 150);
  }
  miss() {
    this.tone(150, "square", 0.06, 0.055);
  }
  impact(v = 0.5) {
    this.tone(85 + Math.random() * 25, "sine", 0.09, 0.045 * v);
  }
  bubble() {
    this.tone(120 + Math.random() * 50, "sine", 0.12, 0.028, 50);
  }
  fwoosh() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.26);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(1300, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 0.22);
    f.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + 0.28);
  }
}
