# Ninja Quiz — Coding Pirates Viborg/Bjerringbro

En storskærms-quiz hvor deltagerne fordeler sig fysisk til venstre (A) eller højre (B). Nedtælling → ninja-sværd skærer ned gennem midten → forkert side elimineres → gentages til én vinder.

---

## Start

```bash
python3 -m http.server 8080
```

Åbn derefter `http://localhost:8080` i browseren.

**URL-parametre:**

| Parameter | Effekt |
|---|---|
| `?mode=testing` | Nedtælling forkortes til 2 sekunder |
| `?question=sample` | Bruger `questions-SAMPLE.json` i stedet for `questions.json` |

Kombiner begge for fuld testmode:
```
http://localhost:8080?mode=testing&question=sample
```

---

## Keyboard

| Tast | Handling |
|---|---|
| `Space` / `Enter` | Start quiz · Aktiver sværd (fra WAIT_FOR_MASTER) · Næste spørgsmål |
| `R` | Genstart fra spørgsmål 1 |
| `F` | Fullscreen til/fra |

Sværdet aktiveres **kun manuelt** — quiz-masteren trykker Space når alle deltagere er på plads.

---

## Spørgsmålsfiler

| Fil | Brug |
|---|---|
| `questions/questions.json` | Produktionsspørgsmål |
| `questions/questions-SAMPLE.json` | Testspørgsmål (`?question=sample`) |

### Format

```json
[
  {
    "question": "Spørgsmålstekst?",
    "a": {
      "answer": "Svar A",
      "image": "images/filnavn.jpeg",
      "funfact": "Vises på den korrekte side efter afsløringen.",
      "correct": true
    },
    "b": {
      "answer": "Svar B",
      "image": "images/filnavn.jpeg"
    }
  }
]
```

- `correct: true` sættes på præcis ét af de to svar
- `image` er valgfri — sti relativt til `questions/`-mappen
- `funfact` er valgfri — vises under svaret på den korrekte side efter sværdanimationen

Billeder lægges i `questions/images/`.

---

## Fejlfinding

| Problem | Løsning |
|---|---|
| Blank fejlskærm ved opstart | Start Python-serveren — fetch virker ikke fra `file://` |
| Billede vises ikke | Tjek stien i `questions.json` — den skal være relativ til `questions/`, fx `images/filnavn.jpeg` |
| Ingen lyd | Genstart browseren — Web Audio API kræver en frisk browsersession første gang |
