# The Master Key System | Interactive Study Library

A free, responsive React reader for **Charles F. Haanel's public-domain *The Master Key System***.

## What's inside

- All **24 original parts** reproduced from the project founder's 156-page PDF
- All **240 printed study questions and answers**
- **Exact full-book source search** across lesson passages and all 240 printed study questions/answers, with literal highlighting and deep links to the original
- **Listen to this lesson:** browser/device speech synthesis reads the original source aloud with voice selection, speed, pause/resume, navigation, passage highlighting, saved listening positions, and optional keyboard shortcuts
- Editorial **Concept Atlas** for 10 recurring topics, with source-linked excerpts and reloadable passage URLs
- Week-by-week navigation and a completion tracker
- **24-week study dashboard:** completion totals, practice logs, recall questions due, new questions, notes and listening bookmarks, with direct Read / Practice / Recall navigation
- Collapsible original question/answer cards
- Original source-linked exercise passages for every week, optional timer, and local practice journal
- **Active Recall** for all 240 original printed study questions, with reveal-after-attempt, self-rating, due-review scheduling, and local progress backups
- Private per-week notes stored in your browser's local storage, with JSON backup import/export
- Offline reading after the first successful visit (all original lesson text is bundled)
- Print-friendly lessons and adjustable reading text size
- Mobile-friendly design, accessible controls, and Netlify-ready deployment
- Automated checks validating the number of lessons and questions

## Run locally

Requires Node.js 20.19+ or 22.12+.

~~~bash
npm install
npm run check:content
npm run dev
~~~

Open the Vite local URL printed in your terminal. For production, run \`npm run build\` and deploy the \`dist/\` directory. \`netlify.toml\` includes the build settings.

## Reading philosophy

The original source recommended **one part per week**. The app does not lock lessons or impose a schedule. The sidebar, reading pages, source questions, and timer are independent tools for study.

The original text is **historical material, not scientific validation**. It includes philosophical, metaphysical, psychological, and medical assertions from its era. The project preserves these statements as primary-source claims and does not present them as established evidence or medical advice.

## Provenance and reuse

- **Source:** Charles F. Haanel, *The Master Key System*, as transcribed in the PDF provided by the project founder, with extraction markers and third-party website footer text removed.
- **Source text:** Original early twentieth-century Haanel work, public domain in the United States. Check applicable law in other jurisdictions.
- **Code and original interface:** MIT license.
- **Notes and progress:** local browser storage only. No backend, tracking, or accounts.
- **Quality assurance:** The 24 parts and 240 Q&As are validated; text can still contain transcription imperfections inherited from the PDF. Compare with an original historical printing for textual scholarship.

A further public-domain edition is available at [Internet Sacred Text Archive](https://sacred-texts.com/nth/mks/mks00.htm).


## GitHub Pages deployment

The public React app is configured for the project URL:

**https://michaelwave369.github.io/MasterKeySystem/**

1. Open [the repository's Pages settings](https://github.com/MichaelWave369/MasterKeySystem/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**. This one-time repository setting is required to activate Pages.
3. The [Publish React app to GitHub Pages](https://github.com/MichaelWave369/MasterKeySystem/actions/workflows/pages.yml) workflow deploys the compiled `dist/` contents automatically on every push to `main`. It can also be started manually with **Run workflow**.
4. Wait until the workflow's **Publish site** job is green before treating the URL above as live.

The Vite `base` is set to `/MasterKeySystem/` only for GitHub Pages builds, preserving the root base for local development or other hosts such as Netlify.

Offline reading: the app registers a service worker in production, storing the built HTML, scripts, styles, manifest, and the bundled 24-part corpus on the first online visit. After the service worker activates, the study reader and local notes work with the network disconnected. New builds use a content-derived cache key to replace stale site files. Public source links outside the app still need a connection.

Study backups: **Export backup** downloads a local JSON file containing only notes, completed weeks, per-lesson listening positions, practice history, self-rated recall reviews, and the selected week. **Import backup** validates its format, imposes size limits, and asks before overwriting the current local data. No study data is uploaded to a server.

For a command-line preview of the same build, run:

~~~bash
DEPLOY_TARGET=github-pages npm run build
npm run preview:pages
~~~

## Exact source search

The **Book search** tab searches every original reading passage plus all 240 printed study questions and answers. Search is literal and case-insensitive, including phrases. Results are shown as original-source excerpts, with the matching wording highlighted. Filters narrow results to lesson passages or Q&A. Each result opens its exact original passage (`#week-N-p-M`) or printed study question (`#week-N-q-M`) in the reader; those links can be reloaded and bookmarked. The original text is never rewritten, uploaded or sent to a search service. Search works offline once the bundled site has been cached.

Typing into the sidebar's existing lesson filter also offers **View exact source matches** to open a full result list. Highlights are session-local presentation aids; copied passage links preserve source location without including private search terms. Search matches are not scientific, historical or medical validation.

