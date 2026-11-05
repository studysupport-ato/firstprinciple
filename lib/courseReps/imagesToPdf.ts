"use client";

/**
 * Turns photos of handwritten pages into one PDF, in the browser.
 * Each photo is shrunk, brightened a little and saved as JPEG, then the JPEGs
 * are wrapped in a minimal PDF (one page per photo, page shaped like the photo).
 */

const MAX_SIDE = 1700;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function toJpeg(file: File): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn’t prepare the photos.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  // Lift paper to white and darken ink a touch (ignored where the browser lacks canvas filters).
  ctx.filter = "brightness(1.08) contrast(1.15)";
  ctx.drawImage(img, 0, 0, width, height);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("A photo couldn’t be read. Try another one.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
}

export async function imagesToPdf(files: File[], name: string, onPage?: (done: number, total: number) => void): Promise<File> {
  if (!files.length) throw new Error("Add at least one page.");
  const pages: Array<{ bytes: Uint8Array; width: number; height: number }> = [];
  for (let i = 0; i < files.length; i++) {
    pages.push(await toJpeg(files[i]));
    onPage?.(i + 1, files.length);
  }

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: () => void) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const pageIds = pages.map((_, i) => 3 + i * 3);
  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`));
  pages.forEach((p, i) => {
    const pageId = 3 + i * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const w = 595;
    const h = Math.round((595 * p.height) / p.width);
    object(pageId, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    object(imageId, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
      push(p.bytes);
      push("\nendstream");
    });
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
    object(contentId, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  });
  const count = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const safe = name.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) || "Handwritten notes";
  return new File(chunks as BlobPart[], `${safe}.pdf`, { type: "application/pdf" });
}
