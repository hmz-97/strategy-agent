# deck.json spec (for scripts/build_deck.js)

Start from `examples/palantir-deck.json` and replace the content. The script lays out and sizes everything; you only supply text and data.

```json
{ "title": "Firm: DCCD strategy analysis", "slides": [ ...9 slides... ] }
```

## Slide fields
| Field | Used on | Meaning |
|---|---|---|
| `layout` | all | `"cover"` (slide 1), `"content"` (slides 2–8, light), `"close"` (slide 9, dark) |
| `stage` | content, close | Small label above the title, e.g. `"2 · Create (1/2)"` |
| `title` | all | The slide's message as a full sentence (≤ ~130 characters) |
| `kicker`, `subtitle`, `meta` | cover | Line above the title; theory of value; method line at the bottom |
| `stats` | content (optional) | Row of 3–4 headline numbers: `{ "big", "label", "src" }` |
| `left`, `right`, `split` | content, close | Two columns of blocks; `split` = left column share (default 0.5) |
| `full` | content | One full-width column of blocks instead of `left`/`right` |
| `source` | content, close | Small source line at the bottom |
| `notes` | any | Speaker notes |

## Block types
Blocks in a column stack top to bottom. Charts absorb spare height; font shrinks (12 → 9 pt) until the column fits, and the script prints a warning if it still doesn't.

- **card**: `{ "type": "card", "heading", "big"?, "text"?, "lines"?, "bullets"?, "tone"? }`
  - `lines`: paragraphs without bullet dots (use for P1/P2/P3/C; a line starting with `"C "` is bolded).
  - `tone`: `light` (default on content), `outline`, `dark` (default on close), `accent` (amber), `alert` (red outline), `alertfill` (red).
- **table**: `{ "type": "table", "header": [...], "rows": [[...]], "colW"?: [relative widths], "ratingCols"?: [col idx], "verdictCol"?: idx, "highlight"?: [[row, col]] }`
  - `ratingCols` colour H / M / L cells red / amber / green (five forces).
  - `verdictCol` colours Fits (green), Misfit / weak (red), anything else gray (activity fit).
  - `highlight` turns specific cells red (e.g. the weakest VRIO letter); row index excludes the header.
- **chart**: `{ "type": "chart", "chart": "stacked" | "clustered", "title", "labels": [...], "series": [{ "name", "values": [...] }], "percent"?: true, "colors"?: [hex], "note"?, "noteTone"?: "alert" }`
  - Value sticks: stacked, series bottom-up WTS → supplier surplus → firm margin → customer delight, so the bar top is WTP.
- **note**: `{ "type": "note", "text", "tone"?: "alert" }` small italic line (caveats, labels).
