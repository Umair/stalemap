// Runs queued jobs one at a time. Each job holds its lock while it runs; afterwards the
// "after" listeners run in order, and a listener can return false to skip the rest for that job.

export function createRunner({ locks, listeners = [] }) {
  return {
    async runAll(jobs, handle) {
      const results = [];
      jobs: for (const job of jobs) {
        const lock = locks.acquire(job.id);
        try {
          results.push({ id: job.id, value: await handle(job) });
        } finally {
          lock.release();
          for (const listener of listeners) {
            if (listener(job) === false) continue jobs;
          }
        }
      }
      return results;
    },
  };
}

/** In-memory locks, one holder per id. */
export function createLocks() {
  const held = new Set();
  return {
    held,
    acquire(id) {
      if (held.has(id)) throw new Error(`Job ${id} is already running`);
      held.add(id);
      return { release: () => held.delete(id) };
    },
  };
}
