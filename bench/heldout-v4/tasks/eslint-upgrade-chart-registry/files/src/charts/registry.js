// Chart types the dashboard can draw, keyed by the name shown in the "Add chart" menu.
// Each entry is a constructor (the dashboard does `new charts[name](series)`), so it can't be a shorthand method.

const BAR = "▁▂▃▄▅▆▇█";

export const charts = {
  // eslint-disable-next-line object-shorthand -- constructor
  "Bar Chart": function (series) {
    this.kind = "bar";
    this.series = series;
  },
  // eslint-disable-next-line object-shorthand -- constructor
  "Sparkline": function (series) {
    this.kind = "sparkline";
    this.series = series;
  },
  // eslint-disable-next-line object-shorthand -- constructor
  "Table": function (series) {
    this.kind = "table";
    this.series = series;
  },
};

charts["Bar Chart"].prototype.render = function () {
  return this.series.map((p) => `${p.label.padEnd(6)} ${"#".repeat(p.value)}`).join("\n");
};

charts["Sparkline"].prototype.render = function () {
  const max = Math.max(...this.series.map((p) => p.value), 1);
  return this.series.map((p) => BAR[Math.round((p.value / max) * (BAR.length - 1))]).join("");
};

charts["Table"].prototype.render = function () {
  return this.series.map((p) => `${p.label}\t${p.value}`).join("\n");
};

export const menu = {
  "names"() {
    return Object.keys(charts);
  },
  "create"(name, series) {
    const Chart = charts[name];
    if (!Chart) throw new Error(`Unknown chart type: ${name}`);
    return new Chart(series);
  },
};
