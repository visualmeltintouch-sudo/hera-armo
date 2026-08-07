-- ============================================================
-- ARMOCROMIA HERAVIGLIOSA — Database Schema
-- Prefix: hera_armo_
-- ============================================================

-- EVENTS
CREATE TABLE hera_armo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  code_letter char(1) NOT NULL DEFAULT 'A',
  date_start date NOT NULL,
  date_end date,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SETTINGS (per event)
CREATE TABLE hera_armo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES hera_armo_events(id) ON DELETE CASCADE,
  year_cutoff integer NOT NULL DEFAULT 1982,
  hera_threshold integer NOT NULL DEFAULT 2,
  questions_per_session integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- QUESTIONS
CREATE TABLE hera_armo_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES hera_armo_events(id) ON DELETE CASCADE,
  age_group text NOT NULL CHECK (age_group IN ('young', 'classic')),
  sort_order integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  option_a_text text NOT NULL,
  option_a_icon text NOT NULL DEFAULT '🌱',
  option_a_verde integer NOT NULL DEFAULT 0,
  option_a_ciano integer NOT NULL DEFAULT 0,
  option_a_magenta integer NOT NULL DEFAULT 0,
  option_b_text text NOT NULL,
  option_b_icon text NOT NULL DEFAULT '⚡',
  option_b_verde integer NOT NULL DEFAULT 0,
  option_b_ciano integer NOT NULL DEFAULT 0,
  option_b_magenta integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PROFILES
CREATE TABLE hera_armo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES hera_armo_events(id) ON DELETE CASCADE,
  profile_key text NOT NULL CHECK (profile_key IN ('ambiente', 'acqua', 'energia', 'hera')),
  age_group text NOT NULL CHECK (age_group IN ('young', 'classic')),
  name text NOT NULL,
  claim text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, profile_key, age_group)
);

-- SESSIONS
CREATE TABLE hera_armo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES hera_armo_events(id) ON DELETE CASCADE,
  age_group text NOT NULL CHECK (age_group IN ('young', 'classic')),
  birth_year integer NOT NULL,
  score_verde integer NOT NULL DEFAULT 0,
  score_ciano integer NOT NULL DEFAULT 0,
  score_magenta integer NOT NULL DEFAULT 0,
  profile_key text NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

-- ANSWERS
CREATE TABLE hera_armo_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES hera_armo_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES hera_armo_questions(id) ON DELETE CASCADE,
  selected_option char(1) NOT NULL CHECK (selected_option IN ('a', 'b')),
  verde_earned integer NOT NULL DEFAULT 0,
  ciano_earned integer NOT NULL DEFAULT 0,
  magenta_earned integer NOT NULL DEFAULT 0
);

-- PRIZES
CREATE TABLE hera_armo_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES hera_armo_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  image_url text,
  weight integer NOT NULL DEFAULT 1,
  stock_total integer,
  stock_remaining integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CODES
CREATE TABLE hera_armo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES hera_armo_events(id) ON DELETE CASCADE,
  code text NOT NULL,
  prize_id uuid NOT NULL REFERENCES hera_armo_prizes(id) ON DELETE CASCADE,
  session_id uuid REFERENCES hera_armo_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'redeemed', 'expired')),
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_hera_armo_codes_code ON hera_armo_codes(code);

