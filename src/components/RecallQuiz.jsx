import React, { useMemo, useState } from "react";
import lessons from "../data/lessons.json";
import { buildRecallDeck, isDue, utcDate } from "../quiz/recall.js";

const DECK = buildRecallDeck(lessons);

export default function RecallQuiz({ week, progress, onReview }) {
  const [scope, setScope] = useState("week");
  const [filter, setFilter] = useState("due");
  const [seen, setSeen] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState("");

  const today = utcDate();
  const scoped = useMemo(
    () => scope === "week" ? DECK.filter(card => card.week === week) : DECK,
    [scope, week],
  );
  const due = scoped.filter(card => isDue(progress[card.key], today));
  const candidates = (filter === "due" ? due : scoped).filter(card => !seen.includes(card.key));
  const card = candidates[0];
  const remembered = scoped.filter(item => (progress[item.key]?.streak || 0) >= 1).length;

  function resetRound() {
    setSeen([]);
    setRevealed(false);
    setDraft("");
  }

  function selectScope(value) {
    setScope(value);
    resetRound();
  }

  function selectFilter(value) {
    setFilter(value);
    resetRound();
  }

  function rate(outcome) {
    if (!card || !revealed) return;
    onReview(card.key, outcome);
    setSeen(previous => [...previous, card.key]);
    setRevealed(false);
    setDraft("");
  }

  return (
    <section className="reader-card recall-view" aria-label="Active recall study cards">
      <div className="card-top">
        <span className="source-tag">HISTORICAL QUESTIONS · MODERN REVIEW TOOL</span>
        <span className="reading-length">{DECK.length} ORIGINAL QUESTIONS</span>
      </div>
      <h2>Active recall</h2>
      <p className="source-note">
        Try to recall or draft your answer before revealing Haanel's original printed response.
        Your assessment is entirely your own; it does not verify the historical claims or
        grade what is scientifically true. Your temporary draft is never saved or uploaded.
      </p>

      <div className="recall-switches" aria-label="Recall quiz settings">
        <div className="recall-switch-group" role="group" aria-label="Question scope">
          <button type="button" aria-pressed={scope === "week"}
            className={scope === "week" ? "recall-active" : ""}
            onClick={() => selectScope("week")}>This week</button>
          <button type="button" aria-pressed={scope === "all"}
            className={scope === "all" ? "recall-active" : ""}
            onClick={() => selectScope("all")}>All 24 weeks</button>
        </div>
        <div className="recall-switch-group" role="group" aria-label="Review filter">
          <button type="button" aria-pressed={filter === "due"}
            className={filter === "due" ? "recall-active" : ""}
            onClick={() => selectFilter("due")}>Due now</button>
          <button type="button" aria-pressed={filter === "all"}
            className={filter === "all" ? "recall-active" : ""}
            onClick={() => selectFilter("all")}>All questions</button>
        </div>
      </div>

      <div className="recall-stat-row">
        <span><strong>{scoped.length}</strong> questions in scope</span>
        <span><strong>{due.length}</strong> due today</span>
        <span><strong>{remembered}</strong> recalled before</span>
      </div>

      {card ? (
        <article className="recall-card" key={card.key}>
          <p className="recall-index">PART {card.week} · ORIGINAL QUESTION {card.number}</p>
          <h3>{card.question}</h3>
          <label htmlFor="recall-draft" className="notes-label">YOUR PRIVATE, TEMPORARY RECALL</label>
          <textarea id="recall-draft" className="notes-area recall-draft" rows={4} value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder="Try an answer from memory, or think it through before revealing..."
            maxLength={3000} />
          {!revealed ? (
            <button type="button" className="primary-button"
              onClick={() => setRevealed(true)}>Reveal printed answer</button>
          ) : (
            <div className="recall-answer">
              <p className="source-tag">ORIGINAL PRINTED ANSWER · NOT VERIFIED FACT</p>
              <blockquote>{card.answer}</blockquote>
              <p className="source-note">
                Did your response resemble what the historical author wrote?
                Choose how soon to review again. This is self-assessment, not automatic grading.
              </p>
              <div className="recall-review-actions">
                <button type="button" className="secondary-button" onClick={() => rate("again")}>
                  Review again
                </button>
                <button type="button" className="primary-button" onClick={() => rate("recalled")}>
                  I recalled it
                </button>
              </div>
            </div>
          )}
          <p className="source-note recall-local-note">
            Card {seen.length + 1} of {seen.length + candidates.length} in this round.
            Your self-ratings are saved in this browser and included in JSON backups.
          </p>
        </article>
      ) : (
        <div className="recall-finished" role="status">
          <h3>{filter === "due" && due.length === 0 ? "Nothing due right now" : "Round complete"}</h3>
          <p>
            {filter === "due" && due.length === 0
              ? "All the selected questions have been reviewed for now. You can switch to All questions whenever you like."
              : "You've worked through the selected questions. Questions marked Review again remain available for another round."}
          </p>
          <div className="recall-review-actions">
            <button type="button" className="secondary-button" onClick={resetRound}>Start another round</button>
            {filter === "due" &&
              <button type="button" className="primary-button" onClick={() => selectFilter("all")}>
                Review all questions
              </button>}
          </div>
        </div>
      )}
      <p className="source-note">
        Review spacing is a simple transparent schedule: after recalling a question, the next
        review is due in 1, 3, 7, 14, then 30 days as you continue recalling it.
        Review again resets the interval. There is no AI judge, account, or server.
      </p>
    </section>
  );
}
