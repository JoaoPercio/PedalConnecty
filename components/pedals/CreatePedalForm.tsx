"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createPedal, uploadPedalCover, updatePedalCoverUrl } from "@/lib/pedals";
import { PedalFormWizard, EMPTY_PEDAL_FORM, type PedalFormSubmit } from "./PedalFormWizard";

export function CreatePedalForm() {
  const { user } = useAuth();
  const router = useRouter();
  /** Pedal já inserido: um novo clique em "Publicar" não pode criar duplicado. */
  const createdPedalIdRef = useRef<string | null>(null);

  async function handleSubmit({ fields, coverFile }: PedalFormSubmit): Promise<boolean> {
    if (!user) {
      toast.error("Faça login para publicar.");
      return false;
    }

    let pedalId = createdPedalIdRef.current;
    if (!pedalId) {
      const { pedalId: newId, error: createError } = await createPedal({
        ...fields,
        creator_id: user.id,
        cover_image_url: null,
      });
      if (!newId) {
        toast.error("Não foi possível publicar o pedal. Tente novamente.", {
          description: createError?.message,
        });
        return false;
      }
      pedalId = newId;
      createdPedalIdRef.current = newId;
      if (createError) {
        // Pedal foi criado; só a inscrição do organizador falhou.
        toast.warning("Pedal criado, mas não foi possível adicionar você como participante.", {
          description: createError.message,
        });
      }
    }

    if (coverFile) {
      const { coverImageUrl, error: uploadErr } = await uploadPedalCover(pedalId, coverFile);
      const { error: coverUrlErr } =
        !uploadErr && coverImageUrl
          ? await updatePedalCoverUrl(pedalId, coverImageUrl)
          : { error: uploadErr };
      if (coverUrlErr) {
        toast.warning("Pedal publicado, mas não foi possível enviar a imagem de capa.", {
          description: "Você pode adicioná-la depois em Editar pedal.",
        });
      }
    }

    toast.success("Pedal publicado!");
    router.replace(`/pedals/${pedalId}`);
    return true;
  }

  if (!user) return null;

  return (
    <PedalFormWizard
      mode="create"
      initial={EMPTY_PEDAL_FORM}
      exitHref="/home"
      onSubmit={handleSubmit}
    />
  );
}
