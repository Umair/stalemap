// chart-export 2.4.1 (vendored copy, do not edit)

async function rasterizeInBrowser(svg, width, height) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function rasterizeInNode(svg, width, height) {
  // Optional peer dependency: only needed to export PNGs on the server.
  const { createCanvas, loadImage } = await import("canvas");
  const canvas = createCanvas(width, height);
  const img = await loadImage(Buffer.from(svg));
  canvas.getContext("2d").drawImage(img, 0, 0);
  return new Blob([canvas.toBuffer("image/png")], { type: "image/png" });
}

function size(svg) {
  const w = /width="(\d+)"/.exec(svg);
  const h = /height="(\d+)"/.exec(svg);
  return [w ? Number(w[1]) : 300, h ? Number(h[1]) : 150];
}

export async function exportChart(svg, format = "svg") {
  if (format === "svg") return new Blob([svg], { type: "image/svg+xml" });
  const [width, height] = size(svg);
  return typeof window === "undefined" ? rasterizeInNode(svg, width, height) : rasterizeInBrowser(svg, width, height);
}
