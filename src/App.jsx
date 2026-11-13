import React, { useEffect, useMemo, useState } from "react";
import lessons from "./data/lessons.json";
import LibraryTools from "./components/LibraryTools.jsx";
import ConceptAtlas from "./components/ConceptAtlas.jsx";
import VoiceReader from "./components/VoiceReader.jsx";
import PracticeTracker from "./components/PracticeTracker.jsx";
import RecallQuiz from "./components/RecallQuiz.jsx";
import StudyDashboard from "./components/StudyDashboard.jsx";
import { nextReview } from "./quiz/recall.js";
import { buildExerciseIndex } from "./practice/exercises.js";
import { splitPassages } from "./concepts.js";

const TOTAL = lessons.length;
const SOURCE_EXERCISES = buildExerciseIndex(lessons);
const TABS = [
  { key: "dashboard", label: "Study dashboard" },
  { key: "read", label: "Original lesson" },
  { key: "questions", label: "Study questions" },
  { key: "recall", label: "Recall quiz" },
  { key: "practice", label: "Practice" },
  { key: "atlas", label: "Concept Atlas" },
  { key: "notes", label: "My notes" },
];

function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved === null ? initial : JSON.parse(saved);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browsing or quota exceeded */ }
  }, [key, value]);
  return [value, setValue];
}

