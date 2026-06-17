import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showQuestion, showElimination, resetSides } from '../app.js';

const HTML = `
  <div id="side-a" class="side">
    <div class="side-bg"></div>
    <div class="answer-text"></div>
    <div class="funfact-text hidden"></div>
  </div>
  <div id="side-b" class="side">
    <div class="side-bg"></div>
    <div class="answer-text"></div>
    <div class="funfact-text hidden"></div>
  </div>
  <div id="skull-a" class="skull-icon hidden">☠</div>
  <div id="skull-b" class="skull-icon hidden">☠</div>
  <div id="question-text"></div>
  <div id="timer-bar"></div>
  <div id="timer-circle"></div>
  <div id="timer-fill" style="width:100%"></div>
  <div id="timer-number">15</div>
  <div id="sword"></div>
  <div id="divider"></div>
  <div id="overlay" class="hidden"><div id="overlay-message"></div></div>
`;

beforeEach(() => {
  document.body.innerHTML = HTML;
});

describe('showQuestion', () => {
  it('sets question text', () => {
    showQuestion({ question: 'Hvad er 2+2?', a: { answer: 'Fire' }, b: { answer: 'Fem' } });
    expect(document.getElementById('question-text').textContent).toBe('Hvad er 2+2?');
  });

  it('sets answer text for both sides', () => {
    showQuestion({ question: 'Q?', a: { answer: 'Svar A' }, b: { answer: 'Svar B' } });
    expect(document.querySelector('#side-a .answer-text').textContent).toBe('Svar A');
    expect(document.querySelector('#side-b .answer-text').textContent).toBe('Svar B');
  });

  it('sets background image when provided', () => {
    showQuestion({ question: 'Q?', a: { answer: 'A', image: 'images/test.jpg' }, b: { answer: 'B' } });
    expect(document.querySelector('#side-a .side-bg').style.backgroundImage).toContain('images/test.jpg');
  });

  it('clears background image when no image is provided', () => {
    showQuestion({ question: 'Q?', a: { answer: 'A' }, b: { answer: 'B' } });
    expect(document.querySelector('#side-a .side-bg').style.backgroundImage).toBe('');
    expect(document.querySelector('#side-b .side-bg').style.backgroundImage).toBe('');
  });

  it('adds has-bg class when image is present', () => {
    showQuestion({ question: 'Q?', a: { answer: 'A', image: 'img/a.jpg' }, b: { answer: 'B' } });
    expect(document.querySelector('#side-a .answer-text').classList.contains('has-bg')).toBe(true);
    expect(document.querySelector('#side-b .answer-text').classList.contains('has-bg')).toBe(false);
  });
});

describe('showElimination', () => {
  it('marks correct and eliminated sides when A is correct', () => {
    showElimination({ a: { correct: true }, b: {} });
    expect(document.getElementById('side-a').classList.contains('correct')).toBe(true);
    expect(document.getElementById('side-b').classList.contains('eliminated')).toBe(true);
  });

  it('marks correct and eliminated sides when B is correct', () => {
    showElimination({ a: {}, b: { correct: true } });
    expect(document.getElementById('side-b').classList.contains('correct')).toBe(true);
    expect(document.getElementById('side-a').classList.contains('eliminated')).toBe(true);
  });

  it('shows skull on the wrong side after delay', () => {
    vi.useFakeTimers();
    showElimination({ a: { correct: true }, b: {} });
    vi.advanceTimersByTime(1000);
    const skull = document.getElementById('skull-b');
    expect(skull.classList.contains('hidden')).toBe(false);
    expect(skull.classList.contains('visible')).toBe(true);
    vi.useRealTimers();
  });

  it('shows funfact on correct side after delay', () => {
    vi.useFakeTimers();
    showElimination({ a: { correct: true, funfact: 'Interessant!' }, b: {} });
    vi.advanceTimersByTime(1000);
    const funfact = document.querySelector('#side-a .funfact-text');
    expect(funfact.textContent).toBe('💡 Interessant!');
    expect(funfact.classList.contains('visible')).toBe(true);
    vi.useRealTimers();
  });

  it('does not show funfact when none is provided', () => {
    vi.useFakeTimers();
    showElimination({ a: { correct: true }, b: {} });
    vi.advanceTimersByTime(1000);
    const funfact = document.querySelector('#side-a .funfact-text');
    expect(funfact.textContent).toBe('');
    vi.useRealTimers();
  });
});

describe('resetSides', () => {
  it('removes eliminated and correct classes', () => {
    document.getElementById('side-a').classList.add('eliminated');
    document.getElementById('side-b').classList.add('correct');
    resetSides();
    expect(document.getElementById('side-a').classList.contains('eliminated')).toBe(false);
    expect(document.getElementById('side-b').classList.contains('correct')).toBe(false);
  });

  it('clears answer text', () => {
    document.querySelector('#side-a .answer-text').textContent = 'Old answer';
    resetSides();
    expect(document.querySelector('#side-a .answer-text').textContent).toBe('');
  });

  it('clears background images', () => {
    document.querySelector('#side-a .side-bg').style.backgroundImage = "url('img/a.jpg')";
    resetSides();
    expect(document.querySelector('#side-a .side-bg').style.backgroundImage).toBe('');
  });

  it('hides skulls', () => {
    const skull = document.getElementById('skull-a');
    skull.classList.remove('hidden');
    skull.classList.add('visible');
    resetSides();
    expect(skull.classList.contains('hidden')).toBe(true);
    expect(skull.classList.contains('visible')).toBe(false);
  });

  it('clears and hides funfact text', () => {
    const funfact = document.querySelector('#side-a .funfact-text');
    funfact.textContent = '💡 Some fact';
    funfact.classList.remove('hidden');
    funfact.classList.add('visible');
    resetSides();
    expect(funfact.textContent).toBe('');
    expect(funfact.classList.contains('visible')).toBe(false);
    expect(funfact.classList.contains('hidden')).toBe(true);
  });

  it('removes the dropping class from sword', () => {
    document.getElementById('sword').classList.add('dropping');
    resetSides();
    expect(document.getElementById('sword').classList.contains('dropping')).toBe(false);
  });
});
