import type { Branding } from "@/lib/branding";

export const AUTH_ENTRY_BRAND: Branding = {
  appName: "FisioOS",
  name: "FisioOS",
  clinicName: "FisioOS",
  slogan: "Transformando atendimentos em resultados.",
  logo: null,
  logoUrl: null,
  hasOwnLogo: false,
  primaryColor: "#0F4C5C",
  secondaryColor: "#2BB673",
  footer: "FisioOS · Transformando atendimentos em resultados.",
  crefitoDefault: null,
};

export function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Verifique os dados e tente novamente.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar ou peça um novo convite ao administrador.";
  }
  return message;
}
