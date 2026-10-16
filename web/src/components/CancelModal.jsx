import { useEffect, useRef } from "react";

export function CancelModal({ open, appointment, busy, onCancel, onConfirm }) {
  const confirmRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    confirmRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus?.();
    };
  }, [open, onCancel]);

  if (!open || !appointment) return null;

  const otherName = appointment.patient?.name || appointment.doctor?.name;
  const when = `${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}`;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="cancel-modal-title">Cancel this visit?</h3>
        <p className="muted">
          {otherName} — {when}
        </p>
        <div className="modal-actions">
          <button ref={confirmRef} disabled={busy} onClick={onConfirm}>
            {busy ? "Cancelling…" : "Yes, cancel it"}
          </button>
          <button type="button" className="ghost compact" onClick={onCancel}>
            Keep appointment
          </button>
        </div>
      </div>
    </div>
  );
}
