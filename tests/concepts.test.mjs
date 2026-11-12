import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONCEPTS, splitPassages, buildConceptIndex } from "../src/concepts.js";

const lessons = JSON.parse(readFileSync(new URL("../src/data/lessons.json", import.meta.url), "utf8"));
const index = buildConceptIndex(lessons);

test("all editorial concepts have literal matches in the source", () => {
  assert.equal(CONCEPTS.length, 10);
  assert.equal(new Set(CONCEPTS.map(x => x.id)).size, CONCEPTS.length);
  for (const concept of CONCEPTS) {
    assert.ok(index[concept.id].length > 0, "no matches for " + concept.id);
  }
});

test("every linked passage resolves to its original text and matching keyword", () => {
  for (const concept of CONCEPTS) {
    for (const entry of index[concept.id]) {
      const lesson = lessons.find(item => item.week === entry.week);
      assert.ok(lesson, "missing week " + entry.week);
      const passage = splitPassages(lesson.reading)[entry.passage - 1];
      assert.ok(passage, "missing linked passage " + entry.passage);
      assert.ok(concept.pattern.test(passage),
        concept.id + " not actually present in source passage");
      assert.ok(passage.includes(entry.matchedTerm), "matched term not found verbatim");
    }
  }
});

test("passage splitting preserves all reading content in order", () => {
  const source = "One\nline\n\nTwo\nlines\n\nThree.";
  assert.deepEqual(splitPassages(source), ["One line", "Two lines", "Three."]);
  assert.ok(splitPassages(lessons[0].reading).length > 15);
});
