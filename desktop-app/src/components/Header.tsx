import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PointerEvent } from "react";

export default function Header() {
    const startWindowDrag = (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest("button"))) {
            return;
        }

        if ("__TAURI_INTERNALS__" in window) {
            void getCurrentWindow().startDragging();
        }
    };

    return (
        <header
            className="titlebar"
            data-tauri-drag-region
            onPointerDown={startWindowDrag}
        />
    );
}
