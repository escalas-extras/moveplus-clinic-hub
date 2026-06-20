
-- BLOCO G — retry (only one is_default per doc_type)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS cid_principal text,
  ADD COLUMN IF NOT EXISTS cid_secundario text,
  ADD COLUMN IF NOT EXISTS convenio_nome text,
  ADD COLUMN IF NOT EXISTS convenio_carteirinha text,
  ADD COLUMN IF NOT EXISTS acompanhante_nome text,
  ADD COLUMN IF NOT EXISTS acompanhante_parentesco text;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS prognostico text,
  ADD COLUMN IF NOT EXISTS cid_secundario text;

INSERT INTO public.merge_tags (tag, category, description) VALUES
  ('cid_principal','Clínico','CID principal'),
  ('cid_secundario','Clínico','CID secundário'),
  ('prognostico','Clínico','Prognóstico fisioterapêutico'),
  ('paciente_responsavel','Paciente','Responsável legal'),
  ('paciente_acompanhante','Paciente','Acompanhante'),
  ('paciente_acompanhante_parentesco','Paciente','Parentesco do acompanhante'),
  ('paciente_telefone','Paciente','Telefone do paciente'),
  ('paciente_rg','Paciente','RG do paciente'),
  ('convenio_nome','Convênio','Nome do convênio'),
  ('convenio_carteirinha','Convênio','Número da carteirinha'),
  ('escala_eva','Escalas','EVA - Escala Visual Analógica'),
  ('escala_mrc','Escalas','MRC - Força muscular'),
  ('escala_mif','Escalas','MIF - Medida de Independência Funcional'),
  ('escala_tug','Escalas','TUG - Timed Up and Go'),
  ('escala_meem','Escalas','MEEM - Mini Exame do Estado Mental'),
  ('escala_moca','Escalas','MoCA - Montreal Cognitive Assessment'),
  ('escala_ashworth','Escalas','Ashworth - Tônus / espasticidade'),
  ('escala_borg','Escalas','Borg - Percepção de esforço'),
  ('goniometria','Clínico','Goniometria / ADM'),
  ('motivo_alta','Alta','Motivo da alta'),
  ('objetivos_alcancados','Alta','Objetivos alcançados'),
  ('objetivos_pendentes','Alta','Objetivos pendentes'),
  ('recomendacoes_alta','Alta','Recomendações pós-alta'),
  ('plano_domiciliar','Alta','Plano domiciliar'),
  ('encaminhamento_pos_alta','Alta','Encaminhamento pós-alta'),
  ('data_alta','Alta','Data da alta'),
  ('profissional_especialidade','Profissional','Especialidade'),
  ('profissional_assinatura','Profissional','Assinatura digital'),
  ('clinica_cnpj','Clínica','CNPJ da clínica'),
  ('clinica_razao_social','Clínica','Razão social'),
  ('clinica_email','Clínica','E-mail da clínica'),
  ('clinica_cidade_estado','Clínica','Cidade/UF da clínica')
ON CONFLICT (tag) DO UPDATE SET category=EXCLUDED.category, description=EXCLUDED.description;

DELETE FROM public.document_templates
WHERE sections IS NULL OR jsonb_array_length(COALESCE(sections,'[]'::jsonb)) = 0;

