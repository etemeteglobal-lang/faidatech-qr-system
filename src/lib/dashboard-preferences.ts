export type ThemePreference = "system" | "light" | "dark";
export type QrFramePreference = "none" | "square" | "rounded" | "badge" | "circle" | "brand";
export type QrModulePreference = "square" | "round" | "circle" | "diamond" | "heart" | "line";
export type QrLogoPlacementPreference = "none" | "center" | "above";
export type QrExportFormatPreference = "png" | "svg";

export type DashboardPreferences = {
  theme: ThemePreference;
  qr: {
    pageBackground: string;
    moduleColor: string;
    eyeColor: string;
    frame: QrFramePreference;
    modules: QrModulePreference;
    logoPlacement: QrLogoPlacementPreference;
    exportFormat: QrExportFormatPreference;
  };
};

export const DASHBOARD_PREFERENCES_KEY = "faidatech.dashboard.preferences.v1";
export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  theme: "system",
  qr: {
    pageBackground: "#FFFFFF",
    moduleColor: "#0F172A",
    eyeColor: "#0F172A",
    frame: "rounded",
    modules: "square",
    logoPlacement: "center",
    exportFormat: "png",
  },
};

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

export function readDashboardPreferences(): DashboardPreferences {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_PREFERENCES;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return DEFAULT_DASHBOARD_PREFERENCES;
    const value = parsed as Partial<DashboardPreferences>;
    const qr = value.qr && typeof value.qr === "object" ? value.qr : DEFAULT_DASHBOARD_PREFERENCES.qr;
    return {
      theme: isOneOf(value.theme, ["system", "light", "dark"])
        ? value.theme
        : DEFAULT_DASHBOARD_PREFERENCES.theme,
      qr: {
        pageBackground: safeColor(qr.pageBackground, DEFAULT_DASHBOARD_PREFERENCES.qr.pageBackground),
        moduleColor: safeColor(qr.moduleColor, DEFAULT_DASHBOARD_PREFERENCES.qr.moduleColor),
        eyeColor: safeColor(qr.eyeColor, DEFAULT_DASHBOARD_PREFERENCES.qr.eyeColor),
        frame: isOneOf(qr.frame, ["none", "square", "rounded", "badge", "circle", "brand"])
          ? qr.frame
          : DEFAULT_DASHBOARD_PREFERENCES.qr.frame,
        modules: isOneOf(qr.modules, ["square", "round", "circle", "diamond", "heart", "line"])
          ? qr.modules
          : DEFAULT_DASHBOARD_PREFERENCES.qr.modules,
        logoPlacement: isOneOf(qr.logoPlacement, ["none", "center", "above"])
          ? qr.logoPlacement
          : DEFAULT_DASHBOARD_PREFERENCES.qr.logoPlacement,
        exportFormat: isOneOf(qr.exportFormat, ["png", "svg"])
          ? qr.exportFormat
          : DEFAULT_DASHBOARD_PREFERENCES.qr.exportFormat,
      },
    };
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }
}

export function writeDashboardPreferences(preferences: DashboardPreferences): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(preferences));
    window.dispatchEvent(new Event("faidatech:dashboard-preferences-changed"));
    return true;
  } catch {
    return false;
  }
}

export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === "undefined") return;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.themePreference = theme;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
