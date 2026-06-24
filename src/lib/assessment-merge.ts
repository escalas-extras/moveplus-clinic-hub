type AssessmentMergeSource = "form" | "wizard";

type MergeOptions = {
  source: AssessmentMergeSource;
};

const FORM_CLEARABLE_FIELDS = new Set([
  "antecedentes_familiares",
  "antecedentes_pessoais",
  "cirurgias",
  "condutas",
  "diagnostico_clinico",
  "diagnostico_fisio",
  "estatura",
  "eva",
  "exames_complementares",
  "habitos_vida",
  "historia_clinica",
  "hma",
  "hmp",
  "imc",
  "inspecao",
  "med_cintura",
  "med_quadril",
  "medicamentos",
  "medico_responsavel",
  "nivel_consciencia",
  "objetivos",
  "observacoes_gerais",
  "palpacao",
  "peso",
  "queixa_principal",
  "recursos_terapeuticos",
  "semiologia",
  "tem_exames",
  "testes_especificos",
  "teve_cirurgias",
  "tipo",
  "tratamentos_realizados",
  "usa_medicamentos",
]);

const CLINICAL_JSON_FIELDS = new Set([
  "avaliacao_algica",
  "doencas_previas",
  "exame_fisico",
  "executive_summary",
  "habitos_anamnese",
  "postura_alinhamento",
  "rom_goniometry",
  "scales_results",
  "signatures",
  "sinais_vitais",
  "strength_mrc",
  "therapeutic_goals",
]);

const FORM_ARRAY_FIELDS = new Set([
  "apresentacao",
  "avaliacao_algica",
  "doencas_previas",
  "inspecao_flags",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyValue(value: unknown) {
  return value === null || value === "";
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return [...value] as T;
  if (isPlainObject(value)) return { ...value } as T;
  return value;
}

function mergeValue(existing: unknown, incoming: unknown, opts: MergeOptions, path: string[]): unknown {
  if (incoming === undefined) return cloneValue(existing);

  if (Array.isArray(incoming)) {
    if (opts.source === "wizard") return cloneValue(existing);
    const field = path[0];
    if (FORM_ARRAY_FIELDS.has(field) || CLINICAL_JSON_FIELDS.has(field)) return cloneValue(incoming);
    return cloneValue(incoming);
  }

  if (isPlainObject(incoming)) {
    const base = isPlainObject(existing) ? existing : {};
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(incoming)) {
      merged[key] = mergeValue(base[key], value, opts, [...path, key]);
    }
    return merged;
  }

  if (isEmptyValue(incoming)) {
    if (opts.source !== "form") return cloneValue(existing);
    if (path.length === 1 && FORM_CLEARABLE_FIELDS.has(path[0])) return incoming;
    if (path.length > 1 && CLINICAL_JSON_FIELDS.has(path[0])) return incoming;
    return cloneValue(existing);
  }

  return incoming;
}

export function mergeAssessmentUpdate<T extends Record<string, any>>(
  existing: T | null | undefined,
  patch: Record<string, any>,
  opts: MergeOptions,
): Record<string, any> {
  const base = existing ?? {};
  const merged: Record<string, any> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    merged[key] = mergeValue(base[key], value, opts, [key]);
  }

  return merged;
}

function stableJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function buildAssessmentAuditDetails(args: {
  existing?: Record<string, any> | null;
  merged: Record<string, any>;
  patch: Record<string, any>;
  source: AssessmentMergeSource;
  finalize: boolean;
}) {
  const changedFields = Object.keys(args.patch).filter((key) => (
    stableJson(args.existing?.[key]) !== stableJson(args.merged[key])
  ));

  const preservedFields = Object.keys(args.patch).filter((key) => (
    stableJson(args.existing?.[key]) === stableJson(args.merged[key])
    && stableJson(args.patch[key]) !== stableJson(args.existing?.[key])
  ));

  return {
    source: args.source,
    finalize: args.finalize,
    changed_fields: changedFields,
    preserved_fields: preservedFields,
  };
}
