import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import DropZone from "./Components/DropZone";
import FileCard, { type StatefulFile } from "./Components/FileCard";
import Header from "./Components/Header";
import FileDrop, { type SelectedFile } from "./Components/FileDrop";
import Sidebar from "./Components/Sidebar";
import HistoryView from "./Components/HistoryView";
import DevicesView from "./Components/DevicesView";
import SettingsView from "./Components/SettingsView";
import {
  createShare,
  fetchBackendHealth,
  listShares,
  deleteShare,
  fetchTransfers,
  getBackendBaseUrl,
  clearAllSharesHistory,
  type ShareListItem,
} from "./lib/backend";

function App() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [themeSetting, setThemeSetting] = useState<"system" | "light" | "dark">("system");
  const [isDark, setIsDark] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<StatefulFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("transfers");
  const [tunnelActive, setTunnelActive] = useState<boolean>(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const res = await listShares();
      setShares(res.shares);
      setTunnelActive(res.tunnelActive);
    } catch {
      setShares([]);
    } finally {
      setSharesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const res = await fetchBackendHealth();
        if (!cancelled) {
          setBackendOk(true);
          setTunnelActive(res.tunnel_active);
        }
      } catch (err) {
        console.error("Failed to fetch health check status:", err);
        if (!cancelled) {
          setBackendOk(false);
        }
      }
    };

    void checkHealth();

    const interval = setInterval(() => {
      void checkHealth();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (backendOk !== true) return;
    void loadShares();
  }, [backendOk, loadShares]);

  useEffect(() => {
    if (backendOk !== true) return;
    if (currentTab === "history") {
      void loadShares();
      const interval = setInterval(() => {
        void loadShares();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [backendOk, currentTab, loadShares]);

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

  const isSharingActive = selectedFiles.some((f) => f.isSharing && (f.shareLink || f.localShareLink));

  useEffect(() => {
    if (!isSharingActive || backendOk !== true) return;

    const interval = setInterval(async () => {
      try {
        const transfers = await fetchTransfers();
        setSelectedFiles((files) => {
          let changed = false;
          const next = files.map((file) => {
            const token = file.shareLink
              ? file.shareLink.split("/").pop()
              : file.localShareLink
                ? file.localShareLink.split("/").pop()
                : null;
            const statsList = token ? transfers[token] : null;

            const isDownloading = !!statsList && statsList.length > 0;
            const bytesWritten = statsList
              ? statsList.reduce((sum, s) => sum + s.bytes_written, 0)
              : file.bytesWritten || 0;
            const speed = statsList
              ? statsList.reduce((sum, s) => sum + s.speed, 0)
              : undefined;

            const wasDownloading = file.isDownloading;
            const isCompleted = file.isCompleted || (wasDownloading && !isDownloading);
            const activeDownloadsChanged = JSON.stringify(file.activeDownloads) !== JSON.stringify(statsList);

            if (
              file.isDownloading !== isDownloading ||
              file.bytesWritten !== bytesWritten ||
              file.speed !== speed ||
              file.isCompleted !== isCompleted ||
              activeDownloadsChanged
            ) {
              changed = true;
              return {
                ...file,
                isDownloading,
                bytesWritten,
                speed,
                isCompleted,
                activeDownloads: statsList || [],
              };
            }
            return file;
          });
          return changed ? next : files;
        });
      } catch (err) {
        console.error("Failed to fetch active transfers:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSharingActive, backendOk]);

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

  const handleFilesAdded = useCallback(async (files: SelectedFile[]) => {
    const filesWithSize = await Promise.all(
      files.map(async (file) => {
        if (file.size !== undefined || !file.path) return file;

        try {
          const size = await invoke<number>("get_file_size", { path: file.path });
          return { ...file, size };
        } catch {
          return file;
        }
      })
    );

    const filesWithState = filesWithSize.map((file) => ({
      ...file,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      isSharing: false,
      shareLink: null,
      localShareLink: null,
      shareInternet: true,
      shareNearby: true,
      shareError: null,
      shareCreating: false,
      isActionsOpen: false,
      passwordProtected: false,
      passwordValue: "",
      noteValue: "",
      activeDownloads: [],
    }));

    setSelectedFiles((currentFiles) => [...currentFiles, ...filesWithState]);
    dragDepth.current = 0;
  }, []);

  const handleReShareHistoryFiles = useCallback((paths: string[]) => {
    const filesToShare = paths.map((path) => {
      const normalized = path.replace(/\\/g, "/");
      const name = normalized.split("/").pop() || path;
      return {
        name,
        path,
        size: undefined,
      };
    });
    void handleFilesAdded(filesToShare);
    setCurrentTab("transfers");
  }, [handleFilesAdded]);

  const handleClearAllHistory = useCallback(async () => {
    try {
      await clearAllSharesHistory();
      await loadShares();
    } catch (err) {
      console.error("Failed to clear sharing history:", err);
    }
  }, [loadShares]);

  const openFileBrowser = async () => {
    if (!("__TAURI_INTERNALS__" in window)) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: true,
        directory: false,
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const newFiles = paths.map((path) => {
          const normalized = path.replace(/\\/g, "/");
          const name = normalized.split("/").pop() || path;
          return {
            name,
            path,
            size: undefined,
          };
        });
        await handleFilesAdded(newFiles);
      }
    } catch (err) {
      console.error("Failed to open Tauri file dialog:", err);
      fileInputRef.current?.click();
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      void handleFilesAdded(
        files.map((file) => ({
          name: file.name,
          size: file.size,
        }))
      );
    }
  };

  const removeFile = (idToRemove: string) => {
    setSelectedFiles((files) => files.filter((f) => f.id !== idToRemove));
  };

  const startSharing = async (id: string) => {
    const file = selectedFiles.find((f) => f.id === id);
    if (!file) return;

    if (!file.path) {
      setSelectedFiles((files) =>
        files.map((f) =>
          f.id === id
            ? {
              ...f,
              shareError:
                "Each file needs a full path. Use drag-and-drop into the window (or Tauri file dialog with paths) so the server can read the file.",
            }
            : f
        )
      );
      return;
    }

    setSelectedFiles((files) =>
      files.map((f) => (f.id === id ? { ...f, shareCreating: true, shareError: null } : f))
    );

    try {
      const res = await createShare({
        paths: [file.path],
        password: file.passwordProtected ? file.passwordValue : undefined,
        note: file.passwordProtected ? file.noteValue : undefined,
        isInternet: file.shareInternet,
        isLAN: file.shareNearby,
      });

      setSelectedFiles((files) =>
        files.map((f) =>
          f.id === id
            ? {
              ...f,
              shareLink: file.shareInternet ? res.download_url : null,
              localShareLink: file.shareNearby ? res.local_download_url : null,
              isSharing: true,
            }
            : f
        )
      );
      await loadShares();
    } catch (e) {
      setSelectedFiles((files) =>
        files.map((f) =>
          f.id === id
            ? {
              ...f,
              isSharing: false,
              shareLink: null,
              localShareLink: null,
              shareError: e instanceof Error ? e.message : "Could not create share",
            }
            : f
        )
      );
    } finally {
      setSelectedFiles((files) =>
        files.map((f) => (f.id === id ? { ...f, shareCreating: false } : f))
      );
    }
  };

  const stopSharing = async (id: string) => {
    const file = selectedFiles.find((f) => f.id === id);
    if (!file) return;

    const token = (file.shareLink || file.localShareLink || "").split("/").pop();
    if (token) {
      try {
        await deleteShare(token);
      } catch (e) {
        console.error("Failed to delete share on backend:", e);
      }
    }

    setSelectedFiles((files) =>
      files.map((f) =>
        f.id === id
          ? {
            ...f,
            isSharing: false,
            shareLink: null,
            localShareLink: null,
            isActionsOpen: false,
            isCompleted: false,
            isDownloading: false,
            activeDownloads: [],
            speed: undefined,
            bytesWritten: undefined,
          }
          : f
      )
    );
    await loadShares();
  };

  const toggleActions = (id: string) => {
    setSelectedFiles((files) =>
      files.map((f) => (f.id === id ? { ...f, isActionsOpen: !f.isActionsOpen } : f))
    );
  };

  const toggleShareInternet = (id: string) => {
    setSelectedFiles((files) =>
      files.map((f) => (f.id === id ? { ...f, shareInternet: !f.shareInternet } : f))
    );
  };

  const toggleShareNearby = (id: string) => {
    setSelectedFiles((files) =>
      files.map((f) => (f.id === id ? { ...f, shareNearby: !f.shareNearby } : f))
    );
  };

  const togglePasswordProtected = (id: string) => {
    setSelectedFiles((files) =>
      files.map((f) => (f.id === id ? { ...f, passwordProtected: !f.passwordProtected } : f))
    );
  };

  const changePasswordValue = (id: string, val: string) => {
    setSelectedFiles((files) =>
      files.map((f) => (f.id === id ? { ...f, passwordValue: val } : f))
    );
  };

  const changeNoteValue = (id: string, val: string) => {
    setSelectedFiles((files) =>
      files.map((f) => (f.id === id ? { ...f, noteValue: val } : f))
    );
  };

  // Visibility and layout size rules for DropZone
  const showDropZone = true;
  const dropZoneVariant = selectedFiles.length === 0 ? "large" : "compact";

  return (
    <div className={`app-container ${isDark ? "dark-theme" : "light-theme"}`}>
      <FileDrop fileInputRef={fileInputRef} onFilesAdded={handleFilesAdded} />

      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      <div className="app-body">
        <Header />

        <main className={`main-content ${selectedFiles.length === 0 ? "is-empty" : ""}`}>
          <div className="main-content-inner">
            <div className="content-heading">
              <div className="main-title-row">
                <h2 className="main-title">
                  {currentTab === "transfers" && "Transfers"}
                  {currentTab === "history" && "History"}
                  {currentTab === "devices" && "Devices"}
                  {currentTab === "settings" && "Settings"}
                </h2>
                {currentTab === "transfers" && (
                  <div className={`tunnel-status-badge ${backendOk === false ? "inactive" : tunnelActive ? "active" : "inactive"}`}>
                    <span className={`status-dot ${backendOk === false ? "gray" : tunnelActive ? "green" : "gray"}`}></span>
                    <span className="status-label">
                      {backendOk === false
                        ? "Internet sharing unavailable"
                        : tunnelActive
                        ? "Internet sharing active"
                        : "Ready for local sharing"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {currentTab === "transfers" && (
              <>
                {showDropZone && (
                  <DropZone
                    isDragging={isDragging}
                    onBrowse={openFileBrowser}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      dragDepth.current += 1;
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      dragDepth.current = Math.max(0, dragDepth.current - 1);
                      if (dragDepth.current === 0) {
                        setIsDragging(false);
                      }
                    }}
                    onDrop={handleDrop}
                    variant={dropZoneVariant}
                  />
                )}

                {selectedFiles.length > 0 && (
                  <div className="active-transfers-section" style={{ width: "100%", marginTop: "12px" }}>
                    <div className="section-header-row" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <h3 className="section-title">Active Transfers</h3>
                      <span className="count-badge">{selectedFiles.length}</span>
                    </div>
                    <div className="file-cards-list">
                      {selectedFiles.map((file) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          onToggleActions={() => toggleActions(file.id)}
                          onRemoveFile={() => removeFile(file.id)}
                          onStartSharing={() => void startSharing(file.id)}
                          onStopSharing={() => void stopSharing(file.id)}
                          onToggleShareInternet={() => toggleShareInternet(file.id)}
                          onToggleShareNearby={() => toggleShareNearby(file.id)}
                          onTogglePasswordProtected={() => togglePasswordProtected(file.id)}
                          onChangePasswordValue={(val) => changePasswordValue(file.id, val)}
                          onChangeNoteValue={(val) => changeNoteValue(file.id, val)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Transfers removed from Transfers page */}
                
                {/* Bottom helper text */}
                <p className="transfers-helper-text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", flexShrink: 0, opacity: 0.8 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Your files are transferred securely and directly.</span>
                </p>
              </>
            )}

            {currentTab === "history" && (
              <HistoryView
                items={shares}
                loading={sharesLoading}
                onReShare={handleReShareHistoryFiles}
                onRefresh={loadShares}
              />
            )}

            {currentTab === "devices" && (
              <DevicesView />
            )}

            {currentTab === "settings" && (
              <SettingsView
                themeSetting={themeSetting}
                onThemeChange={changeThemeSetting}
                onClearHistory={handleClearAllHistory}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
