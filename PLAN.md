# Ninja Quiz — Implementeringsplan

## Kontekst

Coding Pirates Viborg/Bjerringbro afslutning. En "ninja quiz" hvor alle deltagere (pirater, forældre, frivillige) starter samlet. For hvert spørgsmål er der to svarmuligheder — deltagerne fordeler sig fysisk til venstre (A) eller højre (B) foran storskærmen. Nedtælling → ninja-sværd skærer ned gennem midten → forkert side "dør" dramatisk → gentages til én vinder.

Prototype: 2 spørgsmål, kører lokalt i browser.

---

## Fil-struktur

```
cpvbffa-2026/
  index.html              — app-shell, statisk DOM
  style.css               — arcade/pirat/ninja tema
  app.js                  — parser, state machine, animationer
  README.md
  PLAN.md                 — denne fil
  questions/
    questions.json        — spørgsmålskonfiguration
    images/               — valgfrie baggrundsbilleder
      answer-a-q1.png
      answer-b-q1.png
      ...
```

Python-serveren startes fra **projekt-roden**:
```
python3 -m http.server 8080
```
Åbn derefter `http://localhost:8080` i browseren.

`QUESTIONS_URL` i `app.js` peger på `http://localhost:8080/questions/questions.json`.

Billeder refereres i `questions.json` relativt til `questions/`-mappen, f.eks. `"billede-a": "images/answer-a-q1.png"`. Den fulde fetch-URL bliver `http://localhost:8080/questions/images/answer-a-q1.png`.

---

## Spørgsmålsformat (questions.json)

```json
[
  {
    "question": "Eksempel: Stå til venstre for A, højre for B!",
    "a": {
      "answer": "Tror du det er dét her svar"
    },
    "b": {
      "answer": "Det kan jo også være det her svar!",
      "correct": true
    }
  },
  {
    "question": "Hvad hedder den mest populære programmerings-hjælpeside?",
    "a": {
      "answer": "Stack Underflow",
      "image": "images/stack-underflow.png"
    },
    "b": {
      "answer": "Stack Overflow",
      "image": "images/stack-overflow.png",
      "correct": true
    }
  }
]
```

- `correct` er valgfri og defaults til `false` — sættes på præcis én af de to sider
- `image` er valgfri — udelades hvis ingen baggrundsbillede ønskes
- Parsing er blot `res.json()`, ingen custom parser

I `app.js` afgøres den korrekte side med: `q.a.correct === true ? 'a' : 'b'`

### Validering ved opstart

Efter `res.json()` køres `validateQuestions(questions)` før `showIntro()`. Fejler validering, vises fejlside med præcis besked i stedet for quizzen.

Regler der valideres pr. spørgsmål (med indeks i fejlbesked, f.eks. "Spørgsmål 2"):

| Regel | Fejlbesked |
|---|---|
| Ingen af `a.correct` / `b.correct` er `true` | "Intet svar er markeret som korrekt" |
| Både `a.correct` og `b.correct` er `true` | "Begge svar er markeret som korrekte" |
| `question` mangler eller er tom streng | "Mangler spørgsmålstekst" |
| `a.answer` eller `b.answer` mangler eller er tom | "Mangler svartekst for A/B" |

```js
function validateQuestions(qs) {
  const errors = [];
  qs.forEach((q, i) => {
    const n = `Spørgsmål ${i + 1}`;
    if (!q.question)        errors.push(`${n}: mangler spørgsmålstekst`);
    if (!q.a?.answer)       errors.push(`${n}: mangler svartekst for A`);
    if (!q.b?.answer)       errors.push(`${n}: mangler svartekst for B`);
    const correctCount = [q.a?.correct, q.b?.correct].filter(Boolean).length;
    if (correctCount === 0) errors.push(`${n}: intet svar er markeret som korrekt`);
    if (correctCount > 1)   errors.push(`${n}: begge svar er markeret som korrekte`);
  });
  return errors; // tomt array = OK
}
```

Fejlsiden viser alle fejl samlet (ikke bare den første), så man kan rette dem alle på én gang.

---

## Indlæsning af questions.json

