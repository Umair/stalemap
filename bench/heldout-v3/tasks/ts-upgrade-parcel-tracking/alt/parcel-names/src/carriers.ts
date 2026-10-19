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

  export function carrierName(parcel: Package): string {
    const carrier = carriers[parcel.carrier];
    return carrier ? carrier.name : parcel.carrier.toUpperCase();
  }

  export function trackingLink(parcel: Package): string | undefined {
    const carrier = carriers[parcel.carrier];
    return carrier && carrier.trackingUrl.replace("{id}", encodeURIComponent(parcel.id));
  }
}
