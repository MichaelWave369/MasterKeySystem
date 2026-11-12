import React, { useMemo, useState } from "react";
import lessons from "../data/lessons.json";
import { CONCEPTS, buildConceptIndex } from "../concepts.js";

const INDEX = buildConceptIndex(lessons);

export default function ConceptAtlas({ currentWeek, onOpenPassage }) {
  const [topic, setTopic] = useState("inner-outer");
  const [justThisWeek, setJustThisWeek] = useState(false);
  const [limit, setLimit] = useState(20);

  const concept = CONCEPTS.find(item => item.id === topic) || CONCEPTS[0];
  const matches = useMemo(() => {
    const all = INDEX[concept.id] || [];
    return justThisWeek ? all.filter(hit => hit.week === currentWeek) : all;
  }, [concept.id, justThisWeek, currentWeek]);

  function chooseTopic(id) {
    setTopic(id);
    setLimit(20);
  }

  return (
    <section className="reader-card atlas-view" aria-label="Concept atlas">
      <div className="card-top">
        <span className="source-tag">EDITORIAL INDEX · NOT PART OF THE ORIGINAL TEXT</span>
        <span className="reading-length">24 ORIGINAL LESSONS</span>
      </div>
      <h2>Explore concepts across the book</h2>
      <p className="source-note">
        This index links passages using literal words and phrases in Haanel's text.
        The topic labels and grouping are modern editorial aids, not the author's
        own taxonomy. A keyword match does not establish that a claim is true,
        scientifically supported, or even discussed positively in context.
      </p>
      <div className="atlas-topics" role="group" aria-label="Concept topics">
        {CONCEPTS.map(item => (
          <button
            type="button"
            key={item.id}
            className={"atlas-topic" + (topic === item.id ? " selected" : "")}
            aria-pressed={topic === item.id}
            onClick={() => chooseTopic(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{INDEX[item.id].length} matching passages</span>
          </button>
        ))}
      </div>

      <div className="atlas-results-header">
        <div>
          <p className="section-kicker">SOURCE-LINKED PASSAGES</p>
          <h3>{concept.label}</h3>
          <p className="source-note">
            Keyword cues: {concept.terms}. {matches.length} matching passages
            {justThisWeek ? " in this lesson" : " across all lessons"}.
          </p>
        </div>
        <label className="atlas-scope">
          <input type="checkbox" checked={justThisWeek}
            onChange={event => { setJustThisWeek(event.target.checked); setLimit(20); }} />
          Only this week
        </label>
      </div>

      <div className="atlas-results" aria-live="polite">
        {matches.slice(0, limit).map(hit => (
          <article className="atlas-hit" key={hit.week + "-" + hit.passage}>
            <p className="atlas-hit-label">PART {String(hit.week).padStart(2, "0")} · PASSAGE {hit.passage}</p>
            <h4>{hit.title}</h4>
            <blockquote>{hit.excerpt}</blockquote>
            <button className="atlas-open" type="button"
              onClick={() => onOpenPassage(hit.week, hit.passage)}>
              Open original passage ↗
            </button>
          </article>
        ))}
        {matches.length === 0 &&
          <p className="source-note">No literal matches for this concept in the current lesson. Choose another topic or search all 24 lessons.</p>}
      </div>
      {matches.length > limit &&
        <button type="button" className="secondary-button atlas-more"
          onClick={() => setLimit(count => count + 20)}>
          Show more passages ({matches.length - limit} remaining)
        </button>}
    </section>
  );
}
