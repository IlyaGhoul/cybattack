const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const test = require("node:test");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    const pnpmRoot = path.join(
      os.homedir(),
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
      ".pnpm",
    );
    const packageDir = fs.readdirSync(pnpmRoot).find((name) => /^playwright@/.test(name));

    if (!packageDir) {
      throw error;
    }

    return require(path.join(pnpmRoot, packageDir, "node_modules", "playwright"));
  }
}

const { chromium } = loadPlaywright();

function findBrowserExecutable() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function withPage(callback) {
  const browser = await chromium.launch({
    executablePath: findBrowserExecutable(),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    const fileUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).toString();
    await page.goto(fileUrl);
    await callback(page);
  } finally {
    await browser.close();
  }
}

test("user can run a generated SUSU exam with timer and result actions", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    assert.equal(await page.locator('[data-mode="exam"]').count(), 1);
    assert.equal(await page.locator('[data-mode="topic"]').count(), 1);

    await page.click('[data-mode="exam"]');
    await page.click('[data-start-exam="susu"]');
    await page.waitForSelector('[data-testid="quiz-form"]');

    assert.equal(await page.locator(".question-card").count(), 20);
    await assert.match(await page.locator('[data-testid="timer"]').innerText(), /20:00/);

    await page.locator('.question-card input[type="radio"]').first().check();
    await page.click('[data-testid="submit-quiz"]');

    await page.waitForSelector('[data-testid="result-panel"]');
    await assert.match(await page.locator('[data-testid="score"]').innerText(), /из 20/);
    assert.equal(await page.locator('[data-action="new-attempt"]').count(), 1);
    assert.equal(await page.locator('[data-action="repeat-mistakes"]').count(), 1);
  });
});

test("user can run topic training and return to mode selection", async () => {
  await withPage(async (page) => {
    await page.waitForSelector('[data-testid="mode-selector"]');
    await page.click('[data-mode="topic"]');
    await page.waitForSelector('[data-testid="topic-setup"]');

    await page.selectOption('[data-testid="topic-university"]', "urfu");
    await page.selectOption('[data-testid="topic-select"]', "security");
    await page.click('[data-testid="start-topic"]');

    await page.waitForSelector('[data-testid="quiz-form"]');
    assert.equal(await page.locator(".question-card").count(), 10);

    await page.click('[data-testid="submit-quiz"]');
    await page.waitForSelector('[data-testid="result-panel"]');
    await assert.match(await page.locator('[data-testid="topic-summary"]').innerText(), /Информационная безопасность/);

    await page.click('[data-action="reset"]');
    await page.waitForSelector('[data-testid="mode-selector"]');
  });
});
