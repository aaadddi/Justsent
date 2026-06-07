import type { DragEvent, KeyboardEvent } from "react";
import { CloudUploadIcon } from "../assets/icons";

type DropZoneProps = {
  isDragging: boolean;
  onBrowse: () => void;
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  variant?: "large" | "compact";
};

export default function DropZone({
  isDragging,
  onBrowse,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  variant = "large",
}: DropZoneProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onBrowse();
    }
  };

  return (
    <section
      className={`drop-zone ${variant} ${isDragging ? "dragging" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onBrowse}
      onKeyDown={handleKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="drop-zone-inner">
        <div className="drop-zone-icon-wrapper">
          <CloudUploadIcon />
        </div>
        <h2 className="drop-zone-title">{isDragging ? "Release to add files" : "Drop files here"}</h2>
        <p className="drop-zone-subtitle">or click to browse</p>
      </div>
    </section>
  );
}
