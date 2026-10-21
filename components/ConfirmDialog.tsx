"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle } from "@/lib/icons";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native <dialog> confirmation (T34). Escape and a backdrop click cancel, the
 * browser traps focus while open, and focus returns to the trigger on close.
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    cancelRef.current?.focus();

    return () => {
      if (dialog?.open) dialog.close();
      returnFocusRef.current?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // Clicks on the backdrop target the dialog element itself.
        if (event.target === dialogRef.current) onCancel();
      }}
      className="dialog-panel m-auto w-[calc(100%-2rem)] max-w-md rounded-dialog border border-line bg-surface-raised p-0 text-ink"
      style={{ boxShadow: "var(--shadow-dialog)" }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
            }`}
          >
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

interface ConfirmState extends ConfirmOptions {
  id: number;
}

let nextConfirmId = 1;

/**
 * Promise-based confirmation hook (T34):
 *
 *   const { confirm, dialog } = useConfirm();
 *   const ok = await confirm({ title: "Delete income?", ... });
 *   // render {dialog} once in the page tree
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, id: nextConfirmId++ });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }, []);

  const dialog = state ? (
    <ConfirmDialog
      key={state.id}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      tone={state.tone}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, dialog };
}
