import Link from "next/link";
import type { SkillsProgramme } from "@/lib/site/skillsProgrammes";
import { durationLabel, shortDate } from "@/lib/site/skillsFormat";
import { CREAM, GOLD, INK, PAPER, PriceBadge, SkillsStyles, StatusBadge, Wrap, font, goldGround } from "./ui";

function thumbSrc(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w800`;
}

/** Small tiles, one per programme: picture, Free/Paid, status, duration. */
export function SkillsTiles({ programmes, covers }: { programmes: SkillsProgramme[]; covers: Record<string, string | null> }) {
  return (
    <section style={{ ...goldGround, ...font, color: INK, minHeight: "70vh" }}>
      <SkillsStyles />
      <Wrap>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, letterSpacing: ".14em", color: "#5C3F00" }}>SKILLS TRAINING</p>
        <h1 style={{ margin: "2px 0 0", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.05 }}>Practical engineering skills</h1>
        <div className="sk-tiles" style={{ marginTop: 18 }}>
          {programmes.map((p) => {
            const dark = p.price === "paid";
            const fg = dark ? CREAM : INK;
            const muted = dark ? "rgba(246,239,220,.65)" : "#5C564B";
            const cover = covers[p.id];
            const duration = durationLabel(p.startsOn, p.endsOn);
            const dates = p.startsOn && p.endsOn ? `${shortDate(p.startsOn)} to ${shortDate(p.endsOn)}` : p.startsOn ? `From ${shortDate(p.startsOn)}` : null;
            return (
              <Link key={p.id} href={p.detailHref || `/skills-workshop/${p.slug}`} className="sk-tile" style={{ background: dark ? INK : PAPER, color: fg }}>
                <span className="sk-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: cover ? "#E9E2CF" : "linear-gradient(135deg,#F2D57D,#C9961B)" }}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbSrc(cover)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : p.partnerLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.partnerLogo} alt="" style={{ maxWidth: "70%", maxHeight: "60%", objectFit: "contain", borderRadius: 10 }} />
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 900, color: INK }}>B2B</span>
                  )}
                </span>
                <span className="sk-body" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <StatusBadge status={p.status} />
                    <PriceBadge price={p.price} dark={dark} />
                  </span>
                  <span style={{ marginTop: 2, fontSize: 18, fontWeight: 900, lineHeight: 1.15 }}>{p.name}</span>
                  {p.partner ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: muted }}>
                      In partnership with
                      {p.partnerLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.partnerLogo} alt={p.partner} style={{ height: 18, width: "auto", background: "#fff", borderRadius: 4, padding: "1px 3px" }} />
                      ) : (
                        <b style={{ color: fg }}>{p.partner}</b>
                      )}
                    </span>
                  ) : p.subtitle ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: muted }}>{p.subtitle}</span>
                  ) : null}
                  {duration ? <span style={{ fontSize: 13, fontWeight: 800 }}>{duration}</span> : null}
                  {dates ? <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>{dates}</span> : null}
                  <span style={{ marginTop: "auto", paddingTop: 6, fontSize: 13, fontWeight: 900, color: dark ? GOLD : INK, textDecoration: "underline", textUnderlineOffset: 3 }}>{p.price === "free" ? "See photos and what’s next" : "See the courses"}</span>
                </span>
              </Link>
            );
          })}
        </div>
        {!programmes.length ? <p style={{ fontWeight: 700 }}>New sessions are coming soon.</p> : null}
      </Wrap>
    </section>
  );
}
