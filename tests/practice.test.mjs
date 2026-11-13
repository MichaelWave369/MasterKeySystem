import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildExerciseIndex } from "../src/practice/exercises.js";
import { splitPassages } from "../src/concepts.js";

const lessons = JSON.parse(readFileSync(new URL("../src/data/lessons.json", import.meta.url), "utf8"));
const index = buildExerciseIndex(lessons);

test("source-backed weekly exercise index covers all 24 lessons", () => {
  assert.equal(index.length, 24);
  assert.ok(index.every(Boolean), "Every exercise cue must locate a source passage");
  assert.deepEqual(index.map(item => item.week), Array.from({ length: 24 }, (_, i) => i + 1));
});

test("every exercise quotation equals an unmodified source passage", () => {
  for (const exercise of index) {
    const source = splitPassages(lessons[exercise.week - 1].reading);
    assert.ok(exercise.passages.length > 0);
    for (const passage of exercise.passages) {
      assert.equal(passage.text, source[passage.passageNumber - 1]);
    }
  }
});

test("early, middle, and final original exercise passages resolve accurately", () => {
  assert.match(index[0].passages[0].text, /44\. Now make the application:/);
  assert.match(index[5].passages[0].text, /photograph with you/);
  assert.match(index[8].passages[0].text, /32\. This week visualize a plant/);
  assert.match(index[23].passages[0].text, /31\. This week, try to realize/);
});

test("missing or shifted source cues never manufacture replacement text", () => {
  const altered = lessons.map(item => ({ ...item }));
  altered[0] = { ...altered[0], reading: "Unrelated text, no historical exercise." };
  assert.equal(buildExerciseIndex(altered)[0], null);
  assert.ok(buildExerciseIndex(altered).slice(1).every(Boolean));
});
