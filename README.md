# The Master Key System | Interactive Study Library

A free, responsive React reader for **Charles F. Haanel's public-domain *The Master Key System***.

## What's inside

- All **24 original parts** reproduced from the project founder's 156-page PDF
- All **240 printed study questions and answers**
- Search across the complete source text
- Week-by-week navigation and a completion tracker
- Collapsible original question/answer cards
- Optional concentration timer with source-based practice excerpts
- Private per-week notes stored in your browser's local storage
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

A further public-domain edition is available at [Project Gutenberg](https://www.gutenberg.org/ebooks/30508).

## Roadmap

- Compare source text line-by-line with an independent historical edition
- Add export/import of private notes
- Add print mode and a downloadable offline PWA
- Add optional evidence annotations clearly separated from Haanel's text
- Optional integration into PhiOS and FocusBridge21 without making them dependencies

Contributions are welcome. Please keep primary-source material clearly distinguished from modern explanations.
