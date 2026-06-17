export async function validateImages(qs, imagesBase = 'questions/') {
  const errors = [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const n = `Spørgsmål ${i + 1}`;
    for (const side of ['a', 'b']) {
      if (q[side]?.image) {
        const url = `${imagesBase}${q[side].image}`;
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

export function validateQuestions(qs) {
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
