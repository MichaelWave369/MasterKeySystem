const FORMAT = "master-key-system-study-backup";
const VERSION = 1;
const MAX_TEXT_SIZE = 1024 * 1024;
const MAX_NOTE_LENGTH = 50000;
const WEEK_COUNT = 24;

function validWeek(value) {
  return Number.isInteger(value) && value >= 1 && value <= WEEK_COUNT;
}
function cleanNotes(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Backup notes must be an object.");
  const clean = {};
  for (const [key, value] of Object.entries(raw)) {
    const week = Number(key);
    if (!/^(?:[1-9]|1[0-9]|2[0-4])$/.test(key) || !validWeek(week))
      throw new Error("Backup contains an invalid week number.");
    if (typeof value !== "string" || value.length > MAX_NOTE_LENGTH)
      throw new Error("A note is not text or is too long.");
    clean[week] = value;
  }
  return clean;
}
function cleanCompleted(raw) {
  if (!Array.isArray(raw) || raw.some(week => !validWeek(week)))
    throw new Error("Completed lessons must be numbers from 1 through 24.");
  return [...new Set(raw)].sort((a, b) => a - b);
}
function cleanBookmarks(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Listening bookmarks must be an object.");
  const clean = {};
  for (const [key, passage] of Object.entries(raw)) {
    if (!/^(?:[1-9]|1[0-9]|2[0-4])$/.test(key) ||
        !Number.isInteger(passage) || passage < 1 || passage > 2000)
      throw new Error("A listening bookmark has an invalid week or passage.");
    clean[key] = passage;
  }
  return clean;
}
export function createBackup({ notes, completed, week, bookmarks = {} }) {
  if (!validWeek(week)) throw new Error("Selected lesson is invalid.");
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    week,
    notes: cleanNotes(notes),
    completed: cleanCompleted(completed),
    bookmarks: cleanBookmarks(bookmarks),
  };
}
export function parseBackup(text) {
  if (typeof text !== "string" || text.length > MAX_TEXT_SIZE)
    throw new Error("Backup exceeds the 1 MB safety limit.");
  let backup;
  try { backup = JSON.parse(text); }
  catch { throw new Error("This file is not valid JSON."); }
  if (!backup || typeof backup !== "object" || Array.isArray(backup) ||
      backup.format !== FORMAT || backup.version !== VERSION)
    throw new Error("This is not a compatible Master Key System backup.");
  if (!validWeek(backup.week))
    throw new Error("The saved lesson number is invalid.");
  return {
    week: backup.week,
    notes: cleanNotes(backup.notes),
    completed: cleanCompleted(backup.completed),
    // Version 1 exports before Audio Bookmarks did not include this optional field.
    bookmarks: cleanBookmarks(backup.bookmarks ?? {}),
  };
}
