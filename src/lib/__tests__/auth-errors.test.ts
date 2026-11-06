import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "../auth-errors";

describe("getAuthErrorMessage", () => {
  it("traduz pelo code", () => {
    expect(getAuthErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }))
      .toBe("E-mail ou senha incorretos.");
  });

  it("traduz pela mensagem quando não há code", () => {
    expect(getAuthErrorMessage({ message: "User already registered" }))
      .toBe("Já existe uma conta cadastrada com este e-mail.");
    expect(getAuthErrorMessage({ message: "Password should be at least 6 characters." }))
      .toBe("A senha deve ter pelo menos 6 caracteres.");
  });

  it("extrai o tempo de espera do rate limit", () => {
    expect(getAuthErrorMessage({
      code: "over_email_send_rate_limit",
      message: "For security purposes, you can only request this after 42 seconds.",
    })).toBe("Por segurança, aguarde 42 segundos antes de tentar novamente.");
  });

  it("trata erro de rede e desconhecidos", () => {
    expect(getAuthErrorMessage({ message: "Failed to fetch", status: 0 })).toMatch(/Sem conexão/);
    expect(getAuthErrorMessage({ message: "something weird" })).toBe("Ocorreu um erro inesperado. Tente novamente.");
  });
});
