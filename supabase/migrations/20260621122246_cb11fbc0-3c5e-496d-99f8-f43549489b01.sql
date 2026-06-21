
-- ============================================================
-- BLOCO E: provisionamento padrão de novas clínicas
-- ============================================================

-- 1) Função de seed: cria um conjunto genérico de templates default
--    por clínica. Idempotente: só insere o que ainda não existir
--    como default para a clínica.
CREATE OR REPLACE FUNCTION public.seed_default_document_templates(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layout_signed jsonb := '{"footer":true,"header":true,"qr_code":true,"signatures":["profissional"],"page_numbers":true}'::jsonb;
  v_layout_both   jsonb := '{"footer":true,"header":true,"qr_code":true,"signatures":["profissional","paciente"],"page_numbers":true}'::jsonb;
BEGIN
  IF _clinic_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND doc_type='avaliacao_inicial' AND is_default AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'avaliacao_inicial', 'Avaliação Inicial Padrão', true,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Data:** {{data_atual}}  \n**Profissional:** {{profissional_nome}}"},{"order":2,"title":"Queixa Principal","content":"{{queixa_principal}}"},{"order":3,"title":"HMA / HMP","content":""},{"order":4,"title":"Exame Físico","content":""},{"order":5,"title":"Hipótese diagnóstica","content":"{{diagnostico}}"},{"order":6,"title":"Plano Terapêutico","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND doc_type='reavaliacao' AND is_default AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'reavaliacao', 'Reavaliação Padrão', true,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Data:** {{data_atual}}  \n**Profissional:** {{profissional_nome}}"},{"order":2,"title":"Evolução Funcional","content":"Comparativo de escalas e ganhos do período."},{"order":3,"title":"Plano Atualizado","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND doc_type='evolucao' AND is_default AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'evolucao', 'Evolução Fisioterapêutica', true,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Sessão de:** {{data_atual}}"},{"order":2,"title":"Conduta","content":""},{"order":3,"title":"Resposta do paciente","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND doc_type='relatorio' AND is_default AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'relatorio', 'Relatório Fisioterapêutico', true,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Profissional:** {{profissional_nome}}  \n**Data:** {{data_atual}}"},{"order":2,"title":"Histórico","content":""},{"order":3,"title":"Evolução","content":""},{"order":4,"title":"Conclusão","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND doc_type='alta' AND is_default AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'alta', 'Alta Fisioterapêutica', true,
      '[{"order":1,"title":"Alta","content":"**Paciente:** {{paciente_nome}}  \n**Diagnóstico:** {{diagnostico}}  \n**Data de alta:** {{data_atual}}"},{"order":2,"title":"Objetivos alcançados","content":"{{objetivos}}"},{"order":3,"title":"Orientações pós-alta","content":""}]'::jsonb,
      v_layout_both);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND doc_type='encaminhamento' AND is_default AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'encaminhamento', 'Encaminhamento', true,
      '[{"order":1,"title":"Encaminhamento","content":"Encaminhamos o(a) paciente **{{paciente_nome}}** para avaliação."},{"order":2,"title":"Motivo","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND doc_type='parecer' AND is_default AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'parecer', 'Parecer Técnico', true,
      '[{"order":1,"title":"Parecer","content":"Parecer técnico referente a **{{paciente_nome}}**."},{"order":2,"title":"Análise","content":""},{"order":3,"title":"Conclusão","content":""}]'::jsonb,
      v_layout_signed);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_default_document_templates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_default_document_templates(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_default_document_templates(uuid) TO authenticated;

-- 2) Atualiza provision_clinic para chamar o seeder ao final.
CREATE OR REPLACE FUNCTION public.provision_clinic(
  _nome text,
  _plan_code text DEFAULT 'starter'::text,
  _owner_user_id uuid DEFAULT NULL::uuid,
  _nome_fantasia text DEFAULT NULL::text,
  _cidade text DEFAULT NULL::text,
  _estado text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
  v_plan_id uuid;
  v_settings_id uuid;
  v_clinic_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito a super_admin';
  END IF;

  SELECT id INTO v_plan_id FROM public.plans WHERE code = _plan_code AND active = true;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'Plano % inexistente ou inativo', _plan_code; END IF;

  v_slug := public.generate_clinic_slug(_nome);

  -- branding neutro: defaults da tabela cuidam de primary_color/slogan/app_name
  INSERT INTO public.clinic_settings (nome_fantasia, cidade, estado)
  VALUES (COALESCE(NULLIF(_nome_fantasia,''), _nome), _cidade, _estado)
  RETURNING id INTO v_settings_id;

  INSERT INTO public.clinics (nome, slug, plan, settings_id, active, status)
  VALUES (_nome, v_slug, _plan_code, v_settings_id, true, 'active')
  RETURNING id INTO v_clinic_id;

  UPDATE public.clinic_settings SET clinic_id = v_clinic_id WHERE id = v_settings_id;

  INSERT INTO public.clinic_plans (clinic_id, plan_id, status)
  VALUES (v_clinic_id, v_plan_id, 'active');

  IF _owner_user_id IS NOT NULL THEN
    INSERT INTO public.clinic_members (clinic_id, user_id, role, is_default, active)
    VALUES (v_clinic_id, _owner_user_id, 'owner', false, true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Templates default genéricos da clínica
  PERFORM public.seed_default_document_templates(v_clinic_id);

  RETURN v_clinic_id;
END
$function$;