## 24-week study dashboard

The **Study dashboard** is available from the navigation tab and the sidebar progress panel. It presents an overview of all 24 weeks with direct controls to open each week's **Original lesson**, **Practice**, or **Recall quiz**. Four summary metrics count completed lessons, recorded practice sessions, previously studied recall questions due for review, and new/unrated questions. The overview also shows note presence, listening bookmarks, reviewed-question totals, and recent local practice sessions.

To avoid misleading counts, unseen questions are **new questions**, not previously reviewed questions due again. Review dates follow the Recall Quiz's UTC convention. The dashboard derives everything from existing browser data and stores nothing extra; existing JSON backup/restore covers the entire overview. All statistics describe use of the historical library, **not** proof of the author's medical or scientific claims.

## Active recall study mode

The **Recall quiz** tab presents the 240 original printed questions in study order, either for the selected week or for all 24 weeks. Readers can write a temporary draft or think through the question, then choose **Reveal printed answer**. The response is the original Haanel answer, explicitly labeled as historical content, not validated knowledge. The app does not infer whether a spiritual or medical claim is scientifically true, and it never grades the user's draft. Card identifiers use their **position within each week**, not the printed question number, because the supplied transcription of Part 13 labels the seventh question "27" rather than "127". That source irregularity is preserved on screen, not silently corrected.

Once revealed, readers self-rate with **Review again** or **I recalled it**. The next review is due immediately after Review again or in 1, 3, 7, 14, and then 30-day intervals for consecutive recalled ratings. Filters show questions due today or all questions. Review progress is kept in browser storage and exported with the study backup; old backups without this optional data remain compatible. Draft text is ephemeral and never exported or uploaded. This is a simple mnemonic schedule, **not** a claim of validated personalized AI memory optimization.

## Original weekly exercises and practice journal

The **Practice** tab shows the exact original source passages identified as the weekly exercise in each of the 24 parts. An editorial heading identifies the activity, but no instructions are invented or rewritten as if they were from Haanel. Every original passage links to its exact position in the complete text. The previous loose keyword extractor has been replaced by 24 curated anchors, with automated checks that every quoted passage exactly matches the historic source transcription.

The optional concentration timer is a modern study aid, not an original instruction. Readers can record a practice session or remove an entry whenever they choose; sessions are voluntary, ungraded, and stored only on this device. Practice history is included in JSON exports. Older version-1 backups without a practice history still import successfully.

These passages contain historical philosophical, spiritual and sometimes medical claims that are **not** independently validated. Practice logs measure personal activity, not the correctness of these claims or any medical outcome.

## Voice reader

Open **Original lesson → Listen to this lesson**. The optional narration uses browser/device text-to-speech through the Web Speech API. It reads the historical source wording in short chunks (to avoid browser timeouts), highlighting and following each passage. Users can choose an available device voice, control speed, pause/resume, stop, and skip to a passage or move between passages. Each lesson remembers its last spoken or manually selected passage on this device. The voice reader resumes there when reopened and resets its bookmark after finishing a full lesson. Bookmarks are included in exported study backups; earlier backup files without bookmarks still import correctly. The user can optionally enable keyboard shortcuts: **Alt + Shift + P** to play/pause, **Alt + Shift + left/right arrow** to move between passages, and **Alt + Shift + S** to stop. Shortcuts ignore input fields and are off by default.

**No keys, server API, or generated paraphrases are required.** Audio quality and voice options are determined by the user's browser and operating system. Some voices are installed locally and can work offline, while optional higher-quality system voices may fetch data from a vendor. This is text-to-speech, not a promise of a custom neural AI narrator. In browsers that don't support speech synthesis, the original text remains fully readable. The reader stops when its lesson view closes or the user navigates to another lesson.

## Source-linked concept atlas

The Concept Atlas is a **navigation index, not an interpretation of the author's correctness**. Ten editorial topic labels use literal keyword patterns to identify and link the matching original passages. Each excerpt links into a numbered passage in the reader. For example, an Atlas link has the form `#week-6-p-24`, which can be bookmarked and reloaded, and works with the offline study reader.

The original 24 lessons are unchanged; editorial topic labels and matching logic live separately in `src/concepts.js`. Source-link validation checks that every index entry matches a real source passage. Keyword occurrence is **not** evidence for a historical, psychological, spiritual or medical claim.

## Roadmap

- Compare source text line-by-line with an independent historical edition
- Validate offline installation and long-term cache updates across browsers
- Add optional note exports in plain text and accessible install prompts
- Add optional evidence annotations clearly separated from Haanel's text
- Optional integration into PhiOS and FocusBridge21 without making them dependencies

Contributions are welcome. Please keep primary-source material clearly distinguished from modern explanations.
