-- Amplia seed canônico de modelos de documentos para emissão.
-- Idempotente: insere apenas o que não existir (por clinic_id + name + is_active).
-- Não altera modelos customizados existentes. Não copia dados entre clínicas.

CREATE OR REPLACE FUNCTION public.seed_default_document_templates(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_layout_signed jsonb := '{"footer":true,"header":true,"qr_code":true,"signatures":["profissional"],"page_numbers":true}'::jsonb;
  v_layout_both   jsonb := '{"footer":true,"header":true,"qr_code":true,"signatures":["profissional","paciente"],"page_numbers":true}'::jsonb;
BEGIN
  IF _clinic_id IS NULL THEN RETURN; END IF;

  -- ============ DEFAULTS POR TIPO (um is_default por doc_type) ============

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

  -- ============ EXTRAS CANÔNICOS GENÉRICOS (não-default) ============
  -- Inseridos por (clinic_id, name) — não duplica e não sobrescreve customizados.

  -- Atestado de Comparecimento
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Declaração de Comparecimento' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'parecer', 'Declaração de Comparecimento', false,
      '[{"order":1,"title":"Declaração","content":"Declaro, para os devidos fins, que **{{paciente_nome}}** compareceu a atendimento fisioterapêutico nesta data (**{{data_atual}}**), no horário das ____ às ____."},{"order":2,"title":"Observações","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  -- Atestado Fisioterapêutico
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Atestado Fisioterapêutico' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'parecer', 'Atestado Fisioterapêutico', false,
      '[{"order":1,"title":"Atestado","content":"Atesto, para os devidos fins, que **{{paciente_nome}}** esteve sob meus cuidados fisioterapêuticos em **{{data_atual}}**, necessitando de afastamento de suas atividades por ____ dia(s)."},{"order":2,"title":"CID / Justificativa","content":"{{diagnostico}}"}]'::jsonb,
      v_layout_signed);
  END IF;

  -- TCLE
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Termo de Consentimento Livre e Esclarecido (TCLE)' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'parecer', 'Termo de Consentimento Livre e Esclarecido (TCLE)', false,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Profissional responsável:** {{profissional_nome}}  \n**Data:** {{data_atual}}"},{"order":2,"title":"Esclarecimento","content":"O(a) paciente foi informado(a) sobre a natureza, objetivos, benefícios, riscos e alternativas do tratamento fisioterapêutico proposto."},{"order":3,"title":"Consentimento","content":"Declaro estar ciente e de acordo com a realização do tratamento, podendo retirar o consentimento a qualquer momento, sem prejuízo do atendimento."}]'::jsonb,
      v_layout_both);
  END IF;

  -- Termo de Uso de Imagem
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Termo de Consentimento para Uso de Imagem' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'parecer', 'Termo de Consentimento para Uso de Imagem', false,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Data:** {{data_atual}}"},{"order":2,"title":"Autorização","content":"Autorizo o uso de minha imagem (fotografias e/ou vídeos) para fins de registro clínico, ensino, pesquisa e divulgação institucional, sem finalidade comercial, preservada a confidencialidade conforme legislação vigente."},{"order":3,"title":"Revogação","content":"Esta autorização pode ser revogada a qualquer momento mediante solicitação por escrito."}]'::jsonb,
      v_layout_both);
  END IF;

  -- Contrato de Prestação de Serviços
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Contrato de Prestação de Serviços Fisioterapêuticos' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'parecer', 'Contrato de Prestação de Serviços Fisioterapêuticos', false,
      '[{"order":1,"title":"Partes","content":"**Contratante:** {{contratante_nome}} ({{contratante_cpf}})  \n**Contratado:** {{profissional_nome}} — CREFITO {{profissional_registro}}  \n**Paciente:** {{paciente_nome}}"},{"order":2,"title":"Objeto","content":"Prestação de serviços de fisioterapia, conforme plano terapêutico individualizado."},{"order":3,"title":"Sessões e Valores","content":"Quantidade de sessões: ____  \nValor por sessão: R$ ____  \nForma de pagamento: ____"},{"order":4,"title":"Obrigações","content":"O contratante compromete-se com a assiduidade. O contratado compromete-se com sigilo, ética profissional e padrões técnicos vigentes."},{"order":5,"title":"Disposições Gerais","content":"Foro de eleição: comarca local. Data: **{{data_atual}}**."}]'::jsonb,
      v_layout_both);
  END IF;

  -- Relatório para INSS
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Relatório para INSS' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'relatorio', 'Relatório para INSS', false,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Data:** {{data_atual}}  \n**Profissional:** {{profissional_nome}} — CREFITO {{profissional_registro}}"},{"order":2,"title":"Diagnóstico e CID","content":"{{diagnostico}}"},{"order":3,"title":"Histórico Clínico","content":""},{"order":4,"title":"Limitações Funcionais","content":""},{"order":5,"title":"Conduta e Prognóstico","content":""},{"order":6,"title":"Conclusão","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  -- Relatório Funcional
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Relatório Funcional' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'relatorio', 'Relatório Funcional', false,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Data:** {{data_atual}}"},{"order":2,"title":"Avaliação Funcional","content":"Descrição das capacidades e limitações funcionais (AVDs, marcha, equilíbrio, força)."},{"order":3,"title":"Escalas Aplicadas","content":""},{"order":4,"title":"Conclusão","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  -- Plano Terapêutico
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Plano Terapêutico' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'relatorio', 'Plano Terapêutico', false,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Profissional:** {{profissional_nome}}  \n**Data:** {{data_atual}}"},{"order":2,"title":"Objetivos","content":"{{objetivos}}"},{"order":3,"title":"Condutas Propostas","content":""},{"order":4,"title":"Frequência e Duração","content":""},{"order":5,"title":"Reavaliação","content":""}]'::jsonb,
      v_layout_signed);
  END IF;

  -- Orientações Domiciliares
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE clinic_id=_clinic_id AND name='Orientações Domiciliares' AND is_active) THEN
    INSERT INTO public.document_templates (clinic_id, doc_type, name, is_default, sections, layout_config)
    VALUES (_clinic_id, 'relatorio', 'Orientações Domiciliares', false,
      '[{"order":1,"title":"Identificação","content":"**Paciente:** {{paciente_nome}}  \n**Data:** {{data_atual}}"},{"order":2,"title":"Orientações","content":"Lista de exercícios e cuidados domiciliares prescritos."},{"order":3,"title":"Precauções","content":""},{"order":4,"title":"Quando contatar o profissional","content":""}]'::jsonb,
      v_layout_signed);
  END IF;
END;
$function$;

-- Re-semeia todas as clínicas ativas com o arcabouço ampliado.
-- A função é idempotente (NOT EXISTS por nome) — não duplica nem altera customizados.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clinics WHERE status <> 'deleted' LOOP
    PERFORM public.seed_default_document_templates(r.id);
  END LOOP;
END $$;