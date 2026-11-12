// Keep the source text's wording. Split into smaller utterances because
// several browsers silently cut off very long speech synthesis utterances.
export function speechChunks(source, maxLength = 220) {
  if (!Number.isInteger(maxLength) || maxLength < 10) throw new Error("Invalid speech chunk length");
  const words = String(source ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks = [];
  let current = "";
  function flush() {
    if (current) chunks.push(current);
    current = "";
  }
  for (const word of words) {
    if (word.length > maxLength) {
      flush();
      for (let i = 0; i < word.length; i += maxLength) chunks.push(word.slice(i, i + maxLength));
      continue;
    }
    if (!current) {
      current = word;
    } else if (current.length + word.length + 1 <= maxLength) {
      current += " " + word;
    } else {
      flush();
      current = word;
    }
  }
  flush();
  return chunks;
}

export function clampPassageIndex(index, length) {
  if (!length) return 0;
  return Math.max(0, Math.min(length - 1, Number.isInteger(index) ? index : 0));
}
