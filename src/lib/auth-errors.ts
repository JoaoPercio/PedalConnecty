/**
 * Traduz erros de autenticação do Supabase para mensagens em português.
 *
 * A tradução é feita prioritariamente pelo `code` do AuthError (estável entre
 * versões) e, como fallback, pelo texto da mensagem em inglês.
 */

const DEFAULT_MESSAGE = "Ocorreu um erro inesperado. Tente novamente.";

const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.",
  user_already_exists: "Já existe uma conta cadastrada com este e-mail.",
  email_exists: "Já existe uma conta cadastrada com este e-mail.",
  identity_already_exists: "Esta conta já está vinculada a outro usuário.",
  user_not_found: "Usuário não encontrado.",
  user_banned: "Esta conta está bloqueada. Entre em contato com o suporte.",
  weak_password:
    "A senha é muito fraca. Use pelo menos 6 caracteres, combinando letras e números.",
  same_password: "A nova senha deve ser diferente da senha atual.",
  email_address_invalid: "Informe um endereço de e-mail válido.",
  email_address_not_authorized: "Este endereço de e-mail não está autorizado.",
  validation_failed: "Os dados informados são inválidos. Verifique e tente novamente.",
  signup_disabled: "Novos cadastros estão temporariamente desativados.",
  email_provider_disabled: "O login por e-mail está desativado no momento.",
  provider_disabled: "Este método de login está desativado no momento.",
  oauth_provider_not_supported: "Este provedor de login não é suportado.",
  bad_oauth_state: "Não foi possível concluir o login. Tente novamente.",
  bad_oauth_callback: "Não foi possível concluir o login. Tente novamente.",
  flow_state_not_found: "A sessão de login expirou. Tente novamente.",
  flow_state_expired: "A sessão de login expirou. Tente novamente.",
  bad_code_verifier: "Não foi possível concluir o login. Tente novamente.",
  session_not_found: "Sua sessão expirou. Faça login novamente.",
  session_expired: "Sua sessão expirou. Faça login novamente.",
  refresh_token_not_found: "Sua sessão expirou. Faça login novamente.",
  refresh_token_already_used: "Sua sessão expirou. Faça login novamente.",
  bad_jwt: "Sua sessão é inválida. Faça login novamente.",
  reauthentication_needed:
    "Por segurança, faça login novamente antes de alterar a senha.",
  reauthentication_not_valid: "Código de verificação inválido.",
  otp_expired: "O link ou código expirou. Solicite um novo.",
  otp_disabled: "O login por código está desativado.",
  captcha_failed: "Falha na verificação de segurança. Tente novamente.",
  over_request_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.",
  over_email_send_rate_limit:
    "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente novamente.",
  over_sms_send_rate_limit:
    "Muitas mensagens enviadas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  request_timeout: "O servidor demorou para responder. Tente novamente.",
  hook_timeout: "O servidor demorou para responder. Tente novamente.",
  hook_timeout_after_retry: "O servidor demorou para responder. Tente novamente.",
  unexpected_failure: DEFAULT_MESSAGE,
};

/** Fallback por trecho da mensagem (quando o servidor não envia `code`). */
const MESSAGES_BY_TEXT: Array<[RegExp, string]> = [
  [/invalid login credentials/i, MESSAGES_BY_CODE.invalid_credentials],
  [/email not confirmed/i, MESSAGES_BY_CODE.email_not_confirmed],
  [/user already registered|already been registered/i, MESSAGES_BY_CODE.user_already_exists],
  [/password should be at least (\d+)/i, "A senha deve ter pelo menos $1 caracteres."],
  [/password should contain/i, "A senha deve conter letras maiúsculas, minúsculas, números e símbolos."],
  [/new password should be different/i, MESSAGES_BY_CODE.same_password],
  [/unable to validate email|invalid email|email address .* is invalid/i, MESSAGES_BY_CODE.email_address_invalid],
  [/signups not allowed/i, MESSAGES_BY_CODE.signup_disabled],
  [/user not found/i, MESSAGES_BY_CODE.user_not_found],
  [/token has expired|link is invalid or has expired/i, MESSAGES_BY_CODE.otp_expired],
  [/auth session missing|session.*(not found|expired)/i, MESSAGES_BY_CODE.session_expired],
  [/email rate limit exceeded/i, MESSAGES_BY_CODE.over_email_send_rate_limit],
  [/rate limit|too many requests/i, MESSAGES_BY_CODE.over_request_rate_limit],
  [/failed to fetch|network ?error|load failed|fetch failed/i, "Sem conexão com o servidor. Verifique sua internet e tente novamente."],
];

type AuthLikeError = { message?: string; code?: string; status?: number } | null | undefined;

export function getAuthErrorMessage(error: AuthLikeError): string {
  if (!error) return DEFAULT_MESSAGE;

  // "For security purposes, you can only request this after 42 seconds."
  const wait = error.message?.match(/after (\d+) seconds?/i);
  if (wait) {
    return `Por segurança, aguarde ${wait[1]} segundos antes de tentar novamente.`;
  }

  if (error.code && MESSAGES_BY_CODE[error.code]) {
    return MESSAGES_BY_CODE[error.code];
  }

  const message = error.message ?? "";
  for (const [pattern, translated] of MESSAGES_BY_TEXT) {
    const match = message.match(pattern);
    if (match) return translated.replace("$1", match[1] ?? "");
  }

  // Erro de rede do cliente (AuthRetryableFetchError) chega com status 0.
  if (error.status === 0) {
    return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
  }
  if (error.status === 429) return MESSAGES_BY_CODE.over_request_rate_limit;
  if (error.status && error.status >= 500) {
    return "O servidor está indisponível no momento. Tente novamente mais tarde.";
  }

  return DEFAULT_MESSAGE;
}
