"use client";

import { useRef } from "react";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-surface text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow text-base";

interface AvatarUploadProps {
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function AvatarUpload({
  previewUrl,
  onFileChange,
  disabled,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
  }

  function handleRemove() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`
          w-24 h-24 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center
          bg-gray-50 border-gray-200
          ${previewUrl ? "border-solid border-primary/30" : ""}
        `}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview do avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-text-secondary text-xs text-center px-2">
            Sem foto
          </span>
        )}
      </div>
      <div className="flex gap-2 w-full max-w-[200px]">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
          id="avatar-upload"
        />
        <label
          htmlFor="avatar-upload"
          className={`
            flex-1 py-2.5 rounded-xl text-center text-sm font-medium cursor-pointer transition-opacity
            bg-gray-100 text-foreground hover:bg-gray-200
            ${disabled ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          Escolher
        </label>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-gray-100 disabled:opacity-50"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
