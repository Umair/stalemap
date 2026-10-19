namespace Tracking {
  function row(pkg: Package): string {
    const link = trackingLink(pkg);
    const id = link ? `<a href="${link}">${pkg.id}</a>` : pkg.id;
    return `<li data-status="${currentStatus(pkg)}">${carrierName(pkg)} ${id}: ${describe(pkg)} (${formatWeight(pkg.weightGrams)})</li>`;
  }

  export function mount(list: HTMLElement | null, summary: HTMLElement | null, packages: Package[]): void {
    if (list) list.innerHTML = packages.map(row).join("");
    if (summary) summary.textContent = summarize(packages);
  }
}