-- OPERATORS
CREATE TABLE hera_armo_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  access_code text NOT NULL,
  event_id uuid REFERENCES hera_armo_events(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_hera_armo_operators_code ON hera_armo_operators(access_code);

-- ============================================================
-- RPC: hera_armo_play
-- ============================================================
CREATE OR REPLACE FUNCTION hera_armo_play(
  p_event_id uuid,
  p_birth_year integer,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings record;
  v_answer record;
  v_question record;
  v_session_id uuid;
  v_total_verde integer := 0;
  v_total_ciano integer := 0;
  v_total_magenta integer := 0;
  v_age_group text;
  v_profile_key text;
  v_max_score integer;
  v_min_score integer;
  v_prize record;
  v_code text;
  v_code_letter char(1);
  v_total_weight integer;
  v_rand integer;
  v_cumulative integer := 0;
BEGIN
  -- Get settings
  SELECT * INTO v_settings FROM hera_armo_settings WHERE event_id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Event settings not found');
  END IF;

  -- Get code letter
  SELECT code_letter INTO v_code_letter FROM hera_armo_events WHERE id = p_event_id;

  -- Determine age group
  IF p_birth_year >= v_settings.year_cutoff THEN
    v_age_group := 'young';
  ELSE
    v_age_group := 'classic';
  END IF;

  -- First pass: calculate scores
  FOR v_answer IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(question_id uuid, selected_option char(1))
  LOOP
    SELECT * INTO v_question FROM hera_armo_questions WHERE id = v_answer.question_id;
    IF FOUND THEN
      IF v_answer.selected_option = 'a' THEN
        v_total_verde := v_total_verde + v_question.option_a_verde;
        v_total_ciano := v_total_ciano + v_question.option_a_ciano;
        v_total_magenta := v_total_magenta + v_question.option_a_magenta;
      ELSE
        v_total_verde := v_total_verde + v_question.option_b_verde;
        v_total_ciano := v_total_ciano + v_question.option_b_ciano;
        v_total_magenta := v_total_magenta + v_question.option_b_magenta;
      END IF;
    END IF;
  END LOOP;

  -- Determine profile
  v_max_score := GREATEST(v_total_verde, v_total_ciano, v_total_magenta);
  v_min_score := LEAST(v_total_verde, v_total_ciano, v_total_magenta);

  IF (v_max_score - v_min_score) <= v_settings.hera_threshold THEN
    v_profile_key := 'hera';
  ELSIF v_total_verde >= v_total_ciano AND v_total_verde >= v_total_magenta THEN
    v_profile_key := 'ambiente';
  ELSIF v_total_ciano >= v_total_verde AND v_total_ciano >= v_total_magenta THEN
    v_profile_key := 'acqua';
  ELSE
    v_profile_key := 'energia';
  END IF;

  -- Create session
  INSERT INTO hera_armo_sessions (event_id, age_group, birth_year, score_verde, score_ciano, score_magenta, profile_key)
  VALUES (p_event_id, v_age_group, p_birth_year, v_total_verde, v_total_ciano, v_total_magenta, v_profile_key)
  RETURNING id INTO v_session_id;

  -- Second pass: insert answers with correct session_id
  FOR v_answer IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(question_id uuid, selected_option char(1))
  LOOP
    SELECT * INTO v_question FROM hera_armo_questions WHERE id = v_answer.question_id;
    IF FOUND THEN
      IF v_answer.selected_option = 'a' THEN
        INSERT INTO hera_armo_answers (session_id, question_id, selected_option, verde_earned, ciano_earned, magenta_earned)
        VALUES (v_session_id, v_answer.question_id, 'a', v_question.option_a_verde, v_question.option_a_ciano, v_question.option_a_magenta);
      ELSE
        INSERT INTO hera_armo_answers (session_id, question_id, selected_option, verde_earned, ciano_earned, magenta_earned)
        VALUES (v_session_id, v_answer.question_id, 'b', v_question.option_b_verde, v_question.option_b_ciano, v_question.option_b_magenta);
      END IF;
    END IF;
  END LOOP;

  -- Select prize (weighted random)
  SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
  FROM hera_armo_prizes
  WHERE event_id = p_event_id AND is_active = true
    AND (stock_remaining IS NULL OR stock_remaining > 0);

  IF v_total_weight > 0 THEN
    v_rand := floor(random() * v_total_weight)::integer;

    FOR v_prize IN
      SELECT * FROM hera_armo_prizes
      WHERE event_id = p_event_id AND is_active = true
        AND (stock_remaining IS NULL OR stock_remaining > 0)
      ORDER BY id
    LOOP
      v_cumulative := v_cumulative + v_prize.weight;
      IF v_rand < v_cumulative THEN
        -- Decrement stock
        IF v_prize.stock_remaining IS NOT NULL THEN
          UPDATE hera_armo_prizes SET stock_remaining = stock_remaining - 1
          WHERE id = v_prize.id AND stock_remaining > 0;
        END IF;

        -- Generate unique code
        LOOP
          v_code := v_code_letter || lpad(floor(random() * 10000)::text, 4, '0');
          EXIT WHEN NOT EXISTS (SELECT 1 FROM hera_armo_codes WHERE code = v_code);
        END LOOP;

        INSERT INTO hera_armo_codes (event_id, code, prize_id, session_id, status)
        VALUES (p_event_id, v_code, v_prize.id, v_session_id, 'generated');

        RETURN jsonb_build_object(
          'session_id', v_session_id,
          'profile_key', v_profile_key,
          'age_group', v_age_group,
          'score_verde', v_total_verde,
          'score_ciano', v_total_ciano,
          'score_magenta', v_total_magenta,
          'prize', jsonb_build_object('name', v_prize.label, 'image_url', v_prize.image_url),
          'code', v_code
        );
      END IF;
    END LOOP;
  END IF;

  -- No prize available
  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'profile_key', v_profile_key,
    'age_group', v_age_group,
    'score_verde', v_total_verde,
    'score_ciano', v_total_ciano,
    'score_magenta', v_total_magenta,
    'prize', null,
    'code', null
  );
END;
$$;

-- ============================================================
-- RPC: hera_armo_redeem
-- ============================================================
CREATE OR REPLACE FUNCTION hera_armo_redeem(
  p_code text,
  p_access_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operator record;
  v_code record;
  v_prize record;
  v_event record;
BEGIN
  -- Validate operator
  SELECT * INTO v_operator FROM hera_armo_operators
  WHERE access_code = p_access_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Codice operatore non valido');
  END IF;

  -- Find code
  SELECT * INTO v_code FROM hera_armo_codes WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Codice premio non trovato');
  END IF;

  -- Check operator event scope
  IF v_operator.event_id IS NOT NULL AND v_operator.event_id != v_code.event_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Operatore non autorizzato per questo evento');
  END IF;

  -- Check status
  IF v_code.status = 'redeemed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Codice già riscattato', 'redeemed_at', v_code.redeemed_at);
  END IF;

  IF v_code.status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Codice scaduto');
  END IF;

  -- Redeem
  UPDATE hera_armo_codes SET status = 'redeemed', redeemed_at = now() WHERE id = v_code.id;

  -- Get prize and event info
  SELECT * INTO v_prize FROM hera_armo_prizes WHERE id = v_code.prize_id;
  SELECT * INTO v_event FROM hera_armo_events WHERE id = v_code.event_id;

  RETURN jsonb_build_object(
    'success', true,
    'prize', v_prize.label,
    'event', v_event.name,
    'redeemed_at', now()
  );
END;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE hera_armo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hera_armo_operators ENABLE ROW LEVEL SECURITY;

-- Anon: read active events
CREATE POLICY "anon_read_events" ON hera_armo_events FOR SELECT TO anon USING (is_active = true);

-- Anon: read settings for active events
CREATE POLICY "anon_read_settings" ON hera_armo_settings FOR SELECT TO anon
  USING (event_id IN (SELECT id FROM hera_armo_events WHERE is_active = true));

-- Anon: read active questions for active events
CREATE POLICY "anon_read_questions" ON hera_armo_questions FOR SELECT TO anon
  USING (is_active = true AND event_id IN (SELECT id FROM hera_armo_events WHERE is_active = true));

-- Anon: read active profiles
CREATE POLICY "anon_read_profiles" ON hera_armo_profiles FOR SELECT TO anon
  USING (is_active = true AND event_id IN (SELECT id FROM hera_armo_events WHERE is_active = true));

-- Authenticated: full access on all tables
CREATE POLICY "auth_all_events" ON hera_armo_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_settings" ON hera_armo_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_questions" ON hera_armo_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_profiles" ON hera_armo_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sessions" ON hera_armo_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_answers" ON hera_armo_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_prizes" ON hera_armo_prizes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_codes" ON hera_armo_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_operators" ON hera_armo_operators FOR ALL TO authenticated USING (true) WITH CHECK (true);
