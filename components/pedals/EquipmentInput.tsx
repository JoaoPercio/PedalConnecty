"use client";

import { useState, useCallback, KeyboardEvent } from "react";

interface EquipmentInputProps {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function EquipmentInput({
  value,
  onChange,
  placeholder = "Ex: capacete, kit de reparo, lanterna…",
  label = "Equipamento obrigatório",
}: EquipmentInputProps) {
  const [input, setInput] = useState("");

  const addItem = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) {
      setInput("");
      return;
    }
    onChange([...value, trimmed]);
    setInput("");
  }, [input, value, onChange]);

  const removeItem = useCallback(
    (item: string) => {
      onChange(value.filter((i) => i !== item));
    },
    [value, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-surface p-2 focus-within:ring-2 focus-within:ring-primary/30">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-sm text-foreground"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(item)}
              className="rounded p-0.5 text-text-secondary hover:bg-primary/20 hover:text-foreground"
              aria-label={`Remover ${item}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addItem}
          placeholder={value.length === 0 ? placeholder : "Adicionar…"}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-2 py-1 text-foreground placeholder:text-text-secondary focus:outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-text-secondary">Pressione Enter para adicionar</p>
    </div>
  );
}

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
