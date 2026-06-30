-- =====================================================
-- SPRINT 12A — Biblioteca Inteligente de Exercícios
-- Novas tabelas normalizadas (não altera library_* existente)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.exercise_level AS ENUM ('iniciante', 'intermediario', 'avancado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exercise_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exercise_origin AS ENUM ('global', 'clinic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exercise_media_type AS ENUM ('image', 'video', 'gif', 'document');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exercise_tag_type AS ENUM (
    'regiao', 'patologia', 'objetivo', 'especialidade', 'equipamento', 'dificuldade', 'geral'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- exercise_categories ----------
CREATE TABLE IF NOT EXISTS public.exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.exercise_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  body_region text,
  joint text,
  sort_order int NOT NULL DEFAULT 0,
  origin public.exercise_origin NOT NULL DEFAULT 'global',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_cat_global_slug
  ON public.exercise_categories(slug) WHERE clinic_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_cat_clinic_slug
  ON public.exercise_categories(clinic_id, slug) WHERE clinic_id IS NOT NULL;

-- ---------- exercises ----------
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.exercise_categories(id) ON DELETE SET NULL,
  source_exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  body_region text,
  joint text,
  specialty text,
  objectives text[] NOT NULL DEFAULT '{}',
  level public.exercise_level NOT NULL DEFAULT 'iniciante',
  equipment text[] NOT NULL DEFAULT '{}',
  contraindications text,
  instructions text,
  notes text,
  thumbnail_url text,
  video_url text,
  active boolean NOT NULL DEFAULT true,
  status public.exercise_status NOT NULL DEFAULT 'active',
  origin public.exercise_origin NOT NULL DEFAULT 'global',
  -- Campos preparados para IA (sem implementação nesta sprint)
  ai_keywords text[] NOT NULL DEFAULT '{}',
  ai_embedding jsonb,
  ai_description text,
  semantic_group text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercises_global_slug
  ON public.exercises(slug) WHERE clinic_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercises_clinic_slug
  ON public.exercises(clinic_id, slug) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category_id);
CREATE INDEX IF NOT EXISTS idx_exercises_body_region ON public.exercises(body_region);
CREATE INDEX IF NOT EXISTS idx_exercises_level ON public.exercises(level);
CREATE INDEX IF NOT EXISTS idx_exercises_status ON public.exercises(status);
CREATE INDEX IF NOT EXISTS idx_exercises_objectives ON public.exercises USING gin(objectives);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises USING gin(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_ai_keywords ON public.exercises USING gin(ai_keywords);

-- ---------- exercise_tags ----------
CREATE TABLE IF NOT EXISTS public.exercise_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  tag_type public.exercise_tag_type NOT NULL DEFAULT 'geral',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_tags_global_slug
  ON public.exercise_tags(slug, tag_type) WHERE clinic_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_tags_clinic_slug
  ON public.exercise_tags(clinic_id, slug, tag_type) WHERE clinic_id IS NOT NULL;

-- ---------- exercise_tag_links ----------
CREATE TABLE IF NOT EXISTS public.exercise_tag_links (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.exercise_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, tag_id)
);

-- ---------- exercise_media ----------
CREATE TABLE IF NOT EXISTS public.exercise_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  media_type public.exercise_media_type NOT NULL DEFAULT 'image',
  storage_path text,
  external_url text,
  thumbnail_path text,
  title text,
  description text,
  duration_seconds int,
  file_size_bytes bigint,
  mime_type text,
  sort_order int NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_media_exercise ON public.exercise_media(exercise_id);

-- ---------- exercise_protocols ----------
CREATE TABLE IF NOT EXISTS public.exercise_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  source_protocol_id uuid REFERENCES public.exercise_protocols(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  indication text,
  target_condition text,
  body_region text,
  therapeutic_goal text,
  level public.exercise_level NOT NULL DEFAULT 'iniciante',
  estimated_duration_days int,
  frequency text,
  contraindications text,
  notes text,
  status public.exercise_status NOT NULL DEFAULT 'active',
  origin public.exercise_origin NOT NULL DEFAULT 'global',
  is_favorite boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_protocols_global_slug
  ON public.exercise_protocols(slug) WHERE clinic_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_protocols_clinic_slug
  ON public.exercise_protocols(clinic_id, slug) WHERE clinic_id IS NOT NULL;

-- ---------- protocol_exercises ----------
CREATE TABLE IF NOT EXISTS public.protocol_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.exercise_protocols(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  sort_order int NOT NULL DEFAULT 0,
  phase text,
  sets int,
  repetitions int,
  duration_seconds int,
  hold_seconds int,
  rest_seconds int,
  frequency text,
  side text,
  instructions_override text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_exercises_protocol ON public.protocol_exercises(protocol_id);

-- ---------- exercise_favorites (FavoriteExercises) ----------
CREATE TABLE IF NOT EXISTS public.exercise_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE CASCADE,
  protocol_id uuid REFERENCES public.exercise_protocols(id) ON DELETE CASCADE,
  favorite_type text NOT NULL DEFAULT 'exercise' CHECK (favorite_type IN ('exercise', 'protocol')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_favorites_target_check CHECK (
    (favorite_type = 'exercise' AND exercise_id IS NOT NULL AND protocol_id IS NULL)
    OR (favorite_type = 'protocol' AND protocol_id IS NOT NULL AND exercise_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_fav_user_exercise
  ON public.exercise_favorites(user_id, clinic_id, exercise_id) WHERE exercise_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_fav_user_protocol
  ON public.exercise_favorites(user_id, clinic_id, protocol_id) WHERE protocol_id IS NOT NULL;

-- ---------- clinic_protocols (ClinicProtocols — vínculo clínica ↔ protocolo) ----------
CREATE TABLE IF NOT EXISTS public.clinic_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES public.exercise_protocols(id) ON DELETE CASCADE,
  is_favorite boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, protocol_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_protocols_clinic ON public.clinic_protocols(clinic_id);

-- ---------- Grants ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_tag_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_media TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_protocols TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocol_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_protocols TO authenticated;

GRANT ALL ON public.exercise_categories TO service_role;
GRANT ALL ON public.exercises TO service_role;
GRANT ALL ON public.exercise_tags TO service_role;
GRANT ALL ON public.exercise_tag_links TO service_role;
GRANT ALL ON public.exercise_media TO service_role;
GRANT ALL ON public.exercise_protocols TO service_role;
GRANT ALL ON public.protocol_exercises TO service_role;
GRANT ALL ON public.exercise_favorites TO service_role;
GRANT ALL ON public.clinic_protocols TO service_role;

-- ---------- updated_at triggers ----------
CREATE TRIGGER trg_exercise_categories_updated BEFORE UPDATE ON public.exercise_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exercise_tags_updated BEFORE UPDATE ON public.exercise_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exercise_media_updated BEFORE UPDATE ON public.exercise_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exercise_protocols_updated BEFORE UPDATE ON public.exercise_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_protocol_exercises_updated BEFORE UPDATE ON public.protocol_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_clinic_protocols_updated BEFORE UPDATE ON public.clinic_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- RLS ----------
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_protocols ENABLE ROW LEVEL SECURITY;

-- exercise_categories
CREATE POLICY ex_cat_select ON public.exercise_categories FOR SELECT TO authenticated
  USING (clinic_id IS NULL OR public.can_access_clinic(clinic_id));
CREATE POLICY ex_cat_insert ON public.exercise_categories FOR INSERT TO authenticated
  WITH CHECK (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );
CREATE POLICY ex_cat_update ON public.exercise_categories FOR UPDATE TO authenticated
  USING (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  )
  WITH CHECK (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );
CREATE POLICY ex_cat_delete ON public.exercise_categories FOR DELETE TO authenticated
  USING (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

-- exercises
CREATE POLICY exercises_select ON public.exercises FOR SELECT TO authenticated
  USING (clinic_id IS NULL OR public.can_access_clinic(clinic_id));
CREATE POLICY exercises_insert ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );
CREATE POLICY exercises_update ON public.exercises FOR UPDATE TO authenticated
  USING (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  )
  WITH CHECK (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );
CREATE POLICY exercises_delete ON public.exercises FOR DELETE TO authenticated
  USING (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

-- exercise_tags
CREATE POLICY ex_tags_select ON public.exercise_tags FOR SELECT TO authenticated
  USING (clinic_id IS NULL OR public.can_access_clinic(clinic_id));
CREATE POLICY ex_tags_write ON public.exercise_tags FOR ALL TO authenticated
  USING (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  )
  WITH CHECK (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

-- exercise_tag_links (via exercise access)
CREATE POLICY ex_tag_links_select ON public.exercise_tag_links FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.id = exercise_id
      AND (e.clinic_id IS NULL OR public.can_access_clinic(e.clinic_id))
  ));
CREATE POLICY ex_tag_links_write ON public.exercise_tag_links FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.id = exercise_id
      AND ((e.clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
        OR (e.clinic_id IS NOT NULL AND public.can_manage_clinic(e.clinic_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.id = exercise_id
      AND ((e.clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
        OR (e.clinic_id IS NOT NULL AND public.can_manage_clinic(e.clinic_id)))
  ));

-- exercise_media
CREATE POLICY ex_media_select ON public.exercise_media FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.id = exercise_id
      AND (e.clinic_id IS NULL OR public.can_access_clinic(e.clinic_id))
  ));
CREATE POLICY ex_media_write ON public.exercise_media FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.id = exercise_id
      AND ((e.clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
        OR (e.clinic_id IS NOT NULL AND public.can_manage_clinic(e.clinic_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.id = exercise_id
      AND ((e.clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
        OR (e.clinic_id IS NOT NULL AND public.can_manage_clinic(e.clinic_id)))
  ));

-- exercise_protocols
CREATE POLICY ex_protocols_select ON public.exercise_protocols FOR SELECT TO authenticated
  USING (clinic_id IS NULL OR public.can_access_clinic(clinic_id));
CREATE POLICY ex_protocols_insert ON public.exercise_protocols FOR INSERT TO authenticated
  WITH CHECK (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );
CREATE POLICY ex_protocols_update ON public.exercise_protocols FOR UPDATE TO authenticated
  USING (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  )
  WITH CHECK (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );
CREATE POLICY ex_protocols_delete ON public.exercise_protocols FOR DELETE TO authenticated
  USING (
    (clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
    OR (clinic_id IS NOT NULL AND public.can_manage_clinic(clinic_id))
  );

-- protocol_exercises
CREATE POLICY proto_ex_select ON public.protocol_exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercise_protocols p WHERE p.id = protocol_id
      AND (p.clinic_id IS NULL OR public.can_access_clinic(p.clinic_id))
  ));
CREATE POLICY proto_ex_write ON public.protocol_exercises FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercise_protocols p WHERE p.id = protocol_id
      AND ((p.clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
        OR (p.clinic_id IS NOT NULL AND public.can_manage_clinic(p.clinic_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exercise_protocols p WHERE p.id = protocol_id
      AND ((p.clinic_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
        OR (p.clinic_id IS NOT NULL AND public.can_manage_clinic(p.clinic_id)))
  ));

-- exercise_favorites
CREATE POLICY ex_fav_select ON public.exercise_favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.can_access_clinic(clinic_id));
CREATE POLICY ex_fav_write ON public.exercise_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.can_access_clinic(clinic_id))
  WITH CHECK (user_id = auth.uid() AND public.can_access_clinic(clinic_id));

-- clinic_protocols
CREATE POLICY clinic_proto_select ON public.clinic_protocols FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY clinic_proto_write ON public.clinic_protocols FOR ALL TO authenticated
  USING (public.can_manage_clinic(clinic_id))
  WITH CHECK (public.can_manage_clinic(clinic_id));

-- ---------- Storage bucket (estrutura futura — upload não implementado) ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-media',
  'exercise-media',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ---------- Seed global catalog ----------
INSERT INTO public.exercise_categories (name, slug, description, body_region, sort_order, origin)
VALUES
  ('Membros Inferiores', 'membros-inferiores', 'Joelho, quadril, tornozelo e marcha', 'inferior', 1, 'global'),
  ('Membros Superiores', 'membros-superiores', 'Ombro, cotovelo e punho', 'superior', 2, 'global'),
  ('Coluna', 'coluna', 'Cervical, torácica e lombar', 'coluna', 3, 'global'),
  ('Neurologia', 'neurologia', 'Controle motor e função', 'neurologia', 4, 'global'),
  ('Respiratória', 'respiratoria', 'Expansão e condicionamento', 'respiratoria', 5, 'global')
ON CONFLICT DO NOTHING;

INSERT INTO public.exercise_tags (name, slug, tag_type)
VALUES
  ('Joelho', 'joelho', 'regiao'),
  ('Ombro', 'ombro', 'regiao'),
  ('Lombar', 'lombar', 'regiao'),
  ('Fortalecimento', 'fortalecimento', 'objetivo'),
  ('Mobilidade', 'mobilidade', 'objetivo'),
  ('Alongamento', 'alongamento', 'objetivo'),
  ('LCA', 'lca', 'patologia'),
  ('Manguito rotador', 'manguito-rotador', 'patologia'),
  ('Ortopedia', 'ortopedia', 'especialidade'),
  ('Esportiva', 'esportiva', 'especialidade'),
  ('Elástico', 'elastico', 'equipamento'),
  ('Livre', 'livre', 'equipamento'),
  ('Iniciante', 'iniciante', 'dificuldade'),
  ('Intermediário', 'intermediario', 'dificuldade'),
  ('Avançado', 'avancado', 'dificuldade')
ON CONFLICT DO NOTHING;

INSERT INTO public.exercises (
  name, slug, description, body_region, joint, specialty, objectives, level, equipment,
  contraindications, instructions, notes, active, status, origin, semantic_group, ai_keywords
)
SELECT * FROM (VALUES
  (
    'Agachamento parcial', 'agachamento-parcial',
    'Fortalecimento de quadríceps e glúteos com amplitude controlada.',
    'inferior', 'joelho', 'ortopedia', ARRAY['fortalecimento', 'funcional'], 'iniciante'::public.exercise_level,
    ARRAY['livre'], 'Dor aguda no joelho ou instabilidade severa.',
    'Pés na largura do quadril, desça até 45° mantendo joelhos alinhados aos pés. Suba controlando.',
    'Progressão: aumentar amplitude ou adicionar carga.', true, 'active'::public.exercise_status, 'global'::public.exercise_origin,
    'lower-body-strength', ARRAY['agachamento', 'joelho', 'quadriceps']
  ),
  (
    'Ponte de glúteo', 'ponte-gluteo',
    'Ativação de glúteo máximo e estabilização lombar.',
    'inferior', 'quadril', 'ortopedia', ARRAY['fortalecimento', 'estabilizacao'], 'iniciante'::public.exercise_level,
    ARRAY['livre'], 'Dor lombar aguda não diagnosticada.',
    'Decúbito dorsal, pés apoiados, eleve o quadril até alinhar joelhos-quadril-ombros.',
    'Evitar hiperextensão lombar no topo.', true, 'active'::public.exercise_status, 'global'::public.exercise_origin,
    'hip-stabilization', ARRAY['gluteo', 'lombar', 'ponte']
  ),
  (
    'Mobilização escapular', 'mobilizacao-escapular',
    'Melhora controle escapular e postura do ombro.',
    'superior', 'ombro', 'ortopedia', ARRAY['mobilidade', 'controle-motor'], 'iniciante'::public.exercise_level,
    ARRAY['livre'], 'Luxação recente de ombro.',
    'Em pé, realize protração e retração escapular sem elevar ombros. Ritmo lento.',
    'Associar respiração diafragmática.', true, 'active'::public.exercise_status, 'global'::public.exercise_origin,
    'shoulder-mobility', ARRAY['ombro', 'escapula', 'mobilidade']
  ),
  (
    'Cat-camel', 'cat-camel',
    'Mobilidade segmentar da coluna torácica e lombar.',
    'coluna', 'lombar', 'ortopedia', ARRAY['mobilidade', 'flexibilidade'], 'iniciante'::public.exercise_level,
    ARRAY['livre'], 'Radiculopatia aguda ou fratura.',
    'Quatro apoios, alterne flexão e extensão lombar suavemente. Sem dor.',
    'Ideal como aquecimento.', true, 'active'::public.exercise_status, 'global'::public.exercise_origin,
    'spine-mobility', ARRAY['coluna', 'lombar', 'mobilidade']
  ),
  (
    'Exercício com elástico — rotação externa', 'rotacao-externa-elastico',
    'Fortalecimento do manguito rotador.',
    'superior', 'ombro', 'esportiva', ARRAY['fortalecimento'], 'intermediario'::public.exercise_level,
    ARRAY['elastico'], 'Síndrome do impacto não tratada.',
    'Cotovelo flexionado 90°, rotacionar externamente contra resistência do elástico.',
    'Carga leve, alta repetição.', true, 'active'::public.exercise_status, 'global'::public.exercise_origin,
    'shoulder-strength', ARRAY['ombro', 'manguito', 'elastico']
  ),
  (
    'Respiração diafragmática', 'respiracao-diafragmatica',
    'Expansão torácica e relaxamento.',
    'respiratoria', NULL, 'respiratoria', ARRAY['respiracao', 'relaxamento'], 'iniciante'::public.exercise_level,
    ARRAY['livre'], NULL,
    'Decúbito dorsal, mão no abdômen, inspirar expandindo, expirar lentamente.',
    'Usar antes de sessões de mobilidade.', true, 'active'::public.exercise_status, 'global'::public.exercise_origin,
    'breathing', ARRAY['respiracao', 'diafragma']
  )
) AS v(name, slug, description, body_region, joint, specialty, objectives, level, equipment,
       contraindications, instructions, notes, active, status, origin, semantic_group, ai_keywords)
WHERE NOT EXISTS (SELECT 1 FROM public.exercises WHERE slug = v.slug AND clinic_id IS NULL);

INSERT INTO public.exercise_protocols (
  name, slug, description, indication, body_region, therapeutic_goal, level, frequency, status, origin
)
SELECT * FROM (VALUES
  (
    'Reabilitação de joelho — fase inicial', 'reabilitacao-joelho-fase-inicial',
    'Protocolo base para pós-operatório ou entorse de joelho.',
    'Pós-operatório LCA ou entorse grau II', 'inferior', 'Recuperar amplitude e força', 'iniciante'::public.exercise_level,
    '3x/semana', 'active'::public.exercise_status, 'global'::public.exercise_origin
  ),
  (
    'Manguito rotador — fortalecimento', 'manguito-rotador-fortalecimento',
    'Progressão de exercícios para ombro.',
    'Tendinopatia do manguito', 'superior', 'Fortalecer estabilizadores', 'intermediario'::public.exercise_level,
    '4x/semana', 'active'::public.exercise_status, 'global'::public.exercise_origin
  )
) AS v(name, slug, description, indication, body_region, therapeutic_goal, level, frequency, status, origin)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise_protocols WHERE slug = v.slug AND clinic_id IS NULL);
