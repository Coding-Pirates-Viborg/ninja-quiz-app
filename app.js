const QUESTIONS_FILE='questions.json';
const QUESTIONS_SAMPLE_FILE='questions-SAMPLE.json';
const isTesting = new URLSearchParams(window.location.search).get('mode') === 'testing';
const QUESTIONS_URL = `http://localhost:8080/questions/${isTesting ? QUESTIONS_SAMPLE_FILE : QUESTIONS_FILE}`;
const IMAGES_BASE   = 'http://localhost:8080/questions/';
const COUNTDOWN_SEC = 2;

let questions    = [];
let currentIndex = 0;
let state        = 'IDLE';
let masterResolve = null;

document.addEventListener('DOMContentLoaded', init);

// ── Bootstrap ──────────────────────────────────────────────────────────────

async function init() {
  document.addEventListener('keydown', onKey);
  try {
    const res = await fetch(QUESTIONS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const errors = validateQuestions(data);
    const imgErrors = await validateImages(data);
    const allErrors = [...errors, ...imgErrors];
    if (allErrors.length) {
      showValidationError(allErrors);
      return;
    }
    questions = data;
    showIntro();
  } catch (err) {
    showFetchError(err);
  }
}

// ── Validation ─────────────────────────────────────────────────────────────

async function validateImages(qs) {
  const errors = [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const n = `Spørgsmål ${i + 1}`;
    for (const side of ['a', 'b']) {
      if (q[side]?.image) {
        const url = `${IMAGES_BASE}${q[side].image}`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) errors.push(`${n} - svar ${side.toUpperCase()}: billedet "${q[side].image}" blev ikke fundet`);
        } catch {
          errors.push(`${n} - svar ${side.toUpperCase()}: kunne ikke tjekke billedet "${q[side].image}"`);
        }
      }
    }
  }
  return errors;
}

function validateQuestions(qs) {
  const errors = [];
  qs.forEach((q, i) => {
    const n = `Spørgsmål ${i + 1}`;
    if (!q.question)  errors.push(`${n}: mangler spørgsmålstekst`);
    if (!q.a?.answer) errors.push(`${n}: mangler svartekst for A`);
    if (!q.b?.answer) errors.push(`${n}: mangler svartekst for B`);
    const correctCount = [q.a?.correct, q.b?.correct].filter(Boolean).length;
    if (correctCount === 0) errors.push(`${n}: intet svar er markeret som korrekt`);
    if (correctCount > 1)   errors.push(`${n}: begge svar er markeret som korrekte`);
  });
  return errors;
}

// ── Error screens ──────────────────────────────────────────────────────────

function showFetchError(err) {
  state = 'ERROR';
  const msg = document.getElementById('overlay-message');
  msg.innerHTML = `
    <span class="error-title">⚠ Kunne ikke hente spørgsmål</span>
    Er Python-serveren startet?<br><br>
    Kør: <code>python3 -m http.server 8080</code><br><br>
    <small style="color:#888">(${err.message})</small>
  `;
  showOverlay();
}

function showValidationError(errors) {
  state = 'ERROR';
  const items = errors.map(e => `<li>• ${e}</li>`).join('');
  const msg = document.getElementById('overlay-message');
  msg.innerHTML = `
    <span class="error-title">⚠ Fejl i questions.json</span>
    <ul class="error-list">${items}</ul>
  `;
  showOverlay();
}

// ── States ─────────────────────────────────────────────────────────────────

function showIntro() {
  state = 'INTRO';
  currentIndex = 0;
  resetSides();
  hideTimerBar();
  document.getElementById('question-text').textContent = '☠ NINJA QUIZ ☠';
  const msg = document.getElementById('overlay-message');
  msg.innerHTML = `
    <span class="winner-text">⚔ NINJA QUIZ ⚔</span>
    Coding Pirates Viborg/Bjerringbro
    <span class="sub">Tryk SPACE eller ENTER for at starte</span>
  `;
  showOverlay();
}

async function runQuestion() {
  if (currentIndex >= questions.length) {
    showWinner();
    return;
  }
  const q = questions[currentIndex];
  state = 'QUESTION';

  hideOverlay();
  showTimerBar();
  resetSides();
  showQuestion(q);

  await sleep(400);

  state = 'COUNTDOWN';
  await startCountdown();

  state = 'WAIT_FOR_MASTER';
  playSiren();
  timerExpired();
  await waitForMaster();

  state = 'REVEAL';
  await showReveal(q);

  state = 'ELIMINATION';
  showElimination(q);
  await sleep(1200);

  state = 'NEXT';
  const msg = document.getElementById('overlay-message');
  const isLast = currentIndex === questions.length - 1;
  msg.innerHTML = isLast
    ? `Sidste spørgsmål klaret!<span class="sub">Tryk SPACE for at se vinderen</span>`
    : `<span class="sub">Tryk SPACE for næste spørgsmål</span>`;
  document.getElementById('overlay').classList.add('next-prompt');
  showOverlay();
  currentIndex++;
}

function showQuestion(q) {
  document.getElementById('question-text').textContent = q.question;

  document.querySelector('#side-a .answer-text').textContent = q.a.answer;
  document.querySelector('#side-b .answer-text').textContent = q.b.answer;

  const bgA = document.querySelector('#side-a .side-bg');
  const bgB = document.querySelector('#side-b .side-bg');
  bgA.style.backgroundImage = q.a.image ? `url('${IMAGES_BASE}${q.a.image}')` : '';
  bgB.style.backgroundImage = q.b.image ? `url('${IMAGES_BASE}${q.b.image}')` : '';
  document.querySelector('#side-a .answer-text').classList.toggle('has-bg', !!q.a.image);
  document.querySelector('#side-b .answer-text').classList.toggle('has-bg', !!q.b.image);
}

