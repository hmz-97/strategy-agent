import json, random, sys, pathlib
cfg = json.load(open(sys.argv[1]))
rng = random.Random(cfg["seed"])
w, always = cfg["weights"], cfg["always"]
assert abs(sum(w.values()) - 1) < 1e-6, "weights must sum to 1"
plan = {}
for stage in ["define", "create", "capture", "deliver"]:
    # weighted sampling without replacement
    picked = sorted(w, key=lambda l: rng.random() ** (1 / w[l]), reverse=True)[:cfg["draws"]]
    chosen = set(always) | set(picked)
    plan[stage] = {l: (l in chosen) for l in "abcdefg"}
pathlib.Path("dccd-run").mkdir(exist_ok=True)
json.dump(plan, open("dccd-run/challenge-plan.json", "w"), indent=2)
print(json.dumps(plan))
