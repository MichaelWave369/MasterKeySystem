import React, { useEffect, useRef, useState } from "react";
import { clampPassageIndex, speechChunks } from "../reader/speechText.js";

const SPEEDS = [0.7, 0.85, 1, 1.15, 1.3, 1.5];

function readPreference(key, fallback) {
  try { return window.localStorage.getItem(key) || fallback; }
  catch { return fallback; }
}

function speechEngine() {
  if (typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance !== "function") return null;
  return window.speechSynthesis;
}

// Reads only original source passages using device/browser speech synthesis.
// Audio progress is local, opt-in keyboard shortcuts never intercept text inputs.
export default function VoiceReader({
  passages, lessonWeek, startPassage = 1, savedPassage = 1,
  onPassageChange, onSavePassage,
}) {
  const [available] = useState(() => Boolean(speechEngine()));
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState(() => readPreference("mks.tts.voice.v1", "default"));
  const [speed, setSpeed] = useState(() => {
    const candidate = Number(readPreference("mks.tts.speed.v1", "1"));
    return SPEEDS.includes(candidate) ? candidate : 1;
  });
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() =>
    readPreference("mks.tts.shortcuts.v1", "off") === "on");
  const [position, setPosition] = useState(() =>
    clampPassageIndex((startPassage > 1 ? startPassage : savedPassage) - 1, passages.length));
  const [status, setStatus] = useState("idle"); // idle | playing | paused | finished | error
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    if (!available) return;
    const synth = speechEngine();
    const updateVoices = () => setVoices(synth.getVoices() || []);
    updateVoices();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", updateVoices);
      return () => synth.removeEventListener("voiceschanged", updateVoices);
    }
    const previous = synth.onvoiceschanged;
    synth.onvoiceschanged = updateVoices;
    return () => { synth.onvoiceschanged = previous; };
  }, [available]);

  useEffect(() => {
    try {
      window.localStorage.setItem("mks.tts.voice.v1", voiceURI);
      window.localStorage.setItem("mks.tts.speed.v1", String(speed));
      window.localStorage.setItem("mks.tts.shortcuts.v1", shortcutsEnabled ? "on" : "off");
    } catch { /* Private browsing or disabled storage */ }
  }, [voiceURI, speed, shortcutsEnabled]);

  // VoiceReader is keyed by lessonWeek in App. Unmount always cancels the
  // previous session before another lesson can start talking.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      speechEngine()?.cancel();
    };
  }, []);

  function stop() {
    generation.current += 1;
    speechEngine()?.cancel();
    setStatus("idle");
    setMessage("Narration stopped. Your listening place is saved.");
    onPassageChange(0);
  }

  function startAt(index) {
    const synth = speechEngine();
    if (!synth || !passages.length) return;
    const selected = clampPassageIndex(index, passages.length);
    const token = ++generation.current;
    synth.cancel();
    setPosition(selected);
    setStatus("playing");
    setMessage("");
    const voice = voices.find(item => item.voiceURI === voiceURI) || null;

    function speakPassage(passageIndex) {
      if (!mounted.current || token !== generation.current) return;
      if (passageIndex >= passages.length) {
        setPosition(0);
        setStatus("finished");
        setMessage("End of lesson. Your listening place has reset to the beginning.");
        onSavePassage(lessonWeek, 1);
        onPassageChange(0);
        return;
      }
      setPosition(passageIndex);
      onSavePassage(lessonWeek, passageIndex + 1);
      onPassageChange(passageIndex + 1);
      const chunks = speechChunks(passages[passageIndex]);
      let chunkIndex = 0;

      function nextChunk() {
        if (!mounted.current || token !== generation.current) return;
        if (chunkIndex >= chunks.length) {
          speakPassage(passageIndex + 1);
          return;
        }
        const utterance = new window.SpeechSynthesisUtterance(chunks[chunkIndex++]);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || "en-US";
        utterance.rate = speed;
        utterance.pitch = 1;
        utterance.onend = () => nextChunk();
        utterance.onerror = event => {
          if (!mounted.current || token !== generation.current) return;
          if (event.error === "canceled" || event.error === "interrupted") return;
          setStatus("error");
          setMessage("Speech could not continue (" + (event.error || "voice unavailable") +
            "). Try another voice or your browser's default.");
          onPassageChange(0);
          generation.current += 1;
        };
        try {
          synth.speak(utterance);
        } catch {
          if (token !== generation.current || !mounted.current) return;
          setStatus("error");
          setMessage("This browser could not start speech. Try a different browser or voice.");
          onPassageChange(0);
          generation.current += 1;
        }
      }
      nextChunk();
    }

    speakPassage(selected);
  }

  function seek(index) {
    const selected = clampPassageIndex(index, passages.length);
    if (status === "playing" || status === "paused") startAt(selected);
    else {
      setPosition(selected);
      setStatus("idle");
      setMessage("Listening place saved at passage " + (selected + 1) + ".");
      onSavePassage(lessonWeek, selected + 1);
      onPassageChange(0);
    }
  }

  function togglePause() {
    const synth = speechEngine();
    if (!synth) return;
    if (status === "paused") {
      synth.resume();
      setStatus("playing");
    } else if (status === "playing") {
      synth.pause();
      setStatus("paused");
    }
  }

  // Keyboard controls are opt-in and scoped to the active lesson view.
  // Never hijack normal typing or shortcuts inside forms.
  useEffect(() => {
    if (!available || !shortcutsEnabled) return;
    const onKeyDown = event => {
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea" ||
          event.target?.isContentEditable) return;
      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        if (status === "playing" || status === "paused") togglePause();
        else startAt(position);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(position + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(position - 1);
      } else if (key === "s") {
        event.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [available, shortcutsEnabled, status, position, voiceURI, voices, speed, passages.length]);

  return (
    <section className="voice-reader" aria-label="Listen to this lesson">
      <div className="voice-reader-head">
        <div>
          <p className="voice-kicker">OPTIONAL ACCESSIBILITY FEATURE</p>
          <h3>Listen to this lesson</h3>
          <p className="source-note">Listen to Haanel's original text with your device's available voices.</p>
        </div>
        <span className="voice-symbol" aria-hidden="true">♫</span>
      </div>
      {!available ? (
        <p className="voice-warning" role="status">
          Speech playback isn't available in this browser. Try Chrome, Edge, or Safari with device speech voices enabled.
        </p>
      ) : (
        <>
          <div className="voice-settings">
            <label htmlFor="reader-voice">
              Voice
              <select id="reader-voice" aria-label="Voice"
                value={voices.some(v => v.voiceURI === voiceURI) ? voiceURI : "default"}
                disabled={status === "playing" || status === "paused"}
                onChange={event => setVoiceURI(event.target.value)}>
                <option value="default">Device default voice</option>
                {voices.map((item, i) => (
                  <option key={item.voiceURI + i} value={item.voiceURI}>
                    {item.name} ({item.lang}){item.localService ? " · device" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="reader-speed">
              Speed
              <select id="reader-speed" aria-label="Speed" value={String(speed)}
                disabled={status === "playing" || status === "paused"}
                onChange={event => setSpeed(Number(event.target.value))}>
                {SPEEDS.map(value => <option value={String(value)} key={value}>{value}×</option>)}
              </select>
            </label>
            <label htmlFor="reader-start">
              Start at passage
              <select id="reader-start" aria-label="Start at passage" value={String(position + 1)}
                onChange={event => seek(Number(event.target.value) - 1)}>
                {passages.map((_, index) => (
                  <option key={index} value={String(index + 1)}>Passage {index + 1}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="voice-controls">
            <button type="button" className="primary-button" onClick={() => startAt(position)}
              disabled={!passages.length || status === "playing" || status === "paused"}>
              {status === "finished" ? "Replay lesson" : "Play lesson"}
            </button>
            <button type="button" className="secondary-button" onClick={togglePause}
              disabled={status !== "playing" && status !== "paused"}>
              {status === "paused" ? "Resume narration" : "Pause narration"}
            </button>
            <button type="button" className="secondary-button" onClick={stop}
              disabled={status === "idle"}>Stop narration</button>
            <button type="button" className="secondary-button" disabled={position === 0}
              onClick={() => seek(position - 1)}>Previous passage</button>
            <button type="button" className="secondary-button" disabled={position >= passages.length - 1}
              onClick={() => seek(position + 1)}>Next passage</button>
            {position > 0 &&
              <button type="button" className="secondary-button" onClick={() => startAt(0)}>
                Restart lesson
              </button>}
          </div>
          <p className="voice-progress" aria-live="off">
            {status === "playing" ? "Reading" : status === "paused" ? "Paused at" :
              status === "finished" ? "Finished. Ready to replay from" : "Ready at"} passage {position + 1} of {passages.length}.
          </p>
          <div className="audio-study-options">
            {savedPassage > 1 && <p className="source-note" data-testid="audio-bookmark">
              Saved listening place for Week {lessonWeek}: passage {savedPassage}.
            </p>}
            <label className="audio-shortcut-label">
              <input type="checkbox" checked={shortcutsEnabled}
                onChange={event => setShortcutsEnabled(event.target.checked)} />
              Enable keyboard shortcuts
            </label>
            {shortcutsEnabled &&
              <p className="source-note audio-shortcut-help">
                Alt + Shift + P: play/pause · Alt + Shift + ← / →: previous/next passage ·
                Alt + Shift + S: stop. Typing in form fields is unaffected.
              </p>}
          </div>
          <p className="source-note voice-footnote">
            Your listening position stays on this device and is included in study backups.
            Installed local voices may work offline; some voices use the browser vendor's services.
            Our site does not transmit lesson text or personal notes to a narration server.
          </p>
          {message && <p role="status" className="voice-warning">{message}</p>}
        </>
      )}
    </section>
  );
}
