(function (root, factory) {
  const engine = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = engine;
  }

  root.QuizEngine = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function isBlank(answer) {
    if (answer === undefined || answer === null || answer === "") {
      return true;
    }

    if (Array.isArray(answer)) {
      return answer.length === 0;
    }

    if (typeof answer === "object") {
      return Object.keys(answer).length === 0;
    }

    return false;
  }

  function getOption(question, letter) {
    return (question.options || []).find((option) => option.letter === letter);
  }

  function sortLetters(question, letters) {
    const optionOrder = new Map((question.options || []).map((option, index) => [option.letter, index]));

    return [...letters].sort((left, right) => {
      const leftIndex = optionOrder.has(left) ? optionOrder.get(left) : Number.MAX_SAFE_INTEGER;
      const rightIndex = optionOrder.has(right) ? optionOrder.get(right) : Number.MAX_SAFE_INTEGER;

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return String(left).localeCompare(String(right), "ru");
    });
  }

  function formatLetter(question, letter) {
    if (!letter) {
      return "Нет ответа";
    }

    const option = getOption(question, letter);
    return option ? `${letter}) ${option.text}` : String(letter);
  }

  function formatAnswer(question, answer) {
    if (isBlank(answer)) {
      return "Нет ответа";
    }

    if (question.type === "matching") {
      return question.prompts
        .map((prompt) => `${prompt.text} - ${formatLetter(question, answer[prompt.id])}`)
        .join("; ");
    }

    if (Array.isArray(answer)) {
      return sortLetters(question, answer)
        .map((letter) => formatLetter(question, letter))
        .join("; ");
    }

    return formatLetter(question, answer);
  }

  function arraysEqual(left, right) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  function isCorrectAnswer(question, userAnswer) {
    if (isBlank(userAnswer)) {
      return false;
    }

    if (question.type === "multiple") {
      if (!Array.isArray(userAnswer)) {
        return false;
      }

      return arraysEqual(sortLetters(question, question.correct), sortLetters(question, userAnswer));
    }

    if (question.type === "matching") {
      if (typeof userAnswer !== "object" || Array.isArray(userAnswer)) {
        return false;
      }

      return question.prompts.every((prompt) => userAnswer[prompt.id] === question.correct[prompt.id]);
    }

    return userAnswer === question.correct;
  }

  function gradeQuestion(question, userAnswer) {
    return {
      questionId: question.id,
      isCorrect: isCorrectAnswer(question, userAnswer),
      expected: formatAnswer(question, question.correct),
      actual: formatAnswer(question, userAnswer),
    };
  }

  function gradeQuiz(questions, answers) {
    const results = questions.map((question) => gradeQuestion(question, answers[question.id]));
    const correctCount = results.filter((result) => result.isCorrect).length;
    const totalCount = questions.length;
    const percent = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);

    return {
      correctCount,
      totalCount,
      percent,
      results,
    };
  }

  return {
    formatAnswer,
    gradeQuestion,
    gradeQuiz,
  };
});
