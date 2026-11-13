// Reader-created references, never a copy of or modification to source text.
// The printed source is resolved from the bundled, immutable lesson index.
export const MAX_SAVED = 200;
export const MAX_PERSONAL_NOTE = 2000;

export function cleanSavedSources(raw) {
  if (!Array.isArray(raw) || raw.length > MAX_SAVED)
    throw new Error("Saved sources must be a list of at most 200 entries.");
  const used = new Set();
  return raw.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        typeof item.id !== "string" ||
        !/^[pq]:(?:[1-9]|1[0-9]|2[0-4]):(?:[1-9][0-9]{0,3})$/.test(item.id) ||
        used.has(item.id) || item.id.startsWith("q:") && Number(item.id.split(":")[2]) > 10 ||
        typeof item.note !== "string" || item.note.length > MAX_PERSONAL_NOTE ||
        typeof item.savedAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.savedAt) ||
        Number.isNaN(Date.parse(item.savedAt))) {
      throw new Error("A saved source has an invalid location, date, or private note.");
    }
    used.add(item.id);
    return { id: item.id, note: item.note, savedAt: item.savedAt };
  });
}

export function addSource(existing, id, at = new Date().toISOString()) {
  if (existing.some(item => item.id === id)) return existing;
  if (existing.length >= MAX_SAVED) return existing;
  return cleanSavedSources([...existing, { id, note: "", savedAt: at }]);
}

export function updateSourceNote(existing, id, note) {
  return existing.map(item => item.id === id
    ? { ...item, note: String(note).slice(0, MAX_PERSONAL_NOTE) }
    : item);
}

export function sourceLink(id) {
  const [kind, week, position] = id.split(":");
  return "#week-" + week + "-" + kind + "-" + position;
}
