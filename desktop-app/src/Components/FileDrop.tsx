import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export type SelectedFile = {
    name: string;
    size?: number;
    path?: string;
};

type FileDropProps = {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFilesAdded: (files: SelectedFile[]) => void;
};

const getFileName = (path: string) => {
    const normalized = path.replace(/\\/g, "/");
    return normalized.split("/").pop() || path;
};

export default function FileDrop({ fileInputRef, onFilesAdded }: FileDropProps) {

    useEffect(() => {
        if (!("__TAURI_INTERNALS__" in window)) return;

        let cleanup: (() => void) | undefined;
        let cancelled = false;

        async function setupListener() {
            cleanup = await listen<string[] | { paths?: string[] }>("tauri://drag-drop", (event) => {
                const paths = Array.isArray(event.payload) ? event.payload : event.payload.paths;
                if (paths && paths.length > 0) {
                    onFilesAdded(paths.map((path) => ({
                        name: getFileName(path),
                        path,
                    })));
                }
            });

            if (cancelled && cleanup) {
                cleanup();
            }
        }

        setupListener();

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [onFilesAdded]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFilesAdded(Array.from(files).map((file) => ({
                name: file.name,
                size: file.size,
            })));
        }
    };

    return (
        <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
        />
    );
}
