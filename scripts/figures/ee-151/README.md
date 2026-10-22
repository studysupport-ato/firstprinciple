# EE 151 question figures

`figs.py` draws every EE 151 exam diagram as an SVG with the helper in `sch.py`.

Regenerate after editing a figure:

```
python3 scripts/figures/ee-151/figs.py public/questions/ee-151            # all figures
python3 scripts/figures/ee-151/figs.py public/questions/ee-151 f2004-f2   # one figure
```

A question shows a figure when its `tags` contain `figure:ee-151/<key>`, for example `figure:ee-151/f2004-f2`.

## Word-problem diagrams

`solution_figs.py` draws the circuits that EE 151 word problems describe in text. They are shown only
with the worked solution, after the student answers. A question uses one when its tags contain
`solution-figure:ee-151/sol/<key>`.

```
python3 scripts/figures/ee-151/solution_figs.py public/questions/ee-151/sol
```
