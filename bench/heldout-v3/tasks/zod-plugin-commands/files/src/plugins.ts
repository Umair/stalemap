import { z } from "zod";

export const PluginRegistration = z.object({
  name: z.string().min(1),
  /** Resolves to the plugin's command names once it has loaded. */
  commands: z.promise(z.array(z.string().min(1))),
});

/** Validate every registration and map each plugin's name to its command names. */
export async function listCommands(registrations: unknown[]): Promise<Record<string, string[]>> {
  throw new Error("not implemented");
}
