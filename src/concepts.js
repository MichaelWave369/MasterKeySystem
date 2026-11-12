// Editorial navigation metadata. These labels and regexes are not the
// author's own chapter headings or an assessment of scientific accuracy.
export const CONCEPTS = [
  {
    id: "inner-outer", label: "Inner and outer worlds",
    terms: "world within · world without",
    pattern: /\b(?:world within|world without|inner world|outer world)\b/i,
  },
  {
    id: "conscious-subconscious", label: "Conscious and subconscious",
    terms: "conscious · subconscious",
    pattern: /\b(?:conscious(?:ness)?|subconscious|sub-conscious)\b/i,
  },
  {
    id: "attention", label: "Concentration and attention",
    terms: "concentration · attention",
    pattern: /\b(?:concentrat(?:e|es|ed|ing|ion)|attention|focus)\b/i,
  },
  {
    id: "imagination", label: "Imagination and visualization",
    terms: "imagination · visualization",
    pattern: /\b(?:imagin(?:ation|e|es|ed|ing)|visuali[sz](?:ation|e|es|ed|ing)|mental picture(?:s)?)\b/i,
  },
  {
    id: "habits", label: "Habit and repetition",
    terms: "habit · repetition",
    pattern: /\b(?:habit(?:s|ual|ually)?|repeat(?:ed|ing|edly)?|repetition)\b/i,
  },
  {
    id: "causation", label: "Cause and effect",
    terms: "cause · effect",
    pattern: /\b(?:cause(?:s)?|effect(?:s)?|causation)\b/i,
  },
  {
    id: "universal-mind", label: "Universal Mind",
    terms: "universal mind · cosmic mind",
    pattern: /\b(?:universal mind|infinite intelligence|cosmic mind)\b/i,
  },
  {
    id: "fear-courage", label: "Fear and courage",
    terms: "fear · courage",
    pattern: /\b(?:fear(?:s|ful)?|courage(?:ous)?)\b/i,
  },
  {
    id: "harmony-health", label: "Harmony and health",
    terms: "harmony · health",
    pattern: /\b(?:harmony|harmonious|health|healthy)\b/i,
  },
  {
    id: "service-ideals", label: "Service and ideals",
    terms: "service · ideals",
    pattern: /\b(?:service|serve|serving|ideal(?:s)?|sympathy)\b/i,
  },
];

// Use exactly the same paragraph boundaries as the original reading view.
// A passage number remains stable for as long as source text is unchanged.
export function splitPassages(source) {
  return source.split(/\n\s*\n/g)
    .map(block => block.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export function excerptAround(passage, position) {
  const start = Math.max(0, position - 90);
  const end = Math.min(passage.length, position + 190);
  return (start ? "…" : "") + passage.slice(start, end) +
    (end < passage.length ? "…" : "");
}

export function buildConceptIndex(lessons) {
  const entries = Object.fromEntries(CONCEPTS.map(concept => [concept.id, []]));
  for (const lesson of lessons) {
    const passages = splitPassages(lesson.reading);
    passages.forEach((passage, index) => {
      for (const concept of CONCEPTS) {
        const match = concept.pattern.exec(passage);
        if (!match) continue;
        entries[concept.id].push({
          week: lesson.week,
          title: lesson.title,
          passage: index + 1,
          excerpt: excerptAround(passage, match.index),
          matchedTerm: match[0],
        });
      }
    });
  }
  return entries;
}
