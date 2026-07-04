const app = document.querySelector("#app");
const HISTORY_KEY = "cybattack-quiz-history-v2";

const state = {
  attempt: null,
  answers: {},
  history: loadHistory(),
  lastConfig: null,
  subject: "it",
  timerId: null,
  timerRemaining: null,
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

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return {
      recentQuestionIds: Array.isArray(parsed?.recentQuestionIds) ? parsed.recentQuestionIds : [],
      mistakeQuestionIds: Array.isArray(parsed?.mistakeQuestionIds) ? parsed.mistakeQuestionIds : [],
    };
  } catch {
    return window.QuizGenerator.createEmptyHistory();
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function scrollTop() {
  window.scrollTo({ top: 0, left: 0 });
}

function getUniversityTitle(university) {
  return university === "urfu" ? "УрФУ" : "ЮУрГУ";
}

function getSubjectConfig(subject = state.subject) {
  return window.QUIZ_SUBJECTS?.find((item) => item.id === subject) || window.QUIZ_SUBJECTS?.[0];
}

function getTopicList(subject, university) {
  return window.QUIZ_TOPICS_BY_SUBJECT?.[subject]?.[university] || window.QUIZ_TOPICS[university] || [];
}

function getTopicTitle(subject, university, topicId) {
  return getTopicList(subject || "it", university).find((topic) => topic.id === topicId)?.title || "Все темы";
}

function getExamCard(university) {
  const cards = {
    it: {
      urfu: {
        description: "Информационные технологии и сервисы.",
        meta: "30 вопросов",
      },
      susu: {
        description: "Информационные технологии.",
        meta: "20 минут · 20 вопросов",
      },
    },
    russian: {
      urfu: {
        description: "Русский язык: орфография, пунктуация, культура речи и текст.",
        meta: "17 заданий",
      },
      susu: {
        description: "Русский язык: 20 вопросов по всем разделам программы.",
        meta: "30 минут · 20 вопросов",
      },
    },
    programming: {
      urfu: {
        description: "Алгоритмы: технология программирования, блок-схемы, ветвления, циклы и массивы.",
        meta: "90 минут · 30 заданий",
      },
      susu: {
        description: "Основы программирования: алгоритмы, язык, массивы, функции, ООП, модули и отладка.",
        meta: "60 минут · 15 вопросов",
      },
    },
  };

  return cards[state.subject]?.[university] || cards.it[university];
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function renderModeSelector() {
  clearTimer();
  state.attempt = null;
  state.answers = {};
  const subject = getSubjectConfig();
  const subjectButtons = window.QUIZ_SUBJECTS.map(
    (item) => `
      <button class="button ${item.id === state.subject ? "" : "secondary"}" type="button" data-subject="${item.id}">
        ${escapeHtml(item.title)}
      </button>
    `,
  ).join("");

  renderShell(`
    <section class="topbar">
      <div>
        <p class="eyebrow">Тренажёр</p>
        <h1>${escapeHtml(subject.title)}</h1>
        <p class="lead">${escapeHtml(subject.lead)}</p>
      </div>
    </section>
    <section class="subject-strip" data-testid="subject-selector">
      ${subjectButtons}
    </section>
    <section class="quiz-grid" data-testid="mode-selector">
      <button class="quiz-tile" type="button" data-mode="exam">
        <span>
          <strong>Экзамен</strong>
          Случайный вариант в формате выбранного вуза.
        </span>
        <span class="quiz-meta">${escapeHtml(subject.examMeta)}</span>
      </button>
      <button class="quiz-tile" type="button" data-mode="topic">
        <span>
          <strong>Тренировка по темам</strong>
          Короткие наборы вопросов по слабым разделам.
        </span>
        <span class="quiz-meta">10 вопросов</span>
      </button>
    </section>
  `);
}

function renderExamSetup() {
  const subject = getSubjectConfig();
  const urfuCard = getExamCard("urfu");
  const susuCard = getExamCard("susu");

  renderShell(`
    <section class="topbar">
      <div>
        <p class="eyebrow">Экзамен · ${escapeHtml(subject.title)}</p>
        <h1>Выбери формат</h1>
        <p class="lead">Каждая попытка собирается заново из банка вопросов. Внутри попытки вопросы не повторяются.</p>
      </div>
    </section>
    <section class="quiz-grid">
      <button class="quiz-tile" type="button" data-start-exam="urfu">
        <span>
          <strong>УрФУ</strong>
          ${escapeHtml(urfuCard.description)}
        </span>
        <span class="quiz-meta">${escapeHtml(urfuCard.meta)}</span>
      </button>
      <button class="quiz-tile" type="button" data-start-exam="susu">
        <span>
          <strong>ЮУрГУ</strong>
          ${escapeHtml(susuCard.description)}
        </span>
        <span class="quiz-meta">${escapeHtml(susuCard.meta)}</span>
      </button>
    </section>
    <div class="actions">
      <button class="button secondary" type="button" data-action="reset">К выбору</button>
    </div>
  `);
}

function renderTopicSetup(selectedUniversity = "urfu") {
  const subject = getSubjectConfig();
  const topicOptions = getTopicList(state.subject, selectedUniversity)
    .map((topic) => `<option value="${topic.id}">${escapeHtml(topic.title)}</option>`)
    .join("");

  renderShell(`
    <section class="topbar">
      <div>
        <p class="eyebrow">Тренировка · ${escapeHtml(subject.title)}</p>
        <h1>Выбери тему</h1>
        <p class="lead">Короткий набор на 10 вопросов помогает быстро закрывать слабые места.</p>
      </div>
    </section>
    <section class="setup-panel" data-testid="topic-setup">
      <label>
        <span class="field-label">Вуз</span>
        <select data-testid="topic-university">
          <option value="urfu" ${selectedUniversity === "urfu" ? "selected" : ""}>УрФУ</option>
          <option value="susu" ${selectedUniversity === "susu" ? "selected" : ""}>ЮУрГУ</option>
        </select>
      </label>
      <label>
        <span class="field-label">Тема</span>
        <select data-testid="topic-select">${topicOptions}</select>
      </label>
      <button class="button" type="button" data-testid="start-topic">Начать тренировку</button>
      <button class="button secondary" type="button" data-action="reset">К выбору</button>
    </section>
  `);
}

function startAttempt(config) {
  clearTimer();
  state.lastConfig = { ...config };
  state.attempt = window.QuizGenerator.createAttempt(config, window.QUESTION_BANK, state.history);
  state.answers = {};
  renderQuiz();
  scrollTop();
}

function startTimer(seconds) {
  state.timerRemaining = seconds;
  const timer = document.querySelector('[data-testid="timer"]');
  if (timer) {
    timer.textContent = formatTime(state.timerRemaining);
  }

  state.timerId = setInterval(() => {
    state.timerRemaining -= 1;
    if (timer) {
      timer.textContent = formatTime(Math.max(0, state.timerRemaining));
    }

    if (state.timerRemaining <= 0) {
      clearTimer();
      const form = document.querySelector('[data-testid="quiz-form"]');
      if (form) {
        submitQuiz(form);
      }
    }
  }, 1000);
}

function renderQuestion(question, index) {
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
        <p class="question-number">Вопрос ${index + 1}</p>
        ${hint}
      </div>
      <p class="question-text">${escapeHtml(question.text)}</p>
      ${control}
    </article>
  `;
}

function renderQuiz() {
  const { attempt } = state;
  const title =
    attempt.mode === "topic"
      ? `Тема: ${getTopicTitle(attempt.subject, attempt.university, attempt.topic)}`
      : attempt.mode === "mistakes"
        ? "Повтор ошибок"
        : `Экзамен ${getUniversityTitle(attempt.university)}`;

  renderShell(`
    <form data-testid="quiz-form">
      <section class="toolbar">
        <div class="toolbar-title">
          <h2>${escapeHtml(title)}</h2>
          <p>${getUniversityTitle(attempt.university)} · ${attempt.actualCount} из ${attempt.requestedCount} вопросов</p>
        </div>
        <div class="toolbar-status">
          ${attempt.timerSeconds ? `<span class="timer" data-testid="timer">${formatTime(attempt.timerSeconds)}</span>` : ""}
          <span class="progress">${attempt.actualCount} вопросов</span>
        </div>
      </section>
      <section class="question-list">
        ${attempt.questions.map(renderQuestion).join("")}
      </section>
      <div class="actions">
        <button class="button" type="submit" data-testid="submit-quiz">Проверить</button>
        <button class="button secondary" type="button" data-action="reset">К выбору</button>
      </div>
    </form>
  `);

  if (attempt.timerSeconds) {
    startTimer(attempt.timerSeconds);
  }
}

function collectAnswers(form, attempt) {
  const answers = {};

  for (const question of attempt.questions) {
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

function getQuestionById(id) {
  return state.attempt.questions.find((question) => question.id === id);
}

function renderReview(result) {
  const question = getQuestionById(result.questionId);
  const status = result.isCorrect ? "Верно" : "Ошибка";
  const statusClass = result.isCorrect ? "correct" : "incorrect";

  return `
    <article class="result-card ${statusClass}">
      <p class="result-status">${status}</p>
      <p class="question-text">${escapeHtml(question.text)}</p>
      <div class="answer-review">
        <span><b>Ваш ответ:</b> ${escapeHtml(result.actual)}</span>
        <span><b>Правильный ответ:</b> ${escapeHtml(result.expected)}</span>
        <span><b>Тема:</b> ${escapeHtml(getTopicTitle(question.subject, question.university, question.topic))}</span>
        <span><b>Пояснение:</b> ${escapeHtml(question.explanation)}</span>
      </div>
    </article>
  `;
}

function submitQuiz(form) {
  clearTimer();
  state.answers = collectAnswers(form, state.attempt);
  const summary = window.QuizEngine.gradeQuiz(state.attempt.questions, state.answers);
  state.history = window.QuizGenerator.updateHistory(state.history, state.attempt, summary.results);
  saveHistory();
  renderResults(summary);
  scrollTop();
}

function getTopicSummary(summary) {
  const byTopic = new Map();

  for (const result of summary.results) {
    const question = getQuestionById(result.questionId);
    const key = question.topic;
    const current = byTopic.get(key) || {
      title: getTopicTitle(question.subject, question.university, key),
      total: 0,
      correct: 0,
    };
    current.total += 1;
    current.correct += result.isCorrect ? 1 : 0;
    byTopic.set(key, current);
  }

  return [...byTopic.values()]
    .map((topic) => `${topic.title}: ${topic.correct}/${topic.total}`)
    .join(" · ");
}

function renderResults(summary) {
  const incorrect = summary.results.filter((result) => !result.isCorrect);
  const reviewItems = incorrect.length === 0 ? summary.results : incorrect;
  const reviewTitle = incorrect.length === 0 ? "Все ответы верные" : "Ошибки и пропуски";
  const repeatDisabled = state.history.mistakeQuestionIds.length === 0 ? "disabled" : "";

  renderShell(`
    <section class="summary-panel" data-testid="result-panel">
      <div>
        <p class="eyebrow">Результат</p>
        <div class="score" data-testid="score">${summary.correctCount} из ${summary.totalCount}</div>
        <p class="review-note" data-testid="topic-summary">${escapeHtml(getTopicSummary(summary))}</p>
      </div>
      <div class="score-percent" data-testid="score-percent">${summary.percent}%</div>
    </section>
    <section class="topbar">
      <div>
        <h2>${reviewTitle}</h2>
        <p class="lead">${incorrect.length === 0 ? "Можно брать новый вариант." : `${incorrect.length} вопросов стоит повторить.`}</p>
      </div>
      <div class="actions">
        <button class="button" type="button" data-action="new-attempt">Новый вариант</button>
        <button class="button secondary" type="button" data-action="repeat-mistakes" ${repeatDisabled}>Повторить ошибки</button>
        <button class="button secondary" type="button" data-action="reset">К выбору</button>
      </div>
    </section>
    <section class="review-list">
      ${reviewItems.map(renderReview).join("")}
    </section>
  `);
}

app.addEventListener("click", (event) => {
  const subject = event.target.closest("[data-subject]")?.dataset.subject;
  if (subject) {
    state.subject = subject;
    renderModeSelector();
    scrollTop();
    return;
  }

  const mode = event.target.closest("[data-mode]")?.dataset.mode;
  if (mode === "exam") {
    renderExamSetup();
    scrollTop();
    return;
  }
  if (mode === "topic") {
    renderTopicSetup();
    scrollTop();
    return;
  }

  const examUniversity = event.target.closest("[data-start-exam]")?.dataset.startExam;
  if (examUniversity) {
    startAttempt({ mode: "exam", subject: state.subject, university: examUniversity });
    return;
  }

  if (event.target.closest('[data-testid="start-topic"]')) {
    const university = app.querySelector('[data-testid="topic-university"]').value;
    const topic = app.querySelector('[data-testid="topic-select"]').value;
    startAttempt({ mode: "topic", subject: state.subject, university, topic, count: 10 });
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "reset") {
    renderModeSelector();
    scrollTop();
    return;
  }
  if (action === "new-attempt" && state.lastConfig) {
    startAttempt(state.lastConfig);
    return;
  }
  if (action === "repeat-mistakes" && state.attempt) {
    startAttempt({ mode: "mistakes", subject: state.attempt.subject, university: state.attempt.university, count: 10 });
    return;
  }
  if (action === "clear-history") {
    state.history = window.QuizGenerator.createEmptyHistory();
    saveHistory();
    renderModeSelector();
  }
});

app.addEventListener("change", (event) => {
  if (event.target.matches('[data-testid="topic-university"]')) {
    renderTopicSetup(event.target.value);
  }
});

app.addEventListener("submit", (event) => {
  event.preventDefault();
  submitQuiz(event.target);
});

renderModeSelector();
