namespace Tracking {
  function row(parcel: Package): string {
    const link = trackingLink(parcel);
    const id = link ? `<a href="${link}">${parcel.id}</a>` : parcel.id;
    return `<li data-status="${currentStatus(parcel)}">${carrierName(parcel)} ${id}: ${describe(parcel)} (${formatWeight(parcel.weightGrams)})</li>`;
  }

  export function mount(list: HTMLElement | null, summary: HTMLElement | null, packages: Package[]): void {
    if (list) list.innerHTML = packages.map(row).join("");
    if (summary) summary.textContent = summarize(packages);
  }
}
