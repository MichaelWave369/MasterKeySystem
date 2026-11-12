import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lessons = JSON.parse(readFileSync(new URL("../src/data/lessons.json", import.meta.url), "utf8"));
assert.equal(lessons.length, 24, "The edition must include all 24 parts.");
for (const [index, lesson] of lessons.entries()) {
  assert.equal(lesson.week, index + 1, "Parts must be ordered 1 through 24.");
  assert.ok(lesson.reading.length > 8000, "Lesson " + lesson.week + " is missing its original reading.");
  assert.ok(lesson.study.length > 500, "Lesson " + lesson.week + " is missing study material.");
  assert.equal((lesson.study.match(/^\d+\.\s/gm) || []).length, 10, "Lesson " + lesson.week + " must include 10 questions.");
  assert.ok(!/PARSED TEXT FOR PAGE|mind-your-reality\.com/i.test(lesson.reading + lesson.study), "Source extraction artifact found in lesson " + lesson.week);
}
console.log("Verified 24 lessons and 240 study questions.");
