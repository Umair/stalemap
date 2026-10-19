import { ExportButton } from "../components/ExportButton";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="120" height="80" fill="#4f46e5"/></svg>`;

export default function Dashboard() {
  return (
    <main>
      <h1>Weekly signups</h1>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <ExportButton svg={svg} />
    </main>
  );
}
