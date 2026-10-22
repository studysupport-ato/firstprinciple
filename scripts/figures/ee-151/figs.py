import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sch import Sch, Plot

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)
FIGS = {}


def fig(key, title):
    def deco(fn):
        FIGS[key] = (title, fn)
        return fn
    return deco


O = " Ω"

# ---------------------------------------------------------------- 2003
@fig("e2003-f1", "Resistor network between terminals A and B (January 2003, Fig. 1)")
def _(s=None):
    s = Sch(540, 270)
    s.term(40, 60, "A", "left"); s.wire((40, 60), (90, 60))
    s.res(90, 60, 260, 60, "1" + O)
    s.res(260, 60, 470, 60, "3" + O)
    s.res(260, 60, 260, 220, "4" + O, "right")
    s.res(470, 60, 470, 220, "6" + O, "right")
    s.res(90, 60, 260, 220, None)
    s.text(150, 150, "3.30" + O, 15, "end")
    s.res(470, 60, 260, 220, None)
    s.text(380, 158, "4" + O, 15, "start")
    s.term(40, 220, "B", "left"); s.wire((40, 220), (470, 220))
    for p in [(90, 60), (260, 60), (470, 60), (260, 220)]:
        s.dot(*p)
    return s


@fig("e2003-f2", "Resistor network between terminals A and B (January 2003, Fig. 2)")
def _():
    s = Sch(540, 280)
    s.term(40, 140, "A", "left")
    s.res(40, 140, 170, 140, "5" + O)
    s.res(170, 140, 320, 140, "3" + O)
    s.res(320, 140, 470, 140, "3" + O)
    for x in (170, 320, 470):
        s.res(x, 140, x, 240, "3" + O, "right")
    s.wire((170, 140), (170, 60))
    s.res(170, 60, 470, 60, "6" + O)
    s.wire((470, 60), (470, 140))
    s.term(40, 240, "B", "left"); s.wire((40, 240), (470, 240))
    for p in [(170, 140), (320, 140), (470, 140), (170, 240), (320, 240)]:
        s.dot(*p)
    return s


@fig("e2003-f3", "Circuit with source E and branch currents I1 to I4 (January 2003, Fig. 3)")
def _():
    s = Sch(580, 350)
    s.res(200, 70, 320, 70, "8" + O)
    s.res(320, 70, 440, 70, "6" + O)
    s.wire((440, 70), (490, 70), (490, 210))
    s.wire((200, 70), (200, 210))
    s.res(320, 70, 320, 210, "2" + O, "right")
    s.res(200, 210, 320, 210, "2" + O, "below")
    s.res(320, 210, 490, 210, "*R*", "below")
    s.res(90, 140, 200, 140, "1" + O)
    s.wire((90, 140), (90, 300))
    s.bat(90, 300, 540, 300, "a", "*E*", "below")
    s.wire((540, 300), (540, 140), (490, 140))
    s.flow(90, 225, "down", "*I*_1", -16, 0, "end")
    s.flow(200, 178, "down", "*I*_2", -16, 0, "end")
    s.flow(320, 182, "up", "*I*_3", 18, 0, "start")
    s.flow(470, 70, "left", "*I*_4", 0, -20)
    for p in [(200, 140), (320, 70), (320, 210), (490, 140)]:
        s.dot(*p)
    return s


@fig("e2003-f4", "Circuit with a 12 V source and output terminals A and B (January 2003, Fig. 4)")
def _():
    s = Sch(540, 290)
    s.res(60, 60, 200, 60, "4" + O)
    s.res(200, 60, 340, 60, "6" + O)
    s.wire((340, 60), (430, 60)); s.term(430, 60, "A")
    s.res(60, 60, 60, 240, "8" + O, "left")
    s.res(200, 60, 200, 150, "6" + O, "right")
    s.bat(200, 150, 200, 240, "a", "12 V", "right")
    s.res(340, 60, 340, 240, "2" + O, "right")
    s.wire((60, 240), (430, 240)); s.term(430, 240, "B")
    s.arrow(480, 225, 480, 75)
    s.text(492, 150, "*V*_o", 16, "start")
    for p in [(200, 60), (340, 60), (200, 240), (340, 240)]:
        s.dot(*p)
    return s


