const GSM_7_BASIC = new Set(
  Array.from("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"),
);
const GSM_7_EXTENSION = new Set(Array.from("\f^{}\\[~]|€"));

export type SmsSegmentEstimate = {
  encoding: "GSM-7" | "Unicode (UCS-2)";
  characters: number;
  segments: number;
  charactersPerSegment: number;
  singleMessageLimit: number;
  estimated: true;
};

export function estimateSmsSegments(message: string): SmsSegmentEstimate {
  let gsmSeptets = 0;
  let gsm7 = true;
  for (const character of message) {
    if (GSM_7_BASIC.has(character)) gsmSeptets += 1;
    else if (GSM_7_EXTENSION.has(character)) gsmSeptets += 2;
    else {
      gsm7 = false;
      break;
    }
  }

  if (gsm7) {
    const singleMessageLimit = 160;
    const charactersPerSegment = 153;
    return {
      encoding: "GSM-7",
      characters: gsmSeptets,
      segments: gsmSeptets === 0 ? 0 : gsmSeptets <= singleMessageLimit ? 1 : Math.ceil(gsmSeptets / charactersPerSegment),
      charactersPerSegment,
      singleMessageLimit,
      estimated: true,
    };
  }

  const characters = [...message].reduce((units, character) => units + (character.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  const singleMessageLimit = 70;
  const charactersPerSegment = 67;
  return {
    encoding: "Unicode (UCS-2)",
    characters,
    segments: characters === 0 ? 0 : characters <= singleMessageLimit ? 1 : Math.ceil(characters / charactersPerSegment),
    charactersPerSegment,
    singleMessageLimit,
    estimated: true,
  };
}
