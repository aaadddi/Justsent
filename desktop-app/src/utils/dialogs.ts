export type ConfirmOptions = {
  title?: string;
  okLabel?: string;
  cancelLabel?: string;
  kind?: "info" | "warning" | "error";
};

/**
 * Shows a confirmation dialog.
 * Uses Tauri native dialog if available, falling back to window.confirm.
 */
export async function showConfirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if ("__TAURI_INTERNALS__" in window) {
    try {
      const { ask } = await import("@tauri-apps/plugin-dialog");
      return await ask(message, {
        title: options.title || "Confirm",
        okLabel: options.okLabel || "OK",
        cancelLabel: options.cancelLabel || "Cancel",
        kind: options.kind || "warning",
      });
    } catch (err) {
      console.error("Failed to show native ask dialog:", err);
    }
  }
  return window.confirm(message);
}