function hashWeek() {
  const match = window.location.hash.match(/^#week-(\d{1,2})(?:-p-(\d+))?$/);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= TOTAL ? value : 1;
}

function hashPassage() {
  const match = window.location.hash.match(/^#week-(\d{1,2})-p-(\d+)$/);
  return match && Number(match[2]) >= 1 && Number.isSafeInteger(Number(match[2]))
    ? Number(match[2]) : 0;
}

function studyQuestions(source) {
  return source.split(/(?=^\d+\.\s)/gm)
    .filter(block => /^\d+\.\s/.test(block.trim()))
    .map(block => {
      const match = block.trim().match(/^(\d+)\.\s*([\s\S]*?\?)([\s\S]*)$/);
      return match ? {
        number: Number(match[1]),
        question: match[2].replace(/\s+/g, " ").trim(),
        answer: match[3].replace(/\s+/g, " ").trim(),
      } : null;
    }).filter(Boolean);
}

function pad(seconds) {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

export default function App() {
  const [week, setWeek] = useStored("mks.week.v1", hashWeek());
  const [tab, setTab] = useState("read");
  const [activePassage, setActivePassage] = useState(hashPassage);
  const [spokenPassage, setSpokenPassage] = useState(0);
  const [done, setDone] = useStored("mks.completed.v1", []);
  const [notes, setNotes] = useStored("mks.notes.v1", {});
  const [audioBookmarks, setAudioBookmarks] = useStored("mks.audioBookmarks.v1", {});
  const [practiceSessions, setPracticeSessions] = useStored("mks.practiceSessions.v1", []);
  const [recallProgress, setRecallProgress] = useStored("mks.recallProgress.v1", {});
  const [readerSize, setReaderSize] = useStored("mks.readerSize.v1", "normal");
  const [query, setQuery] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [duration, setDuration] = useState(15);
  const [seconds, setSeconds] = useState(900);
  const [running, setRunning] = useState(false);

  const current = lessons.find(item => item.week === week) || lessons[0];
  const complete = done.includes(current.week);
  const progress = Math.round((done.length / TOTAL) * 100);
  const questions = useMemo(() => studyQuestions(current.study), [current.study]);
  const exercise = SOURCE_EXERCISES[current.week - 1];
  const readingPassages = useMemo(() => splitPassages(current.reading), [current.reading]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? lessons.filter(item =>
      item.title.toLowerCase().includes(term) ||
      item.reading.toLowerCase().includes(term) ||
      item.study.toLowerCase().includes(term) ||
      String(item.week).includes(term)
    ) : lessons;
  }, [query]);

  function chooseWeek(next) {
    const safe = Math.max(1, Math.min(TOTAL, Number(next)));
    setWeek(safe);
    setActivePassage(0);
    setSpokenPassage(0);
    setTab("read");
    setShowAbout(false);
    window.history.replaceState(null, "", "#week-" + safe);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openStudySection(targetWeek, section) {
    if (!Number.isInteger(targetWeek) || targetWeek < 1 || targetWeek > TOTAL ||
        !["read", "practice", "recall", "notes"].includes(section)) return;
    setWeek(targetWeek);
    setActivePassage(0);
    setSpokenPassage(0);
    setTab(section);
    setShowAbout(false);
    window.history.replaceState(null, "", "#week-" + targetWeek);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openPassage(targetWeek, passage) {
    if (!Number.isInteger(targetWeek) || targetWeek < 1 || targetWeek > TOTAL ||
        !Number.isInteger(passage) || passage < 1 ||
        passage > splitPassages(lessons[targetWeek - 1].reading).length) return;
    setWeek(targetWeek);
    setActivePassage(passage);
    setSpokenPassage(0);
    setTab("read");
    setShowAbout(false);
    window.history.replaceState(null, "", "#week-" + targetWeek + "-p-" + passage);
  }

  useEffect(() => {
    const update = () => {
      setWeek(hashWeek());
      setActivePassage(hashPassage());
      setSpokenPassage(0);
      setTab("read");
      setShowAbout(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [setWeek]);

  useEffect(() => {
    if (tab !== "read" || showAbout || !activePassage) return;
    const handle = window.requestAnimationFrame(() => {
      const passage = document.getElementById("source-passage-" + activePassage);
      if (!passage) return;
      passage.scrollIntoView({ behavior: "smooth", block: "center" });
      passage.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [tab, week, activePassage, showAbout]);

  useEffect(() => {
    if (tab !== "read" || showAbout || !spokenPassage) return;
    const handle = window.requestAnimationFrame(() => {
      document.getElementById("source-passage-" + spokenPassage)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [tab, week, spokenPassage, showAbout]);

  useEffect(() => {
    if (tab !== "read" || showAbout) setSpokenPassage(0);
  }, [tab, showAbout]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSeconds(previous => {
        if (previous <= 1) { setRunning(false); return 0; }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  function setTimer(minutes) {
    setDuration(minutes);
    setSeconds(minutes * 60);
    setRunning(false);
  }

  function rememberAudioPosition(lessonWeek, passage) {
    setAudioBookmarks(previous => ({ ...previous, [lessonWeek]: passage }));
  }

  function recordPractice() {
    setPracticeSessions(previous => previous.length >= 2000 ? previous : [
      ...previous, { id: crypto.randomUUID(), at: new Date().toISOString(), week: current.week },
    ]);
  }

  function removePracticeEntry(id) {
    setPracticeSessions(previous => previous.filter(entry => entry.id !== id));
  }

  function recordRecall(key, outcome) {
    setRecallProgress(previous => ({
      ...previous,
      [key]: nextReview(previous[key], outcome),
    }));
  }

  function restoreStudy(backup) {
    setRecallProgress(backup.recallProgress);
    setPracticeSessions(backup.practiceSessions);
    setNotes(backup.notes);
    setAudioBookmarks(backup.bookmarks);
    setDone(backup.completed);
    setWeek(backup.week);
    setActivePassage(0);
    setSpokenPassage(0);
    setTab("notes");
    setShowAbout(false);
    window.history.replaceState(null, "", "#week-" + backup.week);
  }

  function toggleComplete() {
    setDone(previous => complete
      ? previous.filter(value => value !== current.week)
      : [...previous, current.week].sort((a, b) => a - b));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Lesson navigation">
        <a className="brand" href="#week-1" onClick={event => { event.preventDefault(); chooseWeek(1); }}>
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span><strong>MASTER KEY</strong><small>THE 24-WEEK LIBRARY</small></span>
        </a>

        <div className="progress-panel">
          <div className="progress-line"><span>Your journey</span><strong>{done.length} / {TOTAL}</strong></div>
          <div className="progress-track" role="progressbar" aria-label="Completed lessons" aria-valuenow={done.length} aria-valuemin="0" aria-valuemax={TOTAL}>
            <div className="progress-fill" style={{ width: progress + "%" }} />
          </div>
          <p>Study at your own pace. Haanel originally recommended one part per week.</p>
          <button type="button" className="dashboard-sidebar-link"
            onClick={() => {
              setShowAbout(false);
              setTab("dashboard");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}>Open study dashboard</button>
        </div>

        <label className="search-label" htmlFor="lesson-search">FIND A LESSON OR PASSAGE</label>
        <input id="lesson-search" className="search" type="search" value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search all 24 lessons..." />

        <div className="list-heading"><span>THE LESSONS</span><span>{visible.length} shown</span></div>
        <nav className="lesson-nav" aria-label="24 lessons">
          {visible.map(item => (
            <button type="button" key={item.week}
              className={"lesson-link" + (item.week === current.week && !showAbout ? " active" : "")}
              onClick={() => chooseWeek(item.week)} aria-current={item.week === current.week && !showAbout ? "page" : undefined}>
              <span className="lesson-number">{String(item.week).padStart(2, "0")}</span>
              <span className="lesson-label">{item.title}</span>
              <span className="completed-indicator" aria-label={done.includes(item.week) ? "Completed" : "Not completed"}>
                {done.includes(item.week) ? "✓" : ""}
              </span>
            </button>
          ))}
          {visible.length === 0 && <p className="empty-search">No matching lessons. Try another search term.</p>}
        </nav>

        <button type="button" className="source-button" onClick={() => { setShowAbout(true); setTab("read"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          Source, history & legal notes <span aria-hidden="true">↗</span>
        </button>
      </aside>

      <main className={"main-content" + (readerSize === "large" ? " reader-large" : "")}>
        <header className="top-bar">
          <span className="eyebrow">AN OPEN STUDY COMPANION</span>
          <span className="public-domain">PUBLIC-DOMAIN SOURCE TEXT</span>
        </header>
        <LibraryTools
          notes={notes} completed={done} week={current.week} bookmarks={audioBookmarks}
          practiceSessions={practiceSessions} recallProgress={recallProgress}
          readerSize={readerSize} onReaderSizeChange={setReaderSize}
          onRestore={restoreStudy}
        />

        {showAbout ? (
          <section className="about-view">
            <p className="section-kicker">ABOUT THIS PROJECT</p>
            <h1>A library to read, question, and explore.</h1>
            <p className="lead">Charles F. Haanel's <em>The Master Key System</em> is presented here as a historic primary source, organized into its 24 original parts and accompanying sets of study questions.</p>
            <div className="reader-card about-card">
              <h2>What is included</h2>
              <p>The original 24 parts, all 240 study questions with their printed answers, a self-assessed active-recall quiz, a private 24-week study dashboard, primary-source-linked exercises for every week, a practice journal, notes with local backup and restore, completion tracking, searchable passages, source-linked concept navigation, a browser-based spoken lesson reader, offline access after your first visit, print mode, and a simple practice timer.</p>
              <h2>Text provenance</h2>
              <p>This edition is transcribed from the 156-page PDF supplied by the project's founder. PDF page markers and unrelated site branding were removed. Original language and historical claims are otherwise kept as source material. Some inherited scanning or transcription errors may remain; readers should consult the historical edition when exact wording is important.</p>
              <h2>Historically important, not scientific proof</h2>
              <p>The book contains philosophical, spiritual, psychological, and medical claims from its period. Including a claim in this library does not mean modern science has validated it. Meditation, concentration, and visualization are not substitutes for professional medical care.</p>
              <h2>Rights & privacy</h2>
              <p>The early twentieth-century original is in the U.S. public domain. The React application code is offered under MIT terms. Check local laws before distributing source text outside the United States. Notes and progress are kept only in your browser's local storage. There is no account or data collection service.</p>
              <p><a href="https://sacred-texts.com/nth/mks/mks00.htm" target="_blank" rel="noreferrer">Browse a free public-domain edition of Haanel's work ↗</a></p>
            </div>
            <button className="primary-button" type="button" onClick={() => setShowAbout(false)}>Back to the lessons</button>
          </section>
        ) : (
          <>
            <section className="hero">
              <div className="hero-copy">
                {tab === "dashboard" ? (
                  <>
                    <p className="section-kicker">YOUR 24-WEEK STUDY MAP</p>
                    <h1>Study dashboard</h1>
                    <p className="lead">One private place to see what you have explored and choose what comes next.</p>
                    <div className="hero-meta"><span>24 ORIGINAL LESSONS</span><span aria-hidden="true">·</span><span>240 STUDY QUESTIONS</span></div>
                  </>
                ) : (
                  <>
                    <p className="section-kicker">WEEK {String(current.week).padStart(2, "0")} OF {TOTAL}</p>
                    <h1>{current.title}</h1>
                    <p className="lead">Read the original lesson. Reflect on the source. Make your own observations.</p>
                    <div className="hero-meta"><span>CHARLES F. HAANEL</span><span aria-hidden="true">·</span><span>ORIGINAL PART {current.week}</span><span aria-hidden="true">·</span><span>10 STUDY QUESTIONS</span></div>
                  </>
                )}
              </div>
              <div className="orbit-art" aria-hidden="true"><span className="orbit-one"/><span className="orbit-two"/><span className="orbit-three"/><span className="orbit-core">✦</span></div>
            </section>

            <div className="tabs" role="tablist" aria-label="Lesson sections">
              {TABS.map(item => (
                <button type="button" role="tab" key={item.key}
                  aria-selected={tab === item.key} onClick={() => setTab(item.key)}
                  className={"tab" + (tab === item.key ? " selected" : "")}>{item.label}</button>
              ))}
            </div>

            {tab === "dashboard" && (
              <StudyDashboard currentWeek={current.week}
                completed={done} notes={notes} bookmarks={audioBookmarks}
                practiceSessions={practiceSessions} recallProgress={recallProgress}
                onOpenSection={openStudySection} />
            )}

            {tab === "read" && (
              <section className="reader-card" aria-label="Original lesson text">
                <div className="card-top"><span className="source-tag">PRIMARY SOURCE · {current.originalHeading}</span><span className="reading-length">{Math.round(current.reading.split(/\s+/).length / 200)} MIN READ</span></div>
                <h2>The original lesson</h2>
                <p className="source-note">Historical text reproduced for study. Claims reflect the author's views, not established scientific findings.</p>
                <VoiceReader key={current.week + ":" + (activePassage || 0)}
                  lessonWeek={current.week} passages={readingPassages}
                  startPassage={activePassage || 1}
                  savedPassage={Number(audioBookmarks[current.week]) || 1}
                  onPassageChange={setSpokenPassage} onSavePassage={rememberAudioPosition} />
                <article className="source-text">
                  {readingPassages.map((block, index) => (
                    <p key={index} id={"source-passage-" + (index + 1)}
                      tabIndex={-1} className={[
                        activePassage === index + 1 ? "passage-active" : "",
                        spokenPassage === index + 1 ? "passage-speaking" : "",
                      ].filter(Boolean).join(" ") || undefined}>
                      {block}
                    </p>
                  ))}
                </article>
              </section>
            )}

            {tab === "questions" && (
              <section className="reader-card" aria-label="Original study questions">
                <div className="card-top"><span className="source-tag">PRIMARY SOURCE · QUESTIONS & PRINTED ANSWERS</span><span className="reading-length">{questions.length} QUESTIONS</span></div>
                <h2>Test your understanding</h2>
                <p className="source-note">Open each question to reveal the answer as printed in the source. These are Haanel's answers, not independently verified facts.</p>
                <div className="question-list">
                  {questions.map(item => (
                    <details className="question-item" key={item.number}>
                      <summary><span className="question-index">{String(item.number).padStart(3, "0")}</span><span>{item.question}</span><span className="disclosure" aria-hidden="true">+</span></summary>
                      <p className="question-answer"><span>ORIGINAL ANSWER</span>{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {tab === "recall" && (
              <RecallQuiz key={current.week} week={current.week}
                progress={recallProgress} onReview={recordRecall} />
            )}

            {tab === "practice" && (
              <section className="reader-card" aria-label="Practice and timer">
                <div className="card-top"><span className="source-tag">REFLECTIVE PRACTICE</span><span className="reading-length">OPTIONAL</span></div>
                <h2>Quiet practice</h2>
                <p className="source-note">The source excerpts below are reproduced from the corresponding original lesson. Use the optional timer while studying or practicing. The timer and journal are modern tools, not Haanel's printed instructions.</p>
                <PracticeTracker
                  week={current.week} exercise={exercise}
                  sessions={practiceSessions}
                  onRecord={recordPractice} onRemove={removePracticeEntry}
                  onOpenPassage={openPassage}
                />
                <div className="timer">
                  <p>FOCUS TIMER</p>
                  <div className="time-display" role="timer" aria-live="off">{pad(seconds)}</div>
                  <div className="duration-buttons" aria-label="Timer duration">
                    {[5, 10, 15, 20, 30].map(minutes => (
                      <button key={minutes} type="button" className={duration === minutes ? "active" : ""} onClick={() => setTimer(minutes)}>{minutes}m</button>
                    ))}
                  </div>
                  <div className="timer-actions">
                    <button type="button" className="primary-button" onClick={() => { if (seconds === 0) setSeconds(duration * 60); setRunning(!running); }}>{running ? "Pause timer" : "Start timer"}</button>
                    <button type="button" className="secondary-button" onClick={() => { setRunning(false); setSeconds(duration * 60); }}>Reset</button>
                  </div>
                  {seconds === 0 && <p className="timer-done" role="status">Your practice period is complete.</p>}
                </div>
                <p className="source-note">If practicing stillness or concentration causes discomfort, stop or adjust the exercise. The historical text is for education, not medical treatment.</p>
              </section>
            )}

            {tab === "atlas" && (
              <ConceptAtlas currentWeek={current.week} onOpenPassage={openPassage} />
            )}

            {tab === "notes" && (
              <section className="reader-card" aria-label="Private lesson notes">
                <div className="card-top"><span className="source-tag">YOUR PRIVATE JOURNAL</span><span className="reading-length">SAVED IN THIS BROWSER</span></div>
                <h2>Your observations</h2>
                <p className="source-note">Record what resonates, what you question, and what you want to investigate. Notes are stored locally, not sent to a server.</p>
                <label className="notes-label" htmlFor="lesson-notes">NOTES FOR WEEK {current.week}</label>
                <textarea id="lesson-notes" className="notes-area" value={notes[current.week] || ""} onChange={event => setNotes(previous => ({ ...previous, [current.week]: event.target.value }))} placeholder="What did you notice? What claims deserve a closer look?" rows={12} />
                <p className="source-note">Browser storage can be cleared. Use Export backup above to save your notes and completed lessons as a local JSON file.</p>
              </section>
            )}

            <footer className="lesson-footer">
              <button type="button" className="secondary-button previous" disabled={current.week === 1} onClick={() => chooseWeek(current.week - 1)}>← Previous lesson</button>
              <button type="button" className={"complete-button" + (complete ? " is-done" : "")} aria-pressed={complete} onClick={toggleComplete}>{complete ? "✓ Lesson completed" : "✓ Mark lesson complete"}</button>
              <button type="button" className="secondary-button next" disabled={current.week === TOTAL} onClick={() => chooseWeek(current.week + 1)}>Next lesson →</button>
            </footer>
          </>
        )}

        <div className="site-footer"><span>THE MASTER KEY SYSTEM · FREE LEARNING, OPEN KNOWLEDGE</span><span>Source text: Charles F. Haanel · App: community project</span></div>
      </main>
    </div>
  );
}