def linear_network():
    s = Sch(400, 170)
    s.box(60, 30, 170, 110, ["Linear", "network"])
    s.wire((230, 60), (320, 60)); s.term(320, 60, "A")
    s.wire((230, 110), (320, 110)); s.term(320, 110, "B")
    return s


fig("e2003-f5", "A linear network with output terminals A and B (January 2003, Fig. 5)")(linear_network)


@fig("e2003-f6", "Two-source circuit with 120 V and 60 V sources (January 2003, Fig. 6)")
def _():
    s = Sch(560, 300)
    s.wire((70, 70), (200, 70))
    s.res(200, 70, 340, 70, "3" + O)
    s.wire((340, 70), (470, 70))
    s.res(70, 70, 70, 165, "6" + O, "left")
    s.bat(70, 165, 70, 250, "a", "120 V", "left", 26)
    s.res(200, 70, 200, 250, "6" + O, "right")
    s.res(340, 70, 340, 250, "6" + O, "right")
    s.res(470, 70, 470, 165, "7" + O, "right")
    s.bat(470, 165, 470, 250, "a", "60 V", "right", 26)
    s.wire((70, 250), (470, 250))
    s.flow(135, 70, "left", "*I*_2", 0, -20)
    s.flow(405, 70, "left", "*I*_1", 0, -20)
    for p in [(200, 70), (340, 70), (200, 250), (340, 250)]:
        s.dot(*p)
    return s


@fig("e2003-f7", "Triangular voltage waveform, peak 3 V (January 2003, Fig. 7)")
def _():
    s = Sch(600, 230)
    p = Plot(s, 60, 170, 32, 34)
    p.axes(13.8, 0, 3, "*v* (V)", "*t* (s)", [0, 2, 4, 6, 8, 10, 12], [3], guide=[(3, 13)])
    p.trace([(0, 0), (2, 3), (4, 0), (6, 0), (8, 3), (10, 0), (12, 0), (13, 1.5)])
    return s


# ---------------------------------------------------------------- 2004
@fig("f2004-f1", "Network with a 3.4 ohm star between terminals A and B (December 2004, Fig. 1)")
def _():
    s = Sch(520, 290)
    s.term(40, 60, "A", "left"); s.wire((40, 60), (410, 60))
    s.res(130, 60, 130, 250, "4.0", "left")
    s.res(410, 60, 410, 250, "6.0", "right")
    s.res(130, 250, 410, 250, "10.0", "below")
    s.res(270, 60, 270, 175, "3.4", "right")
    s.res(270, 175, 130, 250, None)
    s.text(188, 189, "3.4", 15, "end")
    s.res(270, 175, 410, 250, None)
    s.text(352, 189, "3.4", 15, "start")
    s.term(40, 250, "B", "left"); s.wire((40, 250), (130, 250))
    for p in [(130, 60), (270, 60), (270, 175), (130, 250), (410, 250)]:
        s.dot(*p)
    return s


@fig("f2004-f2", "Circuit with 13 V and 4 V sources and resistor R (December 2004, Fig. 2)")
def _():
    s = Sch(540, 260)
    s.bat(60, 70, 60, 210, "a", "13 V", "left", 26)
    s.res(60, 70, 260, 70, "3" + O)
    s.res(260, 70, 460, 70, "3" + O)
    s.res(260, 70, 260, 210, "*R*", "right")
    s.bat(460, 70, 460, 210, "a", "4 V", "right", 26)
    s.wire((60, 210), (460, 210))
    s.flow(100, 70, "right", "*I*_1", 0, -20)
    s.flow(420, 70, "right", "*I*_2", 0, -20)
    s.dot(260, 70); s.dot(260, 210)
    return s


