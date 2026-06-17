import { describe, it, expect } from 'vitest';
import { validateQuestions } from '../app.js';

const valid = { questionNo: 1, question: 'Q?', a: { answer: 'A', correct: true }, b: { answer: 'B' } };

describe('validateQuestions', () => {
  it('returns no errors for a valid question', () => {
    expect(validateQuestions([valid])).toEqual([]);
  });

  it('accepts correct on side B', () => {
    const q = { questionNo: 1, question: 'Q?', a: { answer: 'A' }, b: { answer: 'B', correct: true } };
    expect(validateQuestions([q])).toEqual([]);
  });

  it('errors on missing question text', () => {
    const q = { questionNo: 1, a: { answer: 'A', correct: true }, b: { answer: 'B' } };
    const errors = validateQuestions([q]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/spørgsmålstekst/);
  });

  it('errors on missing answer A', () => {
    const q = { questionNo: 1, question: 'Q?', a: {}, b: { answer: 'B', correct: true } };
    expect(validateQuestions([q])).toHaveLength(1);
  });

  it('errors on missing answer B', () => {
    const q = { questionNo: 1, question: 'Q?', a: { answer: 'A', correct: true }, b: {} };
    expect(validateQuestions([q])).toHaveLength(1);
  });

  it('errors when no answer is marked correct', () => {
    const q = { questionNo: 1, question: 'Q?', a: { answer: 'A' }, b: { answer: 'B' } };
    const errors = validateQuestions([q]);
    expect(errors.some(e => e.includes('korrekt'))).toBe(true);
  });

  it('errors when both answers are marked correct', () => {
    const q = { questionNo: 1, question: 'Q?', a: { answer: 'A', correct: true }, b: { answer: 'B', correct: true } };
    const errors = validateQuestions([q]);
    expect(errors.some(e => e.includes('begge'))).toBe(true);
  });

  it('accumulates errors across multiple questions', () => {
    const bad = { a: {}, b: {} };
    const errors = validateQuestions([bad, bad]);
    expect(errors.some(e => e.startsWith('Spørgsmål 1'))).toBe(true);
    expect(errors.some(e => e.startsWith('Spørgsmål 2'))).toBe(true);
  });

  it('errors on missing questionNo', () => {
    const q = { question: 'Q?', a: { answer: 'A', correct: true }, b: { answer: 'B' } };
    const errors = validateQuestions([q]);
    expect(errors.some(e => e.includes('questionNo'))).toBe(true);
  });

  it('errors when questionNo is out of sequence', () => {
    const q = { questionNo: 2, question: 'Q?', a: { answer: 'A', correct: true }, b: { answer: 'B' } };
    const errors = validateQuestions([q]);
    expect(errors.some(e => e.includes('questionNo'))).toBe(true);
  });

  it('errors when questionNo is not an integer', () => {
    const q = { questionNo: '1', question: 'Q?', a: { answer: 'A', correct: true }, b: { answer: 'B' } };
    const errors = validateQuestions([q]);
    expect(errors.some(e => e.includes('questionNo'))).toBe(true);
  });

  it('accepts sequential questionNo across multiple questions', () => {
    const q1 = { questionNo: 1, question: 'Q1?', a: { answer: 'A', correct: true }, b: { answer: 'B' } };
    const q2 = { questionNo: 2, question: 'Q2?', a: { answer: 'A' }, b: { answer: 'B', correct: true } };
    expect(validateQuestions([q1, q2])).toEqual([]);
  });
});
