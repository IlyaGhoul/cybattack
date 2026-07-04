const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createAttempt,
  createEmptyHistory,
  updateHistory,
} = require("../quiz-generator");

function makeQuestion(id, university = "urfu", topic = "systems", subject = "it") {
  return {
    id,
    subject,
    university,
    topic,
    type: "single",
    text: `Question ${id}`,
    options: [
      { letter: "А", text: "Right" },
      { letter: "Б", text: "Wrong" },
    ],
    correct: "А",
    explanation: "Explanation",
  };
}

function fixedRng() {
  return 0;
}

test("creates a 30-question UrFU exam attempt", () => {
  const bank = Array.from({ length: 35 }, (_, index) => makeQuestion(`u-${index}`, "urfu", "systems"));

  const attempt = createAttempt({ mode: "exam", university: "urfu" }, bank, createEmptyHistory(), fixedRng);

  assert.equal(attempt.mode, "exam");
  assert.equal(attempt.university, "urfu");
  assert.equal(attempt.requestedCount, 30);
  assert.equal(attempt.actualCount, 30);
  assert.equal(attempt.questions.length, 30);
  assert.equal(attempt.timerSeconds, null);
});

test("creates a 20-question SUSU exam attempt with a 20-minute timer", () => {
  const bank = Array.from({ length: 25 }, (_, index) => makeQuestion(`s-${index}`, "susu", "networks"));

  const attempt = createAttempt({ mode: "exam", university: "susu" }, bank, createEmptyHistory(), fixedRng);

  assert.equal(attempt.requestedCount, 20);
  assert.equal(attempt.actualCount, 20);
  assert.equal(attempt.questions.length, 20);
  assert.equal(attempt.timerSeconds, 20 * 60);
});

test("creates Russian exam attempts with subject-specific format", () => {
  const bank = [
    ...Array.from({ length: 35 }, (_, index) => makeQuestion(`ru-u-${index}`, "urfu", "orthography", "russian")),
    ...Array.from({ length: 25 }, (_, index) => makeQuestion(`ru-s-${index}`, "susu", "orthography", "russian")),
    ...Array.from({ length: 40 }, (_, index) => makeQuestion(`it-u-${index}`, "urfu", "systems", "it")),
  ];

  const urfuAttempt = createAttempt(
    { mode: "exam", subject: "russian", university: "urfu" },
    bank,
    createEmptyHistory(),
    fixedRng,
  );
  const susuAttempt = createAttempt(
    { mode: "exam", subject: "russian", university: "susu" },
    bank,
    createEmptyHistory(),
    fixedRng,
  );

  assert.equal(urfuAttempt.requestedCount, 17);
  assert.equal(urfuAttempt.questions.length, 17);
  assert.equal(urfuAttempt.timerSeconds, null);
  assert.ok(urfuAttempt.questions.every((question) => question.subject === "russian"));
  assert.equal(susuAttempt.requestedCount, 20);
  assert.equal(susuAttempt.questions.length, 20);
  assert.equal(susuAttempt.timerSeconds, 30 * 60);
  assert.ok(susuAttempt.questions.every((question) => question.subject === "russian"));
});

test("creates programming exam attempts with subject-specific format", () => {
  const bank = [
    ...Array.from({ length: 35 }, (_, index) => makeQuestion(`prog-u-${index}`, "urfu", "flowcharts", "programming")),
    ...Array.from({ length: 20 }, (_, index) => makeQuestion(`prog-s-${index}`, "susu", "oop", "programming")),
    ...Array.from({ length: 40 }, (_, index) => makeQuestion(`it-u-${index}`, "urfu", "systems", "it")),
  ];

  const urfuAttempt = createAttempt(
    { mode: "exam", subject: "programming", university: "urfu" },
    bank,
    createEmptyHistory(),
    fixedRng,
  );
  const susuAttempt = createAttempt(
    { mode: "exam", subject: "programming", university: "susu" },
    bank,
    createEmptyHistory(),
    fixedRng,
  );

  assert.equal(urfuAttempt.requestedCount, 30);
  assert.equal(urfuAttempt.questions.length, 30);
  assert.equal(urfuAttempt.timerSeconds, 90 * 60);
  assert.ok(urfuAttempt.questions.every((question) => question.subject === "programming"));
  assert.equal(susuAttempt.requestedCount, 15);
  assert.equal(susuAttempt.questions.length, 15);
  assert.equal(susuAttempt.timerSeconds, 60 * 60);
  assert.ok(susuAttempt.questions.every((question) => question.subject === "programming"));
});

