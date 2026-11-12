import test from "node:test";
import assert from "node:assert/strict";
import { speechChunks, clampPassageIndex } from "../src/reader/speechText.js";

test("narration chunks keep the source wording in order", () => {
  const source = "One sentence. Two sentences of historical text. " +
    "This passage discusses the inner world and the outer world ".repeat(16);
  const chunks = speechChunks(source);
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every(text => text.length <= 220 && text.length > 0));
  assert.equal(chunks.join(" "), source.replace(/\s+/g, " ").trim());
});

test("empty and whitespace-only passages are silent", () => {
  assert.deepEqual(speechChunks(" \n  "), []);
  assert.deepEqual(speechChunks(""), []);
});

test("long single tokens are bounded to prevent oversized utterances", () => {
  const chunks = speechChunks("x".repeat(650), 220);
  assert.deepEqual(chunks.map(chunk => chunk.length), [220, 220, 210]);
  assert.equal(chunks.join(""), "x".repeat(650));
});

test("passage selection stays within this lesson", () => {
  assert.equal(clampPassageIndex(-9, 24), 0);
  assert.equal(clampPassageIndex(5, 24), 5);
  assert.equal(clampPassageIndex(99, 24), 23);
  assert.equal(clampPassageIndex(NaN, 24), 0);
  assert.equal(clampPassageIndex(7, 0), 0);
});
