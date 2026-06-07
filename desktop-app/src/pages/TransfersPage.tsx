import DropZone from "../components/DropZone";
import FileCard from "../components/FileCard";
import { useTransferContext } from "../contexts/TransferContext";

export default function TransfersPage() {
  const {
    isDragging,
    openFileBrowser,
    dragDepth,
    setIsDragging,
    handleDrop,
    selectedFiles,
    toggleActions,
    removeFile,
    startSharing,
    stopSharing,
    toggleShareInternet,
    toggleShareNearby,
    togglePasswordProtected,
    changePasswordValue,
    changeNoteValue,
    highlightActive,
  } = useTransferContext();

  const showDropZone = true;
  const dropZoneVariant = selectedFiles.length === 0 ? "large" : "compact";

  return (
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
        <div className="active-transfers-section">
          <div className="section-header-row">
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
                isHighlighted={highlightActive && file.isSharing && (!!file.shareLink || !!file.localShareLink)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom helper text */}
      <p className="transfers-helper-text">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Your files are transferred securely and directly.</span>
      </p>
    </>
  );
}
