import React from "react";

export default function PracticeTracker({ exercise, week, sessions, onRecord, onRemove, onOpenPassage }) {
  const mine = sessions.filter(item => item.week === week).slice().reverse();

  return (
    <section className="practice-tracker" aria-label="Original weekly exercise and practice history">
      <div className="practice-heading">
        <div>
          <p className="source-tag">HISTORICAL SOURCE EXCERPT · PART {week}</p>
          <h3>{exercise?.label || "Source exercise unavailable"}</h3>
          <p className="source-note">The heading is our editorial label. The passages below reproduce the source wording, including historical claims that are not established science.</p>
        </div>
      </div>
      {exercise ? (
        <div className="practice-source-passages">
          {exercise.passages.map(item => (
            <div className="practice-source-passage" key={item.passageNumber}>
              <p className="practice-passage-number">Original passage {item.passageNumber}</p>
              <blockquote>{item.text}</blockquote>
              <button type="button" className="atlas-open" onClick={() => onOpenPassage(week, item.passageNumber)}>
                View in original lesson
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="source-note">The exact historical exercise could not be matched in this edition. Refer to the complete original lesson instead.</p>
      )}

      <div className="practice-history">
        <div className="practice-history-heading">
          <div>
            <h3>My practice journal</h3>
            <p className="source-note">Record a session only when you choose. This tracks participation, not spiritual, medical, or scientific outcomes.</p>
          </div>
          <span className="practice-count">{mine.length} sessions</span>
        </div>
        <button type="button" className="primary-button" onClick={onRecord}
          disabled={sessions.length >= 2000}>Record a practice session</button>
        <p className="source-note">Dates are stored only on this device and included in your downloadable study backup. No practice is mandatory.</p>
        {sessions.length >= 2000 && <p className="voice-warning">Journal limit reached. Export your backup before removing older entries.</p>}
        {mine.length > 0 ? (
          <ol className="practice-session-list">
            {mine.slice(0, 20).map(item => (
              <li className="practice-session" key={item.id}>
                <time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time>
                <button className="utility-button" type="button" onClick={() => onRemove(item.id)}
                  aria-label={"Remove practice entry recorded " + new Date(item.at).toLocaleString()}>Remove</button>
              </li>
            ))}
          </ol>
        ) : <p className="source-note">No practice sessions logged for this week.</p>}
        {mine.length > 20 && <p className="source-note">Showing the latest 20 of {mine.length} sessions. All sessions are retained in the backup.</p>}
      </div>
    </section>
  );
}
