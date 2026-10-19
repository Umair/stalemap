export type ChartFormat = "svg" | "png";
export declare function exportChart(svg: string, format?: ChartFormat): Promise<Blob>;