def reciprocity(left_labels):
    s = Sch(540, 260)
    a, b = left_labels
    s.wire((80, 60), (170, 60))
    s.res(80, 60, 80, 220, a, "left")
    s.res(170, 60, 170, 220, b, "right")
    s.res(170, 60, 370, 60, "*R*_2")
    s.wire((370, 60), (470, 60))
    s.res(370, 60, 370, 145, "4" + O, "left")
    s.bat(370, 145, 370, 220, "a", "*E*", "right", 26)
    s.res(470, 60, 470, 220, "2" + O, "right")
    s.wire((80, 220), (470, 220))
    for p in [(170, 60), (370, 60), (170, 220), (370, 220)]:
        s.dot(*p)
    return s


fig("f2004-f3", "Linear circuit for the reciprocity question (December 2004, Fig. 3)")(lambda: reciprocity(("3" + O, "*R*_1")))


@fig("f2004-f4", "Circuit with 24 V and 32 V sources and current I (December 2004, Fig. 4)")
def _():
    s = Sch(540, 260)
    s.bat(60, 70, 60, 210, "a", "24 V", "left", 26)
    s.res(60, 70, 260, 70, "6" + O)
    s.res(260, 70, 460, 70, "4" + O)
    s.res(260, 70, 260, 210, "4" + O, "right")
    s.bat(460, 70, 460, 210, "b", "32 V", "right", 26)
    s.wire((60, 210), (460, 210))
    s.flow(260, 112, "up", "*I*", -14, 0, "end")
    s.dot(260, 70); s.dot(260, 210)
    return s


@fig("f2004-f5", "Bridge circuit with a 6 V source and terminals A and B (December 2004, Fig. 5)")
def _():
    s = Sch(540, 280)
    s.wire((60, 60), (60, 240)); s.wire((460, 60), (460, 240))
    s.res(60, 60, 260, 60, "2" + O)
    s.res(260, 60, 460, 60, "4" + O)
    s.res(60, 150, 260, 150, "4" + O, "below")
    s.res(260, 150, 460, 150, "2" + O, "below")
    s.wire((260, 60), (260, 92)); s.term(260, 96, "A")
    s.wire((260, 150), (260, 118)); s.term(260, 114, "B")
    s.bat(60, 240, 460, 240, "a", "6 V", "below")
    for p in [(60, 150), (460, 150), (260, 60), (260, 150)]:
        s.dot(*p)
    return s


fig("f2004-f6", "A linear network with output terminals A and B (December 2004, Fig. 6)")(linear_network)


@fig("f2004-f7", "Ladder network between terminals A and B (December 2004, Fig. 7)")
def _():
    s = Sch(520, 230)
    s.term(40, 60, "A", "left"); s.wire((40, 60), (120, 60))
    s.res(120, 60, 280, 60, "6" + O)
    s.res(280, 60, 440, 60, "4" + O)
    s.res(120, 60, 120, 190, "2" + O, "right")
    s.res(280, 60, 280, 190, "6" + O, "right")
    s.res(440, 60, 440, 190, "8" + O, "right")
    s.term(40, 190, "B", "left"); s.wire((40, 190), (440, 190))
    for p in [(120, 60), (280, 60), (120, 190), (280, 190)]:
        s.dot(*p)
    return s


@fig("f2004-f8", "Triangular waveform, peak 4, period 8 s (December 2004, Fig. 8)")
def _():
    s = Sch(620, 230)
    p = Plot(s, 60, 170, 25, 28)
    p.axes(18.6, 0, 4, "*v*", "Time (s)", [0, 6, 8, 14, 16], [4], guide=[(4, 18)])
    for t in (3, 11):
        a, b = p.P(t, 0), p.P(t, 4)
        s.line(a[0], a[1], b[0], b[1], dash="3 4", sw=1.1, color="#777")
    p.trace([(0, 0), (3, 4), (6, 0), (8, 0), (11, 4), (14, 0), (16, 0), (17.5, 2)])
    return s


