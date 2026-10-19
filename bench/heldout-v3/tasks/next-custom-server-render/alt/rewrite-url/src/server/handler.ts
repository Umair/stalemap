import type { IncomingMessage, ServerResponse } from "node:http";
import type next from "next";

export type NextApp = ReturnType<typeof next>;

export interface HandlerOptions {
  /** When true, visitors see the maintenance page instead of the site. */
  maintenance: boolean;
}

const isAsset = (url: string) => url.startsWith("/_next/");

export function createHandler(app: NextApp, { maintenance }: HandlerOptions) {
  const handle = app.getRequestHandler();
  return (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (maintenance && !isAsset(req.url ?? "/")) {
      res.setHeader("Retry-After", "600");
      req.url = "/maintenance";
    }
    return handle(req, res);
  };
}
