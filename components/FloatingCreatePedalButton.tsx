"use client";

import { FloatingActionButton } from "@/components/FloatingActionButton";

interface FloatingCreatePedalButtonProps {
  className?: string;
  placement?: "fixed" | "inline";
  hideBelowLg?: boolean;
}

export function FloatingCreatePedalButton(props: FloatingCreatePedalButtonProps) {
  return (
    <FloatingActionButton
      {...props}
      href="/pedals/create"
      label="Criar pedal"
      ariaLabel="Criar novo pedal"
      hintKey="pc-create-pedal-hint-shown"
    />
  );
}
