-- =====================================================
-- KINGDOM JOURNEY — Script de création de la base de données
-- =====================================================
-- INSTRUCTIONS :
-- 1. Va sur https://supabase.com → ton projet
-- 2. Clique sur "SQL Editor" dans le menu gauche
-- 3. Colle tout ce texte et clique "Run"
-- =====================================================

-- Extension pour générer des UUIDs automatiquement
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- TABLE : utilisateurs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL DEFAULT 'Guerrier',
  avatar TEXT DEFAULT '🧑',
  profile_type TEXT DEFAULT 'adulte' CHECK (profile_type IN ('enfant','ado','adulte')),
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_active DATE DEFAULT CURRENT_DATE,
  goals TEXT[] DEFAULT '{}',
  tribe_id UUID,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE : progressions de lecture Bible
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_name, chapter)
);

-- ─────────────────────────────────────────
-- TABLE : questions de quiz
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  emoji TEXT DEFAULT '✨',
  options JSONB NOT NULL,  -- tableau de 4 options
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  category TEXT DEFAULT 'general',
  difficulty TEXT DEFAULT 'facile' CHECK (difficulty IN ('facile','moyen','difficile')),
  world TEXT DEFAULT 'jerusalem',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE : résultats de quiz
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id),
  is_correct BOOLEAN NOT NULL,
  xp_gained INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE : défis quotidiens
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('lecture','quiz','verset','priere')),
  description TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 30,
  completed BOOLEAN DEFAULT FALSE,
  challenge_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_type, challenge_date)
);

-- ─────────────────────────────────────────
-- TABLE : badges / récompenses
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ─────────────────────────────────────────
-- TABLE : tribus / équipes
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  emoji TEXT DEFAULT '🦁',
  description TEXT,
  total_xp INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter la clé étrangère tribe_id maintenant que la table existe
ALTER TABLE users ADD CONSTRAINT fk_tribe
  FOREIGN KEY (tribe_id) REFERENCES tribes(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────
-- TABLE : messages chat des tribus
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tribe_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tribe_id UUID REFERENCES tribes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE : versets favoris
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorite_verses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_name, chapter, verse)
);

-- ─────────────────────────────────────────
-- TABLE : historique Eli (assistant IA)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eli_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DONNÉES DE BASE : Tribus
-- ─────────────────────────────────────────
INSERT INTO tribes (name, emoji, description) VALUES
  ('Tribu de Judah',  '🦁', 'La tribu du lion, courageuse et déterminée'),
  ('Tribu de Grace',  '🕊️', 'La tribu de la paix et du pardon'),
  ('Tribu de Faith',  '⭐', 'La tribu de la foi inébranlable')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────
-- DONNÉES DE BASE : Badges
-- ─────────────────────────────────────────
INSERT INTO badges (name, description, emoji, condition_type, condition_value) VALUES
  ('Premier pas',      'Créer son compte',              '🌟', 'register',    1),
  ('Lecteur fidèle',   'Lire 5 chapitres',              '📖', 'chapters',    5),
  ('Quiz champion',    'Réussir 10 quiz',               '⚡', 'quiz',       10),
  ('Semaine sainte',   '7 jours consécutifs',           '🔥', 'streak',      7),
  ('Explorateur',      'Visiter 3 mondes',              '🗺️', 'worlds',       3),
  ('Disciple',         'Atteindre le niveau 5',         '✝️', 'level',        5),
  ('Guerrier de foi',  'Atteindre 1000 XP',             '🛡️', 'xp',        1000),
  ('Mémoriseur',       'Mémoriser 5 versets',           '🧠', 'verses',       5)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- DONNÉES DE BASE : Questions de quiz
