import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { init, getState } from '../app.js';

// Minimal DOM matching index.html
const HTML = `
  <div id="side-a" class="side">
    <div class="side-bg"></div>
    <div class="answer-label">A</div>
    <div class="answer-text"></div>
    <div class="funfact-text hidden"></div>
  </div>
  <div id="divider">
    <div id="sword">⚔</div>
    <div id="timer-circle"><div id="timer-number">15</div></div>
  </div>
  <div id="side-b" class="side">
    <div class="side-bg"></div>
    <div class="answer-label">B</div>
    <div class="answer-text"></div>
    <div class="funfact-text hidden"></div>
  </div>
  <div id="skull-a" class="skull-icon hidden">☠</div>
  <div id="skull-b" class="skull-icon hidden">☠</div>
  <div id="question-text"></div>
  <div id="timer-bar"><div id="timer-fill"></div></div>
  <div id="overlay" class="hidden"><div id="overlay-message"></div></div>
`;

const SAMPLE_QUESTION = {
  question: 'Hvad er 2 + 2?',
  a: { answer: '5' },
  b: { answer: '4', correct: true, funfact: 'Det er altid 4!' },
};

// Mock AudioContext before module runs
const mockGain = {
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
};
const mockOsc = {
  type: '',
  frequency: {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
};
const mockFilter = {
  type: '',
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  Q: { value: 0 },
  connect: vi.fn(),
};
const mockBuffer = { getChannelData: vi.fn(() => new Float32Array(100)) };
const mockBufferSource = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
const mockCtx = {
  state: 'running',
  currentTime: 0,
  destination: {},
  sampleRate: 44100,
  createGain: vi.fn(() => mockGain),
  createOscillator: vi.fn(() => mockOsc),
  createBiquadFilter: vi.fn(() => mockFilter),
  createBuffer: vi.fn(() => mockBuffer),
  createBufferSource: vi.fn(() => mockBufferSource),
  resume: vi.fn(),
};
global.AudioContext = vi.fn(() => mockCtx);
global.webkitAudioContext = vi.fn(() => mockCtx);

function pressSpace() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
}

describe('state machine — full question flow', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    document.body.innerHTML = HTML;

    global.fetch = vi.fn((url) => {
      // HEAD requests for image validation return ok
      if (url.includes('images/')) return Promise.resolve({ ok: true });
      // questions fetch
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([SAMPLE_QUESTION]),
      });
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('starts at INTRO after init', async () => {
    const initP = init();
    await vi.runAllTimersAsync();
    await initP;

    expect(getState()).toBe('INTRO');
    expect(document.getElementById('overlay').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('overlay-message').innerHTML).toContain('NINJA QUIZ');
  });

  it('moves to WAIT_FOR_MASTER after Space + countdown', async () => {
    pressSpace(); // advance from INTRO → runQuestion → COUNTDOWN
    await vi.runAllTimersAsync();

    expect(getState()).toBe('WAIT_FOR_MASTER');
    // Question text should be rendered
    expect(document.getElementById('question-text').textContent).toBe(SAMPLE_QUESTION.question);
  });

  it('moves through REVEAL and ELIMINATION to NEXT after second Space', async () => {
    pressSpace(); // drop sword
    await vi.runAllTimersAsync();

    expect(getState()).toBe('NEXT');
    // Wrong side (A) should be eliminated
    expect(document.getElementById('side-a').classList.contains('eliminated')).toBe(true);
    expect(document.getElementById('side-b').classList.contains('correct')).toBe(true);
  });

  it('shows winner screen after Space on last question', async () => {
    pressSpace();
    await vi.runAllTimersAsync();

    expect(getState()).toBe('WINNER');
    expect(document.getElementById('overlay-message').innerHTML).toContain('VINDER');
  });

  it('returns to INTRO on Space from WINNER', async () => {
    pressSpace();
    await vi.runAllTimersAsync();

    expect(getState()).toBe('INTRO');
  });

  it('R key restarts from INTRO at any point', async () => {
    // Advance into a question
    pressSpace();
    await vi.runAllTimersAsync();
    expect(getState()).toBe('WAIT_FOR_MASTER');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'R', bubbles: true }));
    await vi.runAllTimersAsync();

    expect(getState()).toBe('INTRO');
  });
});