Kræver lokal HTTP-server (fetch blokeres fra `file://` i Chrome).

`app.js` fetcher fra `http://localhost:8080/questions/questions.json` og parser svaret med `JSON.parse()` (hardcodet konstant `QUESTIONS_URL` øverst i filen — gøres konfigurerbar i en senere version).

Ingen inline JS-fallback. Hvis fetch fejler, vises en fejlside med en forklarende besked, f.eks.:
> "Kunne ikke hente questions.json — er python-serveren startet? Kør: python3 -m http.server 8080"

---

## DOM-struktur (index.html)

```html
<div id="arena">
  <div id="side-a" class="side">
    <div class="side-bg"></div>
    <div class="answer-label">A</div>
    <div class="answer-text"></div>
  </div>
  <div id="divider">
    <div id="sword"></div>
  </div>
  <div id="side-b" class="side">
    <div class="side-bg"></div>
    <div class="answer-label">B</div>
    <div class="answer-text"></div>
  </div>
</div>

<div id="hud">
  <div id="question-text"></div>
  <div id="timer-bar">
    <div id="timer-fill"></div>
    <div id="timer-number">10</div>
  </div>
</div>

<div id="overlay">
  <div id="overlay-message"></div>
</div>
```

HUD sidder `position: fixed` øverst. Arena fylder 100vh nedenunder. Divider er en vertikal linje i midten som sværdet animeres ned langs.

---

## State machine

`INTRO → QUESTION → COUNTDOWN → WAIT_FOR_MASTER → REVEAL → ELIMINATION → NEXT` (loop) `→ WINNER`

| State | Beskrivelse |
|---|---|
| **INTRO** | Velkomstskærm — klik/Space for at starte |
| **QUESTION** | Spørgsmål + svar vises, baggrunde sættes |
| **COUNTDOWN** | 10s nedtælling (konfigurerbar i v2), timer-bar shrinks, tal pulserer |
| **WAIT_FOR_MASTER** | Timer blinker + sirene lyder. Venter på Space/Enter fra quiz-master |
| **REVEAL** | Sværd-animation falder ned langs divider |
| **ELIMINATION** | Forkert side: shake + fade-out. Korrekt side: gold glow |
| **NEXT** | Space/Enter → næste spørgsmål eller WINNER |
| **WINNER** | Fuld skærm "VINDER!" med festlig effekt |

Transitions via `async/await` + `setTimeout` wrapped i Promises.

---

## Animationer

### Nedtælling
- `#timer-fill` width: 100% → 0% via CSS `transition` over 10s
- Hvert sekund: JS tilføjer `.tick` class → `@keyframes tick-pulse` pulserer tallet

```css
@keyframes tick-pulse {
  0%   { transform: scale(1.4); color: #ff4444; }
  100% { transform: scale(1);   color: inherit; }
}
```

### Timer udløbet — blink + sirene
- CSS class `.expired` på `#timer-number` → blinker via `@keyframes blink`
- Sirene med Web Audio API (`AudioContext`): kort stigende tone (~0.5s)

### Ninja-sværd slice
```css
@keyframes sword-drop {
  0%   { transform: translateY(-100px); opacity: 1; }
  100% { transform: translateY(100vh);  opacity: 1; }
}
```
Sværdet (SVG eller ⚔ Unicode) positioneres på `#divider` og animeres ned. Divider-linjen flasher hvid `box-shadow` ved impact.

### Eliminering (forkert side)
```css
@keyframes eliminate {
  0%   { transform: translateX(0) scale(1); opacity: 1; filter: none; }
  20%  { transform: translateX(-8px); filter: brightness(2) saturate(0); }
  60%  { transform: translateX(8px);  filter: brightness(0.5) saturate(0); }
  100% { transform: translateX(-30px) scale(0.95); opacity: 0; }
}
```

### Korrekt side
```css
@keyframes winner-pulse {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(1.4) drop-shadow(0 0 20px gold); }
}
```

---

## Visuelt design (style.css)

