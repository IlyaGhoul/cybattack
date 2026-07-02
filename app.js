const app = document.querySelector("#app");

const state = {
  quiz: null,
  answers: {},
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderShell(content) {
  app.innerHTML = content;
}

function renderSelector() {
  state.quiz = null;
  state.answers = {};

  const tiles = window.QUIZ_SETS.map(
    (quiz) => `
      <button class="quiz-tile" type="button" data-quiz-id="${quiz.id}">
        <span>
          <strong>${escapeHtml(quiz.title)}</strong>
          ${escapeHtml(quiz.subtitle)}
        </span>
        <span class="quiz-meta">${quiz.questions.length} вопросов</span>
      </button>
    `,
  ).join("");

  renderShell(`
    <section class="topbar">
      <div>
        <p class="eyebrow">Тренажёр</p>
        <h1>Тесты по информационным технологиям</h1>
        <p class="lead">УрФУ и ЮУрГУ, проверка по ключам, разбор ошибок после отправки.</p>
      </div>
    </section>
    <section class="quiz-grid" data-testid="quiz-selector">
      ${tiles}
    </section>
  `);
}

function renderQuestion(question) {
  const hint = question.hint ? `<p class="question-hint">${escapeHtml(question.hint)}</p>` : "";
  let control = "";

  if (question.type === "matching") {
    const options = question.options
      .map((option) => `<option value="${option.letter}">${option.letter}) ${escapeHtml(option.text)}</option>`)
      .join("");

    control = `
      <div class="matching-list">
        ${question.prompts
          .map(
            (prompt) => `
              <label class="matching-row">
                <span>${escapeHtml(prompt.text)}</span>
                <select name="q-${question.id}-${prompt.id}">
                  <option value="">—</option>
                  ${options}
                </select>
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  } else {
    const inputType = question.type === "multiple" ? "checkbox" : "radio";
    control = `
      <div class="answers">
        ${question.options
          .map(
            (option) => `
              <label class="answer-option">
                <input type="${inputType}" name="q-${question.id}" value="${option.letter}" />
                <span><span class="letter">${option.letter})</span> ${escapeHtml(option.text)}</span>
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  }

  return `
    <article class="question-card">
      <div class="question-head">
        <p class="question-number">Вопрос ${question.id}</p>
        ${hint}
      </div>
      <p class="question-text">${escapeHtml(question.text)}</p>
      ${control}
    </article>
  `;
}

function renderQuiz(quiz) {
  state.quiz = quiz;
  state.answers = {};

  renderShell(`
    <form data-testid="quiz-form">
      <section class="toolbar">
        <div class="toolbar-title">
          <h2>${escapeHtml(quiz.title)}</h2>
          <p>${escapeHtml(quiz.subtitle)}</p>
        </div>
        <div class="progress">${quiz.questions.length} вопросов</div>
      </section>
      <section class="question-list">
        ${quiz.questions.map(renderQuestion).join("")}
      </section>
      <div class="actions">
        <button class="button" type="submit" data-testid="submit-quiz">Проверить</button>
        <button class="button secondary" type="button" data-action="back">К выбору</button>
      </div>
    </form>
  `);
}

function collectAnswers(form, quiz) {
  const answers = {};

  for (const question of quiz.questions) {
    if (question.type === "multiple") {
      answers[question.id] = [...form.querySelectorAll(`input[name="q-${question.id}"]:checked`)].map(
        (input) => input.value,
      );
      continue;
    }

    if (question.type === "matching") {
      const value = {};

      for (const prompt of question.prompts) {
        const select = form.querySelector(`select[name="q-${question.id}-${prompt.id}"]`);
        if (select.value) {
          value[prompt.id] = select.value;
        }
      }

      answers[question.id] = value;
      continue;
    }

    const selected = form.querySelector(`input[name="q-${question.id}"]:checked`);
    answers[question.id] = selected ? selected.value : undefined;
  }

  return answers;
}

function getQuestionById(quiz, id) {
  return quiz.questions.find((question) => question.id === id);
}

function renderReview(result) {
  const question = getQuestionById(state.quiz, result.questionId);
  const status = result.isCorrect ? "Верно" : "Ошибка";
  const statusClass = result.isCorrect ? "correct" : "incorrect";

  return `
    <article class="result-card ${statusClass}">
      <p class="result-status">${status}</p>
      <p class="question-text">Вопрос ${question.id}. ${escapeHtml(question.text)}</p>
      <div class="answer-review">
        <span><b>Ваш ответ:</b> ${escapeHtml(result.actual)}</span>
        <span><b>Правильный ответ:</b> ${escapeHtml(result.expected)}</span>
      </div>
    </article>
  `;
}

function renderResults(summary) {
  const incorrect = summary.results.filter((result) => !result.isCorrect);
  const reviewItems = incorrect.length === 0 ? summary.results : incorrect;
  const reviewTitle = incorrect.length === 0 ? "Все ответы верные" : "Ошибки и пропуски";
  const reviewNote =
    incorrect.length === 0
      ? "Можно пройти другой пробник."
      : `${incorrect.length} из ${summary.totalCount} требуют повторения.`;

  renderShell(`
    <section class="summary-panel" data-testid="result-panel">
      <div>
        <p class="eyebrow">Результат</p>
        <div class="score" data-testid="score">${summary.correctCount} из ${summary.totalCount}</div>
        <p class="review-note">${escapeHtml(state.quiz.title)}</p>
      </div>
      <div class="score-percent" data-testid="score-percent">${summary.percent}%</div>
    </section>
    <section class="topbar">
      <div>
        <h2>${reviewTitle}</h2>
        <p class="lead">${reviewNote}</p>
      </div>
      <div class="actions">
        <button class="button" type="button" data-action="retry">Повторить</button>
        <button class="button secondary" type="button" data-testid="reset-quiz" data-action="reset">К выбору</button>
      </div>
    </section>
    <section class="review-list">
      ${reviewItems.map(renderReview).join("")}
    </section>
  `);
}

app.addEventListener("click", (event) => {
  const quizButton = event.target.closest("[data-quiz-id]");
  if (quizButton) {
    const quiz = window.QUIZ_SETS.find((item) => item.id === quizButton.dataset.quizId);
    renderQuiz(quiz);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "back" || action === "reset") {
    renderSelector();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "retry" && state.quiz) {
    renderQuiz(state.quiz);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

app.addEventListener("submit", (event) => {
  event.preventDefault();
  state.answers = collectAnswers(event.target, state.quiz);
  renderResults(window.QuizEngine.gradeQuiz(state.quiz.questions, state.answers));
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderSelector();
