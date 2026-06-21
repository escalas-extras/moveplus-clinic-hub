import { createClient } from '@supabase/supabase-js';
import { renderPdf } from '/dev-server/src/lib/pdf-engine.ts';
import { buildLibraryContentPdfOpts } from '/dev-server/src/lib/library-pdf.ts';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: clinic, error: clinicError } = await supabase
  .from('clinics')
  .select('id, nome, clinic_settings(nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional, logo_url, primary_color, secondary_color)')
  .ilike('nome', '%GRASIELA%')
  .single();
if (clinicError) throw clinicError;
const settings = clinic.clinic_settings;
let logo = null;
if (settings.logo_url) {
  const { data: signed, error } = await supabase.storage.from('clinic-logos').createSignedUrl(settings.logo_url, 3600);
  if (error) throw error;
  const res = await fetch(signed.signedUrl);
  const ct = res.headers.get('content-type') || 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  logo = `data:${ct};base64,${buf.toString('base64')}`;
}
const opts = buildLibraryContentPdfOpts({
  title: 'Cartilha Alzheimer',
  type: 'cartilha',
  summary: 'Orientações para cuidadores e familiares de pessoas com Doença de Alzheimer.',
  body: '## Cuidados essenciais\nMantenha rotina previsível, ambiente seguro e comunicação simples.\n\n## Sinais de atenção\n- Quedas frequentes\n- Piora súbita da confusão\n- Recusa alimentar\n\n## Orientações ao cuidador\nEstimule mobilidade segura, hidratação e pausas de descanso.',
  tags: ['alzheimer', 'cuidador', 'segurança'],
});
const doc = await renderPdf(opts, { clinic: settings, logo });
const out = '/mnt/documents/grasiela-cartilha-alzheimer.pdf';
doc.save(out);
console.log(JSON.stringify({ out, clinic: settings.nome_fantasia, logoPath: settings.logo_url, hasLogo: Boolean(logo), primary: settings.primary_color, secondary: settings.secondary_color }));
