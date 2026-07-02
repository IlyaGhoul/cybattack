# Adaptive Exam Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build exam and topic-training modes that generate varied UrFU and SUSU attempts from a larger static question bank.

**Architecture:** Keep the site as plain static HTML/CSS/JavaScript for GitHub Pages. Split responsibilities into a grading engine, question bank, attempt generator, browser progress store, and UI controller so generation and progress behavior are testable without a browser.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in `node:test`, Playwright for browser smoke tests.

## Global Constraints

- The app must run locally by opening `index.html`.
- Do not require npm install, a build step, a backend, or a server.
- Keep Russian interface text.
- Exam mode must generate UrFU attempts with 30 questions.
- Exam mode must generate SUSU attempts with 20 questions and a 20-minute timer.
- Topic mode must generate short topic attempts with a default of 10 questions.
- Questions must not repeat inside one attempt.
- Recently answered questions should be avoided when enough alternatives exist.
- Skipped and wrong questions must be stored for repeat-mistakes mode.

---

### Task 1: Attempt Generator And Progress Store

**Files:**
- Create: `quiz-generator.js`
- Create: `tests/quiz-generator.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: question objects with `id`, `university`, `topic`, `type`, `text`, `options`, `correct`, and optional `prompts`.
- Produces: `window.QuizGenerator.createAttempt(config, questionBank, history, rng)` where `config` is `{ mode, university, topic?, count? }` and the return value is `{ mode, university, topic, questions, requestedCount, actualCount, timerSeconds }`.
- Produces: `window.QuizGenerator.updateHistory(history, attempt, results)` returning `{ recentQuestionIds, mistakeQuestionIds }`.
- Produces: `window.QuizGenerator.createEmptyHistory()` returning an empty history object.

- [ ] **Step 1: Write failing generator tests**

Create tests for UrFU exam size, SUSU exam timer, topic attempt size, no duplicates in one attempt, recent-id avoidance, and mistake tracking.

- [ ] **Step 2: Run generator tests and verify RED**

Run: `node --test tests/quiz-generator.test.js`
Expected: fail with missing `quiz-generator.js`.

- [ ] **Step 3: Implement generator and history logic**

Create `quiz-generator.js` as a UMD-style module like `quiz-engine.js`, and include it from `index.html` after `quiz-data.js`.

- [ ] **Step 4: Run generator tests and verify GREEN**

Run: `node --test tests/quiz-generator.test.js`
Expected: pass.

### Task 2: Expanded Question Bank

**Files:**
- Modify: `quiz-data.js`
- Modify: `tests/quiz-engine.test.js`
- Modify: `tests/quiz-generator.test.js`

**Interfaces:**
- Consumes: existing `window.QUIZ_SETS` format for compatibility.
- Produces: `window.QUESTION_BANK`, a flat list of all questions with metadata.
- Produces: `window.QUIZ_TOPICS`, topic definitions grouped by university.

- [ ] **Step 1: Write failing bank integrity tests**

Add assertions that the bank has at least 60 UrFU questions, at least 50 SUSU questions, unique ids, explanations for every question, and topic coverage for both universities.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/quiz-engine.test.js tests/quiz-generator.test.js`
Expected: fail because `QUESTION_BANK` and the larger bank do not exist yet.

- [ ] **Step 3: Expand data**

Add topic metadata and a static bank of UrFU/SUSU-style questions based on the provided programs and demo formats. Preserve existing question compatibility by deriving `QUIZ_SETS` from the bank.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/quiz-engine.test.js tests/quiz-generator.test.js`
Expected: pass.

### Task 3: Two-Mode UI

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `tests/browser-flow.test.js`

**Interfaces:**
- Consumes: `window.QUESTION_BANK`, `window.QUIZ_TOPICS`, `window.QuizGenerator`, and `window.QuizEngine`.
- Produces: selection screens for exam and topic training, quiz rendering, result review with explanations, repeat-mistakes, reset history, and SUSU timer.

- [ ] **Step 1: Write failing browser tests**

Update the browser smoke test to cover choosing exam mode, choosing topic training, seeing a timer for SUSU exam, and seeing result actions.

- [ ] **Step 2: Run browser tests and verify RED**

Run: `node --test tests/browser-flow.test.js`
Expected: fail because the UI still only shows the old quiz selector.

- [ ] **Step 3: Implement UI**

Refactor `app.js` to render mode selection, exam setup, topic setup, generated attempts, results, explanations, mistake replay, and history reset. Update CSS for the additional controls.

- [ ] **Step 4: Run browser tests and verify GREEN**

Run: `node --test tests/browser-flow.test.js`
Expected: pass.

### Task 4: Final Verification And Publish

**Files:**
- Modify as needed after verification.

**Interfaces:**
- Consumes: completed static site.
- Produces: pushed GitHub Pages update on `main`.

- [ ] **Step 1: Run full automated verification**

Run: `node --test tests/quiz-engine.test.js tests/quiz-generator.test.js tests/browser-flow.test.js tests/favicon.test.js`
Expected: all tests pass.

- [ ] **Step 2: Render desktop and mobile screenshots**

Use Playwright to open `index.html`, capture mode selection, exam, topic training, and results screens.

- [ ] **Step 3: Commit implementation**

Run: `git add -A && git commit -m "Add adaptive exam trainer modes"`.

- [ ] **Step 4: Push implementation**

Run: `git push origin main`.

- [ ] **Step 5: Check GitHub Pages**

Open `https://ilyaghoul.github.io/cybattack/` with a cache-busting query and verify the new mode selection appears.
