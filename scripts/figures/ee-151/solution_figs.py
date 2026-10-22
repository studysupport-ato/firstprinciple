"""Diagrams for EE 151 word problems. They are shown only with the worked solution,
after the student answers (tag: solution-figure:ee-151/sol/<key>)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sch import Sch

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)
FIGS = {}
O = " Ω"


def fig(key, title):
    def deco(fn):
        FIGS[key] = (title, fn)
        return fn
    return deco


def put(s, kind, x1, y1, x2, y2, label=None, side=None, off=None):
    if kind == "R":
        s.res(x1, y1, x2, y2, label, side, off)
    elif kind == "L":
        s.ind(x1, y1, x2, y2, label, side, off)
    elif kind == "C":
        s.cap(x1, y1, x2, y2, label, side, off)
    elif kind == "lamp":
        s.lamp(x1, y1, x2, y2, label, side or "above", off or 30)
    elif kind == "A" or kind == "V":
        s.meter(x1, y1, x2, y2, kind, label, side or "right", off or 26)
    elif kind == "W":
        s.line(x1, y1, x2, y2)


# ------------------------------------------------------------------ templates
def series_ac(src, elems, groups=(), current=None, volts=(), seg=120):
    """AC source on the left, elements in series along the top rail."""
    n = len(elems)
    xr = 120 + seg * n + 30
    s = Sch(xr + 70, 280)
    s.pad = 80
    top, bot = 80, 230
    s.acsrc(60, top, 60, bot, src, "left", 30)
    s.wire((60, top), (120, top))
    for i, (k, lab) in enumerate(elems):
        put(s, k, 120 + seg * i, top, 120 + seg * (i + 1), top, lab)
    s.wire((120 + seg * n, top), (xr, top), (xr, bot), (60, bot))
    for (i, j, lab) in groups:
        x0 = 120 + seg * i + 12
        s.group(x0, top - 48, seg * (j - i + 1) - 24, 74, lab, ly=top + 40)
    if current:
        s.flow(90, top, "right", current, 0, -20)
    for (i, lab) in volts:
        x0, x1 = 120 + seg * i + 18, 120 + seg * (i + 1) - 18
        s.line(x0, top + 30, x1 - 6, top + 30, sw=1.3)
        s.arrowhead(x1, top + 30, math.pi, 8)
        s.text((x0 + x1) / 2, top + 48, lab, 14)
    s.w = max(s.w, 300)
    return s


def parallel_ac(src, branches, width_gap=150, top=60, bot=250, caption=None):
    """branches: list of lists of (kind, label); each list is one vertical branch."""
    xs = [200 + width_gap * i for i in range(len(branches))]
    s = Sch(xs[-1] + 150, bot + 40)
    s.pad = 80
    s.acsrc(60, top, 60, bot, src, "left", 30)
    s.wire((60, top), (xs[-1], top)); s.wire((60, bot), (xs[-1], bot))
    for x, br in zip(xs, branches):
        if len(br) == 1:
            k, lab = br[0]
            put(s, k, x, top, x, bot, lab, "right")
        else:
            m = (top + bot) / 2
            put(s, br[0][0], x, top, x, m, br[0][1], "right")
            put(s, br[1][0], x, m, x, bot, br[1][1], "right")
    for x in xs[:-1]:
        s.dot(x, top); s.dot(x, bot)
    return s


def loads(src, boxes, gap=150, w=118, h=78, cap=None):
    xs = [210 + gap * i for i in range(len(boxes) + (1 if cap else 0))]
    s = Sch(xs[-1] + 110, 300)
    s.pad = 80
    top, bot = 50, 260
    s.acsrc(60, top, 60, bot, src, "left", 30)
    s.wire((60, top), (xs[-1], top)); s.wire((60, bot), (xs[-1], bot))
    for x, b in zip(xs, boxes):
        s.loadbox(x, top, bot, w, h, b)
    if cap:
        x = xs[-1]
        s.cap(x, top, x, bot, cap, "right", 22)
    for x in xs[:-1]:
        s.dot(x, top); s.dot(x, bot)
    return s


def dc_parallel(branches, load, gap=150, top=50, bot=270):
    """branches: list of (name, emf_label, r_label, meter_letter_or_None)."""
    xs = [80 + gap * i for i in range(len(branches) + 1)]
    s = Sch(xs[-1] + 120, bot + 40)
    s.wire((xs[0], top), (xs[-1], top)); s.wire((xs[0], bot), (xs[-1], bot))
    for x, (name, e, r, meter) in zip(xs, branches):
        if meter:
            s.meter(x, top, x, top + 50, meter, None)
            s.text(x + 20, top + 25, meter_label(meter), 13, "start", color="#555")
            y0 = top + 50
        else:
            y0 = top
        mid = (y0 + bot) / 2 + 10
        s.res(x, y0, x, mid, r, "right")
        s.bat(x, mid, x, bot, "a", e, "right", 24)
        if name:
            s.text(x, bot + 24, name, 14, weight="600")
    s.res(xs[-1], top, xs[-1], bot, load, "right")
    for x in xs[1:-1]:
        s.dot(x, top); s.dot(x, bot)
    return s


def meter_label(m):
    return {"A": "", "B": ""}.get(m, "")


def star_load(lines, legs, supply, neutral=False, caption=None):
    """lines: 3 names; legs: 3 (kind, label) or impedance text. Exam-style star."""
    s = Sch(560, 340 if neutral else 300)
    n = (310, 160)
    a, c, b = lines
    s.term(40, 40, a, "left"); s.wire((40, 40), (310, 40))
    put_leg(s, legs[0], 310, 40, *n, "right")
    s.term(40, 200, c, "left"); s.wire((40, 200), (200, 200))
    put_leg(s, legs[1], 200, 200, *n, None)
    s.term(40, 260, b, "left")
    if neutral:
        s.wire((40, 260), (300, 260))
        s.hop(300, 260, 430, 260, 310, 260, r=8)
        s.wire((430, 260), (430, 220))
    else:
        s.wire((40, 260), (430, 260), (430, 220))
    put_leg(s, legs[2], 430, 220, *n, None)
    s.dot(*n)
    if neutral:
        s.wire(n, (310, 252)); s.line(310, 268, 310, 310)
        s.wire((310, 310), (40, 310)); s.term(40, 310, "N", "left")
        s.text(324, 300, "neutral", 12, "start", color="#555")
    s.text(540, 22, supply, 14, "end", color="#333")
    return s


def put_leg(s, leg, x1, y1, x2, y2, side):
    kind, lab = leg
    if kind == "RL":
        # coil drawn as resistor + inductor in series along the leg
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        s.res(x1, y1, mx, my, None)
        s.ind(mx, my, x2, y2, None)
        lx, ly = (x1 + x2) / 2, (y1 + y2) / 2
        if x1 == x2:
            s.text(x1 + 22, ly, lab, 13, "start")
        else:
            s.text(lx + (-12 if x1 < x2 else 12), ly - 26, lab, 13, "end" if x1 < x2 else "start")
    else:
        if x1 == x2:
            put(s, kind, x1, y1, x2, y2, None)
            s.text(x1 + 20, (y1 + y2) / 2, lab, 13, "start")
        else:
            put(s, kind, x1, y1, x2, y2, None)
            lx, ly = (x1 + x2) / 2, (y1 + y2) / 2
            s.text(lx + (-12 if x1 < x2 else 12), ly - 24, lab, 13, "end" if x1 < x2 else "start")


def delta_load(lines, sides, supply):
    """lines: (top, middle, bottom). sides: labels for top-mid, top-bottom, mid-bottom, each (kind,label)."""
    s = Sch(560, 270)
    ap, lv, rv = (300, 50), (180, 170), (420, 170)
    t, m, b = lines
    s.term(40, 50, t, "left"); s.wire((40, 50), ap)
    s.term(40, 170, m, "left"); s.wire((40, 170), lv)
    s.term(40, 230, b, "left"); s.wire((40, 230), (420, 230), rv)
    k, lab = sides[0]; put(s, k, *ap, *lv, None); s.text(222, 92, lab, 13, "end")
    k, lab = sides[1]; put(s, k, *ap, *rv, None); s.text(378, 92, lab, 13, "start")
    k, lab = sides[2]; put(s, k, *lv, *rv, None); s.text(300, 196, lab, 13)
    for p in (ap, lv, rv):
        s.dot(*p)
    s.text(540, 22, supply, 14, "end", color="#333")
    return s


def alt_to_delta(load_sides, alt_label, supply):
    s = Sch(600, 300)
    S = (90, 150)
    ends = [(190, 60), (200, 150), (190, 240)]
    for e in ends:
        s.ind(*S, *e, None)
    s.dot(*S)
    s.text(90, 270, alt_label, 13, color="#333")
    V1, V2, V3 = (470, 60), (400, 150), (520, 240)
    names = ["R", "Y", "B"]
    for e, v, nm in zip(ends, (V1, V2, V3), names):
        s.wire(e, (e[0] + 40, e[1]), v)
        s.text(e[0] + 34, e[1] - 12, nm, 13, italic=True)
    k, lab = load_sides[0]; put(s, k, *V1, *V2, None); s.text(420, 92, lab, 13, "end")
    k, lab = load_sides[1]; put(s, k, *V2, *V3, None); s.text(448, 212, lab, 13, "end")
    k, lab = load_sides[2]; put(s, k, *V1, *V3, None); s.text(508, 140, lab, 13, "start")
    for v in (V1, V2, V3):
        s.dot(*v)
    s.text(580, 22, supply, 14, "end", color="#333")
    return s


def tap_star_delta(star_lab, delta_lab, supply):
    """Star load and delta load on the same three lines."""
    s = Sch(620, 330)
    ys = [50, 90, 130]
    names = ["R", "Y", "B"]
    for y, nm, end in zip(ys, names, (400, 470, 540)):
        s.term(40, y, nm, "left"); s.wire((44, y), (end, y))
    # star: legs from each line down to a common bar
    xs = [150, 210, 270]
    for x, y in zip(xs, ys):
        s.dot(x, y)
        if y == 50:
            s.hop(x, y, x, 200, x, 90, 7)
        elif y == 90:
            s.hop(x, y, x, 200, x, 130, 7)
        else:
            s.line(x, y, x, 200)
        s.res(x, 200, x, 270, None)
    s.wire((150, 270), (270, 270)); s.dot(210, 270)
    s.text(210, 300, "Star: " + star_lab, 13)
    # delta: a triangle below the lines, one vertex tapped from each line
    vy, vr, vb = (470, 175), (400, 265), (540, 265)
    s.dot(400, 50); s.dot(470, 90); s.dot(540, 130)
    s.hop(400, 50, 400, 110, 400, 90, 7); s.hop(400, 110, 400, 265, 400, 130, 7)
    s.hop(470, 90, 470, 175, 470, 130, 7)
    s.line(540, 130, 540, 265)
    s.res(*vy, *vr, None); s.res(*vy, *vb, None); s.res(*vr, *vb, None)
    for v in (vy, vr, vb):
        s.dot(*v)
    s.text(470, 300, "Delta: " + delta_lab, 13)
    s.text(600, 22, supply, 14, "end", color="#333")
    return s


# ------------------------------------------------------------------ DC word problems
@fig("s-q12", "4, 5 and 10 ohm resistors in parallel, in series with 20 ohms")
def _():
    s = Sch(520, 260)
    s.bat(60, 60, 60, 220, "a", "*V*", "left", 26)
    s.res(60, 60, 220, 60, "20" + O)
    s.wire((220, 60), (440, 60)); s.wire((60, 220), (440, 220))
    for x, r in zip((260, 350, 440), ("4" + O, "5" + O, "10" + O)):
        s.res(x, 60, x, 220, r, "right")
    s.dot(260, 60); s.dot(350, 60); s.dot(260, 220); s.dot(350, 220)
    s.line(238, 165, 238, 100, sw=1.3); s.arrowhead(238, 96, -math.pi / 2, 8)
    s.text(230, 132, "20 V", 13, "end", color="#555")
    return s


@fig("s-q13", "Total current of 20 A dividing among R1, R2 and R3 in parallel")
def _():
    s = Sch(520, 240)
    s.term(40, 50); s.wire((44, 50), (420, 50))
    s.term(40, 200); s.wire((44, 200), (420, 200))
    s.flow(90, 50, "right", "20 A", 0, -20)
    for x, r in zip((200, 310, 420), ("*R*_1 = 1 kΩ", "*R*_2", "*R*_3")):
        s.res(x, 50, x, 200, r, "right")
    s.flow(420, 80, "down", "12 A", 18, 0, "start")
    s.dot(200, 50); s.dot(310, 50); s.dot(200, 200); s.dot(310, 200)
    return s


@fig("s-q14", "Three resistors in series with p.d.s of 5 V, 7 V and 10 V and a 2 A supply current")
def _():
    s = Sch(520, 230)
    s.bat(60, 60, 60, 190, "a", "*V*", "left", 26)
    for i, v in enumerate(("5 V", "7 V", "10 V")):
        x0 = 100 + 120 * i
        s.res(x0, 60, x0 + 120, 60, f"*R*_{i+1}")
        s.text(x0 + 60, 92, v, 14, color="#555")
    s.wire((60, 60), (100, 60)); s.wire((460, 60), (460, 190), (60, 190))
    s.flow(460, 125, "down", "2 A", 16, 0, "start")
    return s


@fig("s-q16", "20, 20 and 30 ohm resistors in parallel, in series with an unknown resistance")
def _():
    s = Sch(520, 250)
    s.term(40, 60, "A", "left"); s.res(40, 60, 200, 60, "*R* = ?")
    s.wire((200, 60), (420, 60)); s.term(40, 210, "B", "left"); s.wire((40, 210), (420, 210))
    for x, r in zip((240, 330, 420), ("20" + O, "20" + O, "30" + O)):
        s.res(x, 60, x, 210, r, "right")
    s.dot(240, 60); s.dot(330, 60); s.dot(240, 210); s.dot(330, 210)
    s.text(260, 236, "Total resistance between A and B = 10 Ω", 13, color="#555")
    return s


@fig("s-q39", "120 V, 10 ohm and 150 V, 20 ohm batteries in parallel with a 60 ohm load and ammeters A and B")
def _():
    s = dc_parallel([("120-V battery", "120 V", "10" + O, "A"), ("150-V battery", "150 V", "20" + O, "B")], "60" + O)
    return s


@fig("s-q58", "Batteries A (100 V, 5 ohm) and B (95 V, 3 ohm) in parallel with an 80 ohm resistor")
def _():
    return dc_parallel([("Battery A", "100 V", "5" + O, None), ("Battery B", "95 V", "3" + O, None)], "80" + O)


@fig("s-q60", "Batteries A, B and C in parallel with a 3 ohm resistor")
def _():
    return dc_parallel([("A", "24 V", "4" + O, None), ("B", "12 V", "4" + O, None), ("C", "18 V", "6" + O, None)], "3" + O, gap=130)


@fig("s-q63", "Three 10 V cells with internal resistances 2, 3 and 6 ohms in parallel with a 4 ohm load")
def _():
    return dc_parallel([(None, "10 V", "2" + O, None), (None, "10 V", "3" + O, None), (None, "10 V", "6" + O, None)], "4" + O, gap=130)


@fig("s-q47", "Practical current source of 1 A with 100 ohm internal resistance, an added resistance R and a 100 ohm load")
def _():
    s = Sch(560, 270)
    s.isrc(70, 200, 70, 60, "1 A", "left", 30)
    s.wire((70, 60), (420, 60)); s.wire((70, 200), (420, 200))
    s.res(180, 60, 180, 200, "100" + O, "right")
    s.res(300, 60, 300, 200, "*R*", "right")
    s.res(420, 60, 420, 200, "100" + O, "right")
    s.flow(420, 90, "down", "1/12 A", 16, 0, "start")
    s.group(40, 28, 200, 200, "practical source", ly=248)
    s.dot(180, 60); s.dot(300, 60); s.dot(180, 200); s.dot(300, 200)
    return s


@fig("s-q48", "Practical source as a Thevenin voltage and resistance feeding a load RL")
def _():
    s = Sch(600, 280)
    s.bat(70, 60, 70, 200, "a", "*V*_{TH}", "left", 26)
    s.res(70, 60, 240, 60, "*R*_{TH}")
    s.wire((240, 60), (400, 60)); s.wire((70, 200), (400, 200))
    s.res(400, 60, 400, 200, "*R*_L", "right")
    s.flow(320, 60, "right", "*I*_L", 0, -20)
    s.group(36, 26, 236, 206, "practical source", ly=250)
    s.text(470, 110, "10 Ω load → 2 A", 13, "start", color="#555")
    s.text(470, 150, "50 Ω load → 1 A", 13, "start", color="#555")
    return s


# ------------------------------------------------------------------ AC series
@fig("s-q90", "Coil of 10 ohms and 0.1 H across a 100 V, 50 Hz supply")
def _():
    return series_ac(["100 V", "50 Hz"], [("R", "10" + O), ("L", "0.1 H")], groups=[(0, 1, "coil")])


@fig("s-q94", "3/pi H inductor in series with 8 ohms across a 28 V, 1 Hz supply")
def _():
    return series_ac(["28 V", "1 Hz"], [("L", "3/π H"), ("R", "8" + O)])


@fig("s-q95", "Series R and L across 240 V, 50 Hz taking 4 A and 400 W")
def _():
    return series_ac(["240 V", "50 Hz"], [("R", "*R*"), ("L", "*L*")], current="4 A")


@fig("s-q97", "60 W, 120 V lamp in series with a capacitor on a 130 V, 50 Hz supply")
def _():
    return series_ac(["130 V", "50 Hz"], [("lamp", "60 W, 120 V lamp"), ("C", "*C*")])


@fig("s-q99", "Coil of 50 ohms resistance and 120 ohms reactance on a 260 V peak, 50 Hz supply")
def _():
    return series_ac(["260 V peak", "50 Hz"], [("R", "50" + O), ("L", "*X*_L = 120 Ω")], groups=[(0, 1, "coil")])


@fig("s-q100", "Series RLC: 12 ohms, 0.15 H and 100 microfarads on 100 V, 50 Hz")
def _():
    return series_ac(["100 V", "50 Hz"], [("R", "12" + O), ("L", "0.15 H"), ("C", "100 μF")])


@fig("s-q106", "Resistor and pure inductor in series with 18 V across R and 24 V across L")
def _():
    return series_ac(["*V*", "a.c."], [("R", "*R*"), ("L", "*L*")], volts=[(0, "18 V"), (1, "24 V")])


@fig("s-q108", "636.6 mH coil in series with 100 ohms on 250 V, 50 Hz")
def _():
    return series_ac(["250 V", "50 Hz"], [("L", "636.6 mH"), ("R", "100" + O)])


@fig("s-q110", "40 microfarad capacitor in series with a coil of 8 ohms and 80 mH on 200 V, 100 Hz")
def _():
    return series_ac(["200 V", "100 Hz"], [("C", "40 μF"), ("R", "8" + O), ("L", "80 mH")], groups=[(1, 2, "coil")])


@fig("s-q112", "Series C-R circuit on 105 V, 2.5 kHz taking 15 A and 0.9 kW")
def _():
    return series_ac(["105 V", "2.5 kHz"], [("C", "*C*"), ("R", "*R*")], current="15 A")


@fig("s-q148", "Resistor and inductance in series taking 210 W at 0.6 power factor from 50 V, 100 Hz")
def _():
    return series_ac(["50 V", "100 Hz"], [("R", "*R*"), ("L", "*L*")])


# ------------------------------------------------------------------ AC parallel
@fig("s-q113", "400/pi microfarad capacitor in parallel with 40 ohms on 200 V, 50 Hz")
def _():
    return parallel_ac(["200 V", "50 Hz"], [[("C", "400/π μF")], [("R", "40" + O)]])


@fig("s-q116", "Coil of 30 ohms and 20 mH in parallel with 8 microfarads on 25 V, 1000/pi Hz")
def _():
    s = parallel_ac(["25 V", "1000/π Hz"], [[("R", "30" + O), ("L", "20 mH")], [("C", "8 μF")]])
    s.group(170, 72, 110, 168, "coil", lx=146, ly=156)
    return s


@fig("s-q117", "250 ohms in series with 4 microfarads, in parallel with 200 ohms, on 64 V at 1250 rad/s")
def _():
    return parallel_ac(["64 V", "ω = 1250 rad/s"], [[("R", "250" + O), ("C", "4 μF")], [("R", "200" + O)]])


@fig("s-q119", "130 ohms in parallel with 30 microfarads on 200 V, 50 Hz")
def _():
    return parallel_ac(["200 V", "50 Hz"], [[("R", "130" + O)], [("C", "30 μF")]])


@fig("s-q120", "Two identical capacitors in parallel on 200 V, 1 kHz drawing 0.628 A")
def _():
    s = parallel_ac(["200 V", "1 kHz"], [[("C", "*C*")], [("C", "*C*")]])
    s.flow(110, 60, "right", "0.628 A", 0, -20)
    return s


@fig("s-q121", "1500 nF capacitor in parallel with 16 ohms on 10 V, 10 kHz")
def _():
    return parallel_ac(["10 V", "10 kHz"], [[("C", "1500 nF")], [("R", "16" + O)]])


@fig("s-q123", "25 nF capacitor in parallel with a coil of 2 kilohms and 0.20 H on 100 V, 4 kHz")
def _():
    s = parallel_ac(["100 V", "4 kHz"], [[("C", "25 nF")], [("R", "2 kΩ"), ("L", "0.20 H")]])
    s.group(320, 72, 110, 168, "coil", lx=296, ly=156)
    return s


def zbox(s, x1, y1, x2, y2, lab, side=None):
    s.res(x1, y1, x2, y2, lab, side, body=46, wd=18)


@fig("s-q83", "Impedances 10 + j20 and -j12.5 ohms in parallel")
def _():
    s = Sch(460, 230)
    s.term(50, 60); s.term(50, 190)
    s.wire((54, 60), (360, 60)); s.wire((54, 190), (360, 190))
    zbox(s, 200, 60, 200, 190, "*Z*_1 = 10 + *j*20", "right")
    zbox(s, 360, 60, 360, 190, "*Z*_2 = −*j*12.5", "right")
    s.dot(200, 60); s.dot(200, 190)
    s.w = 520
    return s


def series_then_parallel(first, pa, pb):
    s = Sch(560, 240)
    s.term(40, 60); s.term(40, 200)
    zbox(s, 44, 60, 240, 60, first)
    s.wire((240, 60), (460, 60)); s.wire((44, 200), (460, 200))
    zbox(s, 320, 60, 320, 200, pa, "right")
    zbox(s, 460, 60, 460, 200, pb, "right")
    s.dot(320, 60); s.dot(320, 200)
    s.text(130, 130, "impedances in ohms", 12, color="#666")
    return s


fig("s-q84", "24 + j8 ohms in series with j6 and -j8 ohms in parallel")(lambda: series_then_parallel("24 + *j*8", "*j*6", "−*j*8"))
fig("s-q115", "j4 ohms in series with j6 and -j8 ohms in parallel")(lambda: series_then_parallel("*j*4", "*j*6", "−*j*8"))


# ------------------------------------------------------------------ parallel loads
@fig("s-q125", "Fan motor and heater in parallel on a 200 V, 50 Hz supply")
def _():
    return loads(["200 V", "50 Hz"], [["Fan motor", "1.5 kVA", "0.8 p.f. lag"], ["Heater", "1000 W", "unity p.f."]])


@fig("s-q132", "Single-phase motor developing 5 kW on a 200 V, 50 Hz supply")
def _():
    return loads(["200 V", "50 Hz"], [["Motor", "output 5 kW", "η = 80%", "0.6 p.f. lag"]], h=92)


@fig("s-q134", "Fluorescent lighting and motor loads on a 200 V supply")
def _():
    return loads(["200 V", "a.c."], [["Fluorescent", "800 W", "0.8 p.f. lag"], ["Motor", "3 kVA", "0.6 p.f. lag"]])


@fig("s-q140", "Fluorescent, motor and filament loads on a 240 V, 50 Hz supply")
def _():
    return loads(["240 V", "50 Hz"], [["Fluorescent", "900 W", "0.9 p.f. lag"], ["Motor", "3 kVA", "0.6 p.f. lag"], ["Filament", "750 W", "unity p.f."]], gap=140)


@fig("s-q146", "Incandescent, fluorescent and motor loads on a 240 V supply")
def _():
    return loads(["240 V", "a.c."], [["Incandescent", "8 A", "unity p.f."], ["Fluorescent", "5 A", "0.8 p.f. lead"], ["Motor", "7 A", "0.75 p.f. lag"]], gap=140)


@fig("s-q152", "Fluorescent, incandescent and motor loads on 200 V, 50 Hz with a power-factor correction capacitor")
def _():
    s = loads(["200 V", "50 Hz"], [["Fluorescent", "8 A", "0.9 p.f. lead"], ["Incandescent", "6 A", "unity p.f."], ["Motor", "12 A", "0.65 p.f. lag"]], gap=140, cap="*C*")
    s.text(s.w - 10, 290, "*C* is added in the second part to raise the p.f. to 0.98", 12, "end", color="#555")
    return s


# ------------------------------------------------------------------ three-phase
Z = lambda t: ("R", t)
COIL = lambda t: ("RL", t)


@fig("s-q154", "Balanced star load 8 + j6 ohms in parallel with balanced delta load 24 + j18 ohms")
def _():
    return tap_star_delta("8 + *j*6 Ω per phase", "24 + *j*18 Ω per phase", "240√3 V line to line")


@fig("s-q162", "Star load 23.1 ohms in parallel with delta load 69.3 ohms on 400 V")
def _():
    return tap_star_delta("23.1 Ω per phase", "69.3 Ω per phase", "400 V line to line")


@fig("s-q156", "Balanced star-connected load on 240 root 3 V, 50 Hz taking 3.6 kVA at 0.6 p.f. lagging")
def _():
    return star_load(("R", "Y", "B"), [Z("*Z*"), Z("*Z*"), Z("*Z*")], "240√3 V, 50 Hz · 3.6 kVA, 0.6 p.f. lag")


@fig("s-q157", "Balanced star-connected load on 250 root 3 V, 50 Hz taking 3.75 kVA at 0.6 p.f. lagging")
def _():
    return star_load(("R", "Y", "B"), [Z("*Z*"), Z("*Z*"), Z("*Z*")], "250√3 V, 50 Hz · 3.75 kVA, 0.6 p.f. lag")


@fig("s-q158", "Three coils of 5 ohms and 66/pi mH in star on 250 root 3 V, 50 Hz")
def _():
    c = COIL("5 Ω, 66/π mH")
    return star_load(("R", "Y", "B"), [c, c, c], "250√3 V, 3-phase, 50 Hz")


@fig("s-q159", "Three coils of 40 ohms resistance and 30 ohms reactance in star on 415 V, 50 Hz")
def _():
    c = COIL("40 Ω, *X* = 30 Ω")
    return star_load(("R", "Y", "B"), [c, c, c], "415 V, 3-phase, 50 Hz")


@fig("s-q164", "Star load of three coils, 159.2 mH and 50 ohms, line current 3 A at 50 Hz")
def _():
    c = COIL("50 Ω, 159.2 mH")
    s = star_load(("R", "Y", "B"), [c, c, c], "50 Hz · line current 3 A")
    return s


@fig("s-q165", "Three coils of 6 ohms and inductance L in star on 415 V, 50 Hz, line current 30 A")
def _():
    c = COIL("6 Ω, *L*")
    return star_load(("R", "Y", "B"), [c, c, c], "415 V, 50 Hz · line current 30 A")


@fig("s-q163", "Balanced delta load absorbing 1200 W at 0.94 p.f. lagging from 208 V")
def _():
    return delta_load(("R", "Y", "B"), [Z("*Z*"), Z("*Z*"), Z("*Z*")], "208 V · 1200 W, 0.94 p.f. lag")


@fig("s-q175", "Three loads of 4 ohms and 9 ohms reactance in delta consuming 1.2 kW")
def _():
    c = Z("4 + *j*9 Ω")
    return delta_load(("R", "Y", "B"), [c, c, c], "total 1.2 kW")


@fig("s-q189", "Unbalanced delta: 100 ohms A-B, j60 ohms B-C, -j130 ohms C-A on 415 V")
def _():
    s = Sch(560, 270)
    ap, lv, rv = (300, 50), (180, 170), (420, 170)
    s.term(40, 50, "A", "left"); s.wire((40, 50), ap)
    s.term(40, 170, "B", "left"); s.wire((40, 170), lv)
    s.term(40, 230, "C", "left"); s.wire((40, 230), (420, 230), rv)
    s.res(*ap, *lv, None); s.text(222, 92, "100 Ω", 13, "end")
    s.cap(*ap, *rv, None); s.text(378, 92, "*X*_C = 130 Ω", 13, "start")
    s.ind(*lv, *rv, None); s.text(300, 200, "*X*_L = 60 Ω", 13)
    for p in (ap, lv, rv):
        s.dot(*p)
    s.text(540, 22, "415 V, phase sequence A-B-C", 14, "end", color="#333")
    return s


@fig("s-q160", "Star-connected alternator feeding a delta-connected motor at 500 V")
def _():
    m = Z("*Z*_{ph}")
    return alt_to_delta([m, m, m], "star alternator", "500 V · motor 50.7 kW out, η 90%, 0.82 p.f.")


@fig("s-q166", "Star alternator delivering 65 A to a balanced delta load at 380 V")
def _():
    return alt_to_delta([Z("*Z*"), Z("*Z*"), Z("*Z*")], "star alternator", "380 V · line current 65 A")


@fig("s-q167", "Star alternator feeding a delta load of 15 ohms and 20 ohms inductive reactance per phase at 400 V")
def _():
    c = Z("15 + *j*20 Ω")
    return alt_to_delta([c, c, c], "star alternator", "400 V line")


def four_wire(lines, legs, supply):
    return star_load(lines, legs, supply, neutral=True)


@fig("s-q178", "Four-wire star load: R 40 A, Y 50 A, B 60 A at 0.9 p.f. lagging")
def _():
    return four_wire(("R", "Y", "B"), [Z("40 A, 0.9 lag"), Z("50 A, 0.9 lag"), Z("60 A, 0.9 lag")], "230√3 V, 3-phase, 4-wire")


@fig("s-q180", "Four-wire system with 5, 4 and 2.5 kW resistive loads to neutral at 400 V")
def _():
    return four_wire(("L1", "L2", "L3"), [Z("5 kW"), Z("4 kW"), Z("2.5 kW")], "400 V line, 4-wire")


@fig("s-q182", "Four-wire loads R-N 21.7 A, Y-N 17.3 A, B-N 10.8 A at unity p.f., 231 V phase")
def _():
    return four_wire(("R", "Y", "B"), [Z("21.7 A"), Z("17.3 A"), Z("10.8 A")], "231 V phase, R-Y-B, unity p.f.")


@fig("s-q191", "Non-reactive loads of 10, 6 and 4 kW to neutral on a 415 V four-wire system")
def _():
    return four_wire(("A", "B", "C"), [Z("10 kW"), Z("6 kW"), Z("4 kW")], "415 V line, A-B-C")


@fig("s-q193", "Resistive loads of 15, 20 and 25 kW on a 400 V four-wire star system")
def _():
    return four_wire(("R", "Y", "B"), [Z("15 kW"), Z("20 kW"), Z("25 kW")], "400 V line, 4-wire")


# ------------------------------------------------------------------ magnetic
def ring(labels, coil_label, material, fill="#E7E5E0"):
    s = Sch(620, 300)
    cx, cy, R1, R2 = 220, 150, 110, 70
    s.raw(f'<path d="M {cx-R1} {cy} a {R1} {R1} 0 1 0 {2*R1} 0 a {R1} {R1} 0 1 0 {-2*R1} 0 Z M {cx-R2} {cy} a {R2} {R2} 0 1 1 {2*R2} 0 a {R2} {R2} 0 1 1 {-2*R2} 0 Z" fill="{fill}" fill-rule="evenodd" stroke="#111" stroke-width="2"/>')
    Rm = (R1 + R2) / 2
    s.raw(f'<circle cx="{cx}" cy="{cy}" r="{Rm}" fill="none" stroke="#555" stroke-width="1.3" stroke-dasharray="5 4"/>')
    for i in range(7):
        a = math.radians(-55 + i * 18)
        x, y = cx + Rm * math.cos(a), cy + Rm * math.sin(a)
        s.raw(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="24" ry="7" transform="rotate({math.degrees(a):.1f} {x:.1f} {y:.1f})" fill="none" stroke="#B45309" stroke-width="2.2"/>')
    s.text(cx, cy, material, 14, color="#333")
    for i, t in enumerate(labels):
        s.text(372, 70 + i * 26, t, 14, "start")
    s.text(372, 70 + len(labels) * 26 + 8, coil_label, 14, "start", color="#B45309")
    return s


@fig("s-q197", "1500-turn coil on a wooden ring of mean circumference 30 cm and area 4 cm2")
def _():
    return ring(["mean circumference 30 cm", "cross-section 4 cm²"], "1500 turns, 0.4 A", "wood", "#F1E4CC")


@fig("s-q196", "Steel ring of mean diameter 120 mm wound with 1500 turns")
def _():
    return ring(["mean diameter 120 mm", "*B* = 1.5 T in the steel"], "1500 turns, 0.30 A", "steel")


@fig("s-q203", "Mild steel closed magnetic circuit, mean length 75 mm, area 320.2 mm2")
def _():
    return ring(["mean length 75 mm", "area 320.2 mm²", "μ_r = 400, Φ = 200 μWb"], "*N* turns, 0.40 A", "mild steel")


def core(parts, coil_label, gap=False, thin=False):
    s = Sch(640, 290)
    x0, x1, y0, y1, t = 70, 330, 50, 250, 40
    if thin:
        # right limb thinner (different cross-section)
        s.raw(f'<path d="M{x0},{y0} H{x1} V{y1} H{x0} Z M{x0+t},{y0+t} V{y1-t} H{x1-22} V{y0+t} Z" fill="#E7E5E0" fill-rule="evenodd" stroke="#111" stroke-width="2"/>')
    else:
        s.raw(f'<path d="M{x0},{y0} H{x1} V{y1} H{x0} Z M{x0+t},{y0+t} V{y1-t} H{x1-t} V{y0+t} Z" fill="#E7E5E0" fill-rule="evenodd" stroke="#111" stroke-width="2"/>')
    if parts == "two":
        s.raw(f'<path d="M{x0+(x1-x0)*0.62},{y0} H{x1} V{y1} H{x0+(x1-x0)*0.62} V{y1-t} H{x1-t} V{y0+t} H{x0+(x1-x0)*0.62} Z" fill="#C9D7E8" stroke="#111" stroke-width="2"/>')
    if gap:
        gx = x1 - t / 2
        s.raw(f'<rect x="{x1-t-1}" y="138" width="{t+2}" height="14" fill="#fff" stroke="none"/>')
        s.line(x1 - t, 138, x1, 138); s.line(x1 - t, 152, x1, 152)
    for i in range(6):
        y = 105 + i * 18
        s.raw(f'<ellipse cx="{x0+t/2}" cy="{y}" rx="30" ry="6" fill="none" stroke="#B45309" stroke-width="2.2"/>')
    s.text(x0 + t / 2, 270, coil_label, 14, color="#B45309")
    return s


@fig("s-q205", "Magnetic circuit of 0.4 cm2 section: 3 cm part (mu_r 1200) and 2 cm part (mu_r 750), 100 turns at 2 A")
def _():
    s = core("two", "100 turns, 2 A")
    s.text(360, 90, "Part 1: 3 cm, μ_r = 1200", 14, "start")
    s.text(360, 120, "Part 2: 2 cm, μ_r = 750", 14, "start", color="#2F5C8F")
    s.text(360, 160, "cross-section 0.4 cm²", 14, "start")
    return s


@fig("s-q206", "Silicon-iron circuit: 40 mm path of 90 mm2 in series with 15 mm path of 70 mm2, 50 turns at 0.39 A")
def _():
    s = core("two", "50 turns, 0.39 A", thin=True)
    s.text(360, 90, "40 mm path, 90 mm²", 14, "start")
    s.text(360, 120, "15 mm path, 70 mm²", 14, "start", color="#2F5C8F")
    s.text(360, 160, "μ_r = 3000", 14, "start")
    return s


@fig("s-q195", "Air gap of 15 mm needing a flux density of 0.33 T")
def _():
    s = core("one", "coil", gap=True)
    s.arrow(400, 145, 336, 145)
    s.text(408, 145, "air gap 15 mm, *B* = 0.33 T", 14, "start")
    return s


if __name__ == "__main__":
    only = sys.argv[2:] or list(FIGS)
    for key in only:
        title, fn = FIGS[key]
        open(os.path.join(OUT, key + ".svg"), "w").write(fn().svg(title))
    print(len(only), "figures")