function startCountdown() {
  return new Promise(resolve => {
    const fill   = document.getElementById('timer-fill');
    const number = document.getElementById('timer-number');
    let sec = COUNTDOWN_SEC;

    number.textContent = sec;
    number.classList.remove('expired', 'tick');

    playCountdownMusic();

    requestAnimationFrame(() => {
      fill.style.transition = 'none';
      fill.style.width = '100%';
      requestAnimationFrame(() => {
        fill.style.transition = `width ${COUNTDOWN_SEC}s linear`;
        fill.style.width = '0%';
      });
    });

    const interval = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(interval);
        number.textContent = '0';
        stopCountdownMusic();
        resolve();
        return;
      }
      number.textContent = sec;
      number.classList.remove('tick');
      void number.offsetWidth;
      number.classList.add('tick');
    }, 1000);
  });
}

function timerExpired() {
  const number = document.getElementById('timer-number');
  number.classList.remove('tick');
  number.classList.add('expired');
}

function waitForMaster() {
  return new Promise(resolve => {
    masterResolve = resolve;
  });
}

async function showReveal(q) {
  hideOverlay();
  const sword   = document.getElementById('sword');
  const divider = document.getElementById('divider');

  sword.classList.remove('dropping');
  void sword.offsetWidth;
  sword.classList.add('dropping');
  playSwordSwing();

  await sleep(900); // midpoint of 2s animation
  divider.classList.add('divider-flash');
  await sleep(300);
  divider.classList.remove('divider-flash');
  await sleep(900); // let sword finish
}

function showElimination(q) {
  const correctSide = q.a.correct === true ? 'a' : 'b';
  const wrongSide   = correctSide === 'a' ? 'b' : 'a';

  document.getElementById(`side-${wrongSide}`).classList.add('eliminated');
  document.getElementById(`side-${correctSide}`).classList.add('correct');

  setTimeout(() => {
    const skull = document.getElementById(`skull-${wrongSide}`);
    skull.classList.remove('hidden');
    skull.classList.add('visible');

    const funfact = q[correctSide]?.funfact;
    if (funfact) {
      const el = document.querySelector(`#side-${correctSide} .funfact-text`);
      el.textContent = `💡 ${funfact}`;
      el.classList.remove('hidden');
      el.classList.add('visible');
    }
  }, 850);
}

function showWinner() {
  state = 'WINNER';
  document.getElementById('question-text').textContent = '';
  hideTimerBar();
  const msg = document.getElementById('overlay-message');
  msg.innerHTML = `
    <span class="winner-text">🏆 VINDER! 🏆</span>
    Tillykke til den sidste ninja!
    <span class="sub">Tryk R for at genstarte</span>
  `;
  showOverlay();
}

// ── Keyboard ───────────────────────────────────────────────────────────────

function onKey(e) {
  if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    showIntro();
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    handleAdvance();
  }
}

function handleAdvance() {
  ensureAudio(); // must be synchronous inside the keydown handler
  if (state === 'INTRO')   { runQuestion(); return; }
  if (state === 'WAIT_FOR_MASTER' && masterResolve) {
    const fn = masterResolve;
    masterResolve = null;
    fn();
    return;
  }
  if (state === 'NEXT')    { hideOverlay(); runQuestion(); return; }
  if (state === 'WINNER')  { showIntro(); return; }
}

// ── Audio ──────────────────────────────────────────────────────────────────

let _audioCtx = null;
let _countdownGain = null;

// Called synchronously inside the keydown handler — guarantees running state
function ensureAudio() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
}

function playCountdownMusic() {
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

function stopCountdownMusic() {
  if (_countdownGain && _audioCtx) {
    _countdownGain.gain.setValueAtTime(0, _audioCtx.currentTime);
    _countdownGain = null;
  }
}

function playSwordSwing() {
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

async function playSiren() {
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

// ── Helpers ────────────────────────────────────────────────────────────────

function showOverlay() {
  document.getElementById('overlay').classList.remove('hidden');
}

function hideOverlay() {
  const el = document.getElementById('overlay');
  el.classList.add('hidden');
  el.classList.remove('next-prompt');
}

function showTimerBar() {
  document.getElementById('timer-bar').style.display = '';
  document.getElementById('timer-circle').style.display = '';
}

function hideTimerBar() {
  document.getElementById('timer-bar').style.display = 'none';
  document.getElementById('timer-circle').style.display = 'none';
}

function resetSides() {
  ['a', 'b'].forEach(s => {
    const el = document.getElementById(`side-${s}`);
    el.classList.remove('eliminated', 'correct');
    el.querySelector('.answer-text').textContent = '';
    el.querySelector('.side-bg').style.backgroundImage = '';
    const skull = document.getElementById(`skull-${s}`);
    skull.classList.add('hidden');
    skull.classList.remove('visible');
    const funfact = el.querySelector('.funfact-text');
    funfact.textContent = '';
    funfact.classList.add('hidden');
    funfact.classList.remove('visible');
  });
  const sword = document.getElementById('sword');
  sword.classList.remove('dropping');

  const fill = document.getElementById('timer-fill');
  fill.style.transition = 'none';
  fill.style.width = '100%';

  const number = document.getElementById('timer-number');
  number.textContent = COUNTDOWN_SEC;
  number.classList.remove('tick', 'expired');
  stopCountdownMusic();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
