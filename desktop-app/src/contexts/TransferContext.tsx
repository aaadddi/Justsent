import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useBackendHealth } from "../hooks/useBackendHealth";
import { useShares } from "../hooks/useShares";
import { useTransfers } from "../hooks/useTransfers";
import { AppTab } from "../types/app";
import type { StatefulFile, SelectedFile } from "../types/transfer";
import { shareService } from "../services/shareService";
import { showConfirm } from "../utils/dialogs";
import type { ShareListItem } from "../lib/backend";

interface TransferContextType {
  backendOk: boolean | null;
  tunnelActive: boolean;
  shares: ShareListItem[];
  sharesLoading: boolean;
  selectedFiles: StatefulFile[];
  isDragging: boolean;
  highlightActive: boolean;
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragDepth: React.MutableRefObject<number>;
  isSharingActive: boolean;
  loadShares: () => Promise<void>;
  triggerHighlight: () => void;
  handleFilesAdded: (files: SelectedFile[]) => Promise<void>;
  handleReShareHistoryFiles: (paths: string[]) => void;
  handleClearAllHistory: () => Promise<void>;
  openFileBrowser: () => Promise<void>;
  handleDrop: (event: React.DragEvent<HTMLElement>) => void;
  setIsDragging: (val: boolean) => void;
  removeFile: (id: string) => void;
  startSharing: (id: string) => Promise<void>;
  stopSharing: (id: string) => Promise<void>;
  toggleActions: (id: string) => void;
  toggleShareInternet: (id: string) => void;
  toggleShareNearby: (id: string) => void;
  togglePasswordProtected: (id: string) => void;
  changePasswordValue: (id: string, val: string) => void;
  changeNoteValue: (id: string, val: string) => void;
}

const TransferContext = createContext<TransferContextType | undefined>(undefined);

