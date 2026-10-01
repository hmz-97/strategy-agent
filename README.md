# intro
- experiment with multi-agent setup for Biz Strat course at CMU
- runs a DCCD (Define, Create, Capture, Deliver) strategy analysis of a firm and builds a 9-slide deck plus an argument map
- two versions, tagged in git:
  - `vLong`: per-letter pipeline (7 worker calls per stage, sampled challenges, per-letter conciliator). Thorough, ~60 min per run.
  - `vFast` (current): parallel, time-boxed pipeline targeted at ~10 min per run

# how vFast works
- one orchestrator skill (`skills/strategy-master/SKILL.md`) owns the run and launches subagents in parallel wherever the dependency graph allows
- agents
  - researcher: runs haiku, 3 in parallel at the start, each fills one evidence file (financials, market, organization) so workers don't re-search the same filings
  - worker: runs sonnet, one full a-to-g pass per stage (Define, Capture, Deliver)
  - worker-chad: runs opus, used for the Create stage only (the core competitive-advantage claim)
  - challenger: runs haiku, one review per stage, focused on evidence and the slide-ready Settled block
- flow: frame → research wave (parallel) → Define → Create → Capture ∥ Deliver; each stage's review runs while the next stage is being written; revisions only on CHALLENGE, sent back to the same worker (no second review round)
- no conciliator: each worker writes a `## Settled` block, which (after revision) is the only input to the deck
- deck and map are built by scripts from two JSON files the orchestrator writes:
  - `scripts/build_deck.js` (pptxgenjs) lays out and sizes all 9 slides from `deck.json`; see `reference/deck-spec.md` and `examples/palantir-deck.json`
  - `scripts/build_map.py` (stdlib) renders the Mermaid argument map from `map.json`; see `examples/palantir-map.json`
- method text lives in `skills/strategy-master/reference/` and is passed to subagents as file paths, never pasted into prompts
- nothing happens in a chat, all work is done on files (.md) under `dccd-run/`, allowing full traceability and strict viewership by agents
  - challenger only sees the worker's stage file (to avoid it giving up criticizing based on previous facts)
  - workers see the frame, the evidence files and the Settled blocks of earlier stages
- hard budgets (searches, words, calls) are in SKILL.md Part 2; `dccd-run/timing.md` records start and end time of each run

# what vFast trades away
- one challenge round per stage instead of up to three per stage; revisions are marked ADDRESSED (not re-checked)
- Capture and Deliver run in parallel, so neither sees the other; the consistency check catches mismatches
- visual QA of the deck is off by default (the layout engine sizes text to fit)
