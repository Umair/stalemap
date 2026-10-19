"use client";

import { exportChart } from "../../vendor/chart-export/index.js";

export function ExportButton({ svg }: { svg: string }) {
  async function download() {
    const blob = await exportChart(svg, "png");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chart.png";
    a.click();
    URL.revokeObjectURL(url);
  }
  return <button onClick={download}>Export PNG</button>;
}
