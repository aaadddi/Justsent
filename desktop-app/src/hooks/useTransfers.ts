import { useCallback } from "react";
import { transferService } from "../services/transferService";
import { usePolling } from "./usePolling";
import type { StatefulFile } from "../types/transfer";

export function useTransfers(
  isSharingActive: boolean,
  backendOk: boolean | null,
  setSelectedFiles: React.Dispatch<React.SetStateAction<StatefulFile[]>>
) {
  const pollTransfers = useCallback(async () => {
    if (backendOk !== true) return;
    try {
      const transfers = await transferService.fetchActive();
      setSelectedFiles((files) => {
        let changed = false;
        const next = files.map((file) => {
          const token = file.shareLink
            ? file.shareLink.split("/").pop()
            : file.localShareLink
              ? file.localShareLink.split("/").pop()
              : null;
          if (!token) return file;

          const statsList = transfers[token];

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
  }, [backendOk, setSelectedFiles]);

  usePolling(pollTransfers, 1000, isSharingActive && backendOk === true);
}
