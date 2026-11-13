import React from "react";
import { literalHighlightParts } from "../search/search.js";

export default function HighlightedText({ text, term }) {
  return literalHighlightParts(text, term).map((part, index) =>
    part.match ? <mark className="search-highlight" key={index}>{part.text}</mark>
      : <React.Fragment key={index}>{part.text}</React.Fragment>);
}
