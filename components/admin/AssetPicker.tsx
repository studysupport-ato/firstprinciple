"use client";

import { useState } from "react";
import { getAssets, type Asset } from "@/lib/content";

export function AssetPicker({ type, value, onChange }: { type: "image" | "video"; value?: string; onChange: (asset: Asset | undefined) => void }) {
  const [query, setQuery] = useState("");
  const assets = getAssets().filter((asset) => asset.type === type && asset.status !== "archived" && `${asset.name} ${asset.title ?? ""} ${(asset.tags ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const selected = value ? getAssets().find((asset) => asset.id === value) : undefined;

  return <div className="space-y-3 rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] p-3"><div className="flex items-center justify-between"><span className="field-label">Media library</span>{selected ? <button type="button" onClick={() => onChange(undefined)} className="text-xs font-semibold text-[#666666] hover:text-[#111111]">Clear</button> : null}</div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${type} assets`} className="admin-input bg-white" />{selected ? <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-2">{type === "image" ? <img src={selected.source.url} alt={selected.altText ?? ""} className="h-12 w-16 rounded object-cover" /> : <div className="flex h-12 w-16 items-center justify-center rounded bg-[#111111] text-xs text-white">VIDEO</div>}<div className="min-w-0"><div className="truncate text-sm font-medium text-[#111111]">{selected.name}</div><div className="text-xs text-[#666666]">{selected.source.kind} · {selected.status}</div></div></div> : <div className="max-h-40 space-y-2 overflow-y-auto">{assets.map((asset) => <button type="button" key={asset.id} onClick={() => onChange(asset)} className="flex w-full items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-2 text-left hover:border-[#2563EB]">{type === "image" ? <img src={asset.source.url} alt={asset.altText ?? ""} className="h-10 w-14 rounded object-cover" /> : <div className="flex h-10 w-14 items-center justify-center rounded bg-[#111111] text-[10px] text-white">VIDEO</div>}<span className="truncate text-sm text-[#111111]">{asset.name}</span></button>)}{!assets.length ? <div className="py-2 text-xs text-[#666666]">No registered {type} assets yet.</div> : null}</div>}</div>;
}
