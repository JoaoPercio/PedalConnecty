"use client";

interface MapZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
}

export function MapZoomControls({
  onZoomIn,
  onZoomOut,
  onLocate,
}: MapZoomControlsProps) {
  return (
    <div className="absolute right-3 top-1/2 z-[500] flex -translate-y-1/2 flex-col gap-2">
      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-surface text-lg font-semibold text-primary shadow-md transition-colors hover:bg-gray-50"
        aria-label="Aumentar zoom"
      >
        +
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-surface text-lg font-semibold text-primary shadow-md transition-colors hover:bg-gray-50"
        aria-label="Diminuir zoom"
      >
        −
      </button>
      <button
        type="button"
        onClick={onLocate}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-surface text-primary shadow-md transition-colors hover:bg-gray-50"
        aria-label="Centralizar na minha localização"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        </svg>
      </button>
    </div>
  );
}
