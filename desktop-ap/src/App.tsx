import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import DropZone from "./Components/DropZone";
import FileCard, { type StatefulFile } from "./Components/FileCard";
import Header from "./Components/Header";
import FileDrop, { type SelectedFile } from "./Components/FileDrop";
import Sidebar from "./Components/Sidebar";
import RecentActivity from "./Components/RecentActivity";
import HistoryView from "./Components/HistoryView";
import DevicesView from "./Components/DevicesView";
import {
  createShare,
  fetchBackendHealth,
  listShares,
  deleteShare,
  fetchTransfers,
  type ShareListItem,
} from "./lib/backend";

function App() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<StatefulFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("transfers");
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const next = await listShares();
      setShares(next);
    } catch {
      setShares([]);
    } finally {
      setSharesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBackendHealth()
      .then(() => {
        if (!cancelled) setBackendOk(true);
      })
      .catch(() => {
        if (!cancelled) setBackendOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (backendOk !== true) return;
    void loadShares();
  }, [backendOk, loadShares]);

  const isSharingActive = selectedFiles.some((f) => f.isSharing && f.shareLink);

  useEffect(() => {
    if (!isSharingActive || backendOk !== true) return;

    const interval = setInterval(async () => {
      try {
        const transfers = await fetchTransfers();
        setSelectedFiles((files) => {
          let changed = false;
          const next = files.map((file) => {
            const token = file.shareLink ? file.shareLink.split("/").pop() : null;
            const stats = token ? transfers[token] : null;

            const isDownloading = !!stats;
            const bytesWritten = stats ? stats.bytes_written : file.bytesWritten;
            const speed = stats ? stats.speed : undefined;
            const wasDownloading = file.isDownloading;
            const isCompleted = file.isCompleted || (wasDownloading && !isDownloading);

            if (
              file.isDownloading !== isDownloading ||
              file.bytesWritten !== bytesWritten ||
              file.speed !== speed ||
              file.isCompleted !== isCompleted
            ) {
              changed = true;
              return {
                ...file,
                isDownloading,
                bytesWritten,
                speed,
                isCompleted,
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

  const toggleTheme = () => setIsDark(!isDark);

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
      shareError: null,
      shareCreating: false,
      isActionsOpen: false,
    }));

    setSelectedFiles((currentFiles) => [...currentFiles, ...filesWithState]);
    dragDepth.current = 0;
    setIsDragging(false);
  }, []);

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
      const res = await createShare({ paths: [file.path] });
      setSelectedFiles((files) =>
        files.map((f) =>
          f.id === id
            ? {
                ...f,
                shareLink: res.download_url,
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

  const copyShareLink = async (id: string) => {
    const file = selectedFiles.find((f) => f.id === id);
    if (!file || !file.shareLink) return;
    await navigator.clipboard.writeText(file.shareLink);
  };

  const stopSharing = async (id: string) => {
    const file = selectedFiles.find((f) => f.id === id);
    if (!file) return;

    if (file.shareLink) {
      const token = file.shareLink.split("/").pop();
      if (token) {
        try {
          await deleteShare(token);
        } catch (e) {
          console.error("Failed to delete share on backend:", e);
        }
      }
    }

    setSelectedFiles((files) =>
      files.map((f) =>
        f.id === id
          ? {
              ...f,
              isSharing: false,
              shareLink: null,
              isActionsOpen: false,
              isCompleted: false,
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

  // Visibility and layout size rules for DropZone
  const showDropZone = true;
  const dropZoneVariant = (selectedFiles.length === 0 && shares.length === 0) ? "large" : "compact";

  return (
    <div className={`app-container ${isDark ? "dark-theme" : "light-theme"}`}>
      <FileDrop fileInputRef={fileInputRef} onFilesAdded={handleFilesAdded} />

      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        toggleTheme={toggleTheme}
      />

      <div className="app-body">
        <Header />

        <main className="main-content">
          <div className="main-content-inner">
            <div className="content-heading">
              <div className="main-title-row">
                <h2 className="main-title">
                  {currentTab === "transfers" && "Transfers"}
                  {currentTab === "history" && "History"}
                  {currentTab === "devices" && "Devices"}
                </h2>
                {currentTab === "transfers" && (
                  <div className="header-status-badges">
                    <span className="header-status-item">
                      <span className="status-dot green"></span>
                      Online
                    </span>
                    <span className="header-status-item">
                      <svg className="shield-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Tunnel active
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
                    <div
                      className="file-cards-list"
                      style={{
                        maxHeight: "45vh",
                        overflowY: "auto",
                      }}
                    >
                      {selectedFiles.map((file) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          onToggleActions={() => toggleActions(file.id)}
                          onRemoveFile={() => removeFile(file.id)}
                          onStartSharing={() => void startSharing(file.id)}
                          onCopyShareLink={() => void copyShareLink(file.id)}
                          onStopSharing={() => void stopSharing(file.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="recent-transfers-section">
                  <div className="section-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className="section-title">Recent Transfers</h3>
                    {shares.length > 0 && (
                      <button className="view-all-link" onClick={() => setCurrentTab("history")}>
                        View all &gt;
                      </button>
                    )}
                  </div>
                  <RecentActivity items={shares.slice(0, 3)} loading={sharesLoading} hideHeader activeCount={selectedFiles.length} />
                </div>
              </>
            )}

            {currentTab === "history" && (
              <HistoryView items={shares} loading={sharesLoading} />
            )}

            {currentTab === "devices" && (
              <DevicesView />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
