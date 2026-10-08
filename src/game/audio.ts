function ramp(param: AudioParam, value: number, now: number, time = 0.04) {
  param.setTargetAtTime(value, now, time);
}

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let music: GainNode | null = null;
  let sfx: GainNode | null = null;
  let droneGain: GainNode | null = null;
  let muted = false;
  let droneStarted = false;
  let lastBeat = 0;
  let lastStep = 0;

  function ensure() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    music = ctx.createGain();
    sfx = ctx.createGain();
    master.gain.value = 0.85;
    music.gain.value = 0.55;
    sfx.gain.value = 0.7;
    music.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c.state === "suspended") void c.resume();
    startDrone();
  }

  function startDrone() {
    if (!ctx || !music || droneStarted) return;
    droneStarted = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    droneGain.connect(filter);
    filter.connect(music);

    const make = (freq: number, type: OscillatorType, detune: number) => {
      const osc = ctx!.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(droneGain!);
      osc.start();
    };
    make(55, "sine", 0);
    make(82.4, "sine", 7);
    make(110, "triangle", -12);
  }

  function noiseBurst(duration: number, cutoff: number, gain: number, pan = 0) {
    if (!ctx || !sfx || muted) return;
    const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = n;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(f);
    f.connect(g);
    g.connect(p);
    p.connect(sfx);
    src.start();
    src.stop(ctx.currentTime + duration);
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
    if (!ctx || !sfx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(sfx);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  return {
    unlock,
    setMuted(next: boolean) {
      muted = next;
      if (!master || !ctx) return;
      ramp(master.gain, next ? 0 : 0.85, ctx.currentTime, 0.05);
    },
    resume() {
      if (ctx?.state === "suspended") void ctx.resume();
    },
    tick(now: number, watched: boolean, moving: boolean, pan = 0) {
      if (!ctx || muted) return;
      if (droneGain) {
        ramp(droneGain.gain, watched ? 0.09 : 0.04, ctx.currentTime, 0.12);
      }
      if (watched && now - lastBeat > 0.62) {
        lastBeat = now;
        tone(72, 0.12, "sine", 0.18);
        window.setTimeout(() => tone(58, 0.16, "sine", 0.14), 140);
      }
      if (moving && now - lastStep > 0.38) {
        lastStep = now;
        noiseBurst(0.07, 900, 0.07, pan);
      }
    },
    eyeOpen() {
      noiseBurst(0.35, 700, 0.12);
      tone(180, 0.4, "sine", 0.05, 90);
    },
    shard() {
      tone(740, 0.18, "sine", 0.12, 1200);
      tone(1180, 0.28, "triangle", 0.05);
    },
    caught() {
      tone(140, 0.5, "sawtooth", 0.08, 50);
      noiseBurst(0.45, 400, 0.16);
    },
    door() {
      noiseBurst(0.2, 500, 0.1);
      tone(220, 0.3, "sine", 0.06, 140);
    },
    win() {
      tone(330, 0.4, "sine", 0.08, 440);
      tone(495, 0.7, "sine", 0.05, 660);
    },
  };
}

export type GameAudio = ReturnType<typeof createAudio>;
