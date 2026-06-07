import "./styles/index.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import FileDrop from "./components/FileDrop";
import { TransferProvider, useTransferContext } from "./contexts/TransferContext";
import { useTheme } from "./hooks/useTheme";
import { AppTab } from "./types/app";
import TransfersPage from "./pages/TransfersPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

function AppContent() {
  const {
    currentTab,
    setCurrentTab,
    backendOk,
    isSharingActive,
    triggerHighlight,
    handleFilesAdded,
    fileInputRef,
    selectedFiles,
  } = useTransferContext();

  const {
    isDark,
    themeSetting,
    setThemeSetting,
  } = useTheme(backendOk);

  return (
    <div className={`app-container ${isDark ? "dark-theme" : "light-theme"}`}>
      <FileDrop fileInputRef={fileInputRef} onFilesAdded={handleFilesAdded} />

      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <div className="app-body">
        <Header />

        <main className={`main-content ${selectedFiles.length === 0 ? "is-empty" : ""} ${currentTab === AppTab.History ? "wide-layout" : ""}`}>
          <div className={`main-content-inner ${currentTab === AppTab.History ? "wide-layout" : ""}`}>
            <div className="content-heading">
              <div className="main-title-row">
                <h2 className="main-title">
                  {currentTab === AppTab.Transfers && "Transfers"}
                  {currentTab === AppTab.History && "History"}
                  {currentTab === AppTab.Settings && "Settings"}
                </h2>
                {currentTab === AppTab.Transfers && (
                  <div
                    className={`tunnel-status-badge ${isSharingActive ? "active" : "inactive"}`}
                    onClick={triggerHighlight}
                    title={isSharingActive ? "Click to highlight active sharing transfers" : undefined}
                  >
                    <span className={`status-dot ${isSharingActive ? "green" : "gray"}`}></span>
                    <span className="status-label">Sharing</span>
                  </div>
                )}
              </div>
            </div>

            {currentTab === AppTab.Transfers && <TransfersPage />}
            {currentTab === AppTab.History && <HistoryPage />}
            {currentTab === AppTab.Settings && (
              <SettingsPage themeSetting={themeSetting} onThemeChange={setThemeSetting} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TransferProvider>
      <AppContent />
    </TransferProvider>
  );
}
