"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, ImagePlus, Star, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  addWeekAction,
  createProgrammeAction,
  deleteProgrammeAction,
  deleteWeekAction,
  finishPreviewUploadAction,
  movePreviewAction,
  moveProgrammeAction,
  removePreviewAction,
  saveNextSessionAction,
  saveProgrammeAction,
  saveWeekAction,
  setCoverAction,
  skillsAdminDataAction,
  startPreviewUploadAction,
  type SkillsAdminData,
} from "@/lib/site/skillsActions";
import type { SkillsProgramme, SkillsStatus, SkillsWeek } from "@/lib/site/skillsProgrammes";
import { durationLabel } from "@/lib/site/skillsFormat";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2DCCB", borderRadius: 14, padding: 16 };
const label: CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4 };
const input: CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid #D8D2C4", background: "#fff", padding: "0 10px", fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" };
const dark: CSSProperties = { height: 40, padding: "0 16px", borderRadius: 999, border: 0, background: "#111", color: "#E9BC3A", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
const ghost: CSSProperties = { height: 36, padding: "0 12px", borderRadius: 999, border: "1px solid #111", background: "#fff", color: "#111", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 };
const thumb = (id: string) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w300`;

function Seg<T extends string>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "inline-flex", borderRadius: 9, border: "1px solid #D8D2C4", overflow: "hidden" }}>
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} style={{ padding: "8px 12px", border: 0, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: v === value ? "#111" : "#fff", color: v === value ? "#E9BC3A" : "#333" }}>{l}</button>
      ))}
    </div>
  );
}

function put(url: string, file: File, onProgress: (f: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { id?: string };
        if (xhr.status >= 200 && xhr.status < 300 && body.id) resolve(body.id);
        else reject(new Error("Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(file);
  });
}

export default function AdminSkillsPage() {
  const [data, setData] = useState<SkillsAdminData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await skillsAdminDataAction();
    if (r.ok) {
      setData(r.data);
      setSelected((cur) => cur ?? r.data.programmes[0]?.id ?? null);
    } else setError(r.error);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const programme = data?.programmes.find((p) => p.id === selected) ?? null;

  return (
    <div>
      <AdminPageHeader title="Skills training" description="The tiles on the Skills Workshop page, each programme's dates, the next session, and weekly photos (full sets on Pixieset)." />
      {error ? <p style={{ color: "#B3261E", fontWeight: 700 }}>{error}</p> : null}
      {!data ? <p style={{ fontWeight: 700 }}>Loading…</p> : null}
      {data ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {data.programmes.map((p) => (
              <button key={p.id} type="button" onClick={() => setSelected(p.id)} style={{ padding: "10px 14px", borderRadius: 12, background: "#fff", border: p.id === selected ? "2px solid #111" : "1px solid #E2DCCB", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                {p.name}
                {!p.visible ? <span style={{ marginLeft: 6, fontSize: 11, color: "#888" }}>HIDDEN</span> : p.status ? <span style={{ marginLeft: 6, fontSize: 11, color: p.status === "ongoing" ? "#12804A" : "#8F6500" }}>{p.status === "ongoing" ? "ONGOING" : p.status === "coming_soon" ? "COMING SOON" : "ENDED"}</span> : null}
              </button>
            ))}
            <button
              type="button"
              style={{ ...ghost, height: 42 }}
              onClick={async () => {
                const name = window.prompt("Name of the new programme");
                if (!name) return;
                const r = await createProgrammeAction(name);
                if (!r.ok) return window.alert(r.error);
                setSelected(r.data.id);
                await load();
              }}
            >
              + New programme
            </button>
          </div>
          {programme ? <ProgrammeEditor key={programme.id} programme={programme} weeks={data.weeks[programme.id] ?? []} isFirst={data.programmes[0]?.id === programme.id} isLast={data.programmes[data.programmes.length - 1]?.id === programme.id} reload={load} onDeleted={() => setSelected(null)} /> : null}
        </>
      ) : null}
    </div>
  );
}

function ProgrammeEditor({ programme, weeks, isFirst, isLast, reload, onDeleted }: { programme: SkillsProgramme; weeks: SkillsWeek[]; isFirst: boolean; isLast: boolean; reload: () => Promise<void>; onDeleted: () => void }) {
  const [f, setF] = useState({
    name: programme.name,
    subtitle: programme.subtitle ?? "",
    partner: programme.partner ?? "",
    partnerLogo: programme.partnerLogo ?? "",
    price: programme.price,
    status: programme.status,
    startsOn: programme.startsOn ?? "",
    endsOn: programme.endsOn ?? "",
    description: programme.description ?? "",
    registerUrl: programme.registerUrl ?? "",
    detailHref: programme.detailHref ?? "",
    visible: programme.visible,
  });
  const [n, setN] = useState({ week: programme.next.week ? String(programme.next.week) : "", topic: programme.next.topic ?? "", date: programme.next.date ?? "", time: programme.next.time ?? "", venue: programme.next.venue ?? "", note: programme.next.note ?? "", notify: false });
  const [msg, setMsg] = useState<string | null>(null);
  const [nextMsg, setNextMsg] = useState<string | null>(null);
  const duration = durationLabel(f.startsOn || null, f.endsOn || null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b style={{ flex: 1 }}>Tile details</b>
            <a href={programme.detailHref || `/skills-workshop/${programme.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>View page <ExternalLink size={13} /></a>
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={label}>Name</label><input style={input} value={f.name} onChange={set("name")} /></div>
            <div><label style={label}>Second line (optional, shown when there is no partner)</label><input style={input} value={f.subtitle} onChange={set("subtitle")} placeholder="College of Engineering" /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label style={label}>Partner (optional)</label><input style={input} value={f.partner} onChange={set("partner")} placeholder="IEEE" /></div>
              <div style={{ flex: 1 }}><label style={label}>Partner logo link</label><input style={input} value={f.partnerLogo} onChange={set("partnerLogo")} placeholder="/home/ieee-logo.png" /></div>
            </div>
            {f.partnerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.partnerLogo} alt="" style={{ height: 34, width: "auto", alignSelf: "flex-start", border: "1px solid #eee", borderRadius: 6, padding: 3 }} />
            ) : null}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div><span style={label}>Price</span><Seg value={f.price} options={[["free", "Free"], ["paid", "Paid"]]} onChange={(v) => setF({ ...f, price: v })} /></div>
              <div><span style={label}>Status</span><Seg<SkillsStatus> value={f.status} options={[["", "None"], ["coming_soon", "Coming soon"], ["ongoing", "Ongoing"], ["ended", "Ended"]]} onChange={(v) => setF({ ...f, status: v })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label style={label}>Starts</label><input type="date" style={input} value={f.startsOn} onChange={set("startsOn")} /></div>
              <div style={{ flex: 1 }}><label style={label}>Ends</label><input type="date" style={input} value={f.endsOn} onChange={set("endsOn")} /></div>
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>Duration shown to students: <b>{duration ?? "set both dates"}</b></div>
            <div><label style={label}>Short description</label><textarea style={{ ...input, height: 70, padding: 10, resize: "vertical" }} value={f.description} onChange={set("description")} /></div>
            <div><label style={label}>Registration link (optional)</label><input style={input} value={f.registerUrl} onChange={set("registerUrl")} placeholder="https://forms.gle/…" /></div>
            <div><label style={label}>Tile opens this page instead (optional)</label><input style={input} value={f.detailHref} onChange={set("detailHref")} placeholder={`/skills-workshop/${programme.slug}`} /></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}><input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} /> Show this tile on the site</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" style={dark} onClick={async () => { setMsg("Saving…"); const r = await saveProgrammeAction(programme.id, f); setMsg(r.ok ? "Saved." : r.error); if (r.ok) await reload(); }}>Save</button>
              <button type="button" style={ghost} disabled={isFirst} onClick={async () => { await moveProgrammeAction(programme.id, "up"); await reload(); }}><ArrowUp size={14} /> Move tile up</button>
              <button type="button" style={ghost} disabled={isLast} onClick={async () => { await moveProgrammeAction(programme.id, "down"); await reload(); }}><ArrowDown size={14} /> Move tile down</button>
              <button type="button" style={{ ...ghost, borderColor: "#B3261E", color: "#B3261E" }} onClick={async () => { if (!window.confirm(`Delete “${programme.name}” and all its weeks?`)) return; await deleteProgrammeAction(programme.id); onDeleted(); await reload(); }}><Trash2 size={14} /> Delete</button>
              {msg ? <span style={{ fontSize: 13, fontWeight: 700 }}>{msg}</span> : null}
            </div>
          </div>
        </div>

        <div style={card}>
          <b>Coming next</b>
          <div style={{ fontSize: 12, color: "#666" }}>The glowing card at the top of the programme page. It hides itself after the date passes.</div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 90 }}><label style={label}>Week</label><input style={input} inputMode="numeric" value={n.week} onChange={(e) => setN({ ...n, week: e.target.value.replace(/\D/g, "") })} /></div>
              <div style={{ flex: 1 }}><label style={label}>Topic</label><input style={input} value={n.topic} onChange={(e) => setN({ ...n, topic: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label style={label}>Date</label><input type="date" style={input} value={n.date} onChange={(e) => setN({ ...n, date: e.target.value })} /></div>
              <div style={{ flex: 1 }}><label style={label}>Time</label><input style={input} value={n.time} onChange={(e) => setN({ ...n, time: e.target.value })} placeholder="6:00 PM to 8:00 PM" /></div>
            </div>
            <div><label style={label}>Venue</label><input style={input} value={n.venue} onChange={(e) => setN({ ...n, venue: e.target.value })} /></div>
            <div><label style={label}>Note (optional)</label><input style={input} value={n.note} onChange={(e) => setN({ ...n, note: e.target.value })} placeholder="Bring your laptop." /></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}><input type="checkbox" checked={n.notify} onChange={(e) => setN({ ...n, notify: e.target.checked })} /> Send a phone notification when I save</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" style={dark} onClick={async () => { setNextMsg("Saving…"); const r = await saveNextSessionAction(programme.id, { ...n, week: n.week ? Number(n.week) : null }); setNextMsg(r.ok ? (n.notify ? "Saved and sent." : "Saved.") : r.error); if (r.ok) setN({ ...n, notify: false }); }}>Save</button>
              <button type="button" style={ghost} onClick={async () => { const empty = { week: "", topic: "", date: "", time: "", venue: "", note: "", notify: false }; setN(empty); const r = await saveNextSessionAction(programme.id, { week: null }); setNextMsg(r.ok ? "Cleared." : r.error); }}>Clear</button>
              {nextMsg ? <span style={{ fontSize: 13, fontWeight: 700 }}>{nextMsg}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <b style={{ flex: 1 }}>Photos by week</b>
          <button type="button" style={ghost} onClick={async () => { const r = await addWeekAction(programme.id); if (!r.ok) window.alert(r.error); await reload(); }}>+ Add a week</button>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Upload everything to Pixieset and paste the gallery link. Then add a few of the best photos as the preview on our site. The star makes a photo the tile’s picture.</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {weeks.map((w) => <WeekEditor key={w.id} week={w} programme={programme} reload={reload} />)}
          {!weeks.length ? <p style={{ fontSize: 14, color: "#666" }}>No weeks yet.</p> : null}
        </div>
      </div>
    </div>
  );
}

function WeekEditor({ week, programme, reload }: { week: SkillsWeek; programme: SkillsProgramme; reload: () => Promise<void> }) {
  const [f, setF] = useState({ weekNumber: String(week.weekNumber), title: week.title, heldOn: week.heldOn ?? "", pixiesetUrl: week.pixiesetUrl ?? "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).filter((x) => x.type.startsWith("image/"));
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBusy(`Uploading ${i + 1} of ${files.length}…`);
      const s = await startPreviewUploadAction(week.id, { name: file.name || "photo.jpg", type: file.type || "image/jpeg", size: file.size });
      if (!s.ok) {
        setBusy(null);
        return window.alert(s.error);
      }
      try {
        const id = await put(s.data.uploadUrl, file, (p) => setBusy(`Uploading ${i + 1} of ${files.length}… ${Math.round(p * 100)}%`));
        const done = await finishPreviewUploadAction(week.id, id);
        if (!done.ok) window.alert(done.error);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Upload failed.");
      }
    }
    setBusy(null);
    await reload();
  }

  return (
    <div style={{ border: "1px solid #E2DCCB", borderRadius: 12, padding: 12, background: "#FCFBF7" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ width: 80 }}><label style={label}>Week</label><input style={input} inputMode="numeric" value={f.weekNumber} onChange={(e) => setF({ ...f, weekNumber: e.target.value.replace(/\D/g, "") })} /></div>
        <div style={{ flex: "1 1 200px" }}><label style={label}>Topic</label><input style={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div style={{ width: 160 }}><label style={label}>Date</label><input type="date" style={input} value={f.heldOn} onChange={(e) => setF({ ...f, heldOn: e.target.value })} /></div>
        <div style={{ flex: "2 1 280px" }}><label style={label}>Pixieset gallery link</label><input style={input} value={f.pixiesetUrl} onChange={(e) => setF({ ...f, pixiesetUrl: e.target.value })} placeholder="https://….pixieset.com/…" /></div>
        <button type="button" style={dark} onClick={async () => { setMsg("Saving…"); const r = await saveWeekAction(week.id, { ...f, weekNumber: Number(f.weekNumber) }); setMsg(r.ok ? "Saved." : r.error); if (r.ok) await reload(); }}>Save</button>
        <button type="button" aria-label="Delete week" style={{ ...ghost, borderColor: "#B3261E", color: "#B3261E" }} onClick={async () => { if (!window.confirm(`Delete Week ${week.weekNumber} and its preview photos?`)) return; await deleteWeekAction(week.id); await reload(); }}><Trash2 size={14} /></button>
      </div>
      {msg ? <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>{msg}</div> : null}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {week.previews.map((p, i) => (
          <div key={p.fileId} style={{ position: "relative", width: 110, height: 84, borderRadius: 8, overflow: "hidden", background: "#eee", outline: programme.coverFileId === p.fileId ? "3px solid #E9BC3A" : "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(p.fileId)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between", padding: 3, background: "linear-gradient(transparent, rgba(0,0,0,.55))" }}>
              <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={async () => { await movePreviewAction(week.id, p.fileId, -1); await reload(); }} style={mini}><ArrowLeft size={12} /></button>
              <button type="button" aria-label="Use as tile picture" onClick={async () => { await setCoverAction(programme.id, programme.coverFileId === p.fileId ? null : p.fileId); await reload(); }} style={{ ...mini, color: programme.coverFileId === p.fileId ? "#E9BC3A" : "#fff" }}><Star size={12} fill={programme.coverFileId === p.fileId ? "#E9BC3A" : "none"} /></button>
              <button type="button" aria-label="Remove" onClick={async () => { if (!window.confirm("Remove this preview photo?")) return; await removePreviewAction(week.id, p.fileId); await reload(); }} style={mini}><Trash2 size={12} /></button>
              <button type="button" aria-label="Move later" disabled={i === week.previews.length - 1} onClick={async () => { await movePreviewAction(week.id, p.fileId, 1); await reload(); }} style={mini}><ArrowRight size={12} /></button>
            </div>
          </div>
        ))}
        <label style={{ width: 110, height: 84, borderRadius: 8, border: "2px dashed #B58A1E", color: "#8F6500", fontSize: 12, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: busy ? "wait" : "pointer", textAlign: "center" }}>
          <ImagePlus size={18} />
          {busy ?? "Add preview photos"}
          <input type="file" accept="image/*" multiple disabled={Boolean(busy)} onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
        </label>
      </div>
    </div>
  );
}

const mini: CSSProperties = { width: 24, height: 24, borderRadius: 999, border: 0, background: "rgba(0,0,0,.5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 };