@fig("f2004-f9", "Four conductors meeting at a junction (December 2004, Fig. 9)")
def _():
    s = Sch(500, 260)
    c = (250, 130)
    ends = {"i1": (60, 50), "i4": (450, 40), "i3": (90, 230), "i2": (400, 240)}
    for k, e in ends.items():
        s.line(e[0], e[1], *c)
    import math
    def mid_arrow(a, b, lab, lx, ly):
        mx, my = a[0] + (b[0] - a[0]) * 0.55, a[1] + (b[1] - a[1]) * 0.55
        s.arrowhead(mx, my, math.atan2(b[1] - a[1], b[0] - a[0]), 11)
        s.text(mx + lx, my + ly, lab, 16)
    mid_arrow(ends["i1"], c, "*i*_1", -6, -20)
    mid_arrow(ends["i2"], c, "*i*_2", 22, 6)
    mid_arrow(c, ends["i3"], "*i*_3", -22, -6)
    mid_arrow(c, ends["i4"], "*i*_4", 4, -20)
    s.dot(*c, r=4.5)
    return s


# ---------------------------------------------------------------- 2006
@fig("f2006-f1", "Resistor network in kilohms between A and B (December 2006, Fig. 1)")
def _():
    s = Sch(540, 300)
    s.term(40, 90, "A", "left")
    s.res(40, 90, 200, 90, "12")
    s.wire((200, 90), (200, 40))
    s.res(200, 40, 360, 40, "12")
    s.wire((360, 40), (470, 40))
    s.res(200, 90, 200, 200, "18", "left")
    s.res(360, 40, 360, 200, "6", "right")
    s.wire((200, 200), (360, 200))
    s.res(280, 200, 280, 270, "5", "right")
    s.res(470, 40, 470, 270, "6", "right")
    s.term(40, 270, "B", "left"); s.wire((40, 270), (470, 270))
    for p in [(200, 90), (360, 40), (280, 200), (280, 270)]:
        s.dot(*p)
    return s


@fig("f2006-f2", "7 V source, 8 A current source and 6 ohm load between a and b (December 2006, Fig. 2)")
def _():
    s = Sch(540, 250)
    s.bat(60, 60, 60, 200, "a", "7 V", "left", 26)
    s.res(60, 60, 240, 60, "4" + O)
    s.wire((240, 60), (460, 60)); s.term(460, 60, "a")
    s.isrc(240, 60, 240, 200, "8 A", "right", 32)
    s.res(400, 60, 400, 200, "6" + O, "left")
    s.wire((60, 200), (460, 200)); s.term(460, 200, "b")
    for p in [(240, 60), (400, 60), (240, 200), (400, 200)]:
        s.dot(*p)
    return s


@fig("f2006-f3", "Four sources E1 to E4 each with resistance R, feeding a 1 kilohm resistor (December 2006, Fig. 3)")
def _():
    s = Sch(560, 270)
    xs = [60, 155, 250, 345]
    s.wire((60, 50), (470, 50)); s.wire((60, 230), (470, 230))
    for i, x in enumerate(xs):
        s.res(x, 50, x, 140, "*R*", "left")
        s.bat(x, 140, x, 230, "a", f"*E*_{i+1}", "right", 24, show_plus=False)
        s.text(x - 16, 166, "+", 14)
        if i:
            s.dot(x, 50); s.dot(x, 230)
    s.res(470, 50, 470, 230, "1 kΩ", "right")
    return s


@fig("f2006-f4", "Source VS, resistors R1 and R2 and a 3 mA current source (December 2006, Fig. 4)")
def _():
    s = Sch(580, 250)
    s.bat(60, 60, 60, 200, "a", "*V*_S", "left", 26)
    s.res(60, 60, 200, 60, "*R*_1")
    s.wire((200, 60), (420, 60)); s.term(420, 60)
    s.res(200, 60, 200, 200, "*R*_2", "left")
    s.isrc(310, 200, 310, 60, "3 mA", "right", 32)
    s.wire((60, 200), (420, 200)); s.term(420, 200)
    s.arrow(450, 192, 450, 68)
    s.text(462, 130, "*V*_o = 6 V", 16, "start")
    for p in [(200, 60), (310, 60), (200, 200), (310, 200)]:
        s.dot(*p)
    return s