-- Insert with is_default=false everywhere (we'll flip selected ones below)
INSERT INTO public.document_templates (doc_type, name, description, is_active, is_default, version, sections) VALUES

('parecer','Contrato de Prestação de Serviços Fisioterapêuticos','Contrato padrão entre clínica e paciente/responsável',true,false,1,
'[{"order":1,"title":"Partes Contratantes","content":"CONTRATANTE: {{paciente_nome}}, CPF {{paciente_cpf}}, RG {{paciente_rg}}, residente em {{paciente_endereco}}.\n\nCONTRATADA: {{clinica_razao_social}}, CNPJ {{clinica_cnpj}}, sediada em {{clinica_endereco}}, doravante denominada CLÍNICA."},{"order":2,"title":"Objeto","content":"O presente contrato tem por objeto a prestação de serviços fisioterapêuticos pela CLÍNICA ao CONTRATANTE, conforme avaliação realizada em {{data_atual}} e plano terapêutico estabelecido pelo(a) profissional responsável {{profissional_nome}} ({{profissional_crefito}})."},{"order":3,"title":"Plano Terapêutico","content":"Diagnóstico clínico: {{diagnostico}}\nDiagnóstico fisioterapêutico: {{diagnostico_fisio}}\nObjetivos: {{objetivos}}\nCondutas previstas: {{condutas}}"},{"order":4,"title":"Obrigações","content":"A CLÍNICA compromete-se a prestar atendimento ético, técnico e seguro, conforme normas do COFFITO. O CONTRATANTE compromete-se a comparecer às sessões agendadas, seguir as orientações terapêuticas e comunicar qualquer alteração clínica."},{"order":5,"title":"Pagamento e Vigência","content":"Os valores, formas de pagamento e duração serão definidos em termo aditivo específico. O presente contrato vigora a partir da data da assinatura, podendo ser rescindido por qualquer das partes mediante comunicação prévia."},{"order":6,"title":"Foro","content":"Fica eleito o foro de {{clinica_cidade_estado}} para dirimir quaisquer controvérsias decorrentes deste contrato.\n\n{{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb),

('parecer','Termo de Consentimento Livre e Esclarecido (TCLE)','Consentimento para tratamento fisioterapêutico',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}}\nCPF: {{paciente_cpf}}\nResponsável (se aplicável): {{paciente_responsavel}}\nProfissional responsável: {{profissional_nome}} — {{profissional_crefito}}"},{"order":2,"title":"Esclarecimentos","content":"Declaro que fui informado(a) de forma clara e detalhada sobre o diagnóstico ({{diagnostico_fisio}}), o plano terapêutico proposto ({{condutas}}), os objetivos esperados ({{objetivos}}), os possíveis riscos, benefícios, desconfortos e alternativas de tratamento."},{"order":3,"title":"Direitos do Paciente","content":"Tenho ciência de que: (a) posso interromper o tratamento a qualquer momento; (b) tenho direito ao sigilo profissional conforme COFFITO e LGPD; (c) terei acesso ao meu prontuário sempre que solicitar; (d) serei comunicado(a) sobre qualquer alteração no plano terapêutico."},{"order":4,"title":"Consentimento","content":"Declaro estar de acordo com o tratamento fisioterapêutico proposto e autorizo sua execução conforme as condições aqui descritas.\n\n{{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb),

('parecer','Termo de Consentimento para Uso de Imagem','Autorização para uso de imagem em fins clínicos e didáticos',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}}, CPF {{paciente_cpf}}.\nResponsável: {{paciente_responsavel}}."},{"order":2,"title":"Autorização","content":"Autorizo a {{clinica_nome}} ({{clinica_cnpj}}) a captar, armazenar e utilizar minha imagem (fotografias e/ou vídeos) para os seguintes fins: (a) registro clínico e acompanhamento evolutivo; (b) finalidades didáticas, científicas e educacionais; (c) divulgação institucional, desde que preservada minha identificação quando aplicável."},{"order":3,"title":"Condições","content":"A presente autorização é concedida em caráter gratuito, podendo ser revogada a qualquer momento mediante solicitação por escrito. A clínica compromete-se a tratar as imagens conforme a LGPD (Lei 13.709/2018)."},{"order":4,"title":"Assinatura","content":"{{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb),

('parecer','Termo de Consentimento para Compartilhamento de Dados (LGPD)','Consentimento conforme Lei Geral de Proteção de Dados',true,false,1,
'[{"order":1,"title":"Identificação","content":"Titular dos dados: {{paciente_nome}}, CPF {{paciente_cpf}}.\nControlador: {{clinica_razao_social}}, CNPJ {{clinica_cnpj}}."},{"order":2,"title":"Finalidade do Tratamento","content":"Os dados pessoais e sensíveis (incluindo dados de saúde) serão tratados para: prestação de serviços fisioterapêuticos; emissão de relatórios; cobrança; cumprimento de obrigações legais e regulatórias; e comunicação direta com o titular."},{"order":3,"title":"Compartilhamento","content":"Os dados poderão ser compartilhados com: (a) profissionais da equipe assistencial; (b) operadoras de plano de saúde, quando aplicável; (c) órgãos públicos e médicos assistentes mediante autorização expressa; (d) prestadores de serviço sob obrigação de confidencialidade."},{"order":4,"title":"Direitos do Titular","content":"Tenho ciência dos meus direitos previstos no art. 18 da LGPD, incluindo acesso, correção, anonimização, portabilidade e eliminação dos dados, e da possibilidade de revogar este consentimento a qualquer momento."},{"order":5,"title":"Consentimento","content":"Declaro estar ciente e consinto livremente com o tratamento e compartilhamento dos meus dados conforme acima.\n\n{{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb),

('parecer','Termo de Consentimento para Teleatendimento','Consentimento para atendimento remoto',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}} — CPF {{paciente_cpf}}.\nProfissional: {{profissional_nome}} — {{profissional_crefito}}."},{"order":2,"title":"Natureza do Teleatendimento","content":"Declaro estar ciente de que parte do atendimento fisioterapêutico poderá ser realizado de forma remota, via tecnologia digital, conforme Resolução COFFITO nº 516/2020 e demais normativas vigentes."},{"order":3,"title":"Limitações","content":"Compreendo que o teleatendimento possui limitações em relação ao atendimento presencial, especialmente quanto à avaliação física, e que poderão ser indicados atendimentos presenciais sempre que o profissional julgar necessário."},{"order":4,"title":"Privacidade e Registro","content":"Autorizo o registro das informações compartilhadas durante o teleatendimento em prontuário eletrônico, garantida a confidencialidade conforme LGPD."},{"order":5,"title":"Consentimento","content":"Declaro consentir com a realização de teleatendimento fisioterapêutico nas condições acima.\n\n{{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb),

('relatorio','Plano Terapêutico','Plano de tratamento detalhado',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}} ({{paciente_idade}})\nCID Principal: {{cid_principal}}   CID Secundário: {{cid_secundario}}\nProfissional: {{profissional_nome}} — {{profissional_crefito}}\nData: {{data_atual}}"},{"order":2,"title":"Diagnóstico","content":"Diagnóstico clínico: {{diagnostico}}\nDiagnóstico fisioterapêutico: {{diagnostico_fisio}}\nPrognóstico: {{prognostico}}"},{"order":3,"title":"Objetivos Terapêuticos","content":"{{objetivos}}"},{"order":4,"title":"Condutas e Recursos","content":"{{condutas}}"},{"order":5,"title":"Reavaliação","content":"Reavaliação prevista para: {{proxima_reavaliacao}}"}]'::jsonb),

('relatorio','Relatório Funcional','Relatório de capacidade funcional',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}}, {{paciente_idade}}, {{paciente_sexo}}\nCPF: {{paciente_cpf}}   CID: {{cid_principal}}\nProfissional: {{profissional_nome}} — {{profissional_crefito}}"},{"order":2,"title":"Avaliação Funcional","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nQueixa principal: {{queixa_principal}}\nHistória atual: {{hma}}"},{"order":3,"title":"Escalas Aplicadas","content":"EVA: {{escala_eva}}\nBarthel: {{escala_barthel}}\nKatz: {{escala_katz}}\nBerg: {{escala_berg}}\nTinetti: {{escala_tinetti}}\nMIF: {{escala_mif}}\nTUG: {{escala_tug}}\nMRC: {{escala_mrc}}"},{"order":4,"title":"Capacidade Funcional Observada","content":"{{condutas}}"},{"order":5,"title":"Conclusão","content":"Com base nos achados, observa-se {{prognostico}}. Recomenda-se continuidade do programa terapêutico conforme objetivos definidos: {{objetivos}}."}]'::jsonb),

('relatorio','Relatório Evolutivo','Relatório de evolução do tratamento',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}}\nCID: {{cid_principal}}\nProfissional: {{profissional_nome}} — {{profissional_crefito}}\nPeríodo: até {{data_atual}}"},{"order":2,"title":"Diagnóstico e Plano","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nObjetivos: {{objetivos}}\nCondutas: {{condutas}}"},{"order":3,"title":"Evolução Observada","content":"O paciente vem apresentando evolução conforme registros sequenciais em prontuário. Os principais ganhos terapêuticos referem-se à melhora funcional progressiva, à redução da sintomatologia álgica (EVA atual: {{escala_eva}}) e à maior autonomia nas AVDs."},{"order":4,"title":"Conclusão","content":"Recomenda-se manutenção do programa atual. Próxima reavaliação: {{proxima_reavaliacao}}."}]'::jsonb),

