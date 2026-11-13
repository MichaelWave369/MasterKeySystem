import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addSource, cleanSavedSources, updateSourceNote, sourceLink }
  from "../src/shelf/savedSources.js";
import { buildBookIndex } from "../src/search/search.js";

const lessons = JSON.parse(readFileSync(new URL("../src/data/lessons.json", import.meta.url), "utf8"));
const locations = new Map(buildBookIndex(lessons).map(item => [item.key, item]));
const at = "2026-11-13T02:00:00.000Z";

test("passage and printed-question bookmarks resolve to exact source locations", () => {
  for (const id of ["p:1:1", "p:24:1", "q:1:1", "q:13:7", "q:24:10"]) {
    assert.ok(locations.has(id), "source missing: " + id);
    assert.match(sourceLink(id), /^#week-\d+-(?:p|q)-\d+$/);
  }
  assert.equal(sourceLink("q:13:7"), "#week-13-q-7");
  assert.equal(locations.get("q:13:7").number, 27); // printed source irregularity preserved
});

test("saved source operations preserve a separate private note and ignore duplicates", () => {
  const first = addSource([], "p:1:1", at);
  assert.deepEqual(first, [{ id: "p:1:1", note: "", savedAt: at }]);
  assert.deepEqual(addSource(first, "p:1:1", at), first);
  const changed = updateSourceNote(first, "p:1:1", "My independent interpretation");
  assert.equal(changed[0].note, "My independent interpretation");
  assert.equal(locations.get(changed[0].id).text, locations.get("p:1:1").text);
});

test("saved source imports reject unsafe or oversized content", () => {
  for (const values of [
    [{ id: "p:25:1", note: "", savedAt: at }],
    [{ id: "q:1:11", note: "", savedAt: at }],
    [{ id: "p:1:1", note: "a".repeat(2001), savedAt: at }],
    [{ id: "p:1:1", note: "", savedAt: "not a date" }],
    [{ id: "p:1:1", note: "", savedAt: at }, { id: "p:1:1", note: "", savedAt: at }],
    [{ id: "__proto__:1:1", note: "", savedAt: at }],
    Array.from({ length: 201 }, (_, i) => ({ id: "p:1:" + (i + 1), note: "", savedAt: at })),
  ]) assert.throws(() => cleanSavedSources(values), /Saved sources|saved source/);
  assert.deepEqual(cleanSavedSources([]), []);
});
