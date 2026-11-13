import React, { useMemo, useState } from "react";
import lessons from "../data/lessons.json";
import { buildBookIndex } from "../search/search.js";
import { sourceLink, MAX_PERSONAL_NOTE } from "../shelf/savedSources.js";

const LOCATIONS = new Map(buildBookIndex(lessons).map(item => [item.key, item]));

export default function SavedSources({ savedSources, onUpdate, onRemove, onOpenReading, onOpenQuestion }) {
  const [message, setMessage] = useState("");
  const entries = useMemo(() => savedSources
    .map(saved => ({ saved, source: LOCATIONS.get(saved.id) }))
    .filter(item => Boolean(item.source))
    .slice().reverse(), [savedSources]);

  function copyLink(item) {
    const url = new URL(sourceLink(item.source.key), window.location.href).href;
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard unavailable. Open the source and copy the page address instead.");
      return;
    }
    navigator.clipboard.writeText(url)
      .then(() => setMessage("Public source link copied. Personal notes were not copied."))
      .catch(() => setMessage("Clipboard permission denied. Open the source to copy its address."));
  }

  function open(item) {
    const { source } = item;
    if (source.kind === "reading") onOpenReading(source.week, source.position);
    else onOpenQuestion(source.week, source.position);
  }

  return (
    <section className="reader-card saved-sources" aria-label="Personal saved source passages">
      <div className="card-top">
        <span className="source-tag">PRIVATE REFERENCE SHELF · ORIGINAL TEXT</span>
        <span className="reading-length">{entries.length} / 200 SAVED</span>
      </div>
      <h2>Your saved sources</h2>
      <p className="source-note">
        Save meaningful original passages and printed study questions, then add your
        own thoughts separately. The original text is read directly from the book,
        never edited or copied into your private notes.
      </p>
      {savedSources.length > entries.length &&
        <p className="voice-warning" role="status">
          Some saved references could not be located in this edition. They remain in
          your backup, but are hidden until their original text can be matched.
        </p>}
      {entries.length === 0 &&
        <div className="saved-empty">
          <h3>A personal reading shelf, ready when you are</h3>
          <p>Open an original lesson, a printed study question, or a full-book
            search result and select Save. There is no requirement to collect anything.</p>
        </div>}
      <div className="saved-entries">
        {entries.map(({ saved, source }) => (
          <article className="saved-entry" key={saved.id} data-testid={"saved-" + saved.id.replaceAll(":", "-")}>
            <div className="saved-entry-head">
              <span className="source-tag">WEEK {source.week} · {source.kind === "reading"
                ? "ORIGINAL PASSAGE " + source.position
                : "PRINTED QUESTION " + source.number}</span>
              <span className="saved-entry-date">{new Date(saved.savedAt).toLocaleDateString()}</span>
            </div>
            <h3>{source.title}</h3>
            {source.kind === "reading" ? (
              <blockquote>{source.text}</blockquote>
            ) : (
              <div className="saved-question-original">
                <p><strong>Question:</strong> {source.question}</p>
                <p><strong>Printed answer:</strong> {source.answer}</p>
              </div>
            )}
            <label className="notes-label" htmlFor={"saved-note-" + saved.id}>
              YOUR NOTE · SEPARATE FROM THE ORIGINAL
            </label>
            <textarea id={"saved-note-" + saved.id} aria-label={"Personal note for Week " +
              source.week + " " + (source.kind === "reading" ? "passage " : "question ") + source.position}
              className="notes-area saved-note" rows={3} maxLength={MAX_PERSONAL_NOTE}
              value={saved.note} placeholder="What stands out? What deserves further research?"
              onChange={event => onUpdate(saved.id, event.target.value)} />
            <div className="saved-entry-actions">
              <button type="button" className="primary-button" onClick={() => open({ source })}>
                Open original {source.kind === "reading" ? "passage" : "question"}
              </button>
              <button type="button" className="secondary-button" onClick={() => copyLink({ source })}>
                Copy source link
              </button>
              <button type="button" className="secondary-button" onClick={() => onRemove(saved.id)}
                aria-label={"Remove saved " + (source.kind === "reading" ? "passage" : "question") +
                  " Week " + source.week + " position " + source.position}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      {message && <p className="source-note" role="status">{message}</p>}
      <p className="source-note">
        Your shelf is stored only in this browser, included in your study JSON backup,
        and never transmitted to a server. Copied links contain only the public source location.
        The historical source may contain claims that modern research has not validated.
      </p>
    </section>
  );
}
