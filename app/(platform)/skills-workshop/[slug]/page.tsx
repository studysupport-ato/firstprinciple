import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SKILLS_TRAINING } from "@/lib/site/skillsTraining";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";
import { getProgramme, listWeeks } from "@/lib/site/skillsProgrammes";
import { dateParts, durationLabel, longDate, nextIsUpcoming, shortDate } from "@/lib/site/skillsFormat";
import { WeekGallery } from "@/components/skills/WeekGallery";
import { GOLD, GREEN, INK, PriceBadge, SkillsStyles, StatusBadge, Wrap, font, goldGround } from "@/components/skills/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const programme = await getProgramme((await params).slug);
  return { title: `${programme?.name ?? "Skills training"} · Back2Basics with Kwamina` };
}

export default async function SkillsProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  const admin = await isAdminVisitor();
  if (!SKILLS_TRAINING.live && !admin) notFound();
  const programme = await getProgramme((await params).slug);
  if (!programme || (!programme.visible && !admin)) notFound();
  const weeks = await listWeeks(programme.id);
  const duration = durationLabel(programme.startsOn, programme.endsOn);
  const next = programme.next;
  const showNext = nextIsUpcoming(next.date);
  const parts = dateParts(next.date);

  return (
    <main className="min-h-screen pb-24 md:pb-0" style={{ ...goldGround, ...font, color: INK }}>
      <SkillsStyles />
      <Wrap>
        <Link href="/skills-workshop" style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 999, background: INK, color: GOLD, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
          <ArrowLeft size={18} strokeWidth={2.6} /> Skills training
        </Link>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobg.png" alt="Back2Basics with Kwamina" width={44} height={44} style={{ borderRadius: 12 }} />
          {programme.partnerLogo ? (
            <>
              <span style={{ fontSize: 20, fontWeight: 900, color: "rgba(26,24,20,.6)" }}>×</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={programme.partnerLogo} alt={programme.partner ?? ""} style={{ height: 40, width: "auto", background: "#fff", borderRadius: 10, padding: "4px 8px" }} />
            </>
          ) : null}
        </div>
        <h1 style={{ margin: "12px 0 0", fontSize: "clamp(30px, 5vw, 50px)", fontWeight: 900, letterSpacing: "-.035em", lineHeight: 1 }}>{programme.name}</h1>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge status={programme.status} />
          <PriceBadge price={programme.price} />
          {duration ? <span style={{ fontSize: 15, fontWeight: 900 }}>{duration}</span> : null}
          {programme.startsOn && programme.endsOn ? <span style={{ fontSize: 15, fontWeight: 700, color: "#5C3F00" }}>{shortDate(programme.startsOn)} to {shortDate(programme.endsOn)}</span> : null}
        </div>
        {programme.description ? <p style={{ margin: "8px 0 0", maxWidth: 680, fontSize: 17, fontWeight: 600, lineHeight: 1.45, color: "#3A352B" }}>{programme.description}</p> : null}
        {programme.registerUrl && programme.status !== "ended" ? (
          <a href={programme.registerUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 48, padding: "0 22px", borderRadius: 16, background: INK, color: "#F6EFDC", fontSize: 16, fontWeight: 800, textDecoration: "none" }}>
            Register{programme.price === "free" ? <b style={{ color: GOLD }}>for FREE</b> : null} <ExternalLink size={16} color={GOLD} />
          </a>
        ) : null}

        {showNext ? (
          <div className="sk-next" style={{ marginTop: 22, borderRadius: 24, background: "#FFFFFF", padding: "18px 20px", boxShadow: "0 0 0 4px rgba(255,255,255,.5), 0 0 40px 8px rgba(255,255,255,.7)" }}>
            {parts ? (
              <div style={{ width: 82, height: 86, borderRadius: 20, background: INK, color: GOLD, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".1em" }}>{parts.weekday}</span>
                <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{parts.day}</span>
                <span style={{ fontSize: 12, fontWeight: 800 }}>{parts.month}</span>
              </div>
            ) : null}
            <div style={{ minWidth: 0 }}>
              <span style={{ display: "inline-flex", height: 24, padding: "0 10px", borderRadius: 999, background: GREEN, color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: ".1em", alignItems: "center" }}>COMING NEXT</span>
              <div style={{ marginTop: 6, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, lineHeight: 1.1 }}>{[next.week ? `Week ${next.week}` : null, next.topic].filter(Boolean).join(": ") || "Next session"}</div>
              <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: "#5C564B" }}>{longDate(next.date)}</div>
              {next.time ? <div style={{ fontSize: 15, fontWeight: 600, color: "#5C564B" }}>{next.time}</div> : null}
              {next.venue ? <div style={{ fontSize: 15, fontWeight: 600, color: "#5C564B" }}>{next.venue}</div> : null}
              {next.note ? <div style={{ fontSize: 15, fontWeight: 600, color: "#5C564B" }}>{next.note}</div> : null}
            </div>
          </div>
        ) : null}

        {weeks.length ? (
          weeks.map((w) => (
            <section key={w.id} style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ height: 30, padding: "0 12px", borderRadius: 9, background: INK, color: GOLD, fontSize: 15, fontWeight: 900, display: "inline-flex", alignItems: "center" }}>Week {w.weekNumber}</span>
                {w.title ? <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{w.title}</h2> : null}
                {w.heldOn ? <span style={{ fontSize: 14, fontWeight: 700, color: "#5C3F00" }}>{shortDate(w.heldOn)}</span> : null}
              </div>
              <WeekGallery previews={w.previews.map((p) => p.fileId)} title={`Week ${w.weekNumber}${w.title ? `: ${w.title}` : ""}`} pixiesetUrl={w.pixiesetUrl} />
            </section>
          ))
        ) : (
          <p style={{ marginTop: 26, fontSize: 15, fontWeight: 700 }}>Photos from the sessions will appear here after each week.</p>
        )}
      </Wrap>
    </main>
  );
}
