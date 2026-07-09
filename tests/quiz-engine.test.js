const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { formatAnswer, gradeQuestion, gradeQuiz } = require("../quiz-engine");

function loadQuizData() {
  const dataPath = path.join(__dirname, "..", "quiz-data.js");
  const code = fs.readFileSync(dataPath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(code, context, { filename: dataPath });
  return context.window;
}

function loadQuizSets() {
  return loadQuizData().QUIZ_SETS;
}

test("grades a single-choice answer", () => {
  const question = {
    id: 1,
    type: "single",
    options: [
      { letter: "А", text: "wrong" },
      { letter: "Б", text: "right" },
    ],
    correct: "Б",
  };

  const result = gradeQuestion(question, "Б");

  assert.equal(result.isCorrect, true);
  assert.equal(result.expected, "Б) right");
  assert.equal(result.actual, "Б) right");
});

test("grades multiple-choice answers without depending on order", () => {
  const question = {
    id: 15,
    type: "multiple",
    options: [
      { letter: "А", text: "collection" },
      { letter: "Б", text: "storage" },
      { letter: "В", text: "transfer" },
      { letter: "Г", text: "movement" },
    ],
    correct: ["А", "Б", "В"],
  };

  const result = gradeQuestion(question, ["В", "А", "Б"]);

  assert.equal(result.isCorrect, true);
  assert.equal(result.expected, "А) collection; Б) storage; В) transfer");
  assert.equal(result.actual, "А) collection; Б) storage; В) transfer");
});

test("grades matching answers", () => {
  const question = {
    id: 4,
    type: "matching",
    prompts: [
      { id: "1", text: "Прикладное ПО" },
      { id: "2", text: "Сервисное ПО" },
    ],
    options: [
      { letter: "А", text: "BIOS" },
      { letter: "Б", text: "архиватор" },
      { letter: "В", text: "электронные таблицы" },
    ],
    correct: { 1: "В", 2: "Б" },
  };

  const result = gradeQuestion(question, { 1: "В", 2: "Б" });

  assert.equal(result.isCorrect, true);
  assert.equal(result.expected, "Прикладное ПО - В) электронные таблицы; Сервисное ПО - Б) архиватор");
  assert.equal(result.actual, "Прикладное ПО - В) электронные таблицы; Сервисное ПО - Б) архиватор");
});

test("counts skipped answers as incorrect", () => {
  const question = {
    id: 20,
    type: "single",
    options: [
      { letter: "А", text: "+" },
      { letter: "Б", text: "=" },
    ],
    correct: "Б",
  };

  const result = gradeQuestion(question, undefined);

  assert.equal(result.isCorrect, false);
  assert.equal(result.actual, "Нет ответа");
});

test("grades a full quiz and rounds percentage", () => {
  const questions = [
    {
      id: 1,
      type: "single",
      options: [{ letter: "А", text: "right" }],
      correct: "А",
    },
    {
      id: 2,
      type: "single",
      options: [{ letter: "А", text: "wrong" }],
      correct: "А",
    },
    {
      id: 3,
      type: "single",
      options: [{ letter: "А", text: "right" }],
      correct: "А",
    },
  ];

  const result = gradeQuiz(questions, { 1: "А", 2: undefined, 3: "А" });

  assert.equal(result.correctCount, 2);
  assert.equal(result.totalCount, 3);
  assert.equal(result.percent, 67);
  assert.equal(result.results.length, 3);
});

test("formats an unknown answer letter safely", () => {
  const question = {
    id: 99,
    type: "single",
    options: [{ letter: "А", text: "known" }],
    correct: "А",
  };

  assert.equal(formatAnswer(question, "Г"), "Г");
});

test("quiz data contains both university tests with expected sizes", () => {
  const quizSets = loadQuizSets();
  const urfu = quizSets.find((quiz) => quiz.id === "urfu");
  const susu = quizSets.find((quiz) => quiz.id === "susu");

  assert.equal(quizSets.length, 2);
  assert.equal(urfu.questions.length, 30);
  assert.equal(susu.questions.length, 20);
});

test("quiz data includes all required question types", () => {
  const quizSets = loadQuizSets();
  const types = new Set(quizSets.flatMap((quiz) => quiz.questions.map((question) => question.type)));

  assert.deepEqual([...types].sort(), ["matching", "multiple", "single"]);
});

test("quiz data is complete enough to grade every question", () => {
  const quizSets = loadQuizSets();

  for (const quiz of quizSets) {
    for (const question of quiz.questions) {
      assert.ok(question.id, `${quiz.id} question is missing id`);
      assert.ok(question.text, `${quiz.id} question ${question.id} is missing text`);
      assert.ok(question.type, `${quiz.id} question ${question.id} is missing type`);
      assert.ok(question.correct, `${quiz.id} question ${question.id} is missing correct answer`);
    }
  }
});

test("provided answer keys produce full scores", () => {
  const quizSets = loadQuizSets();

  for (const quiz of quizSets) {
    const answers = Object.fromEntries(quiz.questions.map((question) => [question.id, question.correct]));
    const result = gradeQuiz(quiz.questions, answers);

    assert.equal(result.correctCount, quiz.questions.length, quiz.id);
    assert.equal(result.percent, 100, quiz.id);
  }
});

test("question bank has enough generated practice questions", () => {
  const { QUESTION_BANK } = loadQuizData();
  const itQuestions = QUESTION_BANK.filter((question) => (question.subject || "it") === "it");
  const urfuQuestions = itQuestions.filter((question) => question.university === "urfu");
  const susuQuestions = itQuestions.filter((question) => question.university === "susu");
  const russianQuestions = QUESTION_BANK.filter((question) => question.subject === "russian");
  const russianUrfuQuestions = russianQuestions.filter((question) => question.university === "urfu");
  const russianSusuQuestions = russianQuestions.filter((question) => question.university === "susu");
  const programmingQuestions = QUESTION_BANK.filter((question) => question.subject === "programming");
  const programmingUrfuQuestions = programmingQuestions.filter((question) => question.university === "urfu");
  const programmingSusuQuestions = programmingQuestions.filter((question) => question.university === "susu");

  assert.ok(urfuQuestions.length >= 60, `expected at least 60 UrFU questions, got ${urfuQuestions.length}`);
  assert.ok(susuQuestions.length >= 50, `expected at least 50 SUSU questions, got ${susuQuestions.length}`);
  assert.ok(
    russianUrfuQuestions.length >= 50,
    `expected at least 50 Russian UrFU questions, got ${russianUrfuQuestions.length}`,
  );
  assert.ok(
    russianSusuQuestions.length >= 50,
    `expected at least 50 Russian SUSU questions, got ${russianSusuQuestions.length}`,
  );
  assert.ok(
    programmingUrfuQuestions.length >= 80,
    `expected at least 80 Programming UrFU questions, got ${programmingUrfuQuestions.length}`,
  );
  assert.ok(
    programmingSusuQuestions.length >= 80,
    `expected at least 80 Programming SUSU questions, got ${programmingSusuQuestions.length}`,
  );
});

test("question bank ids are unique and questions have metadata", () => {
  const { QUESTION_BANK } = loadQuizData();
  const ids = new Set();

  for (const question of QUESTION_BANK) {
    assert.equal(ids.has(question.id), false, `duplicate id ${question.id}`);
    ids.add(question.id);
    assert.ok(question.university, `${question.id} is missing university`);
    assert.ok(question.topic, `${question.id} is missing topic`);
    assert.ok(question.explanation, `${question.id} is missing explanation`);
  }
});

test("incorrect options avoid low-signal distractors", () => {
  const { QUESTION_BANK } = loadQuizData();
  const weakPatterns = [
    /цвет/i,
    /монитор/i,
    /диплом/i,
    /мебел/i,
    /корпус/i,
    /автоматическ[а-я ]+экзамен/i,
    /случайн[а-я ]+команд/i,
  ];

  for (const question of QUESTION_BANK) {
    if (question.type === "matching" || question.fixedTest) {
      continue;
    }

    const correctLetters = new Set(Array.isArray(question.correct) ? question.correct : [question.correct]);
    const incorrectOptions = question.options.filter((option) => !correctLetters.has(option.letter));

    for (const option of incorrectOptions) {
      assert.equal(
        weakPatterns.some((pattern) => pattern.test(option.text)),
        false,
        `${question.id} has an obvious distractor: ${option.text}`,
      );
    }
  }
});

test("programming single-choice distractors come from the same topic answer pool", () => {
  const { QUESTION_BANK } = loadQuizData();
  const programmingSingles = QUESTION_BANK.filter(
    (question) => question.subject === "programming" && question.type === "single" && !question.examFocus && !question.fixedTest,
  );
  const answerPools = new Map();

  for (const question of programmingSingles) {
    const key = `${question.university}:${question.topic}`;
    const correctOption = question.options.find((option) => option.letter === question.correct);
    const pool = answerPools.get(key) || new Set();
    pool.add(correctOption.text);
    answerPools.set(key, pool);
  }

  for (const question of programmingSingles) {
    const key = `${question.university}:${question.topic}`;
    const pool = answerPools.get(key);

    for (const option of question.options) {
      if (option.letter !== question.correct) {
        assert.equal(
          pool.has(option.text),
          true,
          `${question.id} has a distractor outside its topic pool: ${option.text}`,
        );
      }
    }
  }
});

test("programming bank includes exam-style analysis tasks", () => {
  const { QUESTION_BANK } = loadQuizData();
  const programmingQuestions = QUESTION_BANK.filter((question) => question.subject === "programming");
  const programmingTypes = new Set(programmingQuestions.map((question) => question.type));
  const analysisQuestions = programmingQuestions.filter((question) =>
    /псевдокод|таблица|массив|матриц|A\s*=|for|while|если/i.test(question.text),
  );
  const explainedTrapQuestions = programmingQuestions.filter((question) => question.optionExplanations);

  assert.ok(programmingTypes.has("multiple"), "programming bank should include multiple-answer tasks");
  assert.ok(programmingTypes.has("matching"), "programming bank should include matching tasks");
  assert.ok(analysisQuestions.length >= 8, `expected at least 8 analysis tasks, got ${analysisQuestions.length}`);
  assert.ok(
    explainedTrapQuestions.length >= 6,
    `expected at least 6 tasks with option explanations, got ${explainedTrapQuestions.length}`,
  );
});

test("question bank includes exam-focused tasks from study notes", () => {
  const { QUESTION_BANK } = loadQuizData();
  const examFocusedBySubject = new Map();

  for (const question of QUESTION_BANK.filter((item) => item.examFocus)) {
    const subject = question.subject || "it";
    examFocusedBySubject.set(subject, (examFocusedBySubject.get(subject) || 0) + 1);
  }

  assert.ok((examFocusedBySubject.get("it") || 0) >= 6, "IT should have exam-focused tasks");
  assert.ok((examFocusedBySubject.get("russian") || 0) >= 6, "Russian should have exam-focused tasks");
  assert.ok((examFocusedBySubject.get("programming") || 0) >= 10, "Programming should have exam-focused tasks");
});

test("Russian spelling questions hide the checked letters in options", () => {
  const { QUESTION_BANK } = loadQuizData();
  const spellingQuestions = QUESTION_BANK.filter(
    (question) => question.subject === "russian" && question.topic === "orthography" && question.type === "single",
  );

  assert.ok(spellingQuestions.length > 0, "expected Russian spelling questions");

  for (const question of spellingQuestions) {
    for (const option of question.options) {
      assert.match(
        option.text,
        /_|\(не\)/i,
        `${question.id} exposes the completed spelling in option ${option.letter}: ${option.text}`,
      );
    }
  }
});

test("Russian verb-ending tasks use blanks instead of completed forms", () => {
  const { QUESTION_BANK } = loadQuizData();
  const verbEndingQuestions = QUESTION_BANK.filter(
    (question) =>
      question.subject === "russian" &&
      question.type === "single" &&
      /глагол|блещ|бор_тся|окончан/i.test(question.text),
  );

  assert.ok(verbEndingQuestions.length > 0, "expected Russian verb-ending questions");
  assert.ok(
    verbEndingQuestions.every((question) => question.text.includes("_")),
    verbEndingQuestions.map((question) => question.id).join(", "),
  );
});

test("Russian orthoepy marks тОрты as the correct stress", () => {
  const { QUESTION_BANK } = loadQuizData();
  const cakeStressQuestions = QUESTION_BANK.filter(
    (question) =>
      question.subject === "russian" &&
      question.topic === "orthoepy" &&
      question.type === "single" &&
      question.options.some((option) => /т[оО]рт[ыЫ]/.test(option.text)),
  );

  assert.ok(cakeStressQuestions.length > 0, "expected Russian orthoepy questions about тОрты");

  for (const question of cakeStressQuestions) {
    const correctOption = question.options.find((option) => option.letter === question.correct);
    assert.notEqual(correctOption.text, "тортЫ", `${question.id} marks тортЫ as correct`);
    if (question.options.some((option) => option.text === "тОрты")) {
      assert.equal(correctOption.text, "тОрты", `${question.id} does not accept тОрты as correct`);
    }

    const normalizedExplanations = [
      question.explanation,
      ...Object.values(question.optionExplanations || {}),
    ].join(" ");
    assert.doesNotMatch(normalizedExplanations, /Правильно тортЫ|Нормативное ударение: тортЫ/);
  }
});

test("Russian standalone spelling test contains all imported questions", () => {
  const { QUESTION_BANK, SPECIAL_TESTS } = loadQuizData();
  const spellingTest = SPECIAL_TESTS.find((item) => item.id === "russian-spelling-forms");
  const questions = QUESTION_BANK.filter((question) => question.fixedTest === "russian-spelling-forms");

  assert.ok(spellingTest, "expected standalone Russian spelling test metadata");
  assert.equal(spellingTest.subject, "russian");
  assert.equal(spellingTest.config.count, 60);
  assert.equal(questions.length, 60);
  assert.ok(questions.every((question) => question.type === "single"));
  assert.ok(questions.every((question) => question.subject === "russian"));
  assert.ok(questions.every((question) => question.university === "practice"));
  assert.ok(questions.every((question) => question.topic === "spelling-forms"));

  const firstCorrect = questions[0].options.find((option) => option.letter === questions[0].correct);
  const lastCorrect = questions[59].options.find((option) => option.letter === questions[59].correct);
  assert.equal(firstCorrect.text, "диван-кровать");
  assert.equal(lastCorrect.text, "Я не видел ни дома, ни машины.");
});

test("IT standalone computer literacy test contains all imported questions", () => {
  const { QUESTION_BANK, SPECIAL_TESTS } = loadQuizData();
  const itTest = SPECIAL_TESTS.find((item) => item.id === "it-computer-literacy");
  const questions = QUESTION_BANK.filter((question) => question.fixedTest === "it-computer-literacy");
  const types = new Set(questions.map((question) => question.type));

  assert.ok(itTest, "expected standalone IT test metadata");
  assert.equal(itTest.subject, "it");
  assert.equal(itTest.config.count, 30);
  assert.equal(questions.length, 30);
  assert.ok(types.has("single"));
  assert.ok(types.has("multiple"));
  assert.ok(types.has("matching"));
  assert.ok(questions.every((question) => (question.subject || "it") === "it"));
  assert.ok(questions.every((question) => question.university === "practice"));
  assert.ok(questions.every((question) => question.topic === "it-computer-literacy"));

  const firstCorrect = questions[0].options.find((option) => option.letter === questions[0].correct);
  const lastCorrect = questions[29].options.find((option) => option.letter === questions[29].correct);
  assert.equal(firstCorrect.text, "графические элементы программ, а также технология их обработки");
  assert.equal(lastCorrect.text, "Специальная область памяти компьютера, в которой временно хранится информация");
});

test("SUSU IT review attempt standalone test matches the imported HTML attempt", () => {
  const { QUESTION_BANK, SPECIAL_TESTS } = loadQuizData();
  const reviewTest = SPECIAL_TESTS.find((item) => item.id === "susu-it-review-attempt");
  const questions = QUESTION_BANK.filter((question) => question.fixedTest === "susu-it-review-attempt");

  assert.ok(reviewTest, "expected standalone SUSU IT review attempt metadata");
  assert.equal(reviewTest.subject, "it");
  assert.equal(reviewTest.config.count, 10);
  assert.equal(questions.length, 10);
  assert.ok(questions.every((question) => question.type === "single"));
  assert.ok(questions.every((question) => question.subject === "it"));
  assert.ok(questions.every((question) => question.university === "susu"));
  assert.ok(questions.every((question) => question.topic === "susu-it-review-attempt"));

  assert.equal(questions[0].text, "Корпоративные информационные системы — это системы, обеспечивающие…");
  assert.equal(questions[0].options.find((option) => option.letter === questions[0].correct).text, "полную автоматизацию крупных хозяйственных субъектов");
  assert.equal(questions[2].options.find((option) => option.letter === questions[2].correct).text, "законченное с точки зрения пользователя действие над базой данных");
  assert.equal(questions[9].text, "Защита системы от пользователя предполагает:");
  assert.equal(
    questions[9].options.find((option) => option.letter === questions[9].correct).text,
    "исключение возможности неквалифицированных действий, доступа к общесистемным данным и данным других пользователей",
  );
});

test("Programming standalone SUSU test contains all imported questions", () => {
  const { QUESTION_BANK, SPECIAL_TESTS } = loadQuizData();
  const programmingTest = SPECIAL_TESTS.find((item) => item.id === "susu-programming-full-coverage");
  const questions = QUESTION_BANK.filter((question) => question.fixedTest === "susu-programming-full-coverage");

  assert.ok(programmingTest, "expected standalone programming test metadata");
  assert.equal(programmingTest.subject, "programming");
  assert.equal(programmingTest.config.count, 96);
  assert.equal(questions.length, 96);
  assert.ok(questions.every((question) => ["single", "multiple"].includes(question.type)));
  assert.ok(questions.every((question) => question.subject === "programming"));
  assert.ok(questions.every((question) => question.university === "susu"));
  assert.ok(questions.every((question) => question.topic === "susu-programming-full-coverage"));

  const firstCorrect = questions[0].options.find((option) => option.letter === questions[0].correct);
  const lastCorrect = questions[95].options.find((option) => option.letter === questions[95].correct);
  assert.equal(questions[0].text, "1. Что такое алгоритм?");
  assert.equal(firstCorrect.text, "Точное описание действий для решения задачи");
  assert.equal(lastCorrect.text, "Формально запись есть, но смысл неправильный");
});

test("Programming standalone SUSU test has balanced answer letters", () => {
  const { QUESTION_BANK } = loadQuizData();
  const questions = QUESTION_BANK.filter(
    (question) => question.fixedTest === "susu-programming-full-coverage" && question.type === "single",
  );
  const counts = new Map(["А", "Б", "В", "Г"].map((letter) => [letter, 0]));

  for (const question of questions) {
    counts.set(question.correct, counts.get(question.correct) + 1);
  }

  const values = [...counts.values()];
  assert.ok(values.every((count) => count >= 12), [...counts.entries()].map(([letter, count]) => `${letter}:${count}`).join(", "));
  assert.ok(Math.max(...values) - Math.min(...values) <= 6, [...counts.entries()].map(([letter, count]) => `${letter}:${count}`).join(", "));
});

test("Programming standalone SUSU test includes multi-answer tasks", () => {
  const { QUESTION_BANK } = loadQuizData();
  const questions = QUESTION_BANK.filter((question) => question.fixedTest === "susu-programming-full-coverage");
  const multiQuestions = questions.filter((question) => question.type === "multiple");

  assert.ok(multiQuestions.length >= 12, `expected at least 12 multi-answer tasks, got ${multiQuestions.length}`);
  assert.ok(multiQuestions.every((question) => question.hint.includes("Выберите несколько ответов")));
  assert.ok(multiQuestions.every((question) => question.correct.length >= 2));
});

test("Programming standalone SUSU test uses stronger distractors", () => {
  const { QUESTION_BANK } = loadQuizData();
  const questions = QUESTION_BANK.filter((question) => question.fixedTest === "susu-programming-full-coverage");
  const weakPatterns = [
    /только монитор/i,
    /только клавиатуру/i,
    /только красив/i,
    /не имеет алгоритма/i,
    /только цвет/i,
    /только шрифт/i,
    /только один символ/i,
    /только ошибка/i,
    /только файл/i,
  ];

  for (const question of questions) {
    for (const option of question.options) {
      assert.equal(
        weakPatterns.some((pattern) => pattern.test(option.text)),
        false,
        `${question.id} has a weak distractor: ${option.text}`,
      );
    }
  }
});

test("topic definitions cover both universities", () => {
  const { QUIZ_TOPICS, QUIZ_TOPICS_BY_SUBJECT } = loadQuizData();

  assert.ok(QUIZ_TOPICS.urfu.length >= 4);
  assert.ok(QUIZ_TOPICS.susu.length >= 8);
  assert.ok(QUIZ_TOPICS.urfu.every((topic) => topic.id && topic.title));
  assert.ok(QUIZ_TOPICS.susu.every((topic) => topic.id && topic.title));
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.russian.urfu.length >= 7);
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.russian.susu.length >= 7);
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.russian.urfu.every((topic) => topic.id && topic.title));
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.russian.susu.every((topic) => topic.id && topic.title));
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.programming.urfu.length >= 8);
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.programming.susu.length >= 8);
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.programming.urfu.every((topic) => topic.id && topic.title));
  assert.ok(QUIZ_TOPICS_BY_SUBJECT.programming.susu.every((topic) => topic.id && topic.title));
});
