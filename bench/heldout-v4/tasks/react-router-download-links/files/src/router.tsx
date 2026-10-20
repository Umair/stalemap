import { createBrowserRouter, Link, useParams } from "react-router";
import { RELEASE, RELEASE_ASSET, RELEASES, releasePath } from "./routes";
import { downloadUrl } from "./links";

const versions = ["3.0.0", "2.1.0+build.7", "2.0.4"];

function ReleaseList() {
  return (
    <ul>
      {versions.map((v) => (
        <li key={v}>
          <Link to={releasePath(v)}>{v}</Link>
        </li>
      ))}
    </ul>
  );
}

function Release() {
  const { version = "" } = useParams();
  const file = `acme-${version}-macos.zip`;
  return (
    <main>
      <h1>Acme {version}</h1>
      <a href={downloadUrl(version, file)}>Download {file}</a>
    </main>
  );
}

function ReleaseAsset() {
  const { version = "", asset = "" } = useParams();
  return <a href={downloadUrl(version, asset)}>{asset}</a>;
}

export const router = createBrowserRouter([
  { path: RELEASES, element: <ReleaseList /> },
  { path: RELEASE, element: <Release /> },
  { path: RELEASE_ASSET, element: <ReleaseAsset /> },
]);
