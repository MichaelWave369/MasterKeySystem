import React, { useMemo } from "react";
import lessons from "../data/lessons.json";
import { buildStudyDashboard } from "../dashboard/stats.js";

export default function StudyDashboard({
  currentWeek, completed, notes, bookmarks,
  practiceSessions, recallProgress, onOpenSection,
}) {
  const { weeks, totals, recentSessions, today } = useMemo(
    () => buildStudyDashboard({
      lessons, completed, notes, bookmarks, practiceSessions, recallProgress,
    }),
    [completed, notes, bookmarks, practiceSessions, recallProgress],
  );

  return (
    <section className="reader-card study-dashboard" aria-label="24-week study dashboard">
      <div className="card-top">
        <span className="source-tag">PERSONAL STUDY OVERVIEW · LOCAL ONLY</span>
        <span className="reading-length">24 WEEKS · 240 QUESTIONS</span>
      </div>
      <h2>Your study at a glance</h2>
      <p className="source-note">
        A private overview built from the reading, practice, listening, notes and
        self-rated review history already saved in this browser. There is no
        account or server tracking. All activities are optional.
      </p>

      <div className="dashboard-summary" aria-label="Study totals">
        <div className="dashboard-metric" data-testid="metric-lessons">
          <strong>{totals.complete}<span> / {weeks.length}</span></strong>
          <p>Lessons completed</p>
        </div>
        <div className="dashboard-metric" data-testid="metric-practice">
          <strong>{totals.practiceSessions}</strong>
          <p>Practice sessions logged</p>
        </div>
        <div className="dashboard-metric" data-testid="metric-reviews">
          <strong>{totals.dueReviews}</strong>
          <p>Previously reviewed, due now</p>
        </div>
        <div className="dashboard-metric" data-testid="metric-new">
          <strong>{totals.newQuestions}</strong>
          <p>Questions not yet rated</p>
        </div>
      </div>

      <div className="dashboard-detail-strip">
        <span>{totals.notes} weeks with private notes</span>
        <span>{totals.listeningBookmarks} listening bookmarks beyond passage 1</span>
        <span>{totals.reviewed} / {totals.questionCount} questions self-rated</span>
      </div>
      <p className="source-note">
        Review dates use UTC, as in the Recall Quiz. New questions are counted separately
        from previously studied questions due for another review. Neither number
        indicates factual accuracy or scientific validation of historical claims.
      </p>

      <div className="dashboard-section-head">
        <div>
          <p className="section-kicker">YOUR 24-WEEK MAP</p>
          <h3>Choose where to continue</h3>
        </div>
        <button type="button" className="secondary-button"
          onClick={() => onOpenSection(currentWeek, "read")}>
          Continue current lesson
        </button>
      </div>

      <div className="dashboard-weeks" aria-label="Week-by-week study progress">
        {weeks.map(row => (
          <article key={row.week} className={"dashboard-week" +
            (row.week === currentWeek ? " dashboard-current" : "")} data-testid={"week-" + row.week}>
            <div className="dashboard-week-head">
              <span className="dashboard-week-number">WEEK {String(row.week).padStart(2, "0")}</span>
              {row.complete ? <span className="dashboard-complete">Completed</span>
                : <span className="dashboard-incomplete">Not marked complete</span>}
            </div>
            <h4>{row.title}</h4>
            <p className="dashboard-week-details">
              {row.practiceCount} practice {row.practiceCount === 1 ? "session" : "sessions"}
              <span aria-hidden="true"> · </span>
              {row.reviewed}/{row.questionCount} questions rated
            </p>
            <p className="dashboard-week-details">
              {row.dueReviews} reviews due
              <span aria-hidden="true"> · </span>
              {row.newQuestions} new questions
            </p>
            <p className="dashboard-week-details">
              {row.hasNote ? "Has study notes" : "No notes yet"}
              {row.listeningPassage !== null
                ? " · Listening: passage " + row.listeningPassage : ""}
            </p>
            <div className="dashboard-week-actions">
              <button type="button" onClick={() => onOpenSection(row.week, "read")}
                aria-label={"Read Week " + row.week}>Read</button>
              <button type="button" onClick={() => onOpenSection(row.week, "practice")}
                aria-label={"Practice Week " + row.week}>Practice</button>
              <button type="button" onClick={() => onOpenSection(row.week, "recall")}
                aria-label={"Recall Week " + row.week}>Recall</button>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-recent">
        <p className="section-kicker">RECENT ACTIVITY</p>
        <h3>Practice journal</h3>
        {recentSessions.length === 0 ? (
          <p className="source-note">No sessions logged yet. Your reading and listening can still progress without logging anything.</p>
        ) : (
          <ol className="dashboard-recent-list">
            {recentSessions.map(session => (
              <li key={session.id}>
                <span>Week {session.week} · <time dateTime={session.at}>{new Date(session.at).toLocaleString()}</time></span>
                <button type="button" className="atlas-open"
                  onClick={() => onOpenSection(session.week, "practice")}>
                  Open practice
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="source-note dashboard-dateline">
        Review status calculated for {today} (UTC). Use Export backup at the top
        of the page to keep a portable copy of your progress.
      </p>
    </section>
  );
}
