const QUESTIONS_URL = 'http://localhost:8080/questions/questions.json';
const IMAGES_BASE   = 'http://localhost:8080/questions/';
const COUNTDOWN_SEC = 10;

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
    if (errors.length) {
      showValidationError(errors);
      return;
    }
    questions = data;
    showIntro();
  } catch (err) {
    showFetchError(err);
  }
}

// ── Validation ─────────────────────────────────────────────────────────────

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
}

function startCountdown() {
  return new Promise(resolve => {
    const fill   = document.getElementById('timer-fill');
    const number = document.getElementById('timer-number');
    let sec = COUNTDOWN_SEC;

    number.textContent = sec;
    number.classList.remove('expired', 'tick');

    // kick off CSS transition
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
        resolve();
        return;
      }
      number.textContent = sec;
      number.classList.remove('tick');
      void number.offsetWidth; // reflow to restart animation
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

  await sleep(300); // impact midpoint
  divider.classList.add('divider-flash');
  await sleep(300);
  divider.classList.remove('divider-flash');
  await sleep(400); // finish animation
}

function showElimination(q) {
  const correctSide = q.a.correct === true ? 'a' : 'b';
  const wrongSide   = correctSide === 'a' ? 'b' : 'a';

  document.getElementById(`side-${wrongSide}`).classList.add('eliminated');
  document.getElementById(`side-${correctSide}`).classList.add('correct');
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

function playSiren() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}

// ── Helpers ────────────────────────────────────────────────────────────────

function showOverlay() {
  document.getElementById('overlay').classList.remove('hidden');
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

function showTimerBar() {
  document.getElementById('timer-bar').style.display = '';
}

function hideTimerBar() {
  document.getElementById('timer-bar').style.display = 'none';
}

function resetSides() {
  ['a', 'b'].forEach(s => {
    const el = document.getElementById(`side-${s}`);
    el.classList.remove('eliminated', 'correct');
    el.querySelector('.answer-text').textContent = '';
    el.querySelector('.side-bg').style.backgroundImage = '';
  });
  const sword = document.getElementById('sword');
  sword.classList.remove('dropping');

  const fill = document.getElementById('timer-fill');
  fill.style.transition = 'none';
  fill.style.width = '100%';

  const number = document.getElementById('timer-number');
  number.textContent = COUNTDOWN_SEC;
  number.classList.remove('tick', 'expired');
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
