const EMAIL_RE = /@/;
const JWTISH_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

/**
 * Custom-id sent to Clarity.identify. Official API hashes this on the client.
 * Never include email, name, JWT, or other profile fields.
 */
export function buildClarityIdentifyArgs(technicalId: string): {
  customId: string;
} {
  const customId = technicalId.trim();
  if (!customId) {
    throw new Error("Clarity identify requires a technical id.");
  }
  if (EMAIL_RE.test(customId) || JWTISH_RE.test(customId)) {
    throw new Error("Clarity identify rejected a value that looks like personal or credential data.");
  }
  return { customId };
}

export const CLARITY_FORBIDDEN_IDENTIFY_FIELDS = [
  "email",
  "password",
  "token",
  "jwt",
  "cpf",
  "phone",
  "telefone",
  "address",
  "endereco",
  "friendlyName",
] as const;
