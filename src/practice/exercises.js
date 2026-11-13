import { splitPassages } from "../concepts.js";

// Curated locating cues from the owner's uploaded historic source transcription.
// Titles below are modern navigation labels, NOT chapter titles or paraphrased instructions.
// Only exact original passages from lessons.json are displayed as source material.
export const EXERCISE_SOURCES = [
  ["Physical stillness", "44. Now make the application:", "45. Many will find this extremely difficult"],
  ["Inhibit thought", "29. Last week I gave you an exercise", "30. You will not be able to do this"],
  ["Physical relaxation", "29. For your exercise this week", "32. Make this exercise as thorough"],
  ["Mental release", "29. Last week I asked you to relax", "31. You may say that you cannot"],
  ["Visualize a familiar place", "29. Now, go to your room", "29. Now, go to your room"],
  ["Photograph and attention", "24. In order to cultivate the power of attention", "24. In order to cultivate the power of attention"],
  ["Visualize a conversation", "31. For your exercise this week", "31. For your exercise this week"],
  ["Trace an object to its origins", "28. In the last Part you created a mental image", "31. Follow the great steel plates"],
  ["Visualize a growing flower", "32. This week visualize a plant", "flower comes to view;"],
  ["Draw a mental picture", "24. This week select a blank space", "25. If you can do this"],
  ["Concentrate on the quotation", "35. For your exercise this week", "35. For your exercise this week"],
  ["Silent reflection", "28. This week go to the same room", "28. This week go to the same room"],
  ["Apply the lesson's principle", "26. We can best conserve our interests", "26. We can best conserve our interests"],
  ["Concentrate on harmony", "31. For your exercise this week", "31. For your exercise this week"],
  ["Concentrate on insight", "36. For your exercise this week", "36. For your exercise this week"],
  ["Reflect on harmony and happiness", "37. For your exercise this week", "37. For your exercise this week"],
  ["Concentrate without strain", "33. For your exercise this week", "37. Always concentrate on the ideal"],
  ["Reflect on creative power", "33. This week concentrate upon your power", "of the seed, so that"],
  ["Concentration and appearances", "27. For your exercise this week", "28. Let the thought rest"],
  ["Reflect in the Silence", "31. For your exercise this week", "31. For your exercise this week"],
  ["Concentrate on truth", "28. For your exercise this week", "28. For your exercise this week"],
  ["Reflect on Tennyson's lines", "28. For your exercise this week", "28. For your exercise this week"],
  ["Concentrate on the spiritual", "22. This week concentrate on the fact", "22. This week concentrate on the fact"],
  ["Closing reflection", "31. This week, try to realize", "31. This week, try to realize"],
];

export function buildExerciseIndex(lessons) {
  return EXERCISE_SOURCES.map(([label, startCue, endCue], index) => {
    const week = index + 1;
    const source = lessons[index];
    if (!source || source.week !== week) return null;
    const passages = splitPassages(source.reading);
    const startMatches = passages.flatMap((text, i) => text.startsWith(startCue) ? [i] : []);
    const endMatches = passages.flatMap((text, i) => text.startsWith(endCue) ? [i] : []);
    if (startMatches.length !== 1 || endMatches.length !== 1 || endMatches[0] < startMatches[0])
      return null;
    return {
      week, label, originalHeading: source.originalHeading,
      passages: passages.slice(startMatches[0], endMatches[0] + 1).map((text, i) => ({
        passageNumber: startMatches[0] + i + 1,
        text,
      })),
    };
  });
}
