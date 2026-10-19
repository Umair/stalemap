import defaults from "../config/defaults.json" assert { type: "json" };

export type AppConfig = typeof defaults;

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ...defaults,
    ...overrides,
    features: { ...defaults.features, ...overrides.features },
  };
}
