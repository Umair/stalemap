import type { IncomingMessage, ServerResponse } from "node:http";
import { parse } from "node:url";
import type next from "next";

export type NextApp = ReturnType<typeof next>;

export interface HandlerOptions {
  /** When true, visitors see the maintenance page instead of the site. */
  maintenance: boolean;
}

export function createHandler(app: NextApp, options: HandlerOptions) {
  const handle = app.getRequestHandler();
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const parsedUrl = parse(req.url ?? "/", true);
    if (options.maintenance && !parsedUrl.pathname?.startsWith("/_next/")) {
      // Render the maintenance page at the requested URL.
      await handle(req, res, { ...parsedUrl, pathname: "/maintenance" });
      return;
    }
    await handle(req, res, parsedUrl);
  };
}
