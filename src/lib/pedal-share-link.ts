export function isShareInviteToken(token: string): boolean {
  return /^[0-9a-f]{64}$/i.test(token);
}

/**
 * Monta o link a partir do origin recebido. No browser, passe `getSiteOrigin()`
 * para acompanhar localhost, produção ou preview sem URL fixa.
 */
export function buildPedalInviteUrl(origin: string, token: string): string {
  const path = `/convite/${token}`;
  const base = origin.trim().replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path}`;
}

export function buildInviteShareMessage(input: {
  link: string;
  allowsDirectJoin: boolean;
}): string {
  const access = input.allowsDirectJoin
    ? "Este convite do organizador permite entrar diretamente no pedal."
    : "Este convite permite solicitar participação. O organizador precisa aprovar o pedido.";

  return [
    "🚴 Você foi convidado para participar de um pedal no PedalConnect!",
    "",
    access,
    "",
    "Acesse o link abaixo para conferir o pedal e participar:",
    "",
    input.link,
    "",
    "Te vejo no pedal! 🚴",
  ].join("\n");
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function canUseWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
