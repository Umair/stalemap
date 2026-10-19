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

  function lastEvent(parcel: Package): TrackingEvent | undefined {
    return parcel.events[parcel.events.length - 1];
  }

  export function currentStatus(parcel: Package): Status {
    const last = lastEvent(parcel);
    return last ? last.status : "label_created";
  }

  export function describe(parcel: Package): string {
    const last = lastEvent(parcel);
    const label = labels[currentStatus(parcel)];
    return last ? `${label} · ${last.location}` : label;
  }

  export function formatWeight(grams: number): string {
    return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
  }

  export function summarize(packages: Package[]): string {
    let delivered = 0;
    let problems = 0;
    for (const parcel of packages) {
      const status = currentStatus(parcel);
      if (status === "delivered") delivered++;
      else if (status === "exception") problems++;
    }
    const summary = `${delivered} of ${packages.length} delivered`;
    return problems ? `${summary}, ${problems} with a problem` : summary;
  }
}
