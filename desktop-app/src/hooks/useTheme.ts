import { useState, useEffect } from "react";
import { getBackendBaseUrl } from "../lib/backend";

export function useTheme(backendOk: boolean | null) {
  const [themeSetting, setThemeSetting] = useState<"system" | "light" | "dark">("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (backendOk !== true) return;
    const fetchSettings = async () => {
      try {
        const base = getBackendBaseUrl().replace(/\/$/, "");
        const res = await fetch(`${base}/v1/settings`);
        if (res.ok) {
          const settings = (await res.json()) as Record<string, string>;
          if (settings.theme === "dark" || settings.theme === "light" || settings.theme === "system") {
            setThemeSetting(settings.theme as "system" | "light" | "dark");
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    void fetchSettings();
  }, [backendOk]);

  useEffect(() => {
    if (themeSetting === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDark(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setIsDark(themeSetting === "dark");
    }
  }, [themeSetting]);

  const changeThemeSetting = async (setting: "system" | "light" | "dark") => {
    setThemeSetting(setting);

    if (backendOk !== true) return;
    try {
      const base = getBackendBaseUrl().replace(/\/$/, "");
      await fetch(`${base}/v1/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: setting }),
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  return {
    isDark,
    themeSetting,
    setThemeSetting: changeThemeSetting,
  };
}
