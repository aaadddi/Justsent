import { useState } from "react";
import { formatFileSize, getExtension } from "../utils/fileFormatting";
import { checkFiles, deleteShareHistory, type ShareListItem } from "../lib/backend";

type HistoryViewProps = {
  items: ShareListItem[];
  loading?: boolean;
  onReShare: (paths: string[]) => void;
  onRefresh: () => void;
};

const getExtClass = (name: string = "") => {
  const ext = getExtension(name).toLowerCase();
  if (ext === "pdf") return "ext-pdf";
  if (["zip", "rar", "tar", "gz", "7z"].includes(ext)) return "ext-zip";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "heic"].includes(ext)) return "ext-img";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "ext-video";
  if (["mp3", "wav", "m4a", "flac", "ogg"].includes(ext)) return "ext-audio";
  return "ext-default";
};

export default function HistoryView({ items, loading, onReShare, onRefresh }: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedShares, setExpandedShares] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteHistory = async (token: string) => {
    if (window.confirm("Are you sure you want to delete this share from history?")) {
      try {
        await deleteShareHistory(token);
        onRefresh();
      } catch (err) {
        console.error("Failed to delete history:", err);
      }
    }
  };

  const toggleExpand = (token: string) => {
    setExpandedShares((prev) => ({
      ...prev,
      [token]: !prev[token],
    }));
  };

  const handleReShare = async (item: ShareListItem) => {
    try {
      const res = await checkFiles(item.file_paths);
      if (res.exists) {
        onReShare(item.file_paths);
      } else {
        setErrorMessage(
          `The original file(s) are no longer available at their path(s):\n${res.missing.map((m) => `• ${m}`).join("\n")}`
        );
      }
    } catch (err) {
      console.error("Failed to check files:", err);
      // Fallback: try sharing anyway
      onReShare(item.file_paths);
    }
  };

  const getDownloadCount = (count: number) => {
    return `${count} download${count !== 1 ? "s" : ""}`;
  };

  const getExpireTime = (expiresAt?: string | null) => {
    if (!expiresAt) return "No limit";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours}h left`;
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "09:22 AM";
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
  };

  const formatDownloadTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesPrimary = (item.primary_name || "").toLowerCase().includes(query);
    const matchesPaths = (item.file_paths || []).some(p => p.toLowerCase().includes(query));
    return matchesPrimary || matchesPaths;
  });

  const groupItems = () => {
    const today: ShareListItem[] = [];
    const yesterday: ShareListItem[] = [];
    const older: ShareListItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    filteredItems.forEach((item) => {
      const itemTime = new Date(item.created_at).getTime();
      if (itemTime >= startOfToday) {
        today.push(item);
      } else if (itemTime >= startOfYesterday) {
        yesterday.push(item);
      } else {
        older.push(item);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupItems();

  const renderItemRow = (item: ShareListItem) => {
    const isExpanded = !!expandedShares[item.token];
    return (
      <div className="history-item-wrapper" key={item.id}>
        <div className="history-item-row" onClick={() => toggleExpand(item.token)}>
          <div className="history-name-col">
            <div className={`file-visual ${getExtClass(item.primary_name)}`}>
              {getExtension(item.primary_name) || "file"}
            </div>
            <div className="history-file-info">
              <span className="history-file-name" title={item.primary_name}>
                {item.primary_name}
              </span>
            </div>
          </div>
          <div className="history-size-col">{formatFileSize(item.total_size)}</div>
          <div className="history-time-col">{formatTime(item.created_at)}</div>
          <div className="history-expires-col">{getExpireTime(item.expires_at)}</div>
          <div className="history-downloads-col">{getDownloadCount(Math.max(item.downloads || 0, item.download_history?.length || 0))}</div>
          <div className="history-actions-col" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="history-share-btn"
              onClick={(e) => {
                e.stopPropagation();
                void handleReShare(item);
              }}
              title="Add files back to transfers page for sharing"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
            <button
              className={`history-toggle-btn ${isExpanded ? "expanded" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.token);
              }}
              title={isExpanded ? "Hide details" : "Show details"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="chevron-icon">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="history-expanded-panel" onClick={(e) => e.stopPropagation()}>
            <div className="history-expanded-section">
              <h4 className="history-expanded-section-title">Files ({item.file_paths.length})</h4>
              <ul className="history-paths-list">
                {item.file_paths.map((path, idx) => (
                  <li key={idx} title={path}>
                    {path}
                  </li>
                ))}
              </ul>
            </div>
            <div className="history-expanded-section">
              <h4 className="history-expanded-section-title">Downloads History Log</h4>
              {item.download_history && item.download_history.length > 0 ? (
                <table className="history-downloads-table">
                  <thead>
                    <tr>
                      <th>Downloader IP</th>
                      <th>Downloaded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.download_history.map((log, idx) => (
                      <tr key={idx}>
                        <td>{log.downloader_ip}</td>
                        <td>{formatDownloadTime(log.downloaded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-downloads-text">No downloads recorded yet for this share.</p>
              )}
            </div>
            <div className="history-action-row">
              <button
                className="history-delete-history-btn"
                onClick={() => void handleDeleteHistory(item.token)}
                title="Completely delete this entry from your transfer history"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete History
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="history-view-container">
      {/* Header Search row */}
      <div className="history-toolbar">
        <div className="history-search-wrapper">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="history-search-input"
            placeholder="Search transfers by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* History content list */}
      <div className="history-list-content">
        {loading && filteredItems.length === 0 && (
          <div className="history-empty-state">Loading transfers history…</div>
        )}
        {!loading && filteredItems.length === 0 && (
          <div className="history-empty-state">
            {items.length === 0 ? "No history" : `No transfers found matching "${searchQuery}"`}
          </div>
        )}

        {today.length > 0 && (
          <div className="history-group">
            <h4 className="history-group-title">Today</h4>
            <div className="history-group-rows">{today.map(renderItemRow)}</div>
          </div>
        )}

        {yesterday.length > 0 && (
          <div className="history-group">
            <h4 className="history-group-title">Yesterday</h4>
            <div className="history-group-rows">{yesterday.map(renderItemRow)}</div>
          </div>
        )}

        {older.length > 0 && (
          <div className="history-group">
            <h4 className="history-group-title">Older</h4>
            <div className="history-group-rows">{older.map(renderItemRow)}</div>
          </div>
        )}
      </div>

      {/* Error Dialog Modal overlay */}
      {errorMessage && (
        <div className="error-dialog-overlay" onClick={() => setErrorMessage(null)}>
          <div className="error-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="error-dialog-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h3>Original File Not Found</h3>
            </div>
            <div className="error-dialog-body">
              <p>The original files are no longer available at their original paths. They might have been moved, renamed, or deleted:</p>
              <pre className="error-paths-list">{errorMessage.split('\n').slice(1).join('\n')}</pre>
            </div>
            <div className="error-dialog-actions">
              <button className="error-dialog-close-btn" onClick={() => setErrorMessage(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
