// Builds the DCCD deck from a JSON spec, so a run fills content instead of writing slide code.
// Usage: node build_deck.js dccd-run/deck.json dccd-run/<firm>-dccd.pptx
// Needs pptxgenjs. If require fails: npm install --prefix <dir> pptxgenjs, then run with NODE_PATH=<dir>/node_modules
// Spec: see ../reference/deck-spec.md and ../examples/palantir-deck.json
const fs = require("fs");
let pptxgen;
try { pptxgen = require("pptxgenjs"); } catch (e) {
  console.error("pptxgenjs not found. Run: npm install --prefix <scratch dir> pptxgenjs, then NODE_PATH=<scratch dir>/node_modules node build_deck.js ...");
  process.exit(2);
}

const [, , specPath, outPath] = process.argv;
if (!specPath || !outPath) { console.error("usage: node build_deck.js deck.json out.pptx"); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

const K = {
  ink: "14171C", slate: "2B3440", paper: "FFFFFF", mist: "EEF0F3", rule: "D5D9DE",
  amber: "D9822B", steel: "3E6B8A", green: "2E7D4F", red: "B23A3A", gray: "8A94A0", gold: "C9A227",
};
const HEAD = "Cambria", BODY = "Calibri";
const W = 13.333, X0 = 0.6, CW = 12.13, TOP = 1.7, BOTTOM = 6.8, GAP = 0.15;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
pres.title = spec.title || "DCCD analysis";

// ---------- text-height estimate (Calibri ~0.5em average glyph width) ----------
function lines(str, fs, widthIn) {
  const perLine = Math.max(8, Math.floor(widthIn / (fs * 0.48 / 72)));
  return String(str).split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
}
const lh = (fs) => fs * 1.22 / 72;

// ---------- blocks ----------
const TONES = {
  light: { fill: K.mist, text: K.ink, head: K.steel },
  outline: { fill: K.paper, line: K.rule, text: K.ink, head: K.steel },
  dark: { fill: K.slate, text: K.paper, head: K.amber },
  accent: { fill: K.amber, text: K.paper, head: K.paper },
  alert: { fill: K.paper, line: K.red, text: K.ink, head: K.red },
  alertfill: { fill: K.red, text: K.paper, head: K.paper },
};

function cardRuns(b, t, fs) {
  const runs = [];
  if (b.heading) runs.push({ text: b.heading.toUpperCase(), options: { bold: true, color: t.head, fontSize: fs - 0.5, charSpacing: 1, breakLine: true } });
  if (b.big) runs.push({ text: b.big, options: { bold: true, color: t.text, fontSize: fs + 9, fontFace: HEAD, breakLine: true } });
  if (b.text) runs.push({ text: b.text, options: { color: t.text, fontSize: fs, breakLine: !!(b.bullets && b.bullets.length) } });
  if (b.text && ((b.lines && b.lines.length) || (b.bullets && b.bullets.length))) runs[runs.length - 1].options.breakLine = true;
  (b.lines || []).forEach((x, i, a) => runs.push({ text: x, options: { color: t.text, fontSize: fs, bold: /^C\s/.test(x), breakLine: i < a.length - 1 || !!(b.bullets && b.bullets.length) } }));
  (b.bullets || []).forEach((x, i, a) => runs.push({ text: x, options: { color: t.text, fontSize: fs, bullet: true, breakLine: i < a.length - 1 } }));
  return runs;
}
function cardHeight(b, w, fs) {
  const iw = w - 0.3;
  let h = 0.22;
  if (b.heading) h += lh(fs) + 0.04;
  if (b.big) h += lh(fs + 9) + 0.04;
  if (b.text) h += lines(b.text, fs, iw) * lh(fs) + 0.05;
  (b.lines || []).forEach((x) => { h += lines(x, fs, iw) * lh(fs) + 0.06; });
  (b.bullets || []).forEach((x) => { h += lines(x, fs, iw - 0.25) * lh(fs) + 0.05; });
  return h;
}
function tableRowsH(b, w, fs) {
  const colW = colWidths(b, w);
  const rows = [b.header, ...b.rows];
  return rows.map((r) => Math.max(...r.map((c, i) => lines(c, fs, colW[i] - 0.12) * lh(fs) + 0.12)));
}
function colWidths(b, w) {
  const n = b.header.length;
  const f = b.colW && b.colW.length === n ? b.colW : Array(n).fill(1);
  const s = f.reduce((a, c) => a + c, 0);
  return f.map((x) => (x / s) * w);
}
function blockHeight(b, w, fs) {
  if (b.type === "card") return cardHeight(b, w, fs);
  if (b.type === "note") return lines(b.text, fs - 1.5, w - 0.1) * lh(fs - 1.5) + 0.12;
  if (b.type === "table") return tableRowsH(b, w, fs - 1).reduce((a, c) => a + c, 0) + 0.05;
  if (b.type === "chart") return b.minH || 2.8;
  return 0.5;
}

function ratingFill(v) {
  const s = String(v).trim().toUpperCase();
  if (s.startsWith("H")) return K.red;
  if (s.startsWith("M")) return K.amber;
  if (s.startsWith("L")) return K.green;
  return null;
}
function verdictFill(v) {
  const s = String(v).toLowerCase();
  if (/misfit|fail|weak|^no?$/.test(s)) return K.red;
  if (/^fits|^yes|^y\b|sustained/.test(s)) return K.green;
  return K.gray;
}

function drawBlock(slide, b, x, y, w, h, fs, dark) {
  if (b.type === "card") {
    const t = TONES[b.tone || (dark ? "dark" : "light")] || TONES.light;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: t.fill }, line: t.line ? { color: t.line, width: 1 } : { type: "none" } });
    slide.addText(cardRuns(b, t, fs), { x: x + 0.03, y: y + 0.03, w: w - 0.06, h: h - 0.06, isTextBox: true, valign: "top", fontFace: BODY, margin: [7, 9, 7, 9], paraSpaceAfter: 4 });
  } else if (b.type === "note") {
    const c = b.tone === "alert" ? K.red : dark ? "B8C0C8" : K.gray;
    slide.addText(b.text, { x, y, w, h, isTextBox: true, valign: "top", fontFace: BODY, fontSize: fs - 1.5, italic: true, color: c, margin: 2 });
  } else if (b.type === "table") {
    const colW = colWidths(b, w);
    const rowH = tableRowsH(b, w, fs - 1);
    const hdr = b.header.map((t) => ({ text: t, options: { bold: true, color: K.paper, fill: { color: K.slate }, fontSize: fs - 1, valign: "middle" } }));
    const body = b.rows.map((r, ri) => r.map((t, i) => {
      const o = { fontSize: fs - 1, color: dark ? K.paper : K.ink, valign: "middle" };
      let fill = null;
      if ((b.ratingCols || []).includes(i)) fill = ratingFill(t);
      if (b.verdictCol === i) fill = verdictFill(t);
      if ((b.highlight || []).some(([ri2, ci]) => ri2 === ri && ci === i)) fill = K.red;
      if (fill) Object.assign(o, { fill: { color: fill }, color: K.paper, bold: true, align: (b.ratingCols || []).includes(i) ? "center" : "left" });
      if (i === 0 && b.boldFirst !== false) o.bold = true;
      return { text: String(t), options: o };
    }));
    slide.addTable([hdr, ...body], { x, y, w, colW, rowH, border: { type: "solid", pt: 0.75, color: K.rule }, fontFace: BODY, margin: [2, 5, 2, 5] });
  } else if (b.type === "chart") {
    const stacked = b.chart === "stacked";
    const pal = b.colors || [K.gray, K.gold, K.amber, K.steel, K.green, K.red];
    const noteH = b.note ? 0.45 : 0;
    slide.addChart(pres.charts.BAR, b.series.map((s) => ({ name: s.name, labels: b.labels, values: s.values })), {
      x, y, w, h: h - noteH, barDir: "col", barGrouping: stacked ? "stacked" : "clustered", barGapWidthPct: 60,
      chartColors: pal.slice(0, b.series.length), showValue: true, dataLabelPosition: stacked ? "ctr" : "outEnd",
      dataLabelColor: stacked ? K.paper : K.ink, dataLabelFontSize: 10, dataLabelFontFace: BODY,
      ...(b.percent ? { dataLabelFormatCode: '0"%"' } : {}),
      showLegend: b.series.length > 1, legendPos: "b", legendFontSize: 10, legendFontFace: BODY,
      showTitle: !!b.title, title: b.title || "", titleFontSize: 12, titleFontFace: BODY, titleColor: dark ? K.paper : K.ink,
      catAxisLabelColor: dark ? K.paper : K.slate, catAxisLabelFontFace: BODY, valAxisHidden: !stacked,
      valAxisLabelColor: K.gray, valGridLine: stacked ? { color: "E3E6EA", size: 0.5 } : { style: "none" }, catGridLine: { style: "none" },
    });
    if (b.note) slide.addText(b.note, { x, y: y + h - noteH, w, h: noteH, isTextBox: true, fontFace: BODY, fontSize: 10, italic: true, color: b.noteTone === "alert" ? K.red : K.gray, margin: 2, valign: "top" });
  }
}

