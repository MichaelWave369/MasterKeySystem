import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBookIndex, findBookMatches, literalHighlightParts, normalizeSearchTerm }
  from "../src/search/search.js";
import { splitPassages } from "../src/concepts.js";
import { parsePrintedQuestions } from "../src/quiz/recall.js";

const lessons = JSON.parse(readFileSync(new URL("../src/data/lessons.json", import.meta.url), "utf8"));
const index = buildBookIndex(lessons);

test("indexes every original lesson passage and exactly 240 printed Q&A cards", () => {
  assert.equal(index.filter(item => item.kind === "question").length, 240);
  assert.equal(new Set(index.map(item => item.key)).size, index.length);
  for (const lesson of lessons) {
    assert.equal(index.filter(item => item.kind === "reading" && item.week === lesson.week).length,
      splitPassages(lesson.reading).length);
    assert.equal(index.filter(item => item.kind === "question" && item.week === lesson.week).length,
      parsePrintedQuestions(lesson.study, lesson.week).length);
  }
});

test("each result resolves to its exact original source and a true literal match", () => {
  for (const searchTerm of ["world within", "cause", "concentration", "imagination", "Universal Mind"]) {
    const matches = findBookMatches(index, searchTerm);
    assert.ok(matches.length > 0, searchTerm + " should match");
    for (const match of matches) {
      const lesson = lessons.find(item => item.week === match.week);
      const source = match.kind === "reading"
        ? splitPassages(lesson.reading)[match.position - 1]
        : parsePrintedQuestions(lesson.study, lesson.week)[match.position - 1];
      assert.ok(source, "link position exists");
      const text = match.kind === "reading" ? source : source.question + " " + source.answer;
      assert.equal(match.text, text);
      assert.ok(text.toLowerCase().includes(searchTerm.toLowerCase()));
      assert.ok(match.excerpt.toLowerCase().includes(searchTerm.toLowerCase()));
    }
  }
});

test("search is literal, never executes a regular expression", () => {
  assert.deepEqual(findBookMatches(index, ""), []);
  assert.deepEqual(findBookMatches(index, "x"), []);
  assert.doesNotThrow(() => findBookMatches(index, ".*("));
  assert.ok(findBookMatches(index, "world within", "reading").every(x => x.kind === "reading"));
  assert.ok(findBookMatches(index, "world within", "question").every(x => x.kind === "question"));
  assert.equal(normalizeSearchTerm("   world   within  "), "world within");
});

test("display highlighting preserves every original character without HTML insertion", () => {
  const text = 'The world <within> and WORLD within. \u0026 calm.';
  const pieces = literalHighlightParts(text, "world");
  assert.equal(pieces.map(piece => piece.text).join(""), text);
  assert.equal(pieces.filter(piece => piece.match).length, 2);
  assert.deepEqual(literalHighlightParts("A (x) B", "(x)").filter(piece => piece.match),
    [{ text: "(x)", match: true }]);
});
