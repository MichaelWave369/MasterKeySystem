import React, { useRef, useState } from "react";
import { createBackup, parseBackup } from "../backup.js";

export default function LibraryTools({ notes, completed, week, bookmarks, readerSize, onReaderSizeChange, onRestore }) {
  const fileInput = useRef(null);
  const [message, setMessage] = useState("");

  function downloadBackup() {
    try {
      const payload = createBackup({ notes, completed, week, bookmarks });
      const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "master-key-study-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup downloaded. Keep this file somewhere safe.");
    } catch (error) { setMessage("Export failed: " + error.message); }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) { setMessage("File is too large. Backups must be under 1 MB."); return; }
    try {
      const payload = parseBackup(await file.text());
      if (!window.confirm("Restore this backup? It will replace your notes, completed lessons, and listening positions on this device. Export the current notes first if you need them.")) {
        setMessage("Import cancelled; your current notes are unchanged.");
        return;
      }
      onRestore(payload);
      setMessage("Backup restored. Your notes, progress, and listening positions are now available.");
    } catch (error) { setMessage("Import failed: " + error.message); }
  }

  return (
    <section className="library-utilities" aria-label="Reader and backup tools">
      <div className="utility-buttons">
        <button type="button" className="utility-button" onClick={downloadBackup}>Export backup</button>
        <button type="button" className="utility-button" onClick={() => fileInput.current?.click()}>Import backup</button>
        <input ref={fileInput} aria-label="Select saved study backup" className="file-import"
          type="file" accept=".json,application/json" onChange={importBackup} />
        <button type="button" className="utility-button" onClick={() => window.print()}>Print lesson</button>
        <button type="button" className="utility-button" aria-pressed={readerSize === "large"}
          onClick={() => onReaderSizeChange(readerSize === "large" ? "normal" : "large")}>
          {readerSize === "large" ? "Standard text" : "Larger text"}
        </button>
      </div>
      <p className="utility-status" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
