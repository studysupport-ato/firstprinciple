"""Tiny schematic drawing helper that writes clean, consistent SVG circuit diagrams."""
import math

INK = "#111111"
FONT = "'Helvetica Neue',Arial,sans-serif"


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def rich(s):
    """Allow _x for subscripts and *x* for italics in labels."""
    out, i, italic = [], 0, False
    s = str(s)
    while i < len(s):
        c = s[i]
        if c == "*":
            out.append("</tspan>" if italic else '<tspan font-style="italic">')
            italic = not italic
            i += 1
        elif c == "_" and i + 1 < len(s):
            j = i + 1
            if s[j] == "{":
                k = s.index("}", j)
                sub, i = s[j + 1:k], k + 1
            else:
                sub, i = s[j], j + 1
            out.append(f'<tspan baseline-shift="sub" font-size="72%">{esc(sub)}</tspan>')
        else:
            out.append(esc(c))
            i += 1
    if italic:
        out.append("</tspan>")
    return "".join(out)


class Sch:
    def __init__(self, w, h, sw=2.0):
        self.w, self.h, self.sw, self.el = w, h, sw, []
        self.pad = 0

    # ---------- primitives ----------
    def line(self, x1, y1, x2, y2, dash=None, sw=None, color=INK):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.el.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="{sw or self.sw}" stroke-linecap="round"{d}/>')

    def wire(self, *pts, dash=None):
        p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.el.append(f'<polyline points="{p}" fill="none" stroke="{INK}" stroke-width="{self.sw}" stroke-linejoin="round" stroke-linecap="round"{d}/>')

    def text(self, x, y, s, size=15, anchor="middle", italic=False, weight=None, color=INK):
        st = ' font-style="italic"' if italic else ""
        wt = f' font-weight="{weight}"' if weight else ""
        self.el.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" text-anchor="{anchor}" dominant-baseline="middle" fill="{color}"{st}{wt}>{rich(s)}</text>')

    def dot(self, x, y, r=3.6):
        self.el.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{INK}"/>')

    def term(self, x, y, label=None, side="right", r=4.2, filled=False):
        self.el.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{INK if filled else "#fff"}" stroke="{INK}" stroke-width="{self.sw}"/>')
        if label:
            dx, dy, a = {"right": (14, 0, "start"), "left": (-14, 0, "end"), "up": (0, -16, "middle"), "down": (0, 17, "middle")}[side]
            self.text(x + dx, y + dy, label, 16, a, italic=True)

    def arrowhead(self, x, y, ang, size=9):
        a1, a2 = ang + math.radians(152), ang - math.radians(152)
        pts = [(x, y), (x + size * math.cos(a1), y + size * math.sin(a1)), (x + size * math.cos(a2), y + size * math.sin(a2))]
        self.el.append('<polygon points="' + " ".join(f"{px:.1f},{py:.1f}" for px, py in pts) + f'" fill="{INK}"/>')

    def arrow(self, x1, y1, x2, y2, label=None, lx=0, ly=0, size=9, sw=None, anchor="middle"):
        ang = math.atan2(y2 - y1, x2 - x1)
        self.line(x1, y1, x2 - size * 0.6 * math.cos(ang), y2 - size * 0.6 * math.sin(ang), sw=sw)
        self.arrowhead(x2, y2, ang, size)
        if label:
            self.text((x1 + x2) / 2 + lx, (y1 + y2) / 2 + ly, label, 15, anchor, italic=False)

    def flow(self, x, y, direction, label=None, lx=0, ly=0, anchor="middle", size=10):
        """Current arrowhead sitting on a wire at (x, y) pointing up/down/left/right."""
        ang = {"right": 0, "left": math.pi, "down": math.pi / 2, "up": -math.pi / 2}[direction]
        self.arrowhead(x + size / 2 * math.cos(ang), y + size / 2 * math.sin(ang), ang, size)
        if label:
            self.text(x + lx, y + ly, label, 15, anchor)

    # ---------- components on a segment ----------
    def _seg(self, x1, y1, x2, y2, body):
        L = math.hypot(x2 - x1, y2 - y1)
        ux, uy = (x2 - x1) / L, (y2 - y1) / L
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        h = body / 2
        self.line(x1, y1, mx - ux * h, my - uy * h)
        self.line(mx + ux * h, my + uy * h, x2, y2)
        return mx, my, ux, uy, math.degrees(math.atan2(uy, ux))

    def _label(self, mx, my, ux, uy, label, side, off, size=15):
        if not label:
            return
        nx, ny = -uy, ux  # left normal
        if side in ("left", "right", "above", "below"):
            # absolute placement helpers
            ax, ay = {"left": (-1, 0), "right": (1, 0), "above": (0, -1), "below": (0, 1)}[side]
            x, y = mx + ax * off, my + ay * off
            anchor = "end" if side == "left" else "start" if side == "right" else "middle"
        else:
            s = 1 if side == "n" else -1
            x, y = mx + nx * off * s, my + ny * off * s
            anchor = "middle"
        self.text(x, y, label, size, anchor)

    def res(self, x1, y1, x2, y2, label=None, side=None, off=None, body=40, wd=15, at=0.5):
        if at != 0.5:
            cx, cy = x1 + (x2 - x1) * at, y1 + (y2 - y1) * at
            L = math.hypot(x2 - x1, y2 - y1)
            ux, uy = (x2 - x1) / L, (y2 - y1) / L
            self.line(x1, y1, cx - ux * body / 2, cy - uy * body / 2)
            self.line(cx + ux * body / 2, cy + uy * body / 2, x2, y2)
            mx, my, deg = cx, cy, math.degrees(math.atan2(uy, ux))
        else:
            mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, body)
        self.el.append(f'<rect x="{-body/2:.1f}" y="{-wd/2:.1f}" width="{body}" height="{wd}" fill="#fff" stroke="{INK}" stroke-width="{self.sw}" transform="translate({mx:.1f},{my:.1f}) rotate({deg:.1f})"/>')
        if side is None:
            side = "above" if abs(uy) < 0.3 else "right"
        if off is None:
            off = 21 if side in ("above", "below") else 17
        self._label(mx, my, ux, uy, label, side, off)

    def bat(self, x1, y1, x2, y2, plus="a", label=None, side=None, off=None, show_plus=True):
        """Cell on segment; long (+) plate faces end 'a' (x1,y1) or 'b' (x2,y2)."""
        gap = 8
        mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, gap)
        nx, ny = -uy, ux
        s = -1 if plus == "a" else 1
        lp = (mx + ux * gap / 2 * s, my + uy * gap / 2 * s)   # long plate centre
        sp = (mx - ux * gap / 2 * s, my - uy * gap / 2 * s)   # short plate centre
        self.line(lp[0] - nx * 15, lp[1] - ny * 15, lp[0] + nx * 15, lp[1] + ny * 15, sw=2.2)
        self.line(sp[0] - nx * 7.5, sp[1] - ny * 7.5, sp[0] + nx * 7.5, sp[1] + ny * 7.5, sw=4.2)
        if side is None:
            side = "right" if abs(uy) > 0.7 else "below"
        if show_plus:
            ox, oy = {"left": (1, 0), "right": (-1, 0), "above": (0, 1), "below": (0, -1)}.get(side, (nx, ny))
            px, py = lp[0] + ux * 9 * s + ox * 17, lp[1] + uy * 9 * s + oy * 17
            self.text(px, py, "+", 15)
        if off is None:
            off = 22 if side in ("left", "right") else 24
        self._label(mx, my, ux, uy, label, side, off)

    def isrc(self, x1, y1, x2, y2, label=None, side="right", off=30, r=17):
        """Current source; arrow points from (x1,y1) towards (x2,y2)."""
        mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, 2 * r)
        self.el.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{r}" fill="#fff" stroke="{INK}" stroke-width="{self.sw}"/>')
        self.line(mx - ux * r * 0.55, my - uy * r * 0.55, mx + ux * r * 0.25, my + uy * r * 0.25)
        self.arrowhead(mx + ux * r * 0.62, my + uy * r * 0.62, math.atan2(uy, ux), 9)
        self._label(mx, my, ux, uy, label, side, off)

    def hop(self, x1, y1, x2, y2, cx, cy, r=8):
        """Wire from (x1,y1) to (x2,y2) that jumps over another wire at (cx,cy)."""
        L = math.hypot(x2 - x1, y2 - y1)
        ux, uy = (x2 - x1) / L, (y2 - y1) / L
        a = (cx - ux * r, cy - uy * r)
        b = (cx + ux * r, cy + uy * r)
        self.line(x1, y1, *a)
        self.el.append(f'<path d="M {a[0]:.1f} {a[1]:.1f} A {r} {r} 0 0 1 {b[0]:.1f} {b[1]:.1f}" fill="none" stroke="{INK}" stroke-width="{self.sw}"/>')
        self.line(*b, x2, y2)

    def raw(self, s):
        self.el.append(s)

    def box(self, x, y, w, h, lines):
        self.el.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="{INK}" stroke-width="{self.sw}"/>')
        n = len(lines)
        for i, s in enumerate(lines):
            self.text(x + w / 2, y + h / 2 + (i - (n - 1) / 2) * 20, s, 16)

    # ---------- more components ----------
    def cap(self, x1, y1, x2, y2, label=None, side=None, off=None, gap=9, plate=28):
        mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, gap)
        nx, ny = -uy, ux
        for s in (-1, 1):
            cx, cy = mx + ux * gap / 2 * s, my + uy * gap / 2 * s
            self.line(cx - nx * plate / 2, cy - ny * plate / 2, cx + nx * plate / 2, cy + ny * plate / 2, sw=2.6)
        if side is None:
            side = "above" if abs(uy) < 0.3 else "right"
        if off is None:
            off = 24 if side in ("above", "below") else 22
        self._label(mx, my, ux, uy, label, side, off)

    def ind(self, x1, y1, x2, y2, label=None, side=None, off=None, humps=4, body=48):
        mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, body)
        r = body / humps / 2
        sx, sy = mx - ux * body / 2, my - uy * body / 2
        d = f"M {sx:.1f} {sy:.1f}"
        for i in range(humps):
            ex, ey = sx + ux * 2 * r * (i + 1), sy + uy * 2 * r * (i + 1)
            d += f" A {r:.1f} {r:.1f} 0 0 1 {ex:.1f} {ey:.1f}"
        self.el.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{self.sw}"/>')
        if side is None:
            side = "above" if abs(uy) < 0.3 else "right"
        if off is None:
            off = 24 if side in ("above", "below") else 18
        self._label(mx, my, ux, uy, label, side, off)

    def acsrc(self, x1, y1, x2, y2, label=None, side="left", off=30, r=18):
        mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, 2 * r)
        self.el.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{r}" fill="#fff" stroke="{INK}" stroke-width="{self.sw}"/>')
        w = r * 0.6
        self.el.append(f'<path d="M {mx-w:.1f} {my:.1f} C {mx-w/2:.1f} {my-w*1.1:.1f}, {mx-w/2:.1f} {my-w*1.1:.1f}, {mx:.1f} {my:.1f} S {mx+w/2:.1f} {my+w*1.1:.1f}, {mx+w:.1f} {my:.1f}" fill="none" stroke="{INK}" stroke-width="1.8"/>')
        if label:
            lines = label if isinstance(label, (list, tuple)) else [label]
            ax = {"left": -1, "right": 1}.get(side, 0)
            for i, t in enumerate(lines):
                self.text(mx + ax * off, my + (i - (len(lines) - 1) / 2) * 19, t, 15, "end" if ax < 0 else "start" if ax > 0 else "middle")

    def meter(self, x1, y1, x2, y2, letter, label=None, side="right", off=26, r=13):
        mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, 2 * r)
        self.el.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{r}" fill="#fff" stroke="{INK}" stroke-width="{self.sw}"/>')
        self.text(mx, my + 1, letter, 14, weight="700")
        self._label(mx, my, ux, uy, label, side, off)

    def lamp(self, x1, y1, x2, y2, label=None, side="above", off=30, r=14):
        mx, my, ux, uy, deg = self._seg(x1, y1, x2, y2, 2 * r)
        self.el.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{r}" fill="#fff" stroke="{INK}" stroke-width="{self.sw}"/>')
        k = r * 0.7
        self.line(mx - k, my - k, mx + k, my + k, sw=1.6); self.line(mx - k, my + k, mx + k, my - k, sw=1.6)
        self._label(mx, my, ux, uy, label, side, off)

    def loadbox(self, x, y1, y2, w, h, lines, size=13):
        """Vertical branch from rail y1 to rail y2 through a labelled box centred on x."""
        cy = (y1 + y2) / 2
        self.line(x, y1, x, cy - h / 2); self.line(x, cy + h / 2, x, y2)
        self.el.append(f'<rect x="{x-w/2:.1f}" y="{cy-h/2:.1f}" width="{w}" height="{h}" rx="6" fill="#fff" stroke="{INK}" stroke-width="{self.sw}"/>')
        n = len(lines)
        for i, t in enumerate(lines):
            self.text(x, cy + (i - (n - 1) / 2) * (size + 4), t, size, weight="600" if i == 0 else None)

    def group(self, x, y, w, h, label, lx=None, ly=None):
        self.el.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="none" stroke="#777" stroke-width="1.3" stroke-dasharray="5 4"/>')
        self.text(lx if lx is not None else x + w / 2, ly if ly is not None else y - 10, label, 13, color="#555")

    def svg(self, title):
        body = "\n".join(self.el)
        if self.pad:
            body = f'<g transform="translate({self.pad},0)">\n{body}\n</g>'
        W = self.w + self.pad
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {self.h}" width="{W}" height="{self.h}" '
                f'font-family="{FONT}" role="img" aria-label="{esc(title)}">\n<title>{esc(title)}</title>\n'
                f'<rect width="{W}" height="{self.h}" fill="#ffffff"/>\n{body}\n</svg>\n')


