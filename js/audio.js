import { sleep } from './utils.js';

let _audioCtx = null;
let _countdownGain = null;

export function ensureAudio() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
}

export function playCountdownMusic() {
  if (!_audioCtx) return;
  try {
    const ctx = _audioCtx;
    _countdownGain = ctx.createGain();
    _countdownGain.gain.value = 1;
    _countdownGain.connect(ctx.destination);

    const BPM = 180;
    const b = 60 / BPM;
    const notes = [
      [659,0.5],[659,0.5],[0,0.5],[659,0.5],[0,0.5],[523,0.5],[659,1],[784,2],
      [0,2],[392,2],[0,2],
      [523,1.5],[0,1],[392,1],[0,1],[330,1.5],
      [440,1],[494,1],[466,0.5],[440,1],
      [392,1.33],[659,1.33],[784,1.33],[880,1],
      [698,1],[784,1],[0,0.5],[659,1],
      [523,1],[587,1],[494,1.5],
    ];
    const loopSec = notes.reduce((s, [, d]) => s + d, 0) * b;

    for (let loop = 0; loop < 4; loop++) {
      let t = ctx.currentTime + 0.05 + loop * loopSec;
      notes.forEach(([freq, beats]) => {
        const dur = beats * b;
        if (freq > 0) {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(_countdownGain);
          osc.type = 'square';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.setValueAtTime(0.12, t + dur * 0.85);
          gain.gain.linearRampToValueAtTime(0, t + dur);
          osc.start(t);
          osc.stop(t + dur);
        }
        t += dur;
      });
    }
  } catch (_) {}
}

export function stopCountdownMusic() {
  if (_countdownGain && _audioCtx) {
    _countdownGain.gain.setValueAtTime(0, _audioCtx.currentTime);
    _countdownGain = null;
  }
}

export function playSwordSwing() {
  if (!_audioCtx) return;
  try {
    const ctx = _audioCtx;
    const duration = 1.8;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + duration);
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export async function playSiren() {
  if (!_audioCtx) return;
  for (let i = 0; i < 3; i++) {
    try {
      const ctx  = _audioCtx;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.55);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    } catch (_) {}
    await sleep(700);
  }
}
