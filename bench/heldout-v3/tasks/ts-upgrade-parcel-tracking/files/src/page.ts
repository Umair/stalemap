namespace Tracking {
  function row(package: Package): string {
    const link = trackingLink(package);
    const id = link ? `<a href="${link}">${package.id}</a>` : package.id;
    return `<li data-status="${currentStatus(package)}">${carrierName(package)} ${id}: ${describe(package)} (${formatWeight(package.weightGrams)})</li>`;
  }

  export function mount(list: HTMLElement | null, summary: HTMLElement | null, packages: Package[]): void {
    if (list) list.innerHTML = packages.map(row).join("");
    if (summary) summary.textContent = summarize(packages);
  }
}
