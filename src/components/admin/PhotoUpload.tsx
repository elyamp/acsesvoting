"use client";

import { useRef, useState } from "react";

export default function PhotoUpload({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const payload: unknown = await res.json();
      const data = payload !== null && typeof payload === "object"
        ? payload as Record<string, unknown>
        : null;
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Upload failed.");
      } else if (typeof data?.url !== "string") {
        setError("The upload response was invalid.");
      } else {
        onChange(data.url);
      }
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent-line hover:bg-accent-soft disabled:opacity-60"
        aria-label={value ? "Replace candidate photo" : "Upload candidate photo"}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Candidate photo preview" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-faint" aria-hidden>
            <path
              d="M12 16V8m0 0-3 3m3-3 3 3M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-card/70 text-[10px] font-semibold text-accent-contrast">
            ...
          </span>
        )}
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-surface disabled:opacity-60"
          >
            {busy ? "Uploading..." : value ? "Replace photo" : "Upload photo"}
          </button>
          {value && !busy && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-faint">JPEG, PNG or WebP · up to 5 MB</p>
        {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
