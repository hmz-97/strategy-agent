import json, random, sys, pathlib
cfg = json.load(open(sys.argv[1]))
w, always = cfg["weights"], cfg["always"]
assert abs(sum(w.values()) - 1) < 1e-6, "weights must sum to 1"
assert not set(always) & set(w), "'always' letters must not also be in weights"
assert cfg["draws"] <= len(w), "draws cannot exceed the number of weighted letters"
# record the seed actually used, so any run can be reproduced
seed = cfg["seed"] if cfg["seed"] is not None else random.randrange(2**32)
rng = random.Random(seed)
plan = {"seed": seed, "max_calls_per_stage": cfg["max_calls_per_stage"]}
for stage in ["define", "create", "capture", "deliver"]:
    # weighted sampling without replacement
    picked = sorted(w, key=lambda l: rng.random() ** (1 / w[l]), reverse=True)[:cfg["draws"]]
    chosen = set(always) | set(picked)
    plan[stage] = {l: (l in chosen) for l in "abcdefg"}
pathlib.Path("dccd-run").mkdir(exist_ok=True)
json.dump(plan, open("dccd-run/challenge-plan.json", "w"), indent=2)
print(json.dumps(plan))
