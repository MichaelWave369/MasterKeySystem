// Editorial recall tools, not a substitute for reading the original lesson.
// Questions and answers are copied from the historical study section, never generated.
export function parsePrintedQuestions(study, week) {
  return study.split(/(?=^\d+\.\s)/gm)
    .filter(block => /^\d+\.\s/.test(block.trim()))
    .map(block => {
      const match = block.trim().match(/^(\d+)\.\s*([\s\S]*?\?)([\s\S]*)$/);
      if (!match) return null;
      const number = Number(match[1]);
      return {
        key: week + ":" + number,
        week,
        number,
        question: match[2].replace(/\s+/g, " ").trim(),
        answer: match[3].replace(/\s+/g, " ").trim(),
      };
    }).filter(Boolean);
}

export function buildRecallDeck(lessons) {
  return lessons.flatMap(lesson => parsePrintedQuestions(lesson.study, lesson.week));
}

export function utcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day, count) {
  const start = new Date(day + "T00:00:00.000Z");
  start.setUTCDate(start.getUTCDate() + count);
  return utcDate(start);
}

// A transparent, deliberately simple review schedule, not "AI grading":
// first recalled -> tomorrow; then 3, 7, 14, and 30-day intervals.
export function nextReview(previous, outcome, date = new Date()) {
  if (!["again", "recalled"].includes(outcome)) throw new Error("Unknown review result");
  const today = utcDate(date);
  const streak = outcome === "again" ? 0 : Math.min(5, (previous?.streak || 0) + 1);
  const intervalDays = outcome === "again" ? 0 : [1, 3, 7, 14, 30][streak - 1];
  return { streak, reviewedAt: today, dueOn: addUtcDays(today, intervalDays) };
}

export function isDue(record, today = utcDate()) {
  return !record || record.dueOn <= today;
}
