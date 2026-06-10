import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PointerEvent } from "react";
import { useEffect, useState } from "react";

export default function Header() {
    const [isMac, setIsMac] = useState(true);

    useEffect(() => {
        setIsMac(navigator.userAgent.includes("Macintosh"));
    }, []);

    const startWindowDrag = (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest("button"))) {
            return;
        }

        if ("__TAURI_INTERNALS__" in window) {
            void getCurrentWindow().startDragging();
        }
    };

    const handleMinimize = () => {
        if ("__TAURI_INTERNALS__" in window) {
            void getCurrentWindow().minimize();
        }
    };

    const handleMaximize = () => {
        if ("__TAURI_INTERNALS__" in window) {
            void getCurrentWindow().toggleMaximize();
        }
    };

    const handleClose = () => {
        if ("__TAURI_INTERNALS__" in window) {
            void getCurrentWindow().close();
        }
    };

    return (
        <header
            className={`titlebar ${isMac ? "is-mac" : "is-win"}`}
            data-tauri-drag-region
            onPointerDown={startWindowDrag}
        >
            {isMac ? (
                <div className="titlebar-controls mac-controls">
                    <button className="control-btn mac-close" onClick={handleClose} aria-label="Close">
                        <svg width="6" height="6" viewBox="0 0 6 6">
                            <path d="M1.5 1.5 L4.5 4.5 M4.5 1.5 L1.5 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                    </button>
                    <button className="control-btn mac-minimize" onClick={handleMinimize} aria-label="Minimize">
                        <svg width="6" height="1" viewBox="0 0 6 1">
                            <line x1="0" y1="0.5" x2="6" y2="0.5" stroke="currentColor" strokeWidth="1"/>
                        </svg>
                    </button>
                    <button className="control-btn mac-maximize" onClick={handleMaximize} aria-label="Maximize">
                        <svg width="6" height="6" viewBox="0 0 6 6">
                            <rect x="0.5" y="0.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1"/>
                        </svg>
                    </button>
                </div>
            ) : (
                <div className="titlebar-controls win-controls">
                    <button className="control-btn win-minimize" onClick={handleMinimize} aria-label="Minimize">
                        <svg width="10" height="10" viewBox="0 0 10 10">
                            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1"/>
                        </svg>
                    </button>
                    <button className="control-btn win-maximize" onClick={handleMaximize} aria-label="Maximize">
                        <svg width="10" height="10" viewBox="0 0 10 10">
                            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/>
                        </svg>
                    </button>
                    <button className="control-btn win-close" onClick={handleClose} aria-label="Close">
                        <svg width="10" height="10" viewBox="0 0 10 10">
                            <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1"/>
                        </svg>
                    </button>
                </div>
            )}
        </header>
    );
}
