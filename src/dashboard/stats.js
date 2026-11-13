import { buildRecallDeck, utcDate } from "../quiz/recall.js";
import { splitPassages } from "../concepts.js";

// The dashboard is derived entirely from the existing local study data.
// It creates no tracking service, user account, or additional storage schema.
export function buildStudyDashboard({
  lessons,
  completed = [],
  notes = {},
  bookmarks = {},
  practiceSessions = [],
  recallProgress = {},
  today = utcDate(),
}) {
  const deck = buildRecallDeck(lessons);
  const rows = lessons.map(lesson => {
    const week = lesson.week;
    const cards = deck.filter(card => card.week === week);
    const practiceCount = practiceSessions.filter(s => s.week === week).length;
    const note = typeof notes[week] === "string" && notes[week].trim().length > 0;
    const passages = splitPassages(lesson.reading).length;
    const rawBookmark = bookmarks[week];
    const listeningPassage = Number.isInteger(rawBookmark) && rawBookmark > 1
      ? Math.min(rawBookmark, passages)
      : null;
    const reviewed = cards.filter(card => Boolean(recallProgress[card.key])).length;
    const dueReviews = cards.filter(card => {
      const review = recallProgress[card.key];
      return Boolean(review && review.dueOn <= today);
    }).length;
    const newQuestions = cards.length - reviewed;
    return {
      week, title: lesson.title, complete: completed.includes(week),
      practiceCount, hasNote: note, listeningPassage,
      reviewed, dueReviews, newQuestions,
      questionCount: cards.length,
    };
  });

  const recentSessions = practiceSessions
    .filter(item => lessons.some(lesson => lesson.week === item.week))
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  const totals = {
    complete: rows.filter(row => row.complete).length,
    practiceSessions: rows.reduce((total, row) => total + row.practiceCount, 0),
    notes: rows.filter(row => row.hasNote).length,
    listeningBookmarks: rows.filter(row => row.listeningPassage !== null).length,
    reviewed: rows.reduce((total, row) => total + row.reviewed, 0),
    dueReviews: rows.reduce((total, row) => total + row.dueReviews, 0),
    newQuestions: rows.reduce((total, row) => total + row.newQuestions, 0),
    questionCount: deck.length,
  };
  return { weeks: rows, totals, recentSessions, today };
}
