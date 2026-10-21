"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@/lib/icons";

/**
 * T37 — add/edit surface shared by Income, Expenses and Savings.
 *
 * Native `<dialog>` on desktop and a bottom sheet below the `sm` breakpoint.
 * The browser traps focus while `showModal()` is active; Escape and a backdrop
 * click cancel, and focus returns to the trigger when the dialog unmounts.
 */
export default function FormDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <FormDialogSurface title={title} description={description} onClose={onClose}>
      {children}
    </FormDialogSurface>
  );
}

function FormDialogSurface({
  onClose,
  title,
  description,
  children,
}: {
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();

    // Prefer the form's marked field; the close button comes first in the DOM
    // and would otherwise steal focus from the first input.
    const first =
      dialog.querySelector<HTMLElement>("[data-autofocus]") ??
      dialog.querySelector<HTMLElement>(
        "input:not([type='hidden']), select, textarea, button",
      );
    first?.focus();

    return () => {
      if (dialog.open) dialog.close();
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
        onClose();
      }}
      onClick={(event) => {
        // Clicks on the backdrop target the dialog element itself.
        if (event.target === dialogRef.current) onClose();
      }}
      className="dialog-panel dialog-sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-dialog border border-line bg-surface-raised p-0 text-ink sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:max-w-xl sm:rounded-dialog"
      style={{ boxShadow: "var(--shadow-dialog)" }}
    >
      <div className="sticky top-0 z-10 border-b border-line bg-surface-raised/95 backdrop-blur">
        <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="icon-button -mt-1 -mr-1"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </dialog>
  );
}
