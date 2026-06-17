export function showQuestion(q, imagesBase = 'questions/') {
  document.getElementById('question-text').textContent = q.question;

  document.querySelector('#side-a .answer-text').textContent = q.a.answer;
  document.querySelector('#side-b .answer-text').textContent = q.b.answer;

  const bgA = document.querySelector('#side-a .side-bg');
  const bgB = document.querySelector('#side-b .side-bg');
  bgA.style.backgroundImage = q.a.image?.path ? `url('${imagesBase}${q.a.image.path}')` : '';
  bgB.style.backgroundImage = q.b.image?.path ? `url('${imagesBase}${q.b.image.path}')` : '';
  document.querySelector('#side-a .answer-text').classList.toggle('has-bg', !!q.a.image?.path);
  document.querySelector('#side-b .answer-text').classList.toggle('has-bg', !!q.b.image?.path);
}

export function showElimination(q) {
  const correctSide = q.a.correct === true ? 'a' : 'b';
  const wrongSide   = correctSide === 'a' ? 'b' : 'a';

  document.getElementById(`side-${wrongSide}`).classList.add('eliminated');
  document.getElementById(`side-${correctSide}`).classList.add('correct');

  setTimeout(() => {
    const skull = document.getElementById(`skull-${wrongSide}`);
    skull.classList.remove('hidden');
    skull.classList.add('visible');

    const funfact = q[correctSide]?.funfact;
    if (funfact) {
      const el = document.querySelector(`#side-${correctSide} .funfact-text`);
      el.textContent = `💡 ${funfact}`;
      el.classList.remove('hidden');
      el.classList.add('visible');
    }
  }, 850);
}

export function resetSides(countdownSec = 15) {
  ['a', 'b'].forEach(s => {
    const el = document.getElementById(`side-${s}`);
    el.classList.remove('eliminated', 'correct');
    el.querySelector('.answer-text').textContent = '';
    el.querySelector('.side-bg').style.backgroundImage = '';
    const skull = document.getElementById(`skull-${s}`);
    skull.classList.add('hidden');
    skull.classList.remove('visible');
    const funfact = el.querySelector('.funfact-text');
    funfact.textContent = '';
    funfact.classList.add('hidden');
    funfact.classList.remove('visible');
  });
  document.getElementById('sword').classList.remove('dropping');

  const fill = document.getElementById('timer-fill');
  fill.style.transition = 'none';
  fill.style.width = '100%';

  const number = document.getElementById('timer-number');
  number.textContent = countdownSec;
  number.classList.remove('tick', 'expired');
}

export function showOverlay() {
  document.getElementById('overlay').classList.remove('hidden');
}

export function hideOverlay() {
  const el = document.getElementById('overlay');
  el.classList.add('hidden');
  el.classList.remove('next-prompt');
}

export function showTimerBar() {
  document.getElementById('timer-bar').style.display = '';
  document.getElementById('timer-circle').style.display = '';
}

export function hideTimerBar() {
  document.getElementById('timer-bar').style.display = 'none';
  document.getElementById('timer-circle').style.display = 'none';
}

export function timerExpired() {
  const number = document.getElementById('timer-number');
  number.classList.remove('tick');
  number.classList.add('expired');
}
