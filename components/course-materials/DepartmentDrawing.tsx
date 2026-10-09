import type { CSSProperties, ReactNode } from "react";

// Line drawings shown faintly behind each department tile on the Course Materials page.
// Drawn on a 160 × 100 grid with currentColor strokes so the tile decides the colour.

type DrawingKey =
  | "elec" | "mech" | "petro" | "geomatic" | "marine" | "civil" | "metal" | "bio" | "aero"
  | "indus" | "geo" | "comp" | "agri" | "chem" | "auto" | "tele" | "mat" | "petchem";

const MATCHERS: Array<[RegExp, DrawingKey]> = [
  [/petrochem/i, "petchem"],
  [/petroleum|oil|gas/i, "petro"],
  [/electric|electronic/i, "elec"],
  [/telecom/i, "tele"],
  [/computer|software|information/i, "comp"],
  [/mechanical/i, "mech"],
  [/geomatic|survey/i, "geomatic"],
  [/marine|naval/i, "marine"],
  [/civil/i, "civil"],
  [/metallurg|mining/i, "metal"],
  [/biomedical|medical/i, "bio"],
  [/aerospace|aeronaut/i, "aero"],
  [/industrial/i, "indus"],
  [/geolog/i, "geo"],
  [/agric/i, "agri"],
  [/chemical/i, "chem"],
  [/automobile|automotive/i, "auto"],
  [/material/i, "mat"],
];

export function drawingFor(name: string): DrawingKey {
  for (const [pattern, key] of MATCHERS) if (pattern.test(name)) return key;
  return "mech"; // generic engineering drawing for any department we have no picture for
}