@fig("f2006-f5", "Circuit with sources E1 and E2 and current I (December 2006, Fig. 5)")
def _():
    s = Sch(540, 300)
    s.wire((60, 60), (60, 250)); s.wire((460, 60), (460, 250))
    s.res(60, 60, 260, 60, "6" + O)
    s.res(260, 60, 460, 60, "4" + O)
    s.res(60, 160, 260, 160, "4" + O, "below")
    s.res(260, 160, 460, 160, "6" + O, "below")
    s.bat(260, 160, 260, 60, "b", "*E*_1", "right", 24)
    s.flow(260, 82, "up", "*I*", -14, 0, "end")
    s.bat(60, 250, 460, 250, "a", "*E*_2", "below")
    for p in [(60, 160), (460, 160), (260, 60), (260, 160)]:
        s.dot(*p)
    return s


def trapezoid(peak, sy):
    s = Sch(620, 230)
    p = Plot(s, 60, 175, 32, sy)
    p.axes(13.8, 0, peak, "*v*", "Time (s)", [0, 2, 4, 6, 8, 10, 12], [peak], guide=[(peak, 13)])
    for t in (2, 4, 8, 10):
        a, b = p.P(t, 0), p.P(t, peak)
        s.line(a[0], a[1], b[0], b[1], dash="3 4", sw=1.1, color="#777")
    p.trace([(0, 0), (2, peak), (4, peak), (6, 0), (8, peak), (10, peak), (12, 0), (13, peak / 2)])
    return s


fig("f2006-f6", "Trapezoidal waveform, peak 3, period 6 s (December 2006, Fig. 6)")(lambda: trapezoid(3, 36))
fig("f2006b-f6", "Trapezoidal waveform, peak 4, period 6 s (December 2006, Fig. 6, second paper)")(lambda: trapezoid(4, 28))


@fig("f2006-f7", "Three resistances in ohms connected in delta to lines R, Y and B (December 2006, Fig. 7)")
def _():
    s = Sch(500, 250)
    ap, lv, rv = (290, 50), (170, 160), (410, 160)
    s.term(40, 50, "R", "left"); s.wire((40, 50), ap)
    s.term(40, 160, "B", "left"); s.wire((40, 160), lv)
    s.term(40, 220, "Y", "left"); s.wire((40, 220), (410, 220), rv)
    s.res(*ap, *lv, None); s.text(212, 92, "400", 15, "end")
    s.res(*ap, *rv, None); s.text(368, 92, "100", 15, "start")
    s.res(*lv, *rv, "200", "below")
    for p in (ap, lv, rv):
        s.dot(*p)
    return s


@fig("f2006-f8", "Three resistances in ohms connected in star to lines A, B and C (December 2006, Fig. 8)")
def _():
    s = Sch(500, 290)
    n = (300, 150)
    s.term(40, 40, "A", "left"); s.wire((40, 40), (300, 40))
    s.res(300, 40, *n, "32", "right")
    s.term(40, 200, "C", "left"); s.wire((40, 200), (190, 200))
    s.res(190, 200, *n, None); s.text(232, 152, "16", 15, "end")
    s.term(40, 260, "B", "left"); s.wire((40, 260), (420, 260), (420, 210))
    s.res(420, 210, *n, None); s.text(372, 152, "16", 15, "start")
    s.dot(*n)
    return s


