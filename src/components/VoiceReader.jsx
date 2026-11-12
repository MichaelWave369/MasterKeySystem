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

// Speech uses the original lesson passages only, with no paraphrases,
// invented narration, network calls, accounts, or external API keys.
export default function VoiceReader({ passages, startPassage = 1, onPassageChange }) {
  const [available] = useState(() => Boolean(speechEngine()));
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState(() => readPreference("mks.tts.voice.v1", "default"));
  const [speed, setSpeed] = useState(() => {
    const candidate = Number(readPreference("mks.tts.speed.v1", "1"));
    return SPEEDS.includes(candidate) ? candidate : 1;
  });
  const [position, setPosition] = useState(() => clampPassageIndex(startPassage - 1, passages.length));
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
    } catch { /* Browsers may block storage in private mode. */ }
  }, [voiceURI, speed]);

  // Keyed by lesson in App, so navigating to a new lesson unmounts the
  // old reader and cancels its old voice session immediately.
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
    setMessage("Narration stopped.");
    onPassageChange(0);
  }

  function startAt(index) {
    const synth = speechEngine();
    if (!synth || !passages.length) return;
    const selected = clampPassageIndex(index, passages.length);
    const token = ++generation.current;
    synth.cancel(); // Also clears an old paused utterance.
    setPosition(selected);
    setStatus("playing");
    setMessage("");
    const voice = voices.find(item => item.voiceURI === voiceURI) || null;

    function speakPassage(passageIndex) {
      if (!mounted.current || token !== generation.current) return;
      if (passageIndex >= passages.length) {
        setStatus("finished");
        setMessage("End of lesson.");
        onPassageChange(0);
        return;
      }
      setPosition(passageIndex);
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
      setMessage("");
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

  return (
    <section className="voice-reader" aria-label="Listen to this lesson">
      <div className="voice-reader-head">
        <div>
          <p className="voice-kicker">OPTIONAL ACCESSIBILITY FEATURE</p>
          <h3>Listen to this lesson</h3>
          <p className="source-note">The reader speaks the original text, passage by passage, without changing its wording.</p>
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
              <select id="reader-voice" value={voices.some(v => v.voiceURI === voiceURI) ? voiceURI : "default"}
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
              <select id="reader-speed" value={String(speed)}
                disabled={status === "playing" || status === "paused"}
                onChange={event => setSpeed(Number(event.target.value))}>
                {SPEEDS.map(value => <option value={String(value)} key={value}>{value}×</option>)}
              </select>
            </label>
            <label htmlFor="reader-start">
              Start at passage
              <select id="reader-start" value={String(position + 1)}
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
              {status === "finished" ? "Replay from passage" : "Play lesson"}
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
          </div>
          <p className="voice-progress" aria-live="off">
            {status === "playing" ? "Reading" : status === "paused" ? "Paused at" :
              status === "finished" ? "Finished at" : "Ready at"} passage {position + 1} of {passages.length}.
          </p>
          <p className="source-note voice-footnote">
            Voices depend on your device and browser. Some enhanced voices require an internet connection;
            local installed voices can work offline. Playback stays in your browser. No text is sent to our servers.
          </p>
          {message && <p role="status" className="voice-warning">{message}</p>}
        </>
      )}
    </section>
  );
}
