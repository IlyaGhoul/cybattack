(function (root, factory) {
  const generator = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = generator;
  }

  root.QuizGenerator = generator;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EXAM_COUNTS = {
    it: {
      urfu: 30,
      susu: 20,
    },
    russian: {
      urfu: 17,
      susu: 20,
    },
    programming: {
      urfu: 30,
      susu: 15,
    },
  };
  const TIMER_SECONDS = {
    it: {
      urfu: null,
      susu: 20 * 60,
    },
    russian: {
      urfu: null,
      susu: 30 * 60,
    },
    programming: {
      urfu: 90 * 60,
      susu: 60 * 60,
    },
  };
  const DEFAULT_TOPIC_COUNT = 10;
  const RECENT_LIMIT = 90;

  function createEmptyHistory() {
    return {
      recentQuestionIds: [],
      mistakeQuestionIds: [],
    };
  }

  function normalizeHistory(history) {
    return {
      recentQuestionIds: Array.isArray(history?.recentQuestionIds) ? [...history.recentQuestionIds] : [],
      mistakeQuestionIds: Array.isArray(history?.mistakeQuestionIds) ? [...history.mistakeQuestionIds] : [],
    };
  }

  function uniqueById(questions) {
    const seen = new Set();
    return questions.filter((question) => {
      if (!question?.id || seen.has(question.id)) {
        return false;
      }

      seen.add(question.id);
      return true;
    });
  }

  function shuffle(items, rng) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }

  function getRequestedCount(config, poolSize = DEFAULT_TOPIC_COUNT) {
    if (config.mode === "fixed-test") {
      return config.count || poolSize;
    }

    if (config.mode === "exam") {
      const subject = config.subject || "it";
      return EXAM_COUNTS[subject]?.[config.university] || DEFAULT_TOPIC_COUNT;
    }

    if (config.mode === "mistakes") {
      return config.count || DEFAULT_TOPIC_COUNT;
    }

    return config.count || DEFAULT_TOPIC_COUNT;
  }

  function filterPool(config, questionBank, history) {
    const subject = config.subject || "it";

    if (config.mode === "fixed-test" && config.fixedTest) {
      return questionBank.filter((question) => question.subject === subject && question.fixedTest === config.fixedTest);
    }

    const byUniversity = questionBank.filter(
      (question) => (question.subject || "it") === subject && question.university === config.university,
    );

    if (config.mode === "mistakes") {
      const mistakeIds = new Set(history.mistakeQuestionIds);
      return byUniversity.filter((question) => mistakeIds.has(question.id));
    }

    if (config.mode === "topic" && config.topic) {
      return byUniversity.filter((question) => question.topic === config.topic);
    }

    return byUniversity;
  }

  function selectQuestions(pool, requestedCount, history, rng) {
    const uniquePool = uniqueById(pool);
    const recentIds = new Set(history.recentQuestionIds);
    const freshPool = uniquePool.filter((question) => !recentIds.has(question.id));
    const source = freshPool.length >= requestedCount ? freshPool : uniquePool;

    return shuffle(source, rng).slice(0, requestedCount);
  }

  function selectExamQuestions(pool, requestedCount, history, rng) {
    const uniquePool = uniqueById(pool);
    const recentIds = new Set(history.recentQuestionIds);
    const freshPool = uniquePool.filter((question) => !recentIds.has(question.id));
    const source = freshPool.length >= requestedCount ? freshPool : uniquePool;
    const groups = new Map();

    for (const question of shuffle(source, rng)) {
      const topic = question.topic || "general";
      const topicQuestions = groups.get(topic) || [];
      topicQuestions.push(question);
      groups.set(topic, topicQuestions);
    }

    const topicQueues = [...groups.values()].map((questions) =>
      shuffle(questions, rng).sort((left, right) => Number(Boolean(right.examFocus)) - Number(Boolean(left.examFocus))),
    );
    const selected = [];

    while (selected.length < requestedCount && topicQueues.some((questions) => questions.length > 0)) {
      const activeQueues = shuffle(
        topicQueues.filter((questions) => questions.length > 0),
        rng,
      );

      for (const queue of activeQueues) {
        if (selected.length >= requestedCount) {
          break;
        }

        selected.push(queue.shift());
      }
    }

    return selected;
  }

  function createAttempt(config, questionBank, rawHistory, rng = Math.random) {
    const history = normalizeHistory(rawHistory);
    const pool = filterPool(config, questionBank, history);
    const requestedCount = getRequestedCount(config, pool.length);
    const questions =
      config.mode === "fixed-test"
        ? uniqueById(pool).slice(0, requestedCount)
      : config.mode === "mistakes"
        ? shuffle(uniqueById(pool), rng).slice(0, requestedCount)
        : config.mode === "exam"
          ? selectExamQuestions(pool, requestedCount, history, rng)
        : selectQuestions(pool, requestedCount, history, rng);

    return {
      mode: config.mode,
      subject: config.subject || "it",
      university: config.university,
      topic: config.topic || null,
      fixedTest: config.fixedTest || null,
      title: config.title || null,
      questions,
      requestedCount,
      actualCount: questions.length,
      timerSeconds: config.mode === "exam" ? TIMER_SECONDS[config.subject || "it"]?.[config.university] ?? null : null,
    };
  }

  function updateHistory(rawHistory, attempt, results) {
    const history = normalizeHistory(rawHistory);
    const attemptedIds = attempt.questions.map((question) => question.id);
    const recentQuestionIds = [...history.recentQuestionIds, ...attemptedIds].slice(-RECENT_LIMIT);
    const mistakeIds = new Set(history.mistakeQuestionIds);

    for (const result of results) {
      if (result.isCorrect) {
        mistakeIds.delete(result.questionId);
      } else {
        mistakeIds.add(result.questionId);
      }
    }

    return {
      recentQuestionIds,
      mistakeQuestionIds: [...mistakeIds],
    };
  }

  return {
    createAttempt,
    createEmptyHistory,
    updateHistory,
  };
});
