-- ============================================================
--  SCHÉMA COMPLET — Système de suivi G5C
--  Reconstruit depuis le code source (controllers + routes)
--  À exécuter dans un nouveau projet Supabase
-- ============================================================
DROP SCHEMA public CASCADE; CREATE SCHEMA public;
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES DE BASE
-- ============================================================

-- Soldats
CREATE TABLE soldiers (
  id                      SERIAL PRIMARY KEY,
  uuid                    UUID DEFAULT uuid_generate_v4() UNIQUE,
  matricule               VARCHAR(50) UNIQUE,
  nom                     VARCHAR(100) NOT NULL,
  prenom                  VARCHAR(100) NOT NULL,
  alias                   VARCHAR(100),
  nom_complet             VARCHAR(200) GENERATED ALWAYS AS (prenom || ' ' || nom) STORED,
  grade                   VARCHAR(50) NOT NULL,
  promotion               VARCHAR(50) NOT NULL,
  date_integration        DATE NOT NULL,
  date_promotion_actuelle DATE,
  date_naissance          DATE,
  lieu_naissance          VARCHAR(200),
  telephone               VARCHAR(20),
  email                   VARCHAR(150),
  adresse                 TEXT,
  photo_url               TEXT,
  -- Académique
  matricule_etudiant      VARCHAR(50),
  ufr                     VARCHAR(100),
  departement             VARCHAR(100),
  filiere                 VARCHAR(100),
  specialite              VARCHAR(100),
  annee_etude             VARCHAR(20),
  niveau_etude            VARCHAR(50),
  -- Hébergement
  village                 VARCHAR(100),
  batiment                VARCHAR(100),
  numero_chambre          VARCHAR(20),
  -- Militaire
  unite                   VARCHAR(100),
  section_affectation     VARCHAR(100),
  fonction                VARCHAR(100),
  haut_commandement       BOOLEAN DEFAULT FALSE,
  groupe_sanguin          VARCHAR(10),
  -- Statut
  statut                  VARCHAR(30) DEFAULT 'actif' CHECK (statut IN ('actif','inactif','suspendu','exclu','diplome')),
  statut_campus           VARCHAR(30) DEFAULT 'actif' CHECK (statut_campus IN ('actif','absent_temporaire','inactif')),
  motif_statut            TEXT,
  motif_absence_campus    TEXT,
  date_retour_prevue      DATE,
  -- Audit
  created_by              INTEGER,
  updated_by              INTEGER,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- Utilisateurs
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(30) NOT NULL CHECK (role IN ('admin','instructeur','officier','soldat')),
  nom_complet   VARCHAR(200),
  section_slug  VARCHAR(50),
  soldier_id    INTEGER REFERENCES soldiers(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Clés étrangères audit soldiers
ALTER TABLE soldiers ADD CONSTRAINT fk_soldiers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE soldiers ADD CONSTRAINT fk_soldiers_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 2. CRICs (Candidats Recrutés en Instance de Confirmation)
-- ============================================================
CREATE TABLE crics (
  id                    SERIAL PRIMARY KEY,
  nom                   VARCHAR(100) NOT NULL,
  prenom                VARCHAR(100) NOT NULL,
  date_naissance        DATE,
  lieu_naissance        VARCHAR(200),
  telephone             VARCHAR(20),
  email                 VARCHAR(150),
  photo_url             TEXT,
  ufr                   VARCHAR(100),
  departement           VARCHAR(100),
  annee_etude           VARCHAR(20),
  matricule_etudiant    VARCHAR(50),
  village               VARCHAR(100),
  batiment              VARCHAR(100),
  numero_chambre        VARCHAR(20),
  adresse               TEXT,
  notes_generales       TEXT,
  statut                VARCHAR(30) DEFAULT 'candidature' CHECK (statut IN (
    'candidature','entretien_planifié','confirmé','visite_médicale',
    'apte','inapte','intégration','serment','refusé','converti'
  )),
  date_candidature      DATE DEFAULT CURRENT_DATE,
  date_entretien        DATE,
  resultat_entretien    VARCHAR(50),
  notes_entretien       TEXT,
  date_visite_medicale  DATE,
  avis_medical          VARCHAR(50),
  notes_medicales       TEXT,
  decision_instructeur  TEXT,
  date_integration      DATE,
  date_serment          DATE,
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. PRÉSENCES
-- ============================================================
CREATE TABLE presences (
  id              SERIAL PRIMARY KEY,
  soldier_id      INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  date_activite   DATE NOT NULL,
  type_activite   VARCHAR(50) NOT NULL CHECK (type_activite IN (
    'levee_couleurs','descente_couleurs','entrainement','course','autre'
  )),
  present         BOOLEAN NOT NULL DEFAULT FALSE,
  remarque        TEXT,
  enregistre_par  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(soldier_id, date_activite, type_activite)
);

-- ============================================================
-- 4. SANCTIONS
-- ============================================================
CREATE TABLE sanctions (
  id                    SERIAL PRIMARY KEY,
  soldier_id            INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  date_sanction         DATE NOT NULL,
  type_sanction         VARCHAR(100) NOT NULL,
  categorie             VARCHAR(100),
  motif                 TEXT NOT NULL,
  faits                 TEXT,
  severite              VARCHAR(20) NOT NULL CHECK (severite IN ('mineure','moyenne','grave','tres_grave')),
  duree_jours           INTEGER,
  date_debut_execution  DATE,
  statut                VARCHAR(30) DEFAULT 'prononcee',
  prononce_par          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. DISTINCTIONS
-- ============================================================
CREATE TABLE distinctions (
  id                SERIAL PRIMARY KEY,
  soldier_id        INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  date_distinction  DATE NOT NULL,
  type_distinction  VARCHAR(100) NOT NULL,
  categorie         VARCHAR(100),
  intitule          VARCHAR(200) NOT NULL,
  description       TEXT,
  motif             TEXT NOT NULL,
  evenement         VARCHAR(200),
  date_ceremonie    DATE,
  lieu_ceremonie    VARCHAR(200),
  remise_par        VARCHAR(200),
  propose_par       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. APTITUDES MÉDICALES
-- ============================================================
CREATE TABLE aptitudes_medicales (
  id                                    SERIAL PRIMARY KEY,
  soldier_id                            INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id                               INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  date_visite                           DATE NOT NULL,
  aptitude_generale                     VARCHAR(50) NOT NULL CHECK (aptitude_generale IN (
    'apte','apte_avec_restrictions','inapte_temporaire','inapte_definitif'
  )),
  groupe_sanguin                        VARCHAR(10),
  poids_kg                              NUMERIC(5,2),
  taille_cm                             NUMERIC(5,2),
  tension_arterielle                    VARCHAR(20),
  frequence_cardiaque                   INTEGER,
  pouls                                 INTEGER,
  etat_sante_general                    TEXT,
  restriction_course                    BOOLEAN DEFAULT FALSE,
  restriction_port_charge               BOOLEAN DEFAULT FALSE,
  restriction_station_debout_prolongee  BOOLEAN DEFAULT FALSE,
  restriction_ceremonies                BOOLEAN DEFAULT FALSE,
  autres_restrictions                   TEXT,
  pathologies_actuelles                 TEXT,
  blessures_en_cours                    TEXT,
  traitements_en_cours                  TEXT,
  visite_urgente_requise                BOOLEAN DEFAULT FALSE,
  observations                          TEXT,
  recommandations                       TEXT,
  date_prochaine_visite                 DATE,
  medecin_nom                           VARCHAR(200),
  medecin_signature                     TEXT,
  medecin_user_id                       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  est_valide                            BOOLEAN DEFAULT TRUE,
  created_at                            TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 7. MENSURATIONS
-- ============================================================
CREATE TABLE mensurations (
  id                  SERIAL PRIMARY KEY,
  soldier_id          INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  date_mesure         DATE NOT NULL,
  taille_cm           NUMERIC(5,2),
  poids_kg            NUMERIC(5,2),
  tour_poitrine_cm    NUMERIC(5,2),
  tour_taille_cm      NUMERIC(5,2),
  tour_hanches_cm     NUMERIC(5,2),
  longueur_bras_cm    NUMERIC(5,2),
  longueur_jambe_cm   NUMERIC(5,2),
  pointure            NUMERIC(4,1),
  taille_standard     VARCHAR(10) CHECK (taille_standard IN ('XS','S','M','L','XL','XXL','XXXL')),
  notes               TEXT,
  est_actuelle        BOOLEAN DEFAULT TRUE,
  pris_par            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. VACCINATIONS
-- ============================================================
CREATE TABLE vaccinations (
  id              SERIAL PRIMARY KEY,
  soldier_id      INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id         INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  vaccin          VARCHAR(200) NOT NULL,
  date_vaccin     DATE NOT NULL DEFAULT CURRENT_DATE,
  prochain_rappel DATE,
  lot             VARCHAR(100),
  medecin         VARCHAR(200),
  remarques       TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 9. CÉRÉMONIES DRAPEAU
-- ============================================================
CREATE TABLE parametres_drapeau (
  id                    INTEGER PRIMARY KEY DEFAULT 1,
  auto_levee_active     BOOLEAN DEFAULT TRUE,
  auto_descente_active  BOOLEAN DEFAULT TRUE,
  heure_levee           TIME DEFAULT '07:00',
  heure_descente        TIME DEFAULT '18:00',
  updated_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at            TIMESTAMP DEFAULT NOW()
);
INSERT INTO parametres_drapeau DEFAULT VALUES;

CREATE TABLE ceremonies (
  id              SERIAL PRIMARY KEY,
  type            VARCHAR(30) NOT NULL CHECK (type IN ('levee','descente','speciale')),
  titre           VARCHAR(200) NOT NULL,
  date_ceremonie  DATE NOT NULL,
  heure_debut     TIME NOT NULL,
  lieu            VARCHAR(200) DEFAULT 'QG — UGB',
  description     TEXT,
  statut          VARCHAR(30) DEFAULT 'planifiee' CHECK (statut IN ('planifiee','confirmee','terminee','annulee')),
  auto_generee    BOOLEAN DEFAULT FALSE,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ceremonie_presences (
  id                SERIAL PRIMARY KEY,
  ceremonie_id      INTEGER NOT NULL REFERENCES ceremonies(id) ON DELETE CASCADE,
  participant_type  VARCHAR(10) NOT NULL CHECK (participant_type IN ('soldier','cric')),
  soldier_id        INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id           INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  presence          VARCHAR(20) DEFAULT 'absent' CHECK (presence IN ('present','absent','excuse')),
  motif             TEXT,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(ceremonie_id, soldier_id),
  UNIQUE(ceremonie_id, cric_id)
);

-- ============================================================
-- 10. SIGNALEMENTS
-- ============================================================
CREATE TABLE signalements (
  id            SERIAL PRIMARY KEY,
  section_slug  VARCHAR(50) NOT NULL,
  soldier_id    INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id       INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  ceremonie_id  INTEGER REFERENCES ceremonies(id) ON DELETE SET NULL,
  type          VARCHAR(50) DEFAULT 'autre' CHECK (type IN ('absence','retard','comportement','autre')),
  description   TEXT,
  statut        VARCHAR(30) DEFAULT 'ouvert' CHECK (statut IN ('ouvert','pris_en_charge','cloture')),
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titre       VARCHAR(200),
  message     TEXT,
  type        VARCHAR(50),
  lu          BOOLEAN DEFAULT FALSE,
  data        JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 12. STATUTS CAMPUS
-- ============================================================
CREATE TABLE historique_statuts_campus (
  id               SERIAL PRIMARY KEY,
  soldier_id       INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  ancien_statut    VARCHAR(30),
  nouveau_statut   VARCHAR(30),
  motif            TEXT,
  date_retour_prevue DATE,
  changed_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 13. MEMBRES DE SECTIONS
-- ============================================================
CREATE TABLE section_membres (
  id            SERIAL PRIMARY KEY,
  section_slug  VARCHAR(50) NOT NULL,
  soldier_id    INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  role          VARCHAR(30) DEFAULT 'membre' CHECK (role IN ('chef','second','membre')),
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(section_slug, soldier_id)
);

-- ============================================================
-- 14. BAT-MUSIC
-- ============================================================
CREATE TABLE bat_chansons (
  id            SERIAL PRIMARY KEY,
  titre         VARCHAR(200) NOT NULL,
  paroles       TEXT,
  contexte      VARCHAR(50) DEFAULT 'general',
  lien_externe  TEXT,
  tags          TEXT,
  notes         TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bat_playlists (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(200) NOT NULL,
  contexte      VARCHAR(50) DEFAULT 'general',
  description   TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bat_playlist_chansons (
  id          SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES bat_playlists(id) ON DELETE CASCADE,
  chanson_id  INTEGER NOT NULL REFERENCES bat_chansons(id) ON DELETE CASCADE,
  ordre       INTEGER DEFAULT 0,
  UNIQUE(playlist_id, chanson_id)
);

CREATE TABLE bat_feux_camp (
  id                  SERIAL PRIMARY KEY,
  titre               VARCHAR(200) NOT NULL,
  date_evenement      DATE NOT NULL,
  heure_debut         TIME,
  lieu                VARCHAR(200),
  groupe_beneficiaire VARCHAR(200),
  playlist_id         INTEGER REFERENCES bat_playlists(id) ON DELETE SET NULL,
  statut              VARCHAR(30) DEFAULT 'planifie' CHECK (statut IN ('planifie','en_cours','termine','annule')),
  rapport             TEXT,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bat_pointage_feux (
  id          SERIAL PRIMARY KEY,
  feu_id      INTEGER NOT NULL REFERENCES bat_feux_camp(id) ON DELETE CASCADE,
  soldier_id  INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  presence    VARCHAR(20) DEFAULT 'absent',
  motif       TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(feu_id, soldier_id)
);

CREATE TABLE bat_repetitions (
  id          SERIAL PRIMARY KEY,
  type_rep    VARCHAR(30) DEFAULT 'interne',
  date_rep    DATE NOT NULL,
  heure_debut TIME DEFAULT '14:00',
  heure_fin   TIME DEFAULT '17:00',
  lieu        VARCHAR(200),
  notes       TEXT,
  statut      VARCHAR(30) DEFAULT 'planifiee',
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bat_pointage_reps (
  id            SERIAL PRIMARY KEY,
  repetition_id INTEGER NOT NULL REFERENCES bat_repetitions(id) ON DELETE CASCADE,
  soldier_id    INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  presence      VARCHAR(20) DEFAULT 'absent',
  motif         TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(repetition_id, soldier_id)
);

-- ============================================================
-- 15. CAPORAUX (ENTRAÎNEMENTS)
-- ============================================================
CREATE TABLE entrainements (
  id          SERIAL PRIMARY KEY,
  titre       VARCHAR(200) NOT NULL,
  type_seance VARCHAR(50) NOT NULL,
  date_seance DATE NOT NULL,
  heure_debut TIME,
  heure_fin   TIME,
  lieu        VARCHAR(200) DEFAULT 'Terrain G5C',
  description TEXT,
  statut      VARCHAR(30) DEFAULT 'planifie' CHECK (statut IN ('planifie','en_cours','termine','annule')),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE entrainement_presences (
  id                SERIAL PRIMARY KEY,
  entrainement_id   INTEGER NOT NULL REFERENCES entrainements(id) ON DELETE CASCADE,
  participant_type  VARCHAR(10) NOT NULL CHECK (participant_type IN ('soldier','cric')),
  soldier_id        INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id           INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  presence          VARCHAR(20) DEFAULT 'absent',
  motif             TEXT,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(entrainement_id, soldier_id),
  UNIQUE(entrainement_id, cric_id)
);

CREATE TABLE entrainement_performances (
  id                SERIAL PRIMARY KEY,
  entrainement_id   INTEGER NOT NULL REFERENCES entrainements(id) ON DELETE CASCADE,
  soldier_id        INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id           INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  distance_km       NUMERIC(6,2),
  temps_footing     VARCHAR(20),
  temps_parcours    VARCHAR(20),
  nb_pompes         INTEGER,
  nb_abdos          INTEGER,
  nb_tractions      INTEGER,
  note              NUMERIC(4,2),
  observations      TEXT,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(entrainement_id, soldier_id),
  UNIQUE(entrainement_id, cric_id)
);

-- ============================================================
-- 16. ASSIDUITÉ CRICs
-- ============================================================
CREATE TABLE cric_seances (
  id            SERIAL PRIMARY KEY,
  titre         VARCHAR(200) NOT NULL,
  type_seance   VARCHAR(50) DEFAULT 'autre',
  date_seance   DATE,
  heure_debut   TIME,
  heure_fin     TIME,
  lieu          VARCHAR(200),
  description   TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cric_assiduites (
  id          SERIAL PRIMARY KEY,
  seance_id   INTEGER NOT NULL REFERENCES cric_seances(id) ON DELETE CASCADE,
  cric_id     INTEGER NOT NULL REFERENCES crics(id) ON DELETE CASCADE,
  presence    VARCHAR(20) DEFAULT 'absent',
  motif       TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(seance_id, cric_id)
);

-- ============================================================
-- 17. DASB (Aide sociale)
-- ============================================================
CREATE TABLE budgets (
  id                  SERIAL PRIMARY KEY,
  titre               VARCHAR(200) NOT NULL,
  periode             VARCHAR(50),
  montant_total       NUMERIC(12,2) NOT NULL,
  montant_disponible  NUMERIC(12,2) NOT NULL,
  montant_depense     NUMERIC(12,2) DEFAULT 0,
  description         TEXT,
  statut              VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif','cloture','suspendu')),
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE demandes_sociales (
  id              SERIAL PRIMARY KEY,
  soldier_id      INTEGER REFERENCES soldiers(id) ON DELETE SET NULL,
  cric_id         INTEGER REFERENCES crics(id) ON DELETE SET NULL,
  budget_id       INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
  type_aide       VARCHAR(100) NOT NULL,
  motif           TEXT NOT NULL,
  montant_demande NUMERIC(10,2),
  montant_accorde NUMERIC(10,2),
  priorite        VARCHAR(20) DEFAULT 'normale' CHECK (priorite IN ('normale','haute','urgente')),
  statut          VARCHAR(30) DEFAULT 'en_attente' CHECK (statut IN ('en_attente','approuvee','rejetee','en_cours')),
  date_demande    DATE DEFAULT CURRENT_DATE,
  date_traitement DATE,
  observations    TEXT,
  traite_par      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE depenses (
  id            SERIAL PRIMARY KEY,
  budget_id     INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
  demande_id    INTEGER REFERENCES demandes_sociales(id) ON DELETE SET NULL,
  libelle       VARCHAR(200) NOT NULL,
  montant       NUMERIC(10,2) NOT NULL,
  categorie     VARCHAR(100),
  date_depense  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 18. DASC (Compétitions & culture)
-- ============================================================
CREATE TABLE competitions (
  id          SERIAL PRIMARY KEY,
  titre       VARCHAR(200) NOT NULL,
  sport       VARCHAR(100) NOT NULL,
  type        VARCHAR(30) DEFAULT 'interne' CHECK (type IN ('interne','externe','interuniversitaire')),
  date_debut  DATE NOT NULL,
  date_fin    DATE,
  lieu        VARCHAR(200),
  description TEXT,
  statut      VARCHAR(30) DEFAULT 'planifie' CHECK (statut IN ('planifie','en_cours','termine','annule')),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE participations (
  id              SERIAL PRIMARY KEY,
  competition_id  INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  soldier_id      INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id         INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  sport           VARCHAR(100),
  classement      INTEGER,
  medaille        VARCHAR(20) DEFAULT 'aucune' CHECK (medaille IN ('or','argent','bronze','aucune')),
  performance     TEXT,
  observations    TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE evenements_culturels (
  id              SERIAL PRIMARY KEY,
  titre           VARCHAR(200) NOT NULL,
  type            VARCHAR(100) NOT NULL,
  date_evenement  DATE NOT NULL,
  lieu            VARCHAR(200),
  description     TEXT,
  statut          VARCHAR(30) DEFAULT 'planifie',
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE participations_culturelles (
  id            SERIAL PRIMARY KEY,
  evenement_id  INTEGER NOT NULL REFERENCES evenements_culturels(id) ON DELETE CASCADE,
  soldier_id    INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id       INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  role          VARCHAR(100),
  distinction   VARCHAR(200),
  observations  TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 19. DCSP (Formation & académique)
-- ============================================================
CREATE TABLE formations (
  id                  SERIAL PRIMARY KEY,
  soldier_id          INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id             INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  intitule            VARCHAR(200) NOT NULL,
  type_formation      VARCHAR(50) DEFAULT 'autre',
  domaine             VARCHAR(100),
  description         TEXT,
  date_debut          DATE NOT NULL,
  date_fin            DATE,
  duree_heures        INTEGER,
  statut              VARCHAR(30) DEFAULT 'en_cours' CHECK (statut IN ('en_cours','validee','abandonnee','echouee')),
  note_finale         NUMERIC(5,2),
  note_sur            NUMERIC(5,2) DEFAULT 20,
  appreciation        TEXT,
  certifiante         BOOLEAN DEFAULT FALSE,
  certificat_obtenu   BOOLEAN DEFAULT FALSE,
  numero_certificat   VARCHAR(100),
  organisme           VARCHAR(200),
  formateur           VARCHAR(200),
  lieu                VARCHAR(200),
  enregistre_par      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fiches_academiques (
  id                SERIAL PRIMARY KEY,
  soldier_id        INTEGER REFERENCES soldiers(id) ON DELETE CASCADE,
  cric_id           INTEGER REFERENCES crics(id) ON DELETE CASCADE,
  annee_academique  VARCHAR(20) NOT NULL,
  moyenne_annuelle  NUMERIC(4,2),
  mention           VARCHAR(50),
  statut            VARCHAR(30) DEFAULT 'en_cours',
  releve_notes      TEXT,
  attestation       TEXT,
  observations      TEXT,
  enregistre_par    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(soldier_id, annee_academique)
);

-- Génie en herbe
CREATE TABLE genie_tournois (
  id          SERIAL PRIMARY KEY,
  titre       VARCHAR(200) NOT NULL,
  annee       INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  description TEXT,
  date_debut  DATE,
  date_fin    DATE,
  statut      VARCHAR(30) DEFAULT 'en_cours' CHECK (statut IN ('en_cours','termine','annule')),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE genie_equipes (
  id            SERIAL PRIMARY KEY,
  tournoi_id    INTEGER NOT NULL REFERENCES genie_tournois(id) ON DELETE CASCADE,
  palier        VARCHAR(50) NOT NULL,
  capitaine_id  INTEGER REFERENCES soldiers(id) ON DELETE SET NULL,
  score_total   INTEGER DEFAULT 0,
  victoires     INTEGER DEFAULT 0,
  defaites      INTEGER DEFAULT 0,
  nuls          INTEGER DEFAULT 0
);

CREATE TABLE genie_membres (
  id          SERIAL PRIMARY KEY,
  equipe_id   INTEGER NOT NULL REFERENCES genie_equipes(id) ON DELETE CASCADE,
  soldier_id  INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  role        VARCHAR(30) DEFAULT 'membre',
  UNIQUE(equipe_id, soldier_id)
);

CREATE TABLE genie_matchs (
  id            SERIAL PRIMARY KEY,
  tournoi_id    INTEGER REFERENCES genie_tournois(id) ON DELETE CASCADE,
  equipe1_id    INTEGER NOT NULL REFERENCES genie_equipes(id) ON DELETE CASCADE,
  equipe2_id    INTEGER NOT NULL REFERENCES genie_equipes(id) ON DELETE CASCADE,
  score1        INTEGER DEFAULT 0,
  score2        INTEGER DEFAULT 0,
  phase         VARCHAR(30) DEFAULT 'poule',
  date_match    DATE,
  lieu          VARCHAR(200),
  statut        VARCHAR(20) DEFAULT 'joue',
  observations  TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 20. FONCTION UTILITAIRE — Génération du matricule
-- ============================================================
CREATE OR REPLACE FUNCTION generer_matricule(
  p_date_integration DATE,
  p_promotion        TEXT,
  p_matricule_etud   TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_annee TEXT;
  v_num   TEXT;
  v_count INTEGER;
BEGIN
  v_annee := TO_CHAR(p_date_integration, 'YY');
  SELECT COUNT(*) + 1 INTO v_count FROM soldiers WHERE promotion = p_promotion;
  v_num := LPAD(v_count::TEXT, 3, '0');
  RETURN 'G5C-' || v_annee || '-' || UPPER(LEFT(p_promotion, 3)) || '-' || v_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 21. VUES
-- ============================================================

-- Fiche soldat complète
CREATE OR REPLACE VIEW vue_fiche_soldat AS
SELECT
  s.*,
  (SELECT COUNT(*) FROM presences p WHERE p.soldier_id = s.id AND p.present = TRUE)  AS total_presences,
  (SELECT COUNT(*) FROM sanctions sa WHERE sa.soldier_id = s.id)                      AS total_sanctions,
  (SELECT COUNT(*) FROM distinctions d WHERE d.soldier_id = s.id)                     AS total_distinctions,
  (SELECT aptitude_generale FROM aptitudes_medicales a WHERE a.soldier_id = s.id AND a.est_valide = TRUE ORDER BY a.date_visite DESC LIMIT 1) AS aptitude_actuelle
FROM soldiers s;

-- Effectif par grade
CREATE OR REPLACE VIEW vue_effectif_par_grade AS
SELECT grade, COUNT(*) AS effectif
FROM soldiers
WHERE statut = 'actif'
GROUP BY grade
ORDER BY effectif DESC;

-- Alertes présences (absents à plus de 3 activités récentes)
CREATE OR REPLACE VIEW vue_alertes_presences AS
SELECT s.id, s.matricule, s.nom, s.prenom, s.grade,
  COUNT(*) FILTER (WHERE p.present = FALSE) AS nb_absences_recentes
FROM soldiers s
JOIN presences p ON p.soldier_id = s.id
WHERE p.date_activite >= CURRENT_DATE - INTERVAL '30 days'
  AND s.statut = 'actif'
GROUP BY s.id, s.matricule, s.nom, s.prenom, s.grade
HAVING COUNT(*) FILTER (WHERE p.present = FALSE) >= 3;

-- Stats cérémonies
CREATE OR REPLACE VIEW vue_stats_ceremonies AS
SELECT
  c.*,
  COUNT(cp.id) AS total_participants,
  COUNT(cp.id) FILTER (WHERE cp.presence = 'present') AS nb_presents,
  COUNT(cp.id) FILTER (WHERE cp.presence = 'absent')  AS nb_absents,
  CASE WHEN COUNT(cp.id) > 0
    THEN ROUND(COUNT(cp.id) FILTER (WHERE cp.presence = 'present') * 100.0 / COUNT(cp.id))
    ELSE 0 END AS taux_presence
FROM ceremonies c
LEFT JOIN ceremonie_presences cp ON cp.ceremonie_id = c.id
GROUP BY c.id;

-- Assiduité CRICs
CREATE OR REPLACE VIEW vue_assiduite_crics AS
SELECT
  c.id, c.nom, c.prenom, c.ufr, c.annee_etude, c.statut,
  COUNT(ca.id) AS total_seances,
  COUNT(ca.id) FILTER (WHERE ca.presence = 'present') AS presences,
  CASE WHEN COUNT(ca.id) > 0
    THEN ROUND(COUNT(ca.id) FILTER (WHERE ca.presence = 'present') * 100.0 / COUNT(ca.id))
    ELSE 0 END AS taux_assiduite
FROM crics c
LEFT JOIN cric_assiduites ca ON ca.cric_id = c.id
GROUP BY c.id;

-- ============================================================
-- 22. UTILISATEUR ADMIN PAR DÉFAUT
-- ============================================================
-- Mot de passe: Admin2024! (à changer immédiatement)
INSERT INTO users (username, password_hash, role, nom_complet, is_active)
VALUES (
  'admin',
  '$2b$10$rBV2JDeWW3.vKmBHpSgmZegtBBSJSWnVGHNMj0y2GzmJfZ7SnXXSW',
  'admin',
  'Administrateur G5C',
  true
);
-- Hash correspond à: G5C_Admin_2024!
-- IMPORTANT: Changez ce mot de passe après la première connexion !