('reavaliacao','Relatório de Reavaliação','Reavaliação periódica',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}} ({{paciente_idade}})\nCID: {{cid_principal}}\nProfissional: {{profissional_nome}} — {{profissional_crefito}}\nData da reavaliação: {{data_avaliacao}}"},{"order":2,"title":"Comparativo Clínico","content":"Diagnóstico fisioterapêutico atual: {{diagnostico_fisio}}\nQueixa atual: {{queixa_principal}}\nEVA atual: {{escala_eva}}"},{"order":3,"title":"Escalas Atualizadas","content":"Barthel: {{escala_barthel}} | Katz: {{escala_katz}} | Berg: {{escala_berg}} | Tinetti: {{escala_tinetti}} | MIF: {{escala_mif}} | TUG: {{escala_tug}} | MRC: {{escala_mrc}}"},{"order":4,"title":"Reformulação do Plano","content":"Objetivos revistos: {{objetivos}}\nCondutas atualizadas: {{condutas}}\nPrognóstico: {{prognostico}}"},{"order":5,"title":"Próxima Reavaliação","content":"{{proxima_reavaliacao}}"}]'::jsonb),

('alta','Relatório de Alta Fisioterapêutica','Alta oficial do tratamento',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}} ({{paciente_idade}})\nCID: {{cid_principal}}\nProfissional responsável: {{profissional_nome}} — {{profissional_crefito}}\nData da alta: {{data_alta}}"},{"order":2,"title":"Síntese do Tratamento","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nObjetivos iniciais: {{objetivos}}\nCondutas realizadas: {{condutas}}"},{"order":3,"title":"Motivo da Alta","content":"{{motivo_alta}}"},{"order":4,"title":"Objetivos Alcançados","content":"{{objetivos_alcancados}}"},{"order":5,"title":"Objetivos Pendentes","content":"{{objetivos_pendentes}}"},{"order":6,"title":"Recomendações e Plano Domiciliar","content":"Recomendações: {{recomendacoes_alta}}\nPlano domiciliar: {{plano_domiciliar}}\nEncaminhamento pós-alta: {{encaminhamento_pos_alta}}"}]'::jsonb),

