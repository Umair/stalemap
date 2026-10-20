export function renderGreeting(name: string): HTMLElement {
  const el = document.createElement("h1");
  el.textContent = `Welcome, ${name}`;
  document.getElementById("app")?.append(el);
  return el;
}
