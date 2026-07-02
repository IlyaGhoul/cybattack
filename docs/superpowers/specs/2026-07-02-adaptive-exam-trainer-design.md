# Adaptive Exam Trainer Design

## Goal

Turn the current static quiz site into a stronger exam trainer for UrFU and SUSU. The site should generate varied practice attempts from a larger question bank, keep the official exam-like formats, and help the student repeat weak topics without requiring a server or login.

## Source Materials

- `Programma_Inf.tekhnologii_i_servisy_2026.pdf`: UrFU exam program. Main areas: information systems, information services, digital data, information security.
- `informaczionnye-tehnologii.pdf`: SUSU exam program. Main areas: information technology concepts, information processes, user technologies, OSI/network topics, client-server, data warehouses, GIS, hypertext, cloud technologies, security, and information society.
- `Информационные технологии и сервисы_УРФУ.html`: UrFU demo format and sample Moodle attempt.
- `Информационные технологии_ЮУРГУ.html`: SUSU demo format and sample Moodle attempt.

The trainer should use these materials as topic and style guidance. New practice questions should be similar in subject and difficulty, but not simple copies of demo questions.

## Modes

### Exam Mode

Exam mode creates a fresh attempt from the bank each time.

- UrFU: 30 questions per attempt.
- SUSU: 20 questions per attempt and a 20-minute timer.
- Questions are sampled by university and topic coverage, then shuffled.
- The same question must not appear twice within one attempt.
- Recently answered questions should be avoided when enough alternatives exist.
- After submission, the page shows score, percentage, wrong answers, correct answers, and topic tags.

### Topic Training Mode

Topic mode lets the student choose a university and a topic.

- Default length: 10 questions.
- No timer by default.
- The result screen shows topic accuracy and recommended next topic.
- A "Repeat mistakes" action builds a short attempt from questions previously answered incorrectly.

## Question Bank

The static bank will live in JavaScript and include question metadata:

- `id`: stable unique id.
- `university`: `urfu` or `susu`.
- `topic`: short topic id.
- `type`: `single`, `multiple`, or `matching`.
- `text`, `options`, `prompts`, and `correct`: compatible with the existing grading engine.
- `explanation`: short explanation shown after checking.

Initial bank target:

- At least 60 UrFU-style questions.
- At least 50 SUSU-style questions.
- Preserve the current demo/practice questions as part of the bank where useful.
- Add enough alternatives so repeated exam attempts vary noticeably.

## Anti-Repetition Logic

Use `localStorage` to store recent question ids and mistake ids.

- `recentQuestionIds`: queue of recently used question ids.
- `mistakeQuestionIds`: ids of questions answered incorrectly.
- If a topic has enough unused questions, exclude recent ids.
- If a topic does not have enough unused questions, allow older recent ids rather than leaving the attempt incomplete.
- Reset history action clears local progress.

## Interface

The first screen keeps the current clean layout but adds two mode cards:

- `Экзамен`: choose UrFU or SUSU, then start a generated attempt.
- `Тренировка по темам`: choose university, topic, and question count.

The quiz screen reuses the current question rendering and result layout. The result screen adds topic-level feedback and actions: `Новый вариант`, `Повторить ошибки`, `К выбору`.

## Error Handling

- If there are not enough questions for a requested topic, the site uses all available questions and shows the actual count.
- If there are no mistakes yet, `Repeat mistakes` is disabled with a short note.
- Skipped questions are incorrect and stored as mistakes.
- Timer expiration in SUSU exam mode auto-submits the current answers.

## Testing

Automated tests should cover:

- Question bank integrity and unique ids.
- Exam generation sizes for UrFU and SUSU.
- No duplicate questions within an attempt.
- Recent-question avoidance when alternatives exist.
- Mistake tracking and repeat-mistakes attempt generation.
- Timer presence in SUSU exam mode.
- Browser smoke flow for selecting both modes.

Manual verification should open the GitHub Pages build locally, run one exam, run one topic training attempt, submit, review explanations, and reset history.
