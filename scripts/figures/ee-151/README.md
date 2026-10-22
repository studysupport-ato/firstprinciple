# EE 151 question figures

`figs.py` draws every EE 151 exam diagram as an SVG with the helper in `sch.py`.

Regenerate after editing a figure:

```
python3 scripts/figures/ee-151/figs.py public/questions/ee-151            # all figures
python3 scripts/figures/ee-151/figs.py public/questions/ee-151 f2004-f2   # one figure
```

A question shows a figure when its `tags` contain `figure:ee-151/<key>`, for example `figure:ee-151/f2004-f2`.
