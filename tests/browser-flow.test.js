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

test("user can select a quiz, submit answers, see results, and reset", async () => {
  const browser = await chromium.launch({
    executablePath: findBrowserExecutable(),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    const fileUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).toString();
    await page.goto(fileUrl);

    await page.waitForSelector('[data-testid="quiz-selector"]');
    assert.equal(await page.locator("[data-quiz-id]").count(), 2);

    await page.click('[data-quiz-id="susu"]');
    await page.waitForSelector('[data-testid="quiz-form"]');
    assert.equal(await page.locator(".question-card").count(), 20);

    await page.locator('.question-card input[type="radio"]').first().check();
    await page.click('[data-testid="submit-quiz"]');

    await page.waitForSelector('[data-testid="result-panel"]');
    await assert.match(await page.locator('[data-testid="score"]').innerText(), /из 20/);
    await assert.match(await page.locator('[data-testid="score-percent"]').innerText(), /%/);

    await page.click('[data-testid="reset-quiz"]');
    await page.waitForSelector('[data-testid="quiz-selector"]');
  } finally {
    await browser.close();
  }
});
