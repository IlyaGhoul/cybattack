const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("site declares an SVG favicon", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /<link\s+rel="icon"\s+href="favicon\.svg"\s+type="image\/svg\+xml"\s*\/?>/);
});

test("favicon is a square SVG image", () => {
  const svg = fs.readFileSync(path.join(__dirname, "..", "favicon.svg"), "utf8");

  assert.match(svg, /<svg[^>]+viewBox="0 0 64 64"/);
  assert.match(svg, /IT/);
});
