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

  function lastEvent(package: Package): TrackingEvent | undefined {
    return package.events[package.events.length - 1];
  }

  export function currentStatus(package: Package): Status {
    const last = lastEvent(package);
    return last ? last.status : "label_created";
  }

  export function describe(package: Package): string {
    const last = lastEvent(package);
    const label = labels[currentStatus(package)];
    return last ? `${label} · ${last.location}` : label;
  }

  export function formatWeight(grams: number): string {
    return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
  }

  export function summarize(packages: Package[]): string {
    let delivered = 0;
    let problems = 0;
    for (const package of packages) {
      const status = currentStatus(package);
      if (status === "delivered") delivered++;
      else if (status === "exception") problems++;
    }
    const summary = `${delivered} of ${packages.length} delivered`;
    return problems ? `${summary}, ${problems} with a problem` : summary;
  }
}
