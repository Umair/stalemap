import { generatePath } from "react-router";

/** App routes for the releases section (see src/router.tsx). */
export const RELEASES = "/releases";
export const RELEASE = "/releases/:version";
export const RELEASE_ASSET = "/releases/:version/assets/:asset";

export const releasePath = (version: string) => generatePath(RELEASE, { version });
export const releaseAssetPath = (version: string, asset: string) => generatePath(RELEASE_ASSET, { version, asset });
