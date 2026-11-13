import React, { useMemo, useState } from "react";
import lessons from "../data/lessons.json";
import { buildBookIndex, findBookMatches, normalizeSearchTerm } from "../search/search.js";
import HighlightedText from "./HighlightedText.jsx";

const INDEX = buildBookIndex(lessons);
const PAGE_SIZE = 30;

export default function BookSearch({ query, onQueryChange, onOpenReading, onOpenQuestion, savedIds = [], onToggleSave }) {
  const [scope, setScope] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const clean = normalizeSearchTerm(query);
  const matches = useMemo(() => findBookMatches(INDEX, clean, scope), [clean, scope]);

  function selectScope(next) {
    setScope(next);
    setLimit(PAGE_SIZE);
  }

  return (
    <section className="reader-card search-library" aria-label="Search the entire book">
      <div className="card-top">
        <span className="source-tag">VERBATIM SOURCE · LITERAL TEXT SEARCH</span>
        <span className="reading-length">24 LESSONS · 240 STUDY QUESTIONS</span>
      </div>
      <h2>Search the complete book</h2>
      <p className="source-note">
        Find a word or phrase in Haanel's original lesson passages and printed study
        questions or answers. Results link directly to the source.
        Search is case-insensitive, literal and performed entirely in this browser.
      </p>
      <label className="notes-label" htmlFor="full-book-search">WORD OR PHRASE</label>
      <input id="full-book-search" className="search book-search-input" type="search"
        value={query} maxLength={100} onChange={event => {
          onQueryChange(event.target.value);
          setLimit(PAGE_SIZE);
        }} placeholder='Try "world within" or "concentration"' />

      <div className="search-filters" role="group" aria-label="Search source type">
        {[
          { key: "all", label: "All source text" },
          { key: "reading", label: "Lesson passages" },
          { key: "question", label: "Study questions & answers" },
        ].map(option => (
          <button type="button" key={option.key} aria-pressed={scope === option.key}
            className={scope === option.key ? "search-filter-selected" : ""}
            onClick={() => selectScope(option.key)}>{option.label}</button>
        ))}
      </div>

      {clean.length < 2 ? (
        <p className="source-note search-prompt">Enter at least two characters to search all 24 lessons.</p>
      ) : (
        <>
          <p className="search-result-count" role="status">
            {matches.length} matching {matches.length === 1 ? "source location" : "source locations"}
            {matches.length > PAGE_SIZE ? " · showing " + Math.min(matches.length, limit) : ""}
          </p>
          <div className="search-results">
            {matches.slice(0, limit).map(hit => (
              <article className="search-hit" key={hit.key}>
                <p className="search-hit-meta">
                  WEEK {String(hit.week).padStart(2, "0")} · {hit.kind === "reading"
                    ? "ORIGINAL PASSAGE " + hit.position
                    : "PRINTED STUDY QUESTION " + hit.number}
                </p>
                <h3>{hit.title}</h3>
                <blockquote><HighlightedText text={hit.excerpt} term={clean}/></blockquote>
                <button type="button" className="atlas-open"
                  onClick={() => hit.kind === "reading"
                    ? onOpenReading(hit.week, hit.position, clean)
                    : onOpenQuestion(hit.week, hit.position, clean)}>
                  {hit.kind === "reading" ? "Open original passage" : "Open printed question"}
                </button>
                <button type="button" className="save-source-action search-save-action"
                  aria-pressed={savedIds.includes(hit.key)}
                  disabled={savedIds.length >= 200 && !savedIds.includes(hit.key)}
                  onClick={() => onToggleSave(hit.key)}>
                  {savedIds.includes(hit.key) ? "✓ Saved" : "＋ Save source"}
                </button>
              </article>
            ))}
            {matches.length === 0 &&
              <p className="source-note">No literal matches. Try a shorter phrase or another spelling.</p>}
          </div>
          {matches.length > limit &&
            <button type="button" className="secondary-button search-more"
              onClick={() => setLimit(previous => previous + PAGE_SIZE)}>
              Show more ({matches.length - limit} remaining)
            </button>}
        </>
      )}
      <p className="source-note search-disclaimer">
        Search results reproduce historical claims without endorsing them.
        The index adds no AI-generated summaries or citations.
      </p>
    </section>
  );
}
