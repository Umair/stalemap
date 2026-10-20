// Chart types the dashboard can draw, keyed by the name shown in the "Add chart" menu.
// Each entry is a constructor (the dashboard does `new charts[name](series)`).

const BAR = "▁▂▃▄▅▆▇█";

class Chart {
  constructor(kind, series) {
    this.kind = kind;
    this.series = series;
  }
}

export const charts = {
  "Bar Chart": class extends Chart {
    constructor(series) {
      super("bar", series);
    }
    render() {
      return this.series.map((p) => `${p.label.padEnd(6)} ${"#".repeat(p.value)}`).join("\n");
    }
  },
  "Sparkline": class extends Chart {
    constructor(series) {
      super("sparkline", series);
    }
    render() {
      const max = Math.max(...this.series.map((p) => p.value), 1);
      return this.series.map((p) => BAR[Math.round((p.value / max) * (BAR.length - 1))]).join("");
    }
  },
  "Table": class extends Chart {
    constructor(series) {
      super("table", series);
    }
    render() {
      return this.series.map((p) => `${p.label}\t${p.value}`).join("\n");
    }
  },
};

export const menu = {
  "names"() {
    return Object.keys(charts);
  },
  "create"(name, series) {
    const ChartType = charts[name];
    if (!ChartType) throw new Error(`Unknown chart type: ${name}`);
    return new ChartType(series);
  },
};
