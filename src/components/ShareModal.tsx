import { useRef, useState } from "react";
import type { Dictionary } from "../i18n/ko";
import { encodeStateToHash } from "../lib/shareUrl";
import { exportStateAsJson, parseImportedJson } from "../lib/storage";
import type { LifeState } from "../types/life";

interface ShareModalProps {
  state: LifeState;
  t: Dictionary;
  onImportState: (next: LifeState) => void;
  onClose: () => void;
}

export function ShareModal({
  state,
  t,
  onImportState,
  onClose,
}: ShareModalProps) {
  const [includeNotes, setIncludeNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const shareResult = encodeStateToHash(state, includeNotes, baseUrl);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareResult.fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseImportedJson(text);
    if (!parsed) {
      setStatusMsg(t.importError);
      return;
    }
    onImportState(parsed);
    setStatusMsg(t.importSuccess);
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {t.shareModalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-700"
            aria-label={t.closeBtn}
          >
            ✕
          </button>
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
            className="h-4 w-4 rounded accent-slate-900"
          />
          <span>{t.includeNotesLabel}</span>
        </label>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            readOnly
            value={shareResult.fullUrl}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            {copied ? t.copiedBtn : t.copyLinkBtn}
          </button>
        </div>

        {shareResult.isTooLong && (
          <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            {t.urlTooLongWarning}
          </p>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportStateAsJson(state)}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              {t.exportJsonBtn}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              {t.importJsonBtn}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {statusMsg && (
            <p className="mt-2 text-xs font-medium text-slate-700">{statusMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