# ---------------------------------------------------------------- 2007
@fig("f2007-f1", "Resistor network in kilohms with a star centre, between A and B (December 2007, Fig. 1)")
def _():
    s = Sch(520, 290)
    n = (300, 150)
    s.term(40, 50, "A", "left"); s.wire((40, 50), (150, 50))
    s.res(150, 50, 450, 50, "3")
    s.res(150, 50, 150, 250, "21", "left")
    s.res(150, 50, *n, None); s.text(212, 130, "2", 15)
    s.res(450, 50, *n, None); s.text(388, 130, "4", 15)
    s.res(*n, 300, 250, "8", "right")
    s.res(450, 50, 450, 250, "12", "right")
    s.term(40, 250, "B", "left"); s.wire((40, 250), (450, 250))
    for p in [(150, 50), (450, 50), n, (150, 250), (300, 250)]:
        s.dot(*p)
    return s


@fig("f2007-f2", "Circuit with current source Is, a 4 V source and output Vo across 6 kilohms (December 2007, Fig. 2)")
def _():
    s = Sch(620, 260)
    s.res(80, 60, 80, 210, "2 kΩ", "left")
    s.res(80, 60, 220, 60, "1 kΩ")
    s.isrc(220, 210, 220, 60, "*I*_s", "right", 30)
    s.res(220, 60, 340, 60, "4 kΩ")
    s.bat(340, 60, 420, 60, "b", "4 V", "above", 26)
    s.wire((420, 60), (500, 60)); s.term(500, 60)
    s.res(450, 60, 450, 210, "6 kΩ", "left")
    s.wire((80, 210), (500, 210)); s.term(500, 210)
    s.arrow(525, 202, 525, 68)
    s.text(537, 135, "*V*_o = 6 V", 16, "start")
    for p in [(220, 60), (450, 60), (220, 210), (450, 210)]:
        s.dot(*p)
    return s


@fig("f2007-f3", "48 V circuit with output Vo between terminals A and B (December 2007, Fig. 3)")
def _():
    s = Sch(520, 300)
    s.bat(60, 60, 60, 250, "a", "48 V", "left", 26)
    s.wire((60, 60), (215, 60)); s.term(219, 60, "A", "up")
    s.term(301, 60, "B", "up"); s.wire((305, 60), (460, 60))
    s.arrow(292, 92, 228, 92)
    s.text(260, 110, "*V*_o", 16)
    s.res(150, 60, 150, 170, "10", "left")
    s.res(380, 60, 380, 170, "5", "right")
    s.wire((150, 170), (380, 170))
    s.res(265, 170, 265, 250, "10", "right")
    s.res(460, 60, 460, 250, "10", "right")
    s.wire((60, 250), (460, 250))
    for p in [(150, 60), (380, 60), (265, 170), (265, 250)]:
        s.dot(*p)
    return s


fig("f2007-f4", "Linear circuit for the reciprocity question (December 2007, Fig. 4)")(lambda: reciprocity(("3" + O, "6" + O)))


@fig("f2007-f5", "20 V circuit with crossed 2 ohm resistors and terminals A and B (December 2007, Fig. 5)")
def _():
    s = Sch(520, 300)
    tl, tr, bl, br = (110, 60), (370, 60), (110, 250), (370, 250)
    s.bat(*tl, *bl, "a", "20 V", "left", 26)
    s.res(*tl, *tr, "8")
    s.res(*bl, *br, "8", "below")
    s.wire(tr, (370, 116)); s.term(370, 120, "A")
    s.wire(br, (370, 194)); s.term(370, 190, "B")
    s.res(*tl, *br, None, at=0.3)
    s.text(180, 82, "2", 15)
    cx, cy = 240, 155
    s.res(bl[0], bl[1], 201, 183.5, None, at=0.5)
    s.text(170, 236, "2", 15)
    s.hop(201, 183.5, *tr, cx, cy, r=9)
    s.dot(*tl); s.dot(*bl); s.dot(*tr); s.dot(*br)
    return s


