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
    const { pathname, query } = parsedUrl;
    if (options.maintenance && !pathname?.startsWith("/_next/")) {
      await app.render(req, res, "/maintenance", query);
      return;
    }
    await handle(req, res, parsedUrl);
  };
}
