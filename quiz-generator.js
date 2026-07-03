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

  function getRequestedCount(config) {
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

  function createAttempt(config, questionBank, rawHistory, rng = Math.random) {
    const history = normalizeHistory(rawHistory);
    const requestedCount = getRequestedCount(config);
    const pool = filterPool(config, questionBank, history);
    const questions =
      config.mode === "mistakes"
        ? shuffle(uniqueById(pool), rng).slice(0, requestedCount)
        : selectQuestions(pool, requestedCount, history, rng);

    return {
      mode: config.mode,
      subject: config.subject || "it",
      university: config.university,
      topic: config.topic || null,
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
