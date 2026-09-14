import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

/** True when running inside the Tauri desktop shell (not a regular browser). */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function extensionsFromAccept(accept: string): string[] {
  return accept
    .split(",")
    .map((s) => s.trim().replace(/^\./, ""))
    .filter(Boolean);
}

/**
 * Opens the OS-native file picker (Tauri's dialog plugin) and returns the
 * chosen file as a browser `File`, reading its bytes via the fs plugin —
 * the dialog plugin grants read scope for exactly the path it returns. Used
 * in place of `<input type="file">` inside the desktop shell (110 Part C);
 * callers should check `isDesktop()` first and keep the HTML input as the
 * browser fallback.
 */
export async function pickNativeFile(accept: string): Promise<File | null> {
  const extensions = extensionsFromAccept(accept);
  const path = await open({
    multiple: false,
    filters: extensions.length ? [{ name: "Supported files", extensions }] : undefined,
  });
  if (!path || Array.isArray(path)) return null;

  const bytes = await readFile(path);
  const name = path.split(/[\\/]/).pop() ?? path;
  return new File([bytes], name);
}
