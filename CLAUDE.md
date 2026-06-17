# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tests

```bash
npm test                                          # run all tests once
npm run test:watch                                # watch mode
npx vitest run tests/validateQuestions.test.js   # single file
```

Test files live in `tests/`. The suite uses Vitest + jsdom (no browser needed).

## Running the app

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

Test mode (uses `questions/questions-SAMPLE.json`, 2s countdown instead of 15s):
```
http://localhost:8080?mode=testing
```

The app must be served over HTTP — `file://` won't work because `fetch()` is used to load questions.

## Architecture

Single-page vanilla JS app with no build step, no framework, no dependencies.

- `index.html` — layout with two side panels (A/B), sword/divider overlay, timer bar, and a central overlay for state messages
- `app.js` — all game logic as a state machine with states: `IDLE → INTRO → QUESTION → COUNTDOWN → WAIT_FOR_MASTER → REVEAL → ELIMINATION → NEXT → WINNER`
- `style.css` — all styling and animations (sword drop, elimination flash, skull reveal, funfact fade-in)
- `js/audio.js` — Web Audio API synthesis (countdown music, siren); exports `ensureAudio`, `startCountdown`, `stopCountdown`, `playSiren`
- `js/dom.js` — DOM updates; exports `showQuestion`, `showIntro`, `showValidationError`, `showFetchError`, etc.
- `js/utils.js` — shared helpers; exports `sleep`, `toggleFullscreen`
- `js/validation.js` — startup validation; exports `validateQuestions`, `validateImages`
- `questions/questions.json` — production questions; `questions/questions-SAMPLE.json` — test questions
- `questions/images/` — images referenced in question JSON (paths are relative to `questions/`)

## State machine flow

Each question goes through: show question → 15s countdown with music → siren plays → quiz master presses Space to drop sword → sword animation → wrong side eliminated → funfact shown → Space for next question.

`masterResolve` is a Promise resolver that pauses execution until the quiz master presses Space in `WAIT_FOR_MASTER` state.

## Audio

All audio is synthesized via Web Audio API — no audio files. `ensureAudio()` must be called synchronously inside a user gesture (keydown) to satisfy browser autoplay policy.

## Question format

See README.md for the full question format. Validation runs on startup via `validateQuestions()` in `js/validation.js`.

## Deployment

Hosted on GitHub Pages. All fetch paths must be relative (no leading `/`) to work in subdirectory deployments.