class Plot:
    """Simple waveform axes."""

    def __init__(self, s, x0, y0, sx, sy):
        self.s, self.x0, self.y0, self.sx, self.sy = s, x0, y0, sx, sy

    def P(self, t, v):
        return (self.x0 + t * self.sx, self.y0 - v * self.sy)

    def axes(self, tmax, vmin, vmax, ylab, xlab, xticks, yticks, guide=(), tick_dx=0, tick_dy=18):
        s = self.s
        a, b = self.P(0, vmin - 0.6), self.P(0, vmax + 1.0)
        s.arrow(a[0], a[1], b[0], b[1], size=10, sw=1.6)
        c, d = self.P(0, 0), self.P(tmax, 0)
        s.arrow(c[0], c[1], d[0], d[1], size=10, sw=1.6)
        s.text(b[0] + 10, b[1] + 2, ylab, 15, "start")
        s.text(d[0] + 8, d[1], xlab, 15, "start")
        for t in xticks:
            x, y = self.P(t, 0)
            s.line(x, y - 4, x, y + 4, sw=1.4)
            s.text(x + (tick_dx or (-7 if t == 0 else 0)), y + tick_dy, f"{t:g}", 14)
        for v in yticks:
            x, y = self.P(0, v)
            s.line(x - 4, y, x + 4, y, sw=1.4)
            s.text(x - 10, y, f"{v:g}".replace("-", "−"), 14, "end")
        for v, t1 in guide:
            p, q = self.P(0, v), self.P(t1, v)
            s.line(p[0], p[1], q[0], q[1], dash="3 4", sw=1.1, color="#777")

    def trace(self, pts, dash=None):
        self.s.wire(*[self.P(t, v) for t, v in pts], dash=dash)
