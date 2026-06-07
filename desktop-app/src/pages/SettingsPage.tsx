import SettingsView from "../components/SettingsView";
import { useTransferContext } from "../contexts/TransferContext";

interface SettingsPageProps {
  themeSetting: "system" | "light" | "dark";
  onThemeChange: (setting: "system" | "light" | "dark") => Promise<void>;
}

export default function SettingsPage({ themeSetting, onThemeChange }: SettingsPageProps) {
  const { handleClearAllHistory } = useTransferContext();

  return (
    <SettingsView
      themeSetting={themeSetting}
      onThemeChange={onThemeChange}
      onClearHistory={handleClearAllHistory}
    />
  );
}
