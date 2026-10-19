namespace Tracking {
  export type Status = "label_created" | "in_transit" | "out_for_delivery" | "delivered" | "exception";

  export interface TrackingEvent {
    at: string;
    status: Status;
    location: string;
  }

  export interface Package {
    id: string;
    carrier: string;
    weightGrams: number;
    events: TrackingEvent[];
  }

  const labels: Record<Status, string> = {
    label_created: "Label created",
    in_transit: "In transit",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    exception: "Delivery problem",
  };

  function lastEvent(pkg: Package): TrackingEvent | undefined {
    return pkg.events[pkg.events.length - 1];
  }

  export function currentStatus(pkg: Package): Status {
    const last = lastEvent(pkg);
    return last ? last.status : "label_created";
  }

  export function describe(pkg: Package): string {
    const last = lastEvent(pkg);
    const label = labels[currentStatus(pkg)];
    return last ? `${label} · ${last.location}` : label;
  }

  export function formatWeight(grams: number): string {
    return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
  }

  export function summarize(packages: Package[]): string {
    let delivered = 0;
    let problems = 0;
    for (const pkg of packages) {
      const status = currentStatus(pkg);
      if (status === "delivered") delivered++;
      else if (status === "exception") problems++;
    }
    const summary = `${delivered} of ${packages.length} delivered`;
    return problems ? `${summary}, ${problems} with a problem` : summary;
  }
}