-- ─────────────────────────────────────────
INSERT INTO quiz_questions (question, emoji, options, correct_index, category, difficulty, world) VALUES
  ('Combien de jours Dieu a-t-il mis pour créer le monde ?',
   '🌍', '["5 jours","6 jours","7 jours","10 jours"]', 1, 'creation', 'facile', 'jerusalem'),

  ('Quel est le premier livre de la Bible ?',
   '📖', '["Exode","Lévitique","Genèse","Nombres"]', 2, 'bible', 'facile', 'jerusalem'),

  ('Qui a construit l''Arche ?',
   '🚢', '["Abraham","Moïse","Noé","David"]', 2, 'ancien_testament', 'facile', 'ark'),

  ('Combien de disciples Jésus avait-il ?',
   '🕊️', '["7","10","12","15"]', 2, 'nouveau_testament', 'facile', 'galilee'),

  ('Dans quelle ville Jésus est-il né ?',
   '⭐', '["Nazareth","Jérusalem","Bethléem","Jéricho"]', 2, 'jesus', 'facile', 'jerusalem'),

  ('Qui a tué Goliath ?',
   '🪨', '["Saul","Jonathan","Samuel","David"]', 3, 'ancien_testament', 'facile', 'david'),

  ('Combien de livres la Bible contient-elle ?',
   '📚', '["56","66","76","86"]', 1, 'bible', 'moyen', 'jerusalem'),

  ('Quel Psaume commence par "L''Éternel est mon berger" ?',
   '🎵', '["Psaume 1","Psaume 23","Psaume 91","Psaume 150"]', 1, 'psaumes', 'moyen', 'jerusalem'),

  ('Quelle mer Moïse a-t-il traversée ?',
   '🌊', '["Mer Morte","Mer Rouge","Mer Méditerranée","Mer de Galilée"]', 1, 'exode', 'moyen', 'egypt'),

  ('Combien d''années les Hébreux ont-ils erré dans le désert ?',
   '🏜️', '["20 ans","30 ans","40 ans","50 ans"]', 2, 'exode', 'moyen', 'desert'),

  ('Qui était la mère de Jésus ?',
   '👼', '["Elisabeth","Sarah","Marie","Rachel"]', 2, 'jesus', 'facile', 'galilee'),

  ('Quel apôtre a renié Jésus trois fois ?',
   '🐓', '["Jean","Paul","Pierre","André"]', 2, 'apotres', 'moyen', 'jerusalem'),

  ('Dans quelle prison Paul et Silas chantaient-ils ?',
   '🎶', '["Rome","Philippes","Corinthe","Éphèse"]', 1, 'actes', 'difficile', 'jerusalem'),

  ('Qui a interprété les rêves du Pharaon ?',
   '💭', '["Moïse","Abraham","Joseph","Daniel"]', 2, 'ancien_testament', 'moyen', 'egypt'),

  ('Combien de plaies ont frappé l''Égypte ?',
   '🐸', '["7","8","10","12"]', 2, 'exode', 'moyen', 'egypt')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- SÉCURITÉ : Row Level Security (RLS)
-- Chaque utilisateur ne voit que ses propres données
-- ─────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE eli_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_messages ENABLE ROW LEVEL SECURITY;

-- Policies : un utilisateur ne peut lire/modifier que ses propres données
CREATE POLICY "users_own" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "reading_own" ON reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "quiz_own" ON quiz_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "challenges_own" ON daily_challenges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "badges_own" ON user_badges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "verses_own" ON favorite_verses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "eli_own" ON eli_conversations FOR ALL USING (auth.uid() = user_id);

-- Quiz questions : lecture publique pour tous
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_public_read" ON quiz_questions FOR SELECT USING (true);

-- Tribus : lecture publique
ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tribes_public_read" ON tribes FOR SELECT USING (true);

-- Messages de tribu : visible par les membres
CREATE POLICY "tribe_messages_read" ON tribe_messages FOR SELECT USING (
  tribe_id IN (SELECT tribe_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "tribe_messages_insert" ON tribe_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FONCTION : mise à jour automatique updated_at
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- FONCTION : calculer le niveau depuis XP
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION xp_to_level(xp_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN xp_points < 100  THEN 1
    WHEN xp_points < 300  THEN 2
    WHEN xp_points < 600  THEN 3
    WHEN xp_points < 1000 THEN 4
    WHEN xp_points < 1500 THEN 5
    WHEN xp_points < 2200 THEN 6
    WHEN xp_points < 3000 THEN 7
    WHEN xp_points < 4000 THEN 8
    WHEN xp_points < 5500 THEN 9
    ELSE 10
  END;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────
-- FONCTION : ajouter XP et recalculer niveau
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_xp INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_user users%ROWTYPE;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  v_new_xp := v_user.xp + p_xp;
  v_new_level := xp_to_level(v_new_xp);

  IF v_new_level > v_user.level THEN
    v_leveled_up := TRUE;
  END IF;

  UPDATE users SET xp = v_new_xp, level = v_new_level WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'xp', v_new_xp,
    'level', v_new_level,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- LEADERBOARD : vue publique classement
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id,
  u.username,
  u.avatar,
  u.xp,
  u.level,
  u.streak,
  t.name AS tribe_name,
  t.emoji AS tribe_emoji,
  RANK() OVER (ORDER BY u.xp DESC) AS rank
FROM users u
LEFT JOIN tribes t ON t.id = u.tribe_id
ORDER BY u.xp DESC
LIMIT 100;

-- Tout le monde peut voir le classement
CREATE POLICY "leaderboard_public" ON users FOR SELECT USING (true);

RAISE NOTICE '✅ Base de données Kingdom Journey créée avec succès !';