**Farvepalette:**
| Navn | Hex | Brug |
|---|---|---|
| Baggrund | `#0a0a0f` | Body |
| Side A default | `#1a0a2e` | Venstre side (mørk lilla) |
| Side B default | `#0a1a2e` | Højre side (mørk marineblå) |
| Guld/korrekt | `#ffd700` | Divider, correct side glow |
| Elimineret | `#ff2244` | Wrong side flash |
| Tekst | `#f0e6cc` | Pergament-hvid |

**Typografi:**
- Primær: `'Press Start 2P'` fra Google Fonts (kræver internet)
- Fallback: `'Courier New', Courier, monospace` med `letter-spacing: 2px; text-transform: uppercase`

**Pirat/ninja-vibe:**
- Dekorative Unicode-tegn via CSS `content:`: `☠ ⚓ ⚔`
- Subtle baggrundsmønster med `linear-gradient` stripes (plankeeffekt)

**Layout:**
```css
body    { margin: 0; overflow: hidden; background: #0a0a0f; }
#arena  { display: flex; height: 100vh; }
.side   { flex: 1; position: relative; overflow: hidden; }
#hud    { position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(0,0,0,0.85); padding: 16px; text-align: center; }
#divider{ position: absolute; left: 50%; top: 0; bottom: 0; width: 4px;
          background: #ffd700; z-index: 50; transform: translateX(-50%); }
```

---

## Presenter-kontroller (keyboard)

| Tast | Handling |
|---|---|
| `Space` / `Enter` | Gå videre: intro→start, aktiver sværd (fra WAIT_FOR_MASTER), næste spørgsmål |
| `R` | Genstart fra første spørgsmål |
| `F` | Toggle fullscreen (`document.documentElement.requestFullscreen()`) |

Sværdet aktiveres **kun manuelt** — countdown-udløb sætter app i `WAIT_FOR_MASTER` (timer blinker + sirene). Quiz-master trykker Space/Enter når alle deltagere er på plads.

---

## app.js struktur

```js
const QUESTIONS_URL = 'http://localhost:8080/questions/questions.txt';

let questions = [];
let currentIndex = 0;
let state = 'IDLE';

// Entry point
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const res = await fetch(QUESTIONS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    questions = await res.json();
    showIntro();
  } catch (err) {
    showError(err);
  }
}

// Ingen custom parser — blot:
// questions = JSON.parse(responseText);

function showError(err) { /* vis fejlskærm med besked */ }
function showIntro() { /* velkomstskærm */ }
function showQuestion(q) { /* populate DOM */ }
function startCountdown() { /* returnerer Promise der resolver ved 0 */ }
function waitForMaster() { /* returnerer Promise der resolver ved Space/Enter */ }
function showReveal(q) { /* starter sværd-animation */ }
function animateSword() { /* returnerer Promise */ }
function showElimination(q) { /* trigger CSS animations */ }
function showWinner() { /* winner-skærm */ }
function playSiren() { /* Web Audio API tone */ }
```

Async flow bruger `async/await` med `setTimeout`/event-listeners wrapped i Promises — lineær og læsbar logik.

---

## Verificering

1. Start server fra projekt-rod: `python3 -m http.server 8080`
2. Åbn `http://localhost:8080` — bekræft velkomstskærm vises
3. Tryk Space — bekræft spørgsmål + A/B tekster vises korrekt
4. Bekræft timer tæller 10→0, bar shrinks, tal pulserer hvert sekund
5. **Ved 0:** bekræft timer blinker + sirene lyder — sværd starter IKKE
6. Tryk Space — bekræft sværd-animation spiller ned langs midterlinjen
7. Bekræft forkert side shaker + forsvinder; korrekt side glower guld
8. Tryk Space → næste spørgsmål loader
9. Bekræft WINNER-skærm vises efter 2. spørgsmål
10. Test `F` (fullscreen) og `R` (genstart fra spørgsmål 1)
11. Fejltest: stop python-serveren og genindlæs → bekræft fejlside med forklarende besked
12. Billedtest: tilføj `"billede-a": "images/test.png"` i `questions.json` og læg en fil i `questions/images/` — bekræft den bruges som baggrund
13. Test ved 1920×1080 — intet overflow
