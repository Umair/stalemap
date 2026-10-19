/** JSON, or JSONC (comments, trailing commas). `lossy`: writing it back as JSON would drop something. */
export function parseJsonc(text: string): { value: any; lossy: boolean } | undefined {
  try {
    return { value: JSON.parse(text), lossy: false };
  } catch {
    // fall through to JSONC
  }
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      const start = i;
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === "\\") i++;
      out += text.slice(start, i + 1);
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 1;
    } else out += c;
  }
  try {
    return { value: JSON.parse(out.replace(/,(\s*[}\]])/g, "$1")), lossy: true };
  } catch {
    return undefined;
  }
}
