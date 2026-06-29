import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Headphones,
  Layers,
  Receipt,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import type { SaasNavTarget } from "./types";

/** Identidade visual do painel plataforma (distinto do módulo clínico). */
export const SAAS_PLATFORM = {
  name: "FisioOS",
  eyebrow: "Plataforma SaaS",
  primaryColor: "#312e81",
  secondaryColor: "#6366f1",
  accent: "#4f46e5",
} as const;

/** Janela padrão para alerta de trials vencendo. */
export const SAAS_TRIAL_EXPIRY_DAYS = 7;

export type SaasNavItem = {
  id: SaasNavTarget;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tab interna existente em /app/admin-saas */
  tab?: string;
  placeholder?: boolean;
};

export const SAAS_NAV_ITEMS: SaasNavItem[] = [
  {
    id: "clinics",
    label: "Clínicas",
    description: "Cadastro, status e operação",
    icon: Building2,
    tab: "clinics",
  },
  {
    id: "catalog",
    label: "Planos",
    description: "Catálogo e preços",
    icon: Layers,
    tab: "catalog",
  },
  {
    id: "trials",
    label: "Trials",
    description: "Períodos de teste ativos",
    icon: Sparkles,
    tab: "clinics",
  },
  {
    id: "plans",
    label: "Assinaturas",
    description: "Contratos por clínica",
    icon: Shield,
    tab: "plans",
  },
  {
    id: "commercial",
    label: "Comercial",
    description: "Receita, risco e vencimentos",
    icon: Receipt,
    tab: "commercial",
  },
  {
    id: "billing",
    label: "Cobranças",
    description: "Faturamento (em breve)",
    icon: Receipt,
    placeholder: true,
  },
  {
    id: "support",
    label: "Suporte",
    description: "Sessões e modo suporte",
    icon: Headphones,
    placeholder: true,
  },
  {
    id: "settings",
    label: "Configurações SaaS",
    description: "Parâmetros globais",
    icon: Settings,
    placeholder: true,
  },
];

export const SAAS_AUDIT_ACTION_LABEL: Record<string, string> = {
  "clinic.provision": "Clínica provisionada",
  "clinic.status_change": "Status alterado",
  "clinic.mark_test": "Marcada como teste",
  "clinic.trial_start": "Trial iniciado",
  "clinic.trial_extend": "Trial estendido",
  "clinic.trial_convert": "Trial convertido",
  "clinic.cancel": "Assinatura cancelada",
  "plan.assign": "Plano atribuído",
  "plan.create": "Plano criado",
  "plan.update": "Plano atualizado",
  "owner.invite": "Convite enviado",
  "owner.change": "Owner alterado",
};