('encaminhamento','Encaminhamento Fisioterapêutico','Encaminhamento a outro profissional',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente: {{paciente_nome}} ({{paciente_idade}})\nCPF: {{paciente_cpf}}   CID: {{cid_principal}}"},{"order":2,"title":"Encaminhamento","content":"Encaminho o(a) paciente acima identificado(a) para avaliação especializada, em razão dos achados clínicos abaixo descritos, solicitando parecer/conduta conforme indicação técnica."},{"order":3,"title":"Quadro Clínico","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nQueixa principal: {{queixa_principal}}\nAchados relevantes: {{condutas}}"},{"order":4,"title":"Profissional Responsável","content":"{{profissional_nome}} — {{profissional_crefito}}\n{{clinica_nome}} — {{data_atual}}"}]'::jsonb),

('parecer','Declaração de Comparecimento','Comprovante de presença em atendimento',true,false,1,
'[{"order":1,"title":"Declaração","content":"Declaro, para os devidos fins, que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, compareceu nesta clínica em {{data_atual}} para atendimento fisioterapêutico sob minha responsabilidade técnica."},{"order":2,"title":"Responsável Técnico","content":"{{profissional_nome}} — {{profissional_crefito}}\n{{clinica_nome}}\n{{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb),

('parecer','Declaração de Acompanhante','Comprovante de presença de acompanhante',true,false,1,
'[{"order":1,"title":"Declaração","content":"Declaro, para os devidos fins, que o(a) Sr(a). {{paciente_acompanhante}} ({{paciente_acompanhante_parentesco}}) acompanhou o(a) paciente {{paciente_nome}}, CPF {{paciente_cpf}}, em atendimento fisioterapêutico realizado nesta clínica em {{data_atual}}."},{"order":2,"title":"Responsável Técnico","content":"{{profissional_nome}} — {{profissional_crefito}}\n{{clinica_nome}} — {{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb),

('parecer','Declaração de Atendimento Domiciliar','Comprovante de visita domiciliar',true,false,1,
'[{"order":1,"title":"Declaração","content":"Declaro, para os devidos fins, que prestei atendimento fisioterapêutico domiciliar ao(à) paciente {{paciente_nome}}, CPF {{paciente_cpf}}, no endereço {{paciente_endereco}}, em {{data_atual}}."},{"order":2,"title":"Natureza do Atendimento","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nConduta realizada: {{condutas}}"},{"order":3,"title":"Responsável Técnico","content":"{{profissional_nome}} — {{profissional_crefito}}\n{{clinica_nome}} — {{data_atual}}."}]'::jsonb),

('relatorio','Relatório para Médico Assistente','Comunicação ao médico responsável',true,false,1,
'[{"order":1,"title":"Prezado(a) Doutor(a)","content":"Encaminho, para conhecimento e conduta complementar, o relatório fisioterapêutico do(a) paciente abaixo identificado(a), em acompanhamento sob minha responsabilidade técnica."},{"order":2,"title":"Identificação","content":"Paciente: {{paciente_nome}} ({{paciente_idade}})\nCID Principal: {{cid_principal}}   CID Secundário: {{cid_secundario}}\nDiagnóstico clínico encaminhado: {{diagnostico}}"},{"order":3,"title":"Achados Fisioterapêuticos","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nPrognóstico: {{prognostico}}\nEscalas relevantes: EVA {{escala_eva}} · Barthel {{escala_barthel}} · Berg {{escala_berg}} · MIF {{escala_mif}}"},{"order":4,"title":"Plano Terapêutico em Curso","content":"Objetivos: {{objetivos}}\nCondutas: {{condutas}}"},{"order":5,"title":"Solicitação","content":"Solicito gentilmente avaliação complementar e/ou orientação conforme julgar necessário. Permaneço à disposição."},{"order":6,"title":"Atenciosamente","content":"{{profissional_nome}} — {{profissional_crefito}}\n{{clinica_nome}} — {{data_atual}}."}]'::jsonb),

('relatorio','Relatório para Convênio','Relatório clínico para operadora',true,false,1,
'[{"order":1,"title":"Identificação do Beneficiário","content":"Nome: {{paciente_nome}} ({{paciente_idade}})\nCPF: {{paciente_cpf}}\nConvênio: {{convenio_nome}}   Carteirinha: {{convenio_carteirinha}}\nCID: {{cid_principal}} / {{cid_secundario}}"},{"order":2,"title":"Justificativa Clínica","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nQueixa principal: {{queixa_principal}}\nHistória atual: {{hma}}"},{"order":3,"title":"Avaliação Funcional","content":"EVA: {{escala_eva}} | MIF: {{escala_mif}} | Barthel: {{escala_barthel}} | Berg: {{escala_berg}} | TUG: {{escala_tug}}"},{"order":4,"title":"Plano Terapêutico","content":"Objetivos: {{objetivos}}\nCondutas: {{condutas}}\nPrognóstico: {{prognostico}}"},{"order":5,"title":"Solicitação de Autorização","content":"Solicita-se autorização para continuidade do programa de tratamento fisioterapêutico conforme plano acima."},{"order":6,"title":"Responsável Técnico","content":"{{profissional_nome}} — {{profissional_crefito}} — {{profissional_especialidade}}\n{{clinica_nome}} — {{data_atual}}."}]'::jsonb),

('relatorio','Relatório para INSS','Relatório pericial para perícia previdenciária',true,false,1,
'[{"order":1,"title":"Identificação do Periciado","content":"Nome: {{paciente_nome}}\nCPF: {{paciente_cpf}}   RG: {{paciente_rg}}\nData de nascimento: {{paciente_data_nascimento}}\nCID Principal: {{cid_principal}}   CID Secundário: {{cid_secundario}}"},{"order":2,"title":"Quadro Clínico","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nHistória da moléstia atual: {{hma}}\nPrognóstico funcional: {{prognostico}}"},{"order":3,"title":"Achados Funcionais","content":"EVA: {{escala_eva}} · Barthel: {{escala_barthel}} · MIF: {{escala_mif}} · Berg: {{escala_berg}} · TUG: {{escala_tug}} · Ashworth: {{escala_ashworth}} · MRC: {{escala_mrc}} · Goniometria: {{goniometria}}"},{"order":4,"title":"Conclusão Técnica","content":"Com base na avaliação fisioterapêutica realizada, observa-se comprometimento funcional compatível com o quadro descrito, com repercussão nas atividades laborais e cotidianas. Indica-se continuidade do tratamento conforme plano terapêutico abaixo."},{"order":5,"title":"Plano Terapêutico","content":"Objetivos: {{objetivos}}\nCondutas: {{condutas}}"},{"order":6,"title":"Responsável Técnico","content":"{{profissional_nome}} — {{profissional_crefito}} — {{profissional_especialidade}}\n{{clinica_nome}} — {{data_atual}}."}]'::jsonb),

('relatorio','Relatório Funcional para Empresa','Relatório de capacidade laboral',true,false,1,
'[{"order":1,"title":"Identificação","content":"Colaborador(a): {{paciente_nome}}\nCPF: {{paciente_cpf}}   CID: {{cid_principal}}\nProfissional responsável: {{profissional_nome}} — {{profissional_crefito}}"},{"order":2,"title":"Avaliação Funcional","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nQueixa principal: {{queixa_principal}}\nLimitações observadas: vide condutas e escalas abaixo."},{"order":3,"title":"Escalas e Medidas","content":"EVA: {{escala_eva}} | MIF: {{escala_mif}} | Borg: {{escala_borg}} | Goniometria: {{goniometria}} | MRC: {{escala_mrc}}"},{"order":4,"title":"Capacidade Laboral","content":"Considerando os achados acima, o(a) colaborador(a) apresenta condição funcional descrita em: {{condutas}}. Recomenda-se: {{objetivos}}."},{"order":5,"title":"Conclusão","content":"Permanece em acompanhamento fisioterapêutico. Prognóstico: {{prognostico}}.\n\n{{profissional_nome}} — {{profissional_crefito}} — {{data_atual}}."}]'::jsonb),

('parecer','Parecer Técnico / Relatório Pericial','Parecer técnico fisioterapêutico',true,false,1,
'[{"order":1,"title":"Identificação","content":"Paciente/Periciado: {{paciente_nome}}\nCPF: {{paciente_cpf}}   CID: {{cid_principal}}\nProfissional emissor: {{profissional_nome}} — {{profissional_crefito}} — {{profissional_especialidade}}"},{"order":2,"title":"Objeto do Parecer","content":"O presente parecer técnico tem por finalidade subsidiar análise especializada quanto ao quadro fisioterapêutico, capacidade funcional e prognóstico do(a) paciente acima identificado(a)."},{"order":3,"title":"Análise Técnica","content":"Diagnóstico fisioterapêutico: {{diagnostico_fisio}}\nHistória: {{hma}}\nEscalas aplicadas: EVA {{escala_eva}} · Barthel {{escala_barthel}} · MIF {{escala_mif}} · Berg {{escala_berg}} · MRC {{escala_mrc}} · Ashworth {{escala_ashworth}} · Goniometria {{goniometria}}"},{"order":4,"title":"Conclusão Pericial","content":"Diante dos elementos clínicos e funcionais acima descritos, conclui-se que o quadro apresentado é compatível com o diagnóstico fisioterapêutico exposto, sendo o prognóstico considerado: {{prognostico}}. Recomenda-se a continuidade do plano terapêutico conforme objetivos definidos."},{"order":5,"title":"Responsável Técnico","content":"{{profissional_nome}} — {{profissional_crefito}}\n{{clinica_nome}} — {{clinica_cidade_estado}}, {{data_atual}}."}]'::jsonb);

-- Marca um default por doc_type
WITH first_of_type AS (
  SELECT DISTINCT ON (doc_type) id, doc_type
  FROM public.document_templates
  ORDER BY doc_type, created_at
)
UPDATE public.document_templates t
SET is_default = true
FROM first_of_type f
WHERE t.id = f.id;
