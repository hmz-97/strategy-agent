"""Render dccd-run/argument-map.html from dccd-run/map.json (stdlib only).

map.json:
{
  "firm": "Palantir",
  "stages": [
    {"stage": "Define", "claim": "...", "objection": "..." | null, "sources_checked": "...",
     "response": "..." | null, "verdict": "SATISFIED" | "ADDRESSED" | "UNRESOLVED", "settled": "...",
     "challenger_calls": 1}
  ],
  "contradictions": [{"from": "Capture", "to": "Create", "note": "..."}]
}
SATISFIED = challenger agreed; ADDRESSED = worker revised after a CHALLENGE, not re-checked; UNRESOLVED = no fix.
Usage: python build_map.py dccd-run/map.json dccd-run/argument-map.html
"""
import html
import json
import sys

src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
stages = d["stages"]


def q(s):
    return '"' + html.escape(str(s)).replace('"', "'") + '"'


CLS = {"SATISFIED": "ok", "ADDRESSED": "mid", "UNRESOLVED": "bad"}
lines = [
    "flowchart TB",
    "classDef base fill:#eef0f3,stroke:#8A94A0,color:#14171C",
    "classDef obj fill:#fbe8d3,stroke:#D9822B,color:#14171C",
    "classDef ok fill:#d8efe0,stroke:#2E7D4F,color:#14171C",
    "classDef mid fill:#fff3c4,stroke:#C9A227,color:#14171C",
    "classDef bad fill:#f6d6d6,stroke:#B23A3A,color:#14171C",
]
for r in stages:
    k = r["stage"][:3]
    lines.append(f'subgraph {k}G[{q(r["stage"])}]')
    lines.append("direction LR")
    lines.append(f'{k}c[{q("Claim: " + r["claim"])}]:::base')
    prev = f"{k}c"
    if r.get("objection"):
        lines.append(f'{k}o[{q("Objection: " + r["objection"])}]:::obj')
        lines.append(f"{prev} --> {k}o")
        prev = f"{k}o"
        if r.get("response"):
            lines.append(f'{k}r[{q("Response: " + r["response"])}]:::base')
            lines.append(f"{prev} --> {k}r")
            prev = f"{k}r"
    lines.append(f'{k}s[{q("Settled: " + r["settled"])}]:::{CLS.get(r["verdict"], "ok")}')
    lines.append(f"{prev} --> {k}s")
    lines.append("end")
for a, b in zip(stages, stages[1:]):
    lines.append(f'{a["stage"][:3]}s ==> {b["stage"][:3]}c')
for c in d.get("contradictions", []):
    lines.append(f'{c["from"][:3]}s -.{q(c["note"][:40])}.-> {c["to"][:3]}s')
mermaid = "\n".join(lines)

rows = "".join(
    f"<tr><td>{html.escape(r['stage'])}</td><td>{'yes' if r.get('objection') else 'no'}</td>"
    f"<td>{html.escape(r['verdict'])}</td><td>{r.get('challenger_calls', 0)}</td></tr>"
    for r in stages
)
weak = "".join(
    f"<li><b>{html.escape(r['stage'])}</b> ({r['verdict'].lower()}): {html.escape(r['objection'])}"
    f" <span class='muted'>checked: {html.escape(r.get('sources_checked') or 'n/a')}</span></li>"
    for r in stages if r.get("objection") and r["verdict"] != "SATISFIED"
) or "<li>None</li>"
contra = "".join(
    f"<li><b>{html.escape(c['from'])}</b> ⇢ <b>{html.escape(c['to'])}</b>: {html.escape(c['note'])}</li>"
    for c in d.get("contradictions", [])
) or "<li>None flagged</li>"
firm = html.escape(d.get("firm", "Firm"))

page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{firm} Argument Map</title>
<style>
:root{{--bg:#fff;--fg:#14171C;--muted:#5b6470;--line:#d5d9de;--card:#eef0f3}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#14171C;--fg:#eef0f3;--muted:#9aa3ad;--line:#2b3440;--card:#1e242c}}}}
:root[data-theme="dark"]{{--bg:#14171C;--fg:#eef0f3;--muted:#9aa3ad;--line:#2b3440;--card:#1e242c}}
body{{background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Segoe UI,Calibri,sans-serif;margin:0;padding:24px 16px}}
main{{max-width:1200px;margin:0 auto}} h1,h2{{font-family:Cambria,Georgia,serif}} .muted{{color:var(--muted)}}
table{{border-collapse:collapse;width:100%;max-width:640px}} td,th{{border:1px solid var(--line);padding:6px 10px;text-align:left}} th{{background:var(--card)}}
.scroll{{overflow-x:auto;background:#fff;border-radius:8px;padding:8px}}
</style></head><body><main>
<h1>{firm}: DCCD argument map</h1>
<p class="muted">Per stage: claim → challenger objection → worker response → settled position. Green = challenger satisfied; yellow = revised, not re-checked; red = unresolved. Dashed edges = contradictions flagged in the consistency check.</p>
<h2>Summary</h2><table><tr><th>Stage</th><th>Objection</th><th>Verdict</th><th>Challenger calls</th></tr>{rows}</table>
<h2>Weakest points</h2><ul>{weak}</ul>
<h2>Cross-stage contradictions</h2><ul>{contra}</ul>
<h2>Map</h2><div class="scroll"><pre class="mermaid">
{mermaid}
</pre></div>
</main>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({{startOnLoad:true,theme:"base",flowchart:{{useMaxWidth:false,wrappingWidth:240}}}});</script>
</body></html>"""
open(out, "w").write(page)
print("wrote " + out)
