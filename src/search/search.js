import { splitPassages, excerptAround } from "../concepts.js";
import { parsePrintedQuestions } from "../quiz/recall.js";

// Literal search only. There is no generated interpretation and the source
// itself is never changed, normalized or stored in a second user database.
export function buildBookIndex(lessons) {
  return lessons.flatMap(lesson => {
    const reading = splitPassages(lesson.reading).map((text, i) => ({
      key: "p:" + lesson.week + ":" + (i + 1),
      kind: "reading", week: lesson.week, title: lesson.title,
      position: i + 1, text,
    }));
    const questions = parsePrintedQuestions(lesson.study, lesson.week).map(item => ({
      key: "q:" + lesson.week + ":" + item.position,
      kind: "question", week: lesson.week, title: lesson.title,
      position: item.position, number: item.number,
      question: item.question, answer: item.answer,
      text: item.question + " " + item.answer,
    }));
    return [...reading, ...questions];
  });
}

export function normalizeSearchTerm(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
}

export function findBookMatches(index, value, scope = "all") {
  const query = normalizeSearchTerm(value);
  if (query.length < 2) return [];
  const needle = query.toLowerCase();
  return index.flatMap(item => {
    if (scope !== "all" && item.kind !== scope) return [];
    const position = item.text.toLowerCase().indexOf(needle);
    if (position < 0) return [];
    let passageText = item.text;
    if (item.kind === "question") {
      const where = item.question.toLowerCase().includes(needle) ? item.question : item.answer;
      passageText = where;
    }
    const at = passageText.toLowerCase().indexOf(needle);
    return [{ ...item, excerpt: excerptAround(passageText, Math.max(0, at)),
      matchedTerm: passageText.slice(at, at + query.length) }];
  });
}

export function literalHighlightParts(text, value) {
  const query = normalizeSearchTerm(value);
  if (query.length < 2) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts = [];
  let from = 0;
  while (from < text.length) {
    const at = lower.indexOf(needle, from);
    if (at < 0) break;
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    parts.push({ text: text.slice(at, at + query.length), match: true });
    from = at + query.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return parts.length ? parts : [{ text, match: false }];
}
