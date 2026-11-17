#!/usr/bin/env python3
"""site/data.json -> site/story/story.json: how long after the first paper attack does the real one come?

    python3 build_story.py          # BUILD_OUT=... writes elsewhere (publish.sh compares)

Everything comes from the file the page already ships. "Weak" is the first published attack
better than brute force; "broken" the first that worked. Each is a dated, quoted event.

  warned    [name, weak, broken|null, retired|null] for every algorithm with a weak event
            before (or without) a break; a warned one never broken waits until retirement or `now`
  unwarned  [name, born, broken] for every break with no recorded weak event before it.
            That is a fact about this record, not about history: the page only lists a weakness
            it can quote (TLS 1.0's 2002 CBC weakness is not in it), so the story says so

test/story.test.mjs recomputes both arrays from data.json in JS and requires the `check`
block below, computed here in python, to agree with the page's own layout.js stats().
"""
import json
import os
from datetime import date
from statistics import median

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "site", "data.json")
OUT = os.environ.get("BUILD_OUT", os.path.join(HERE, "site", "story", "story.json"))
NOW = int(os.environ.get("STORY_NOW", date.today().year))  # AES's wait grows each year: re-run on 1 January


def main():
    A = json.load(open(SRC))["algorithms"]
    warned, unwarned = [], []
    for a in A:
        e = {x["kind"]: x["year"] for x in a["events"]}
        w, b = e.get("weak"), e.get("broken")
        if w is not None and (b is None or w < b):
            warned.append([a["short"], w, b, e.get("retired")])
        elif b is not None:
            unwarned.append([a["short"], e["born"], b])
    wait = lambda r: (r[2] if r[2] is not None else r[3] if r[3] is not None else NOW) - r[1]
    warned.sort(key=lambda r: (wait(r), r[0]))
    unwarned.sort(key=lambda r: (r[2], r[0]))
    broke = [r for r in warned if r[2] is not None]
    gaps = sorted(r[2] - r[1] for r in broke)
    open_ = [r for r in warned if r[2] is None and r[3] is None]
    # the chapter follows the longest wait still running (AES); any younger ones are named in it
    assert open_, "the story's middle chapter needs a warned algorithm still unbroken and in use"
    open_.sort(key=lambda r: (r[1], r[0]))
    aes = open_[0]
    longest = max(broke, key=lambda r: r[2] - r[1])
    D = {
        "source": "Crypto Lifetimes' site/data.json: every date quoted from its source",
        "now": NOW, "warned": warned, "unwarned": unwarned,
    }
    D["check"] = {
        "n_warned": len(warned), "n_broke": len(broke), "n_unwarned": len(unwarned),
        "gap_median": median(gaps), "gap_min": gaps[0], "gap_max": gaps[-1], "max_name": longest[0],
        "gap_median_wo_max": median(gaps[:-1]),
        "open_name": aes[0], "open_wait": NOW - aes[1], "still_open": open_[1:],
        "longer_than_open": sum(1 for g in gaps if g > NOW - aes[1]),
        "unwarned_median": median(r[2] - r[1] for r in unwarned),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(D, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print("  ".join(f"{k} {v}" for k, v in D["check"].items()))
    print("warned", warned)
    print("unwarned", unwarned)


if __name__ == "__main__":
    main()
