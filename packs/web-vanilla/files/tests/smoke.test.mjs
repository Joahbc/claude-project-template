// Smoke test: the main files exist and the page has the basics.
// Extend with playwright-core browser checks as the site grows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const indexUrl = new URL("../index.html", import.meta.url);
const skip = existsSync(indexUrl) ? false : "no index.html yet";

test("index.html has a title, viewport and lang", { skip }, async () => {
  const html = await readFile(indexUrl, "utf8");
  assert.match(html, /<title>[^<]+<\/title>/, "missing <title>");
  assert.match(html, /name="viewport"/, "missing viewport meta");
  assert.match(html, /<html[^>]*lang="/, "missing lang attribute");
});