export const TransferProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { backendOk, tunnelActive, setTunnelActive } = useBackendHealth();
  const { shares, sharesLoading, loadShares } = useShares(backendOk, setTunnelActive);

  const [selectedFiles, setSelectedFiles] = useState<StatefulFile[]>([]);
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.Transfers);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightActive, setHighlightActive] = useState(false);

  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSharingActive = selectedFiles.some((f) => f.isSharing && (f.shareLink || f.localShareLink));

  useTransfers(isSharingActive, backendOk, setSelectedFiles);

  const triggerHighlight = () => {
    if (!isSharingActive) return;
    setHighlightActive(true);
    setTimeout(() => {
      setHighlightActive(false);
    }, 2000);
  };

  const updateFile = useCallback((
    id: string,
    updates: Partial<StatefulFile> | ((file: StatefulFile) => Partial<StatefulFile>)
  ) => {
    setSelectedFiles((files) =>
      files.map((f) => {
        if (f.id !== id) return f;
        const resolvedUpdates = typeof updates === "function" ? updates(f) : updates;
        return { ...f, ...resolvedUpdates };
      })
    );
  }, []);

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
    setCurrentTab(AppTab.Transfers);
  }, [handleFilesAdded]);

  const handleClearAllHistory = useCallback(async () => {
    try {
      await shareService.clearHistory();
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

  const removeFile = useCallback((idToRemove: string) => {
    setSelectedFiles((files) => files.filter((f) => f.id !== idToRemove));
  }, []);

  const startSharing = async (id: string) => {
    const file = selectedFiles.find((f) => f.id === id);
    if (!file) return;

    if (!file.path) {
      updateFile(id, {
        shareError:
          "Each file needs a full path. Use drag-and-drop into the window (or Tauri file dialog with paths) so the server can read the file.",
      });
      return;
    }

    updateFile(id, { shareCreating: true, shareError: null });

    try {
      const res = await shareService.create({
        paths: [file.path],
        password: file.passwordProtected ? file.passwordValue : undefined,
        note: file.passwordProtected ? file.noteValue : undefined,
        isInternet: file.shareInternet,
        isLAN: file.shareNearby,
      });

      updateFile(id, {
        shareLink: file.shareInternet ? res.download_url : null,
        localShareLink: file.shareNearby ? res.local_download_url : null,
        isSharing: true,
      });
      await loadShares();
    } catch (e) {
      updateFile(id, {
        isSharing: false,
        shareLink: null,
        localShareLink: null,
        shareError: e instanceof Error ? e.message : "Could not create share",
      });
    } finally {
      updateFile(id, { shareCreating: false });
    }
  };

  const stopSharing = async (id: string) => {
    const file = selectedFiles.find((f) => f.id === id);
    if (!file) return;

    const token = (file.shareLink || file.localShareLink || "").split("/").pop();
    if (token) {
      try {
        await shareService.delete(token);
      } catch (e) {
        console.error("Failed to delete share on backend:", e);
      }
    }

    updateFile(id, {
      isSharing: false,
      shareLink: null,
      localShareLink: null,
      isActionsOpen: false,
      isCompleted: false,
      isDownloading: false,
      activeDownloads: [],
      speed: undefined,
      bytesWritten: undefined,
    });
    await loadShares();
  };

  const toggleActions = useCallback((id: string) => {
    updateFile(id, (f) => ({ isActionsOpen: !f.isActionsOpen }));
  }, [updateFile]);

  const toggleShareInternet = useCallback((id: string) => {
    updateFile(id, (f) => ({ shareInternet: !f.shareInternet }));
  }, [updateFile]);

  const toggleShareNearby = useCallback((id: string) => {
    updateFile(id, (f) => ({ shareNearby: !f.shareNearby }));
  }, [updateFile]);

  const togglePasswordProtected = useCallback((id: string) => {
    updateFile(id, (f) => ({ passwordProtected: !f.passwordProtected }));
  }, [updateFile]);

  const changePasswordValue = useCallback((id: string, val: string) => {
    updateFile(id, { passwordValue: val });
  }, [updateFile]);

  const changeNoteValue = useCallback((id: string, val: string) => {
    updateFile(id, { noteValue: val });
  }, [updateFile]);

  const isSharingActiveRef = useRef(isSharingActive);
  const tunnelActiveRef = useRef(tunnelActive);

  useEffect(() => {
    isSharingActiveRef.current = isSharingActive;
  }, [isSharingActive]);

  useEffect(() => {
    tunnelActiveRef.current = tunnelActive;
  }, [tunnelActive]);

  useEffect(() => {
    if (backendOk !== true) return;
    void loadShares();
  }, [backendOk, loadShares]);

  // Synchronize selectedFiles with active shares from the backend
  useEffect(() => {
    if (sharesLoading) return;

    setSelectedFiles((currentFiles) => {
      const activeShares = shares.filter((s) => s.is_active);

      const missingActiveShares = activeShares.filter((share) => {
        if (!share.token) return false;
        return !currentFiles.some(
          (f) =>
            f.id === share.token ||
            (f.shareLink && f.shareLink.endsWith("/" + share.token)) ||
            (f.localShareLink && f.localShareLink.endsWith("/" + share.token))
        );
      });

      let filesChanged = false;
      const updatedFiles = currentFiles.map((file) => {
        if (!file.isSharing) return file;

        const token = (file.shareLink || file.localShareLink || "").split("/").pop();
        if (!token) return file;

        const stillActive = activeShares.some((s) => s.token === token);

        if (!stillActive) {
          filesChanged = true;
          return {
            ...file,
            isSharing: false,
            shareLink: null,
            localShareLink: null,
            isCompleted: false,
            isDownloading: false,
            activeDownloads: [],
            speed: undefined,
            bytesWritten: undefined,
          };
        }
        return file;
      });

      if (missingActiveShares.length > 0) {
        const newFiles = missingActiveShares.map((share) => ({
          id: share.token,
          name: share.primary_name,
          size: share.total_size,
          path: share.file_paths[0],
          isSharing: true,
          shareLink: share.is_internet ? share.download_url : null,
          localShareLink: share.is_lan ? share.local_download_url : null,
          shareInternet: share.is_internet,
          shareNearby: share.is_lan,
          shareError: null,
          shareCreating: false,
          isActionsOpen: false,
          passwordProtected: !!share.password,
          passwordValue: share.password || "",
          noteValue: share.note || "",
          activeDownloads: [],
        }));

        return [...updatedFiles, ...newFiles];
      }

      return filesChanged ? updatedFiles : currentFiles;
    });
  }, [shares, sharesLoading]);

  // Window close requested listener
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    let isMounted = true;
    let unlistenFn: (() => void) | undefined;

    const setupCloseListener = async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");

      const windowInstance = getCurrentWindow();
      const unlisten = await windowInstance.onCloseRequested(async (event) => {
        event.preventDefault();

        if (isSharingActiveRef.current || tunnelActiveRef.current) {
          const confirmed = await showConfirm(
            "You have active sharing sessions. Closing the app will stop all sharing. Are you sure you want to quit?",
            {
              title: "Confirm Close",
              kind: "warning",
              okLabel: "Quit and Stop Sharing",
              cancelLabel: "Keep Sharing",
            }
          );

          if (confirmed) {
            await invoke("exit_app");
          }
        } else {
          await invoke("exit_app");
        }
      });

      if (!isMounted) {
        unlisten();
      } else {
        unlistenFn = unlisten;
      }
    };

    void setupCloseListener();

    return () => {
      isMounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  return (
    <TransferContext.Provider
      value={{
        backendOk,
        tunnelActive,
        shares,
        sharesLoading,
        selectedFiles,
        isDragging,
        highlightActive,
        currentTab,
        setCurrentTab,
        fileInputRef,
        dragDepth,
        isSharingActive,
        loadShares,
        triggerHighlight,
        handleFilesAdded,
        handleReShareHistoryFiles,
        handleClearAllHistory,
        openFileBrowser,
        handleDrop,
        setIsDragging,
        removeFile,
        startSharing,
        stopSharing,
        toggleActions,
        toggleShareInternet,
        toggleShareNearby,
        togglePasswordProtected,
        changePasswordValue,
        changeNoteValue,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
};

export function useTransferContext() {
  const context = useContext(TransferContext);
  if (!context) {
    throw new Error("useTransferContext must be used within a TransferProvider");
  }
  return context;
}