test("exam attempts sample questions across available topics", () => {
  const topics = ["systems", "services", "data", "security"];
  const bank = topics.flatMap((topic) =>
    Array.from({ length: 10 }, (_, index) => makeQuestion(`${topic}-${index}`, "urfu", topic)),
  );

  const attempt = createAttempt({ mode: "exam", university: "urfu" }, bank, createEmptyHistory(), fixedRng);
  const selectedTopics = new Set(attempt.questions.map((question) => question.topic));
  const topicCounts = topics.map((topic) => attempt.questions.filter((question) => question.topic === topic).length);

  assert.equal(attempt.questions.length, 30);
  assert.equal(selectedTopics.size, topics.length);
  assert.ok(Math.max(...topicCounts) - Math.min(...topicCounts) <= 2, topicCounts.join(", "));
});

test("creates a topic training attempt with the requested count", () => {
  const bank = [
    ...Array.from({ length: 12 }, (_, index) => makeQuestion(`sys-${index}`, "urfu", "systems")),
    ...Array.from({ length: 12 }, (_, index) => makeQuestion(`sec-${index}`, "urfu", "security")),
  ];

  const attempt = createAttempt(
    { mode: "topic", university: "urfu", topic: "security", count: 10 },
    bank,
    createEmptyHistory(),
    fixedRng,
  );

  assert.equal(attempt.mode, "topic");
  assert.equal(attempt.topic, "security");
  assert.equal(attempt.questions.length, 10);
  assert.ok(attempt.questions.every((question) => question.topic === "security"));
});

test("does not duplicate questions inside one attempt", () => {
  const bank = Array.from({ length: 35 }, (_, index) => makeQuestion(`u-${index}`, "urfu", "systems"));

  const attempt = createAttempt({ mode: "exam", university: "urfu" }, bank, createEmptyHistory(), fixedRng);
  const ids = attempt.questions.map((question) => question.id);

  assert.equal(new Set(ids).size, ids.length);
});

test("avoids recent questions when enough alternatives exist", () => {
  const bank = Array.from({ length: 45 }, (_, index) => makeQuestion(`u-${index}`, "urfu", "systems"));
  const history = {
    recentQuestionIds: Array.from({ length: 10 }, (_, index) => `u-${index}`),
    mistakeQuestionIds: [],
  };

  const attempt = createAttempt({ mode: "exam", university: "urfu" }, bank, history, fixedRng);
  const ids = new Set(attempt.questions.map((question) => question.id));

  assert.equal([...history.recentQuestionIds].some((id) => ids.has(id)), false);
});

test("falls back to recent questions when the pool is too small", () => {
  const bank = Array.from({ length: 30 }, (_, index) => makeQuestion(`u-${index}`, "urfu", "systems"));
  const history = {
    recentQuestionIds: Array.from({ length: 20 }, (_, index) => `u-${index}`),
    mistakeQuestionIds: [],
  };

  const attempt = createAttempt({ mode: "exam", university: "urfu" }, bank, history, fixedRng);

  assert.equal(attempt.questions.length, 30);
});

test("updates recent questions and stores mistakes", () => {
  const questions = [makeQuestion("u-1"), makeQuestion("u-2"), makeQuestion("u-3")];
  const attempt = {
    questions,
  };
  const results = [
    { questionId: "u-1", isCorrect: true },
    { questionId: "u-2", isCorrect: false },
    { questionId: "u-3", isCorrect: false },
  ];

  const history = updateHistory(createEmptyHistory(), attempt, results);

  assert.deepEqual(history.recentQuestionIds.slice(-3), ["u-1", "u-2", "u-3"]);
  assert.deepEqual(history.mistakeQuestionIds.sort(), ["u-2", "u-3"]);
});

test("creates a repeat-mistakes attempt from stored mistake ids", () => {
  const bank = Array.from({ length: 5 }, (_, index) => makeQuestion(`u-${index}`, "urfu", "systems"));
  const history = {
    recentQuestionIds: [],
    mistakeQuestionIds: ["u-1", "u-3"],
  };

  const attempt = createAttempt({ mode: "mistakes", university: "urfu" }, bank, history, fixedRng);

  assert.equal(attempt.mode, "mistakes");
  assert.deepEqual(attempt.questions.map((question) => question.id).sort(), ["u-1", "u-3"]);
}
);
