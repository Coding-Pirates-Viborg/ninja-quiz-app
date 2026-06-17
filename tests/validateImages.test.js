import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImages } from '../app.js';

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('validateImages', () => {
  it('returns no errors when all images respond OK', async () => {
    global.fetch.mockResolvedValue({ ok: true });
    const qs = [{ a: { answer: 'A', image: 'images/a.jpg', correct: true }, b: { answer: 'B' } }];
    expect(await validateImages(qs)).toEqual([]);
  });

  it('errors when image returns non-OK status', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    const qs = [{ a: { answer: 'A', image: 'images/a.jpg', correct: true }, b: { answer: 'B' } }];
    const errors = await validateImages(qs);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/ikke fundet/);
  });

  it('errors when fetch throws a network error', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    const qs = [{ a: { answer: 'A', image: 'images/a.jpg', correct: true }, b: { answer: 'B' } }];
    const errors = await validateImages(qs);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/ikke.*tjekke/);
  });

  it('skips sides with no image field', async () => {
    const qs = [{ a: { answer: 'A', correct: true }, b: { answer: 'B' } }];
    expect(await validateImages(qs)).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('checks images on both sides independently', async () => {
    global.fetch.mockResolvedValue({ ok: true });
    const qs = [{ a: { answer: 'A', image: 'images/a.jpg', correct: true }, b: { answer: 'B', image: 'images/b.jpg' } }];
    await validateImages(qs);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('reports the correct question number and side in the error', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    const qs = [
      { a: { answer: 'A', correct: true }, b: { answer: 'B' } },
      { a: { answer: 'A', correct: true }, b: { answer: 'B', image: 'images/b.jpg' } },
    ];
    const errors = await validateImages(qs);
    expect(errors[0]).toMatch(/Spørgsmål 2/);
    expect(errors[0]).toMatch(/B/);
  });
});