// Stack blocks in one column; charts absorb leftover height; shrink font until it fits.
function layoutColumn(slide, blocks, x, y0, w, dark) {
  if (!blocks || !blocks.length) return;
  const avail = BOTTOM - y0;
  for (let fs = 12; fs >= 9; fs -= 0.5) {
    const hs = blocks.map((b) => blockHeight(b, w, fs));
    const total = hs.reduce((a, c) => a + c, 0) + GAP * (blocks.length - 1);
    if (total <= avail || fs === 9) {
      const charts = blocks.filter((b) => b.type === "chart").length;
      const cards = blocks.some((b) => b.type === "table") ? 0 : blocks.filter((b) => b.type === "card").length;
      const spare = Math.max(0, avail - total);
      let y = y0;
      blocks.forEach((b, i) => {
        let h = hs[i];
        if (b.type === "chart" && charts) h += spare / charts;
        else if (!charts && cards && b.type === "card") h += Math.min(0.6, spare / cards); // even out the column without leaving cards mostly empty
        drawBlock(slide, b, x, y, w, h, fs, dark);
        y += h + GAP;
      });
      if (total > avail) console.warn(`  ! overflow risk on "${slide._dccdTitle}" (${total.toFixed(2)} > ${avail.toFixed(2)} in)`);
      return;
    }
  }
}

