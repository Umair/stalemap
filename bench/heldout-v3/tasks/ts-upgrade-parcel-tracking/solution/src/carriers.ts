namespace Tracking {
  export interface Carrier {
    name: string;
    trackingUrl: string;
  }

  export const carriers: Record<string, Carrier> = {
    ups: { name: "UPS", trackingUrl: "https://www.ups.com/track?tracknum={id}" },
    dhl: { name: "DHL", trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB={id}" },
    usps: { name: "USPS", trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels={id}" },
  };

  export function carrierName(pkg: Package): string {
    const carrier = carriers[pkg.carrier];
    return carrier ? carrier.name : pkg.carrier.toUpperCase();
  }

  export function trackingLink(pkg: Package): string | undefined {
    const carrier = carriers[pkg.carrier];
    return carrier && carrier.trackingUrl.replace("{id}", encodeURIComponent(pkg.id));
  }
}
