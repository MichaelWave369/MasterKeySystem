import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildStudyDashboard } from "../src/dashboard/stats.js";

const lessons = JSON.parse(readFileSync(new URL("../src/data/lessons.json", import.meta.url), "utf8"));
const compute = overrides => buildStudyDashboard({ lessons, today: "2026-11-12", ...overrides });

test("blank dashboard distinguishes all 240 new questions from reviews due", () => {
  const { weeks, totals, recentSessions } = compute({});
  assert.equal(weeks.length, 24);
  assert.equal(totals.complete, 0);
  assert.equal(totals.practiceSessions, 0);
  assert.equal(totals.reviewed, 0);
  assert.equal(totals.newQuestions, 240);
  assert.equal(totals.dueReviews, 0);
  assert.deepEqual(recentSessions, []);
  assert.ok(weeks.every(week => week.questionCount === 10 && week.newQuestions === 10));
});

test("summary aggregates per-week notes, bookmarks, practice and recall accurately", () => {
  const { weeks, totals, recentSessions } = compute({
    completed: [1, 6],
    notes: { 1: " My thoughts ", 2: "  " },
    bookmarks: { 1: 9, 6: 1, 9: 9999 },
    practiceSessions: [
      { id: "a", week: 6, at: "2026-11-11T12:00:00.000Z" },
      { id: "b", week: 1, at: "2026-11-12T12:00:00.000Z" },
      { id: "c", week: 1, at: "2026-11-10T12:00:00.000Z" },
    ],
    recallProgress: {
      "1:1": { streak: 1, reviewedAt: "2026-11-10", dueOn: "2026-11-11" },
      "1:2": { streak: 2, reviewedAt: "2026-11-12", dueOn: "2026-11-15" },
    },
  });
  assert.equal(totals.complete, 2);
  assert.equal(totals.practiceSessions, 3);
  assert.equal(totals.notes, 1);
  assert.equal(totals.listeningBookmarks, 2);
  assert.equal(totals.reviewed, 2);
  assert.equal(totals.newQuestions, 238);
  assert.equal(totals.dueReviews, 1);
  assert.equal(weeks[0].practiceCount, 2);
  assert.equal(weeks[0].dueReviews, 1);
  assert.equal(weeks[5].practiceCount, 1);
  assert.equal(weeks[5].listeningPassage, null);
  assert.equal(recentSessions[0].id, "b");
});

test("future review dates never get labeled due", () => {
  const result = compute({
    recallProgress: {
      "24:10": { streak: 4, reviewedAt: "2026-11-12", dueOn: "2026-11-26" },
    },
  });
  assert.equal(result.weeks[23].newQuestions, 9);
  assert.equal(result.weeks[23].dueReviews, 0);
});