function gear(cx: number, cy: number, r: number, teeth: number, depth: number) {
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const start = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    for (const [fraction, radius] of [[0, r], [0.18, r + depth], [0.42, r + depth], [0.6, r]] as const) {
      const angle = start + fraction * step;
      points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`);
    }
  }
  return `M${points.join("L")}Z`;
}

const BIG_GEAR = gear(58, 54, 30, 16, 5);
const SMALL_GEAR = gear(111, 34, 17, 10, 4);
const thin = { strokeWidth: 0.6 };

const DRAWINGS: Record<DrawingKey, ReactNode> = {
  elec: (
    <>
      <path d="M20 30H66M90 30H140V50M140 60V80H102M82 80H20V63M20 47V30" />
      <path d="M66 30l3-6 4 12 4-12 4 12 4-12 3 6" />
      <path d="M132 50h16M132 60h16" />
      <path d="M86 72v16M98 75v10M82 80h4M98 80h4" />
      <circle cx="20" cy="55" r="8" /><path d="M14.5 49.5l11 11M25.5 49.5l-11 11" />
      <path d="M40 80v-14l6 -6M40 60l8-3-3 8" />
      <circle cx="20" cy="30" r="1.6" fill="currentColor" /><circle cx="140" cy="80" r="1.6" fill="currentColor" /><circle cx="40" cy="80" r="1.6" fill="currentColor" />
      <path d="M112 8l-10 16h8l-4 14 14-20h-8l6-10z" />
      <path d="M70 46h28v18H70z" /><path d="M70 52h-6M70 58h-6M98 52h6M98 58h6" /><path d="M78 46v18M90 46v18" strokeDasharray="1 2" />
    </>
  ),
  mech: (
    <>
      <path d={BIG_GEAR} /><circle cx="58" cy="54" r="22" /><circle cx="58" cy="54" r="7" />
      <circle cx="58" cy="40" r="3" /><circle cx="72" cy="54" r="3" /><circle cx="58" cy="68" r="3" /><circle cx="44" cy="54" r="3" />
      <path d={SMALL_GEAR} /><circle cx="111" cy="34" r="11" /><circle cx="111" cy="34" r="4" />
      <path d="M58 54L111 34" strokeDasharray="3 3" />
      <path d="M20 54h76M58 16v76M111 12v44M89 34h44" strokeDasharray="6 2 1 2" {...thin} />
      <path d="M118 66h30v22h-30zM124 66v-6h18v6M148 72h6v10h-6" />
    </>
  ),
  petro: (
    <>
      <path d="M8 92H152" />
      <path d="M62 92L76 40L90 92M67 72h18M70 60h12" />
      <path d="M30 34L126 46M30 39L124 51" />
      <path d="M30 34c-14 2-16 12-14 24l5-1c-1-8 2-14 9-18" />
      <path d="M18 57V86" /><path d="M10 86h16v6H10zM13 80h10v6H13z" />
      <circle cx="76" cy="40" r="2.4" />
      <path d="M124 51l-4 18" /><circle cx="118" cy="74" r="12" /><circle cx="118" cy="74" r="2" /><path d="M118 74l-4 -6" />
      <path d="M104 86h28v6h-28zM134 80h16v12h-16z" />
      <path d="M100 60c4 0 6 4 6 8" strokeDasharray="2 2" />
    </>
  ),
  geomatic: (
    <>
      <path d="M70 18h26v20H70z" /><path d="M58 24h50v8H58z" /><circle cx="83" cy="44" r="6" /><path d="M83 38v-3M77 44h-3M89 44h3" />
      <path d="M83 50L58 94M83 50l25 44M83 50v44M64 82h38" />
      <path d="M8 70c8-16 34-16 40 0s-32 16-40 0z" /><path d="M16 70c5-9 20-9 24 0s-19 9-24 0z" /><path d="M24 70c2-4 8-4 9 0s-7 4-9 0z" />
      <path d="M126 20l14 24h-28z" /><path d="M126 20v-8M126 44v6" strokeDasharray="2 2" />
      <path d="M108 28L148 8" strokeDasharray="3 3" /><path d="M120 62h30M135 48v28" {...thin} /><circle cx="135" cy="62" r="6" />
    </>
  ),
  marine: (
    <>
      <path d="M10 60h128l-12 22H26z" /><path d="M20 82l-6 -10" />
      <path d="M30 60V48h14v12M46 60V48h14v12M62 60V48h14v12M30 48V36h14v12M46 48V36h14v12" />
      <path d="M96 60V30h22v30M100 30v-8h14v8M104 36h6M104 42h6M104 48h6" /><path d="M110 22V12h4v10" />
      <path d="M120 82c4 0 6-3 6-6s-2-6-6-6" strokeDasharray="1 2" />
      <path d="M4 92c6 0 6-3 12-3s6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3 6 3 12 3" />
      <circle cx="146" cy="20" r="3" /><path d="M146 23v18M140 30h12M136 36c2 6 18 6 20 0" />
    </>
  ),
  civil: (
    <>
      <path d="M4 66H156M4 70H156" />
      <path d="M42 92V14M48 92V14M112 92V14M118 92V14M42 14h6M112 14h6M42 30h6M112 30h6" />
      <path d="M4 60C20 58 36 40 45 16M45 16C60 50 100 50 115 16M115 16C124 40 140 58 156 60" />
      <path d="M56 66V34M66 66V42M76 66V46M84 66V46M94 66V42M104 66V34M28 66V44M18 66V54M132 66V44M142 66V54" />
      <path d="M38 92h14M108 92h14" />
      <path d="M4 82c10 0 10 3 20 3s10-3 20-3M116 82c10 0 10 3 20 3s10-3 20-3" strokeDasharray="2 2" />
    </>
  ),
  metal: (
    <>
      <path d="M30 18l36 10-6 30-34-6z" /><path d="M30 18l-6 4M66 28l4 2" /><path d="M48 23v-14h20v18" strokeWidth={0.8} />
      <path d="M60 58c6 6 10 12 12 22" /><path d="M63 60c4 6 7 12 8 20" strokeDasharray="1.5 1.5" />
      <path d="M58 82h40v10H58zM62 82v-4h32v4" />
      <path d="M104 92h48v-10h-48zM108 82l4-8h32l4 8" /><path d="M104 72h48v-10h-48zM108 62l4-8h32l4 8" />
      <path d="M80 70l3-5M86 72l5-3M76 64l-1-6M90 66l4-6" />
      <path d="M12 92V40h10v52M10 40h14M14 46h6M14 54h6M14 62h6" />
    </>
  ),
  bio: (
    <>
      <path d="M14 10c24 12 24 28 0 40s-24 28 0 40M38 10c-24 12-24 28 0 40s24 28 0 40" />
      <path d="M19 15h14M24 22h4M19 35h14M24 30h4M19 65h14M24 72h4M19 85h14M24 58h4" />
      <path d="M58 22h92v56H58z" /><path d="M58 70h92" {...thin} />
      <path d="M62 48h18l4-8 6 22 6-30 6 24 4-8h14l4-6 4 6h18" />
      <circle cx="66" cy="74" r="1.6" /><circle cx="74" cy="74" r="1.6" /><path d="M124 74h20" />
      <path d="M100 78v10M86 92h28" />
    </>
  ),
  aero: (
    <>
      <ellipse cx="80" cy="56" rx="72" ry="26" strokeDasharray="3 3" />
      <circle cx="80" cy="56" r="14" /><path d="M66 56c8 4 20 4 28 0M70 47c6 2 14 2 20 0" />
      <path d="M120 14c10 6 16 16 18 28l-8 6-14-20z" />
      <path d="M116 28l-24 22 8 6 22-22" /><path d="M96 46l-8-2-4 4 10 2M104 54l2 8-4 4-2-10" />
      <path d="M92 50c-6 4-10 10-12 16 6-2 12-6 16-12" />
      <circle cx="128" cy="30" r="3" />
      <circle cx="18" cy="18" r="1.4" fill="currentColor" /><circle cx="40" cy="88" r="1.2" fill="currentColor" /><circle cx="148" cy="86" r="1.4" fill="currentColor" />
    </>
  ),
  indus: (
    <>
      <path d="M6 78h120M6 86h120" /><circle cx="14" cy="82" r="4" /><circle cx="118" cy="82" r="4" /><path d="M30 82h2M50 82h2M70 82h2M90 82h2" />
      <path d="M20 78v-10h16v10M58 78v-10h16v10M96 78v-10h16v10" />
      <path d="M136 92h20v-6h-20zM146 86V72" /><circle cx="146" cy="70" r="4" />
      <path d="M146 70L124 44" /><circle cx="122" cy="42" r="3.5" /><path d="M122 42L94 46" />
      <path d="M94 46l-6 -4M94 46l-6 4M88 42v8" />
      <path d="M74 40V18M74 18h20M84 18v-8M4 40V22l14-8v8l14-8v8l14-8v26" strokeWidth={0.8} />
    </>
  ),
  geo: (
    <>
      <path d="M4 40L30 14l18 16 14-12 22 22 20-18 26 18H4z" />
      <path d="M4 40h126v52H4z" />
      <path d="M4 52c20 4 30-4 54 0s30 6 50 0 18-2 22 0" />
      <path d="M4 64c22-4 34 4 56 0s30-6 46 0 20 4 24 2" />
      <path d="M4 78c18 4 34-2 50 0s32 4 52-2 20 0 24 2" />
      <path d="M78 40l-20 52" strokeWidth={1.6} />
      <path d="M140 18l14 14M150 14l-14 14-4 -4 14-14z" /><path d="M140 26l-6 30" />
      <circle cx="24" cy="70" r="1.5" /><circle cx="96" cy="58" r="1.5" /><circle cx="110" cy="84" r="1.5" />
    </>
  ),
  comp: (
    <>
      <path d="M56 26h48v48H56z" /><path d="M66 36h28v28H66z" /><path d="M66 36l28 28M94 36L66 64" strokeWidth={0.5} />
      <path d="M62 26v-8M70 26v-8M78 26v-8M86 26v-8M94 26v-8M62 74v8M70 74v8M78 74v8M86 74v8M94 74v8M56 32h-8M56 40h-8M56 48h-8M56 56h-8M56 64h-8M104 32h8M104 40h8M104 48h8M104 56h8M104 64h8" />
      <path d="M48 40H30V20H12M48 56H34v22H16M112 40h16V18h20M112 56h22v24h14M78 82v10H40M86 18V8h40" />
      <circle cx="12" cy="20" r="2.5" /><circle cx="16" cy="78" r="2.5" /><circle cx="148" cy="18" r="2.5" /><circle cx="148" cy="80" r="2.5" /><circle cx="40" cy="92" r="2.5" /><circle cx="126" cy="8" r="2.5" />
    </>
  ),
  agri: (
    <>
      <circle cx="46" cy="70" r="22" /><circle cx="46" cy="70" r="14" /><circle cx="46" cy="70" r="4" />
      <path d="M46 48v8M46 84v8M24 70h8M60 70h8M30 54l6 6M56 80l6 6M30 86l6-6M56 60l6-6" />
      <circle cx="118" cy="80" r="12" /><circle cx="118" cy="80" r="4" />
      <path d="M24 58V36h30l8 22M34 36V18h22v18M38 22h14v10H38z" />
      <path d="M62 58h64l4 10h-6M68 48h50v10M100 48V38M98 38h4" />
      <path d="M130 68h10l12 12h-6" />
      <path d="M4 96h152" strokeDasharray="4 3" />
    </>
  ),
  chem: (
    <>
      <circle cx="34" cy="62" r="16" /><path d="M30 46V30h8v16" /><path d="M20 66h28" strokeDasharray="2 2" />
      <path d="M34 30V22h6" />
      <path d="M40 24L120 50M44 20l80 26" /><path d="M60 26l2-8M100 40l2-8M66 34l-2 8M106 48l-2 8" />
      <path d="M120 50v18M114 68h16l-2 24h-12z" /><path d="M116 80h12" strokeDasharray="2 2" />
      <path d="M18 78v14h32V78M14 92h40" /><path d="M26 84c2-4 4-4 6 0s4 4 6 0" />
      <path d="M8 18v74M4 92h8" /><path d="M8 40h22" />
    </>
  ),
  auto: (
    <>
      <path d="M8 70v-12l14-6 18-20h52l22 20 30 6v12h-10" />
      <path d="M46 34l-12 18h40V34zM80 34v18h32l-18-18z" />
      <path d="M54 70h52" />
      <circle cx="38" cy="70" r="13" /><circle cx="38" cy="70" r="6" /><path d="M38 57v26M25 70h26M29 61l18 18M47 61l-18 18" strokeWidth={0.5} />
      <circle cx="122" cy="70" r="13" /><circle cx="122" cy="70" r="6" /><path d="M122 57v26M109 70h26M113 61l18 18M131 61l-18 18" strokeWidth={0.5} />
      <path d="M144 60h6M8 62h6M78 58h8" /><path d="M4 90h152" strokeDasharray="4 3" />
    </>
  ),
  tele: (
    <>
      <path d="M70 96L80 20L90 96M72 82h16M74 66h12M76 50h8M78 36h4M72 82l12-16M74 66l10-16M76 50l6-14" />
      <path d="M80 20v-8" /><circle cx="80" cy="10" r="2" />
      <path d="M86 42c6-2 10 2 10 8l-8 2z" /><path d="M74 58c-6-2-10 2-10 8l8 2z" />
      <path d="M96 8a22 22 0 0 1 0 30M104 2a32 32 0 0 1 0 42M64 8a22 22 0 0 0 0 30M56 2a32 32 0 0 0 0 42" />
      <path d="M128 20h10v8h-10zM120 22h8M138 24h10M118 18h-6v12h6M148 18h6v12h-6" />
      <path d="M128 28l-20 20" strokeDasharray="2 3" />
    </>
  ),
  mat: (
    <>
      <path d="M50 30h44v44H50z" /><path d="M72 14h44v44H72z" /><path d="M50 30l22-16M94 30l22-16M94 74l22-16M50 74l22-16" />
      <path d="M50 52h44M72 30v44M61 22h44M83 22v44" strokeWidth={0.5} />
      <circle cx="50" cy="30" r="3.4" /><circle cx="94" cy="30" r="3.4" /><circle cx="94" cy="74" r="3.4" /><circle cx="50" cy="74" r="3.4" />
      <circle cx="72" cy="14" r="3.4" /><circle cx="116" cy="14" r="3.4" /><circle cx="116" cy="58" r="3.4" /><circle cx="72" cy="58" r="3.4" />
      <circle cx="83" cy="44" r="4.6" />
      <path d="M128 70h24M128 80h24M128 90h24M134 70v20M146 70v20" strokeWidth={0.7} />
      <path d="M10 84l14-24 14 24z" /><path d="M17 72h14" {...thin} />
    </>
  ),
  petchem: (
    <>
      <path d="M30 94V18h16v76M28 18h20M30 30h16M30 42h16M30 54h16M30 66h16M30 78h16" />
      <path d="M62 94V34h12v60M60 34h16M62 50h12M62 66h12" />
      <path d="M46 24h8v-10h40v26M74 44h20v6" />
      <path d="M92 94V60c0-6 4-10 14-10s14 4 14 10v34z" /><path d="M126 94V70c0-4 4-8 12-8s12 4 12 8v24z" />
      <path d="M4 94h152" /><path d="M120 76h6M46 86h16" />
      <path d="M100 18c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" />
      <circle cx="124" cy="22" r="2.5" /><circle cx="136" cy="14" r="2.5" /><circle cx="144" cy="26" r="2.5" /><path d="M126 21l8-5M138 16l5 8" />
    </>
  ),
};

export function DepartmentDrawing({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 160 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={style}
    >
      {DRAWINGS[drawingFor(name)]}
    </svg>
  );
}
