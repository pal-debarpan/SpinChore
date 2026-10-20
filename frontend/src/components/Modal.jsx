import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center">
      <button className="absolute inset-0" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="dialog-title" className="font-display text-2xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
