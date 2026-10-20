/**
 * Power of heldout-v4's primary comparison under its pre-registered analysis (two-level bootstrap, 95% interval
 * must exclude zero), by simulation. Each task has a true pass probability per arm on the logit scale:
 * logit(alone) ~ N(muA, sdA), logit(treated) = logit(alone) + d, d ~ N(muD, sdD). muA and sdA are set so the
 * alone arm passes about 23% of the time with many tasks at the floor or ceiling, as in heldout-v2; muD and sdD are
 * then set so the mean true difference is the target effect and the per-task observed difference (6 runs per arm)
 * has the SD heldout-v2 showed, about 0.28.
 *
 *   npx tsx bench/heldout-v4/sampling/power.ts [effect, default 0.12] [interval level, default 0.95]
 */
let seed = 7;
const LEVEL = Number(process.argv[3] ?? 0.95);
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const normal = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
const expit = (x: number) => 1 / (1 + Math.exp(-x));
const binom = (n: number, p: number) => {
  let k = 0;
  for (let i = 0; i < n; i++) if (rand() < p) k++;
  return k;
};

interface Model { muA: number; sdA: number; muD: number; sdD: number }

/** Mean true effect and SD of the observed per-task difference with `runs` runs per arm. */
function describe(m: Model, runs: number, n = 200_000): { pA: number; effect: number; sdObs: number } {
  let sA = 0, sE = 0;
  const obs: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = m.muA + m.sdA * normal();
    const pa = expit(a), pt = expit(a + m.muD + m.sdD * normal());
    sA += pa;
    sE += pt - pa;
    if (i < 40_000) obs.push(binom(runs, pt) / runs - binom(runs, pa) / runs);
  }
  const mean = obs.reduce((s, x) => s + x, 0) / obs.length;
  const sd = Math.sqrt(obs.reduce((s, x) => s + (x - mean) ** 2, 0) / (obs.length - 1));
  return { pA: sA / n, effect: sE / n, sdObs: sd };
}

/** Fraction of simulated suites in which the two-level bootstrap interval lies above zero. */
function power(m: Model, tasks: number, runs: number, sims = 400, boots = 1000): number {
  let wins = 0;
  for (let s = 0; s < sims; s++) {
    const A: number[] = [], T: number[] = [];
    for (let i = 0; i < tasks; i++) {
      const a = m.muA + m.sdA * normal();
      A.push(binom(runs, expit(a)));
      T.push(binom(runs, expit(a + m.muD + m.sdD * normal())));
    }
    const stats: number[] = [];
    for (let b = 0; b < boots; b++) {
      let sum = 0;
      for (let i = 0; i < tasks; i++) {
        const j = Math.floor(rand() * tasks);
        // Resample the runs within the drawn task, per arm.
        sum += binom(runs, T[j] / runs) / runs - binom(runs, A[j] / runs) / runs;
      }
      stats.push(sum / tasks);
    }
    stats.sort((x, y) => x - y);
    if (stats[Math.floor(((1 - LEVEL) / 2) * boots)] > 0) wins++;
  }
  return wins / sims;
}

// Calibrate: alone near 23%; then search muD, sdD for the target effect with observed SD near 0.28.
const base = { muA: -2.2, sdA: 2.6 };
const target = Number(process.argv[2] ?? 0.12);
let best: Model & { err: number } = { ...base, muD: 0, sdD: 0, err: Infinity };
for (let sdD = 0; sdD <= 3; sdD += 0.25) {
  for (let muD = 0; muD <= 2; muD += 0.05) {
    const d = describe({ ...base, muD, sdD }, 6, 20_000);
    const err = Math.abs(d.effect - target) * 4 + Math.abs(d.sdObs - 0.28);
    if (err < best.err) best = { ...base, muD, sdD, err };
  }
}
const d = describe(best, 6);
process.stdout.write(`model: muA ${best.muA}, sdA ${best.sdA}, muD ${best.muD.toFixed(2)}, sdD ${best.sdD}: alone ${(100 * d.pA).toFixed(0)}%, effect ${(100 * d.effect).toFixed(1)} pts, observed per-task SD ${d.sdObs.toFixed(3)} (6 runs per arm)\n`);
process.stdout.write("| tasks | runs per arm per task | power |\n|---|---|---|\n");
for (const runs of [6, 8]) for (const tasks of [40, 47, 56, 64, 72]) process.stdout.write(`| ${tasks} | ${runs} | ${(100 * power(best, tasks, runs)).toFixed(0)}% |\n`);
