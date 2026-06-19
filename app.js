import { validateQuestions, validateImages } from './js/validation.js';
import {
  showQuestion, showElimination, resetSides,
  showOverlay, hideOverlay, showTimerBar, hideTimerBar, timerExpired,
} from './js/dom.js';
import {
  ensureAudio, playCountdownMusic, stopCountdownMusic, playSwordSwing, playSiren,
} from './js/audio.js';
import { sleep, toggleFullscreen } from './js/utils.js';

const QUESTIONS_FILE        = 'questions.json';
const QUESTIONS_SAMPLE_FILE = 'questions-SAMPLE.json';
const _params        = new URLSearchParams(window.location.search);
const isTesting      = _params.get('mode') === 'testing';
const useSample      = _params.get('question') === 'sample';
const _startQuestion      = parseInt(_params.get('question'), 10);
const isQuestionReviewMode = !isNaN(_startQuestion);
const QUESTIONS_URL  = `questions/${useSample ? QUESTIONS_SAMPLE_FILE : QUESTIONS_FILE}`;
const IMAGES_BASE    = 'questions/';
const COUNTDOWN_SEC  = isTesting ? 2 : 15;

let questions    = [];
let currentIndex = 0;
let state        = 'IDLE';
let masterResolve = null;

document.addEventListener('DOMContentLoaded', init);

// ── Bootstrap ──────────────────────────────────────────────────────────────

export async function init() {
  document.addEventListener('keydown', onKey);
  try {
    const res = await fetch(QUESTIONS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const errors = validateQuestions(data);
    const imgErrors = await validateImages(data, IMAGES_BASE);
    const allErrors = [...errors, ...imgErrors];
    if (allErrors.length) {
      showValidationError(allErrors);
      return;
    }
    questions = data;
    if (isQuestionReviewMode && _startQuestion >= 1 && _startQuestion <= questions.length) {
      currentIndex = _startQuestion - 1;
      runQuestion();
    } else {
      showIntro();
    }
  } catch (err) {
    showFetchError(err);
  }
}

// ── Error screens ──────────────────────────────────────────────────────────

function showFetchError(err) {
  state = 'ERROR';
  const msg = document.getElementById('overlay-message');
  msg.innerHTML = `
    <span class="error-title">⚠ Kunne ikke hente spørgsmål</span>
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
  resetSides(COUNTDOWN_SEC);
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
  resetSides(COUNTDOWN_SEC);
  showQuestion(q, IMAGES_BASE);

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

// ── Countdown ──────────────────────────────────────────────────────────────

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
        document.getElementById('timer-bar').style.display = 'none';
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

  await sleep(900);
  divider.classList.add('divider-flash');
  await sleep(300);
  divider.classList.remove('divider-flash');
  await sleep(900);
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
  if (isQuestionReviewMode) {
    if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
      currentIndex++;
      runQuestion();
      return;
    }
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      currentIndex--;
      runQuestion();
      return;
    }
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    handleAdvance();
  }
}

function handleAdvance() {
  ensureAudio();
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

// ── Testing exports ────────────────────────────────────────────────────────

export { validateQuestions, validateImages };
export { showQuestion, showElimination, resetSides };
export const getState = () => state;