@fig("f2007-f6", "Rectangular waveform between 6 and -2, period 4 s (December 2007, Fig. 6)")
def _():
    s = Sch(600, 230)
    p = Plot(s, 70, 135, 38, 15)
    p.axes(11.4, -2, 6, "*v*", "*t* (s)", [0, 2, 4, 6, 8, 10], [6, -2], guide=[(6, 10.6), (-2, 10.6)], tick_dx=10, tick_dy=-11)
    p.trace([(0, 6), (2, 6), (2, -2), (4, -2), (4, 6), (6, 6), (6, -2), (8, -2), (8, 6), (10, 6), (10, -2), (10.6, -2)])
    return s


@fig("f2007-f7", "Impedance network ZT, all impedances in ohms (December 2007, Fig. 7)")
def _():
    s = Sch(500, 280)
    s.term(60, 60)
    s.res(60, 60, 220, 60, "2")
    s.res(220, 60, 370, 60, "−*j*4")
    s.wire((370, 60), (420, 60))
    s.res(220, 60, 220, 150, "*j*2", "left")
    s.res(220, 150, 220, 240, "2", "left")
    s.res(420, 60, 420, 150, "4", "right")
    s.res(420, 150, 420, 240, "*j*6", "right")
    s.term(60, 240); s.wire((64, 240), (420, 240))
    s.arrow(80, 150, 140, 150)
    s.text(108, 130, "*Z*_T", 17, weight="700")
    s.dot(220, 60); s.dot(220, 240)
    return s


@fig("f2007-f8", "Shell-type magnetic core with two coils (December 2007, Fig. 8)")
def _():
    s = Sch(620, 330)
    x0, x1, y0, y1 = 120, 500, 70, 290
    lw = 40
    cx0 = (x0 + x1) / 2 - lw / 2
    path = (f"M{x0},{y0} H{x1} V{y1} H{x0} Z "
            f"M{x0+lw},{y0+lw} V{y1-lw} H{cx0} V{y0+lw} Z "
            f"M{cx0+lw},{y0+lw} V{y1-lw} H{x1-lw} V{y0+lw} Z")
    s.raw(f'<path d="{path}" fill="#E7E5E0" fill-rule="evenodd" stroke="#111" stroke-width="2"/>')
    m = lw / 2
    s.raw(f'<rect x="{x0+m}" y="{y0+m}" width="{x1-x0-2*m}" height="{y1-y0-2*m}" fill="none" stroke="#555" stroke-width="1.3" stroke-dasharray="5 4"/>')
    s.line(310, y0 + m, 310, y1 - m, dash="5 4", sw=1.3, color="#555")
    for cxl in (x0 + m, x1 - m):
        for i in range(6):
            yy = 150 + i * 12
            s.raw(f'<ellipse cx="{cxl}" cy="{yy}" rx="31" ry="6" fill="none" stroke="#B45309" stroke-width="2.2"/>')
    s.text(222, 222, "Coil 1", 15)
    s.text(398, 222, "Coil 2", 15)
    s.arrow(180, 45, 240, 45); s.text(210, 26, "Φ_1", 16)
    s.arrow(440, 45, 380, 45); s.text(410, 26, "Φ_3", 16)
    s.arrow(340, 150, 340, 205); s.text(354, 178, "Φ_2", 16, "start")
    s.arrow(70, 125, 134, 125); s.text(58, 125, "*l*_1", 16, "end")
    s.arrow(550, 125, 486, 125); s.text(562, 125, "*l*_3", 16, "start")
    s.arrow(240, 125, 306, 125); s.text(228, 125, "*l*_2", 16, "end")
    s.arrow(60, 240, 60, 180); s.text(46, 210, "*F*_1", 16, "end")
    s.arrow(560, 240, 560, 180); s.text(574, 210, "*F*_3", 16, "start")
    return s


if __name__ == "__main__":
    only = sys.argv[2:] or list(FIGS)
    for key in only:
        title, fn = FIGS[key]
        open(os.path.join(OUT, key + ".svg"), "w").write(fn().svg(title))
    print(len(only), "figures")
