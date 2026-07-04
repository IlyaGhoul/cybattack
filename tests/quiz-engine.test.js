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
