import { useState, useEffect } from "react";
import { formatFileSize, getExtension } from "../utils/fileFormatting";
import { checkFiles, deleteShareHistory, type ShareListItem } from "../lib/backend";
import { invoke } from "@tauri-apps/api/core";
import { showConfirm } from "../utils/dialogs";

type HistoryViewProps = {
  items: ShareListItem[];
  loading?: boolean;
  onReShare: (paths: string[]) => void;
  onRefresh: () => void;
  onGoToTransfers?: () => void;
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

const getBasename = (path: string) => {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
};

const FolderIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

interface ShareGroup {
  filePathsKey: string;
  primaryName: string;
  totalSize: number;
  filePaths: string[];
  fileCount: number;
  shares: ShareListItem[];
  mostRecentCreatedAt: string;
  totalDownloads: number;
}

export default function HistoryView({ items, loading, onReShare, onRefresh, onGoToTransfers }: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedShares, setExpandedShares] = useState<Record<string, boolean>>({});
  const [expandedInstances, setExpandedInstances] = useState<Record<string, boolean>>({});
  const [showAllShares, setShowAllShares] = useState<Record<string, boolean>>({});
  const [fileExists, setFileExists] = useState<Record<string, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Batch check file existence for all paths on load or update
  useEffect(() => {
    if (!items || items.length === 0) return;
    const allPaths = Array.from(new Set(items.flatMap((item) => item.file_paths || [])));
    if (allPaths.length === 0) return;

    const runCheck = async () => {
      try {
        const res = await checkFiles(allPaths);
        setFileExists((prev) => {
          const next = { ...prev };
          allPaths.forEach((p) => {
            next[p] = !res.missing.includes(p);
          });
          return next;
        });
      } catch (err) {
        console.error("Failed to check file existence on mount:", err);
      }
    };
    void runCheck();
  }, [items]);

  const handleDeleteHistory = async (token: string) => {
    const confirmed = await showConfirm("Are you sure you want to delete this share from history?", {
      title: "Delete Share History",
      okLabel: "Delete",
      cancelLabel: "Cancel",
      kind: "warning",
    });
    if (confirmed) {
      try {
        await deleteShareHistory(token);
        onRefresh();
      } catch (err) {
        console.error("Failed to delete history:", err);
      }
    }
  };

  const handleDeleteGroupHistory = async (group: ShareGroup) => {
    const confirmed = await showConfirm("Are you sure you want to delete all sharing history for these files?", {
      title: "Delete Group History",
      okLabel: "Delete All",
      cancelLabel: "Cancel",
      kind: "warning",
    });
    if (confirmed) {
      try {
        for (const share of group.shares) {
          await deleteShareHistory(share.token);
        }
        onRefresh();
      } catch (err) {
        console.error("Failed to delete group history:", err);
      }
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedShares((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleInstanceExpand = (token: string) => {
    setExpandedInstances((prev) => ({
      ...prev,
      [token]: !prev[token],
    }));
  };

  const toggleShowAllShares = (key: string) => {
    setShowAllShares((prev) => ({
      ...prev,
      [key]: !prev[key],
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

  const handleRevealInFinder = async (path: string) => {
    try {
      await invoke("reveal_in_finder", { path });
    } catch (err) {
      console.error("Failed to reveal in finder:", err);
    }
  };

  const handleCopyLink = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(key);
      setTimeout(() => {
        setCopiedToken(null);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const getExpireTime = (expiresAt?: string | null) => {
    if (!expiresAt) return "No limit";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours}h left`;
  };

  const formatInstanceDateTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Unknown Date";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? "0" + minutes : minutes;
    return `${day} ${month} ${year} at ${hours}:${strMinutes} ${ampm}`;
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

  // Group shares by unique file paths list
  const groupsMap: Record<string, ShareListItem[]> = {};
  items.forEach((item) => {
    const key = (item.file_paths || []).join("|") || item.primary_name;
    if (!groupsMap[key]) {
      groupsMap[key] = [];
    }
    groupsMap[key].push(item);
  });

  const groupsList: ShareGroup[] = Object.keys(groupsMap).map((key) => {
    const shares = groupsMap[key];
    shares.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const firstItem = shares[0];
    const totalDownloads = shares.reduce(
      (sum, s) => sum + Math.max(s.downloads || 0, s.download_history?.length || 0),
      0
    );
    
    return {
      filePathsKey: key,
      primaryName: firstItem.primary_name,
      totalSize: firstItem.total_size,
      filePaths: firstItem.file_paths || [],
      fileCount: firstItem.file_count || 1,
      shares,
      mostRecentCreatedAt: firstItem.created_at,
      totalDownloads,
    };
  });

  // Filter grouped items by search query
  const filteredGroups = groupsList.filter((group) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    
    const matchesPrimary = (group.primaryName || "").toLowerCase().includes(query);
    const matchesPaths = (group.filePaths || []).some((p) => p.toLowerCase().includes(query));
    
    return matchesPrimary || matchesPaths;
  });

  const groupGroupsByDate = (groups: ShareGroup[]) => {
    const today: ShareGroup[] = [];
    const yesterday: ShareGroup[] = [];
    const older: ShareGroup[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    groups.forEach((group) => {
      const groupTime = new Date(group.mostRecentCreatedAt).getTime();
      if (groupTime >= startOfToday) {
        today.push(group);
      } else if (groupTime >= startOfYesterday) {
        yesterday.push(group);
      } else {
        older.push(group);
      }
    });

    const sortByRecent = (a: ShareGroup, b: ShareGroup) =>
      new Date(b.mostRecentCreatedAt).getTime() - new Date(a.mostRecentCreatedAt).getTime();

    today.sort(sortByRecent);
    yesterday.sort(sortByRecent);
    older.sort(sortByRecent);

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupGroupsByDate(filteredGroups);

  const renderRevealButton = (path: string, isIconOnly = false) => {
    const exists = fileExists[path];
    const isMissing = exists === false;

    return (
      <div className="history-reveal-container" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
        {isMissing && (
          <span 
            className="history-file-error-icon" 
            title="File no longer exists at this path"
            style={{ color: "#ef4444", cursor: "help", display: "inline-flex", alignItems: "center" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
        )}
        <button
          className="history-reveal-finder-btn"
          onClick={(e) => {
            e.stopPropagation();
            void handleRevealInFinder(path);
          }}
          disabled={isMissing}
          title={isMissing ? "File no longer exists at this path" : path}
          style={{ opacity: isMissing ? 0.5 : 1, cursor: isMissing ? "not-allowed" : "pointer" }}
        >
          <FolderIcon />
          {!isIconOnly && <span style={{ marginLeft: "4px" }}>Reveal in Finder</span>}
        </button>
      </div>
    );
  };

  const renderGroupRow = (group: ShareGroup) => {
    const isExpanded = !!expandedShares[group.filePathsKey];
    const hasActiveShare = group.shares.some((s) => s.is_active);

    return (
      <div className={`history-item-wrapper ${isExpanded ? "expanded" : ""}`} key={group.filePathsKey}>
        <div className="history-item-row" onClick={() => toggleExpand(group.filePathsKey)}>
          <div className="history-name-col">
            <div className={`file-visual ${getExtClass(group.primaryName)}`}>
              {getExtension(group.primaryName).toUpperCase() || "FILE"}
            </div>
            <div className="history-file-info">
              <span className="history-file-name" title={group.primaryName}>
                {group.primaryName}
              </span>
              <div className="history-file-details">
                <span className="history-file-size">{formatFileSize(group.totalSize)}</span>
                <span className="bullet-separator">•</span>
                <span className="history-file-downloads" title={`${group.totalDownloads} downloads`}>
                  <DownloadIcon />
                  <span className="history-file-downloads-count" style={{ marginLeft: "4px" }}>
                    {group.totalDownloads}
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="history-actions-col" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {hasActiveShare && <span className="status-dot-sm active" title="Has active share"></span>}
            
            {group.filePaths.length === 1 && (
              <>
                {renderRevealButton(group.filePaths[0], true)}
                <button
                  className="history-row-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteGroupHistory(group);
                  }}
                  disabled={hasActiveShare}
                  title={hasActiveShare ? "Cannot delete history while share is active" : "Delete all sharing history for these files"}
                  style={{ opacity: hasActiveShare ? 0.4 : 1, cursor: hasActiveShare ? "not-allowed" : "pointer" }}
                >
                  <TrashIcon />
                </button>
              </>
            )}

            {group.filePaths.length > 1 && (
              <button
                className="history-row-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDeleteGroupHistory(group);
                }}
                disabled={hasActiveShare}
                title={hasActiveShare ? "Cannot delete history while share is active" : "Delete all sharing history for these files"}
                style={{ opacity: hasActiveShare ? 0.4 : 1, cursor: hasActiveShare ? "not-allowed" : "pointer" }}
              >
                <TrashIcon />
              </button>
            )}

            {hasActiveShare ? (
              <button
                className="history-active-redirect-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToTransfers?.();
                }}
                title="Go to Transfers page to manage active share"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Active
              </button>
            ) : (
              <button
                className="history-share-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleReShare(group.shares[0]);
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
            )}
            <button
              className={`history-toggle-btn ${isExpanded ? "expanded" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(group.filePathsKey);
              }}
              title={isExpanded ? "Hide details" : "Show details"}
            >
              <ChevronIcon />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="history-expanded-panel" onClick={(e) => e.stopPropagation()}>
            {/* Files List Section (only visible if > 1 files in group) */}
            {group.filePaths.length > 1 && (
              <div className="history-expanded-section">
                <h4 className="history-expanded-section-title">Files ({group.filePaths.length})</h4>
                <ul className="history-paths-list">
                  {group.filePaths.map((path, idx) => {
                    const basename = getBasename(path);
                    return (
                      <li key={idx} className="history-file-path-row">
                        <span className="history-file-path-name" title={basename}>{basename}</span>
                        {renderRevealButton(path, false)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Sharing History Instances */}
            <div className="history-expanded-section">
              <h4 className="history-expanded-section-title">Sharing History</h4>
              <div className="history-instances-list">
                {(showAllShares[group.filePathsKey] ? group.shares : group.shares.slice(0, 2)).map((share) => {
                  const isInstanceExpanded = !!expandedInstances[share.token];
                  const primaryCopyLink = share.is_internet ? share.download_url : share.local_download_url;
                  return (
                    <div className={`history-instance-card ${isInstanceExpanded ? "expanded" : ""}`} key={share.id}>
                      <div 
                        className="history-instance-row-header"
                        onClick={() => toggleInstanceExpand(share.token)}
                      >
                        <div className="history-instance-meta">
                          <div className="history-instance-date-col">
                            <span className="history-instance-date">
                              {formatInstanceDateTime(share.created_at)}
                            </span>
                            {share.is_active && (
                              <span className="detail-instance-badge-active">Active</span>
                            )}
                          </div>
                          
                          {share.expires_at && getExpireTime(share.expires_at) !== "No limit" && (
                            <div className="history-instance-expiry-col">
                              <span className="history-instance-expiry">
                                {getExpireTime(share.expires_at)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="history-instance-header-right" onClick={(e) => e.stopPropagation()}>
                          {share.is_active && primaryCopyLink && (
                            <button
                              className={`history-instance-copy-btn ${copiedToken === share.token ? "copied" : ""}`}
                              onClick={() => void handleCopyLink(primaryCopyLink, share.token)}
                              title="Copy Share Link"
                            >
                              {copiedToken === share.token ? "Copied" : "Copy Link"}
                            </button>
                          )}
                          <div className="history-instance-downloads-col" title={`${Math.max(share.downloads || 0, share.download_history?.length || 0)} downloads`}>
                            <DownloadIcon />
                            <span className="history-instance-downloads-count">
                              {Math.max(share.downloads || 0, share.download_history?.length || 0)}
                            </span>
                          </div>
                          <button
                            className={`history-instance-expand-chevron ${isInstanceExpanded ? "expanded" : ""}`}
                            onClick={() => toggleInstanceExpand(share.token)}
                            title={isInstanceExpanded ? "Hide logs" : "Show logs"}
                          >
                            <ChevronIcon />
                          </button>
                        </div>
                      </div>
                      
                      {isInstanceExpanded && (
                        <div className="history-instance-expanded-content">
                          {share.download_history && share.download_history.length > 0 ? (
                            <div className="history-instance-logs">
                              <table className="history-downloads-table">
                                <thead>
                                  <tr>
                                    <th>Downloader IP</th>
                                    <th>Downloaded At</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {share.download_history.map((log, idx) => (
                                    <tr key={idx}>
                                      <td>{log.downloader_ip}</td>
                                      <td>{formatDownloadTime(log.downloaded_at)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="no-downloads-text" style={{ padding: "8px 0" }}>No downloads recorded yet for this share.</p>
                          )}
                          
                          <div className="history-instance-footer-actions">
                            <button
                              className="history-delete-history-btn"
                              onClick={() => void handleDeleteHistory(share.token)}
                              disabled={share.is_active}
                              title={share.is_active ? "Cannot delete history while share is active" : "Completely delete this entry from your transfer history"}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {!showAllShares[group.filePathsKey] && group.shares.length > 2 && (
                  <button
                    className="history-show-older-shares-btn"
                    onClick={() => toggleShowAllShares(group.filePathsKey)}
                    title={`Show older shares (${group.shares.length - 2} more)`}
                  >
                    <ChevronIcon />
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>{group.shares.length - 2}</span>
                  </button>
                )}
                
                {showAllShares[group.filePathsKey] && group.shares.length > 2 && (
                  <button
                    className="history-show-older-shares-btn expanded"
                    onClick={() => toggleShowAllShares(group.filePathsKey)}
                    title="Hide older shares"
                  >
                    <ChevronIcon />
                  </button>
                )}
              </div>
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
        {loading && filteredGroups.length === 0 && (
          <div className="history-empty-state">Loading transfers history…</div>
        )}
        {!loading && filteredGroups.length === 0 && (
          <div className="history-empty-state">
            {items.length === 0 ? "No history" : `No transfers found matching "${searchQuery}"`}
          </div>
        )}

        {today.length > 0 && (
          <div className="history-group">
            <h4 className="history-group-title">Today</h4>
            <div className="history-group-rows">{today.map(renderGroupRow)}</div>
          </div>
        )}

        {yesterday.length > 0 && (
          <div className="history-group">
            <h4 className="history-group-title">Yesterday</h4>
            <div className="history-group-rows">{yesterday.map(renderGroupRow)}</div>
          </div>
        )}

        {older.length > 0 && (
          <div className="history-group">
            <h4 className="history-group-title">Older</h4>
            <div className="history-group-rows">{older.map(renderGroupRow)}</div>
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
