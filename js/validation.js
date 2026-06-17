export async function validateImages(qs, imagesBase = 'questions/') {
  const checks = [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const n = `Spørgsmål ${i + 1}`;
    for (const side of ['a', 'b']) {
      if (q[side]?.image?.path) {
        const url = `${imagesBase}${q[side].image.path}`;
        const path = q[side].image.path;
        const label = `${n} - svar ${side.toUpperCase()}`;
        checks.push(
          fetch(url, { method: 'HEAD' })
            .then(res => res.ok ? null : `${label}: billedet "${path}" blev ikke fundet`)
            .catch(() => `${label}: kunne ikke tjekke billedet "${path}"`)
        );
      }
    }
  }
  const results = await Promise.all(checks);
  return results.filter(Boolean);
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
    if (q.questionNo === undefined) {
      errors.push(`${n}: mangler questionNo`);
    } else if (!Number.isInteger(q.questionNo) || q.questionNo !== i + 1) {
      errors.push(`${n}: questionNo skal være ${i + 1}, men er ${q.questionNo}`);
    }
  });
  return errors;
}
