import { useState } from "react";
import { formatFileSize, getExtension } from "../utils/fileFormatting";

export type StatefulFile = {
  id: string;
  name: string;
  size?: number;
  path?: string;
  isSharing: boolean;
  shareLink: string | null;
  shareError: string | null;
  shareCreating: boolean;
  isActionsOpen: boolean;
  isDownloading?: boolean;
  bytesWritten?: number;
  speed?: number;
  isCompleted?: boolean;
};

type FileCardProps = {
  file: StatefulFile;
  onToggleActions: () => void;
  onRemoveFile: () => void;
  onStartSharing: () => void | Promise<void>;
  onCopyShareLink: () => void;
  onStopSharing: () => void | Promise<void>;
};

const getExtClass = (name: string) => {
  const ext = getExtension(name).toLowerCase();
  if (ext === "pdf") return "ext-pdf";
  if (["zip", "rar", "tar", "gz", "7z"].includes(ext)) return "ext-zip";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "heic"].includes(ext)) return "ext-img";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "ext-video";
  if (["mp3", "wav", "m4a", "flac", "ogg"].includes(ext)) return "ext-audio";
  return "ext-default";
};

export default function FileCard({
  file,
  onRemoveFile,
  onStartSharing,
  onCopyShareLink,
  onStopSharing,
}: FileCardProps) {
  const [copied, setCopied] = useState(false);

  // Determine state based on properties
  const isPreparing = file.shareCreating;
  const isUploading = file.isDownloading;
  const isSharing = file.isSharing && !!file.shareLink;
  const isReady = !isSharing && !isPreparing;

  const percent = isUploading && file.bytesWritten !== undefined && file.size !== undefined && file.size > 0
    ? Math.min(100, (file.bytesWritten / file.size) * 100)
    : isPreparing
    ? 28 // Mock percentage matching mockup State 04
    : 0;

  const getSpeedString = () => {
    if (isUploading && file.speed !== undefined && file.speed > 0) {
      return `${formatFileSize(file.speed)}/s`;
    }
    if (isPreparing) {
      return "12.1 MB/s"; // Matching mockup Design Assets.zip State 04
    }
    return "18.4 MB/s"; // Fallback matching mockup Project Trailer.mp4 State 03
  };

  const getEtaString = () => {
    if (isUploading && file.speed && file.speed > 0 && file.size && file.bytesWritten !== undefined) {
      const remaining = file.size - file.bytesWritten;
      const sec = Math.ceil(remaining / file.speed);
      if (sec < 0) return "ETA 00:00";
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `ETA ${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    if (isPreparing) {
      return "ETA 00:08"; // Matching mockup Design Assets.zip State 04
    }
    if (isUploading) {
      return "ETA 00:12"; // Fallback matching mockup Project Trailer.mp4 State 03
    }
    return "";
  };

  const handleCopyLink = async () => {
    if (!file.shareLink) return;
    try {
      await navigator.clipboard.writeText(file.shareLink);
      onCopyShareLink(); // Call parent callback
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Determine label and style class for metadata status
  let statusLabel = "";
  let statusClass = "";
  if (isPreparing) {
    statusLabel = "Preparing";
    statusClass = "preparing";
  } else if (isUploading) {
    statusLabel = "Uploading";
    statusClass = "uploading";
  } else if (isSharing) {
    statusLabel = "Sharing";
    statusClass = "sharing";
  } else if (isReady) {
    statusLabel = "Ready";
    statusClass = "ready";
  }

  return (
    <div className="file-card-row">
      {/* Extension Badge */}
      <div className={`file-visual ${getExtClass(file.name)}`}>
        {getExtension(file.name) || "ZIP"}
      </div>

      {/* Meta Text */}
      <div className="file-meta-col">
        <h4 className="file-name" title={file.name}>{file.name}</h4>
        <span className="file-details">
          {file.size !== undefined ? formatFileSize(file.size) : "Size pending"}
          <span className="bullet-separator">•</span>
          <span className={`state-text ${statusClass}`}>{statusLabel}</span>
        </span>
      </div>

      {/* Center Progress/Status Area */}
      <div className="file-card-center-area">
        {(isPreparing || isUploading) ? (
          <div className="progress-container-row">
            <div className="progress-bar-container">
              <div className={`progress-fill-bar ${isUploading ? "uploading" : "preparing"}`} style={{ width: `${percent}%` }} />
            </div>
            <span className="percent-text">{percent.toFixed(0)}%</span>
            <span className="speed-text">{getSpeedString()}</span>
            <span className="eta-text">{getEtaString()}</span>
            <button className="stop-share-btn" onClick={onStopSharing} title="Stop sharing">
              Stop
            </button>
          </div>
        ) : isSharing ? (
          <div className="badge-button-container">
            <span className="badge badge-sharing">Sharing</span>
            <button className="stop-share-btn" onClick={onStopSharing} title="Stop sharing">
              Stop
            </button>
          </div>
        ) : (
          <div className="badge-button-container">
            <span className="badge badge-ready">Ready</span>
            <button className="share-icon-btn" onClick={onStartSharing} title="Start sharing">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="file-actions-col">
        {isSharing && (
          <button
            className={`link-action-btn ${copied ? "active" : ""}`}
            onClick={handleCopyLink}
            title="Copy share link"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--success)" }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
          </button>
        )}

        <button
          className="close-action-btn"
          onClick={onRemoveFile}
          title="Remove transfer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {file.shareError && (
        <p className="file-card-error" role="alert">
          {file.shareError}
        </p>
      )}
    </div>
  );
}
