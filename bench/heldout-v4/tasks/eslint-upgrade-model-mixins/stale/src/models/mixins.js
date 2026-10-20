// Mixins shared by the model classes, e.g. class Order extends Timestamped(Tracked(Model)) {}.
// Ported from the old prototype-based models; the factories stay bound to the module scope.

let clock = () => Date.now();

/** Lets tests freeze time. */
export function setClock(fn) {
  clock = fn;
}

export class Model {
  constructor(attrs = {}) {
    Object.assign(this, attrs);
  }
}

/** Adds createdAt/updatedAt, set from the clock. */
export const Timestamped = function (Base) {
  return class extends Base {
    createdAt = clock();
    updatedAt = this.createdAt;

    touch() {
      this.updatedAt = clock();
      return this;
    }
  };
}.bind(this);

/** Gives each instance a per-class sequence number and keeps a registry of live instances by id. */
export const Tracked = function (Base) {
  return class extends Base {
    static nextSeq = 1;
    static {
      this.live = new Map();
    }

    seq = this.constructor.nextSeq++;

    track() {
      this.constructor.live.set(this.id, this);
      return this;
    }

    untrack() {
      this.constructor.live.delete(this.id);
      return this;
    }
  };
}.bind(this);
