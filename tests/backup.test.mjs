import test from "node:test";
import assert from "node:assert/strict";
import { createBackup, parseBackup } from "../src/backup.js";

test("round-trips notes, progress, and selected week", () => {
  const original = createBackup({
    notes: { 1: "Observed stillness", 24: "Questions to investigate" },
    completed: [3, 1, 3],
    week: 24,
  });
  assert.deepEqual(parseBackup(JSON.stringify(original)), {
    notes: { 1: "Observed stillness", 24: "Questions to investigate" },
    completed: [1, 3],
    week: 24,
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