function header(slide, s, dark) {
  slide.background = { color: dark ? K.ink : K.paper };
  if (s.stage) slide.addText(s.stage.toUpperCase(), { x: X0, y: 0.28, w: 6, h: 0.32, isTextBox: true, fontFace: BODY, fontSize: 11, bold: true, color: K.amber, charSpacing: 2, margin: 0 });
  const tfs = s.title.length > 120 ? 22 : 25;
  slide.addText(s.title, { x: X0, y: 0.6, w: CW, h: 0.98, isTextBox: true, fontFace: HEAD, fontSize: tfs, bold: true, color: dark ? K.paper : K.ink, valign: "top", margin: 0 });
  if (s.source) slide.addText(s.source, { x: X0, y: 6.98, w: 11.2, h: 0.42, isTextBox: true, fontFace: BODY, fontSize: 8.5, color: K.gray, valign: "top", margin: 0 });
  slide.slideNumber = { x: 12.3, y: 6.98, w: 0.45, h: 0.3, fontSize: 9, color: K.gray, align: "right" };
}

function statsRow(slide, stats, dark) {
  const n = stats.length, gap = 0.17, w = (CW - gap * (n - 1)) / n;
  stats.forEach((st, i) => {
    const x = X0 + i * (w + gap);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: TOP, w, h: 1.12, rectRadius: 0.08, fill: { color: dark ? K.slate : K.mist }, line: { type: "none" } });
    slide.addText([
      { text: st.big, options: { fontSize: 24, bold: true, fontFace: HEAD, color: dark ? K.paper : K.ink, breakLine: true } },
      { text: st.label, options: { fontSize: 10.5, color: dark ? K.mist : K.slate, breakLine: !!st.src } },
      ...(st.src ? [{ text: st.src, options: { fontSize: 8.5, color: K.gray } }] : []),
    ], { x: x + 0.05, y: TOP + 0.02, w: w - 0.1, h: 1.08, isTextBox: true, fontFace: BODY, valign: "top", margin: [5, 8, 5, 8], paraSpaceAfter: 0 });
  });
  return TOP + 1.12 + 0.18;
}

for (const s of spec.slides) {
  const slide = pres.addSlide();
  slide._dccdTitle = s.title;
  if (s.layout === "cover") {
    slide.background = { color: K.ink };
    if (s.kicker) slide.addText(s.kicker.toUpperCase(), { x: 0.7, y: 1.2, w: 11.9, h: 0.45, isTextBox: true, fontFace: BODY, fontSize: 14, bold: true, color: K.amber, charSpacing: 2, margin: 0 });
    slide.addText(s.title, { x: 0.7, y: 1.7, w: 11.9, h: 2.2, isTextBox: true, fontFace: HEAD, fontSize: s.title.length > 90 ? 32 : 36, bold: true, color: K.paper, valign: "top", margin: 0 });
    if (s.subtitle) slide.addText(s.subtitle, { x: 0.7, y: 4.1, w: 11.0, h: 1.9, isTextBox: true, fontFace: BODY, fontSize: 17, color: K.mist, valign: "top", margin: 0 });
    if (s.meta) slide.addText(s.meta, { x: 0.7, y: 6.5, w: 11.9, h: 0.5, isTextBox: true, fontFace: BODY, fontSize: 11, color: K.gray, margin: 0 });
    if (s.notes) slide.addNotes(s.notes);
    continue;
  }
  const dark = s.layout === "close";
  header(slide, s, dark);
  let y = TOP;
  if (s.stats && s.stats.length) y = statsRow(slide, s.stats, dark);
  if (s.full) layoutColumn(slide, s.full, X0, y, CW, dark);
  else {
    const split = s.split || 0.5, gap = 0.3;
    const lw = (CW - gap) * split, rw = CW - gap - lw;
    layoutColumn(slide, s.left, X0, y, lw, dark);
    layoutColumn(slide, s.right, X0 + lw + gap, y, rw, dark);
  }
  if (s.notes) slide.addNotes(s.notes);
}

pres.writeFile({ fileName: outPath }).then(() => console.log("wrote " + outPath));
