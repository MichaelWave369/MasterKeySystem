import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRecallDeck, isDue, nextReview } from "../src/quiz/recall.js";

const lessons = JSON.parse(readFileSync(new URL("../src/data/lessons.json", import.meta.url), "utf8"));
const cards = buildRecallDeck(lessons);

test("exactly 240 unique original study questions, ten per week", () => {
  assert.equal(cards.length, 240);
  assert.equal(new Set(cards.map(card => card.key)).size, 240);
  for (let week = 1; week <= 24; week++) {
    const part = cards.filter(card => card.week === week);
    assert.equal(part.length, 10, "Week " + week);
    assert.deepEqual(part.map(card => card.number),
      Array.from({ length: 10 }, (_, i) => (week - 1) * 10 + i + 1));
    assert.ok(part.every(card => card.question.endsWith("?") && card.answer.length > 0));
  }
  assert.equal(cards[0].question, "What is the world without in its relation to the world within?");
  assert.equal(cards[10].question, "What are the two modes of mental activity?");
});

test("all source answers stay exactly in source order and wording (normalized whitespace only)", () => {
  for (const lesson of lessons) {
    const questions = cards.filter(card => card.week === lesson.week);
    const originalBlocks = lesson.study.split(/(?=^\d+\.\s)/gm)
      .filter(block => /^\d+\.\s/.test(block.trim()));
    for (let i = 0; i < questions.length; i++) {
      const cleaned = originalBlocks[i].replace(/\s+/g, " ").trim();
      assert.equal(questions[i].number + ". " + questions[i].question + " " + questions[i].answer, cleaned);
    }
  }
});

test("review outcomes use predictable UTC schedule", () => {
  const now = new Date("2026-11-12T22:00:00.000Z");
  const one = nextReview(null, "recalled", now);
  assert.deepEqual(one, { streak: 1, reviewedAt: "2026-11-12", dueOn: "2026-11-13" });
  const two = nextReview(one, "recalled", now);
  assert.equal(two.dueOn, "2026-11-15");
  const three = nextReview(two, "recalled", now);
  assert.equal(three.dueOn, "2026-11-19");
  assert.equal(nextReview(three, "again", now).dueOn, "2026-11-12");
  assert.equal(isDue(two, "2026-11-14"), false);
  assert.equal(isDue(two, "2026-11-15"), true);
  assert.equal(isDue(undefined, "2026-11-12"), true);
});
