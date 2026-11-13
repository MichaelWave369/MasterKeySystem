import test from "node:test";
import assert from "node:assert/strict";
import { createBackup, parseBackup } from "../src/backup.js";

test("round-trips notes, progress, and selected week", () => {
  const original = createBackup({
    notes: { 1: "Observed stillness", 24: "Questions to investigate" },
    completed: [3, 1, 3],
    week: 24,
    bookmarks: { 1: 12, 24: 6 },
    practiceSessions: [{ id: "study-abc", week: 24, at: "2026-11-12T12:30:00.000Z" }],
  });
  assert.deepEqual(parseBackup(JSON.stringify(original)), {
    notes: { 1: "Observed stillness", 24: "Questions to investigate" },
    completed: [1, 3],
    week: 24,
    bookmarks: { 1: 12, 24: 6 },
    practiceSessions: [{ id: "study-abc", week: 24, at: "2026-11-12T12:30:00.000Z" }],
  });
});

test("rejects malformed and unrelated JSON", () => {
  assert.throws(() => parseBackup("{"), /valid JSON/);
  assert.throws(() => parseBackup('{"foo":"bar"}'), /compatible/);
});

test("rejects out-of-range lesson numbers", () => {
  const payload = createBackup({ notes: {}, completed: [], week: 1 });
  payload.completed = [0, 25];
  assert.throws(() => parseBackup(JSON.stringify(payload)), /numbers/);
  payload.completed = [];
  payload.notes = { 25: "out-of-range" };
  assert.throws(() => parseBackup(JSON.stringify(payload)), /week number/);
});

test("rejects prototype pollution keys", () => {
  const payload = createBackup({ notes: {}, completed: [], week: 1 });
  payload.notes = JSON.parse('{"__proto__":"bad"}');
  assert.throws(() => parseBackup(JSON.stringify(payload)), /week number/);
  assert.equal(Object.prototype.bad, undefined);
});

test("limits oversized backups and notes", () => {
  const payload = createBackup({ notes: {}, completed: [], week: 1 });
  assert.throws(() => parseBackup("x".repeat(1024 * 1024 + 1)), /1 MB/);
  payload.notes = { 2: "a".repeat(50001) };
  assert.throws(() => parseBackup(JSON.stringify(payload)), /too long/);
});


test("accepts earlier v1 backups without audio bookmarks", () => {
  const backup = createBackup({ notes: { 2: "Old note" }, completed: [2], week: 2 });
  delete backup.bookmarks;
  assert.deepEqual(parseBackup(JSON.stringify(backup)), {
    week: 2, notes: { 2: "Old note" }, completed: [2], bookmarks: {}, practiceSessions: [],
  });
});

test("rejects invalid listening bookmarks and prototype keys", () => {
  const backup = createBackup({ notes: {}, completed: [], week: 1, bookmarks: { 1: 5 } });
  backup.bookmarks = { 25: 2 };
  assert.throws(() => parseBackup(JSON.stringify(backup)), /listening bookmark/);
  backup.bookmarks = { 1: -3 };
  assert.throws(() => parseBackup(JSON.stringify(backup)), /listening bookmark/);
  backup.bookmarks = JSON.parse('{"__proto__":12}');
  assert.throws(() => parseBackup(JSON.stringify(backup)), /listening bookmark/);
  assert.equal(Object.prototype.polluted, undefined);
});


test("imports older backups without a practice history", () => {
  const original = createBackup({ notes: {}, completed: [5], bookmarks: {}, week: 5 });
  delete original.practiceSessions;
  assert.deepEqual(parseBackup(JSON.stringify(original)).practiceSessions, []);
});

test("rejects malformed, oversized, and unsafe practice history", () => {
  const original = createBackup({ notes: {}, completed: [], week: 1 });
  original.practiceSessions = [{ id: "ok", week: 25, at: "2026-11-12T12:30:00.000Z" }];
  assert.throws(() => parseBackup(JSON.stringify(original)), /Practice history/);
  original.practiceSessions = [{ id: "__proto__", week: 1, at: "invalid date" }];
  assert.throws(() => parseBackup(JSON.stringify(original)), /Practice history/);
  original.practiceSessions = Array.from({ length: 2001 }, () => ({ id: "ok", week: 1, at: "2026-11-12T12:30:00.000Z" }));
  assert.throws(() => parseBackup(JSON.stringify(original)), /Practice history/);
});
