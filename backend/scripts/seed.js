let faker;
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SEED_COUNTS = {
  soldiers: 50,
  crics: 20,
  users: 5,
  presencesPerSoldier: { min: 20, max: 60 },
  sanctions: 15,
  distinctions: 25,
  aptitudes: 40,
  mensurations: 50,
  ceremonies: 10,
  batChansons: 15,
  entrainements: 10,
  competitions: 6,
  formations: 20,
  demandesSociales: 15,
  notifications: 30,
};

const grades = ['Caporal', 'Sergent', 'Lieutenant', 'Capitaine', 'Commandant', 'Colonel'];
const promotions = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
const sections = ['Section Drapeau', 'Section Caporaux', 'BAT-MUSIC', 'Restauration', 'Recrutement', 'DRH', 'DASB', 'DASC', 'DCSP'];
const unites = ['1ère Compagnie', '2ème Compagnie', '3ème Compagnie', 'État-major'];
const villages = ['Village A', 'Village B', 'Village C', 'Village D'];
const ufrs = ['Sciences', 'Lettres', 'Droit', 'Économie', 'Médecine', 'Ingénierie'];
const typesActivite = ['levee_couleurs', 'descente_couleurs', 'entrainement', 'course', 'autre'];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Début du seeding...');
    const fakerModule = await import('@faker-js/faker');
    faker = fakerModule.faker;
    await client.query('BEGIN');

    // Vérifier admin
    let adminId = 1;
    const adminExists = await client.query("SELECT id FROM users WHERE id = 1");
    if (adminExists.rows.length === 0) {
      const adminHash = await bcrypt.hash('Admin2024', 10);
      await client.query(
        "INSERT INTO users (id, username, password_hash, role, nom_complet, is_active) VALUES (1, 'admin', $1, 'admin', 'Administrateur', true)",
        [adminHash]
      );
      console.log('Admin créé');
    }

    // 1. Soldats
    console.log(`Création de ${SEED_COUNTS.soldiers} soldats...`);
    const soldierIds = [];
    for (let i = 0; i < SEED_COUNTS.soldiers; i++) {
      const nom = faker.person.lastName().slice(0, 50);
      const prenom = faker.person.firstName().slice(0, 50);
      const grade = faker.helpers.arrayElement(grades);
      const promotion = faker.helpers.arrayElement(promotions);
      const date_integration = faker.date.between({ from: '2020-01-01', to: '2025-01-01' });
      const date_naissance = faker.date.birthdate({ min: 18, max: 40, mode: 'age' });
      const lieu_naissance = faker.location.city().slice(0, 100);
      const telephone = '77' + faker.string.numeric(8);
      const email = faker.internet.email({ firstName: prenom, lastName: nom }).slice(0, 150);
      const adresse = faker.location.streetAddress().slice(0, 200);
      const matricule_etudiant = 'ETU' + faker.number.int({ min: 1000, max: 9999 });
      const ufr = faker.helpers.arrayElement(ufrs);
      const departement = faker.helpers.arrayElement(['Maths', 'Physique', 'Informatique', 'Lettres']);
      const filiere = faker.helpers.arrayElement(['Licence', 'Master', 'Doctorat']);
      const annee_etude = faker.helpers.arrayElement(['L1', 'L2', 'L3', 'M1', 'M2']);
      const village = faker.helpers.arrayElement(villages);
      const batiment = 'B' + faker.string.alphanumeric(2).toUpperCase();
      const numero_chambre = faker.number.int({ min: 1, max: 50 }).toString();
      const section_affectation = faker.helpers.arrayElement(sections);
      const unite = faker.helpers.arrayElement(unites);
      const fonction = faker.person.jobTitle().slice(0, 100);
      const statut = faker.helpers.arrayElement(['actif', 'inactif', 'suspendu']);
      const statut_campus = faker.helpers.arrayElement(['actif', 'absent_temporaire', 'inactif']);
      const created_by = adminId;

      const res = await client.query(
        `INSERT INTO soldiers (
          nom, prenom, grade, promotion, date_integration, date_naissance, lieu_naissance,
          telephone, email, adresse, matricule_etudiant, ufr, departement, filiere, annee_etude,
          village, batiment, numero_chambre, section_affectation, unite, fonction, statut,
          statut_campus, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        RETURNING id`,
        [nom, prenom, grade, promotion, date_integration, date_naissance, lieu_naissance,
         telephone, email, adresse, matricule_etudiant, ufr, departement, filiere, annee_etude,
         village, batiment, numero_chambre, section_affectation, unite, fonction, statut,
         statut_campus, created_by]
      );
      soldierIds.push(res.rows[0].id);
    }

    // 2. Autres utilisateurs
    console.log(`Création de ${SEED_COUNTS.users} utilisateurs...`);
    const userIds = [adminId];
    for (let i = 0; i < SEED_COUNTS.users; i++) {
      const soldier = soldierIds[i % soldierIds.length];
      const username = faker.internet.username().slice(0, 100);
      const password_hash = await bcrypt.hash('password123', 10);
      const role = faker.helpers.arrayElement(['instructeur', 'officier', 'soldat']);
      const nom_complet = faker.person.fullName().slice(0, 200);
      const section_slug = faker.helpers.arrayElement(['drapeau', 'caporaux', 'batmusic']);
      const is_active = true;
      const res = await client.query(
        `INSERT INTO users (username, password_hash, role, nom_complet, section_slug, soldier_id, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (username) DO NOTHING RETURNING id`,
        [username, password_hash, role, nom_complet, section_slug, soldier, is_active]
      );
      if (res.rows[0]) userIds.push(res.rows[0].id);
    }

    // 3. Présences (avec gestion des doublons)
    console.log(`Création des présences...`);
    for (const soldierId of soldierIds) {
      const nbPresences = faker.number.int({ min: SEED_COUNTS.presencesPerSoldier.min, max: SEED_COUNTS.presencesPerSoldier.max });
      const usedKeys = new Set();
      for (let j = 0; j < nbPresences; j++) {
        let date_activite = faker.date.between({ from: '2024-01-01', to: '2025-06-01' });
        let type_activite = faker.helpers.arrayElement(typesActivite);
        let key = `${soldierId}_${date_activite.toISOString()}_${type_activite}`;
        // Éviter les doublons pour ce soldat
        while (usedKeys.has(key)) {
          date_activite = faker.date.between({ from: '2024-01-01', to: '2025-06-01' });
          type_activite = faker.helpers.arrayElement(typesActivite);
          key = `${soldierId}_${date_activite.toISOString()}_${type_activite}`;
        }
        usedKeys.add(key);
        const present = faker.datatype.boolean(0.85);
        const remarque = present ? null : faker.lorem.sentence().slice(0, 255);
        await client.query(
          `INSERT INTO presences (soldier_id, date_activite, type_activite, present, remarque, enregistre_par)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [soldierId, date_activite, type_activite, present, remarque, faker.helpers.arrayElement(userIds)]
        );
      }
    }

    // 4. Sanctions
    console.log(`Création de ${SEED_COUNTS.sanctions} sanctions...`);
    for (let i = 0; i < SEED_COUNTS.sanctions; i++) {
      const soldierId = faker.helpers.arrayElement(soldierIds);
      const date_sanction = faker.date.between({ from: '2024-01-01', to: '2025-06-01' });
      const type_sanction = faker.helpers.arrayElement(['Avertissement', 'Blâme', 'Travaux forcés', 'Exclusion temporaire']);
      const motif = faker.lorem.sentence().slice(0, 255);
      const severite = faker.helpers.arrayElement(['mineure', 'moyenne', 'grave']);
      const duree_jours = severite === 'grave' ? faker.number.int({ min: 10, max: 30 }) : faker.number.int({ min: 1, max: 7 });
      const prononce_par = faker.helpers.arrayElement(userIds);
      await client.query(
        `INSERT INTO sanctions (soldier_id, date_sanction, type_sanction, motif, severite, duree_jours, prononce_par)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [soldierId, date_sanction, type_sanction, motif, severite, duree_jours, prononce_par]
      );
    }

    // 5. Distinctions
    console.log(`Création de ${SEED_COUNTS.distinctions} distinctions...`);
    for (let i = 0; i < SEED_COUNTS.distinctions; i++) {
      const soldierId = faker.helpers.arrayElement(soldierIds);
      const date_distinction = faker.date.between({ from: '2023-01-01', to: '2025-06-01' });
      const type_distinction = faker.helpers.arrayElement(['Médaille', 'Diplôme', 'Lettre de félicitations', 'Promotion exceptionnelle']);
      const intitule = faker.lorem.words(3).slice(0, 200);
      const motif = faker.lorem.sentence().slice(0, 255);
      const propose_par = faker.helpers.arrayElement(userIds);
      await client.query(
        `INSERT INTO distinctions (soldier_id, date_distinction, type_distinction, intitule, motif, propose_par)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [soldierId, date_distinction, type_distinction, intitule, motif, propose_par]
      );
    }

    // 6. Aptitudes médicales
    console.log(`Création de ${SEED_COUNTS.aptitudes} aptitudes...`);
    for (let i = 0; i < SEED_COUNTS.aptitudes; i++) {
      const soldierId = faker.helpers.arrayElement(soldierIds);
      const date_visite = faker.date.between({ from: '2023-01-01', to: '2025-06-01' });
      const aptitude_generale = faker.helpers.arrayElement(['apte', 'apte_avec_restrictions', 'inapte_temporaire']);
      const groupe_sanguin = faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);
      const poids_kg = faker.number.float({ min: 50, max: 100, fractionDigits: 1 });
      const taille_cm = faker.number.float({ min: 150, max: 200, fractionDigits: 1 });
      const medecin_nom = faker.person.fullName().slice(0, 200);
      await client.query(
        `INSERT INTO aptitudes_medicales (soldier_id, date_visite, aptitude_generale, groupe_sanguin,
          poids_kg, taille_cm, medecin_nom, est_valide)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [soldierId, date_visite, aptitude_generale, groupe_sanguin, poids_kg, taille_cm, medecin_nom, true]
      );
    }

    // 7. Mensurations
    console.log(`Création de ${SEED_COUNTS.mensurations} mensurations...`);
    for (let i = 0; i < SEED_COUNTS.mensurations; i++) {
      const soldierId = faker.helpers.arrayElement(soldierIds);
      const date_mesure = faker.date.between({ from: '2023-01-01', to: '2025-06-01' });
      const taille_cm = faker.number.float({ min: 150, max: 200, fractionDigits: 1 });
      const poids_kg = faker.number.float({ min: 50, max: 100, fractionDigits: 1 });
      const pointure = faker.number.float({ min: 36, max: 46, fractionDigits: 0 });
      const taille_standard = faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL']);
      const pris_par = faker.helpers.arrayElement(userIds);
      await client.query(
        `INSERT INTO mensurations (soldier_id, date_mesure, taille_cm, poids_kg, pointure, taille_standard, pris_par)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [soldierId, date_mesure, taille_cm, poids_kg, pointure, taille_standard, pris_par]
      );
    }

    // 8. CRICs
    console.log(`Création de ${SEED_COUNTS.crics} CRICs...`);
    const cricIds = [];
    for (let i = 0; i < SEED_COUNTS.crics; i++) {
      const nom = faker.person.lastName().slice(0, 100);
      const prenom = faker.person.firstName().slice(0, 100);
      const date_naissance = faker.date.birthdate({ min: 18, max: 30 });
      const telephone = '77' + faker.string.numeric(8);
      const email = faker.internet.email().slice(0, 150);
      const ufr = faker.helpers.arrayElement(ufrs);
      const annee_etude = faker.helpers.arrayElement(['L1', 'L2', 'L3']);
      const village = faker.helpers.arrayElement(villages);
      const statut = faker.helpers.arrayElement(['candidature', 'confirmé', 'apte', 'intégration']);
      const created_by = faker.helpers.arrayElement(userIds);
      const res = await client.query(
        `INSERT INTO crics (nom, prenom, date_naissance, telephone, email, ufr, annee_etude, village, statut, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [nom, prenom, date_naissance, telephone, email, ufr, annee_etude, village, statut, created_by]
      );
      cricIds.push(res.rows[0].id);
    }

    // 9. Cérémonies
    console.log(`Création de ${SEED_COUNTS.ceremonies} cérémonies...`);
    for (let i = 0; i < SEED_COUNTS.ceremonies; i++) {
      const type = faker.helpers.arrayElement(['levee', 'descente', 'speciale']);
      const titre = `Cérémonie ${type} - ${faker.lorem.words(2)}`.slice(0, 200);
      const date_ceremonie = faker.date.between({ from: '2024-01-01', to: '2025-12-31' });
      const heure_debut = faker.date.past().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const lieu = faker.location.city().slice(0, 200);
      const statut = faker.helpers.arrayElement(['planifiee', 'confirmee', 'terminee']);
      const created_by = faker.helpers.arrayElement(userIds);
      const res = await client.query(
        `INSERT INTO ceremonies (type, titre, date_ceremonie, heure_debut, lieu, statut, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [type, titre, date_ceremonie, heure_debut, lieu, statut, created_by]
      );
      const participants = [...soldierIds.slice(0, 20), ...cricIds.slice(0, 10)];
      for (const pid of participants) {
        const isSoldier = soldierIds.includes(pid);
        const presence = faker.helpers.arrayElement(['present', 'absent', 'excuse']);
        await client.query(
          `INSERT INTO ceremonie_presences (ceremonie_id, participant_type, soldier_id, cric_id, presence)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [res.rows[0].id, isSoldier ? 'soldier' : 'cric', isSoldier ? pid : null, !isSoldier ? pid : null, presence]
        );
      }
    }

    // 10. BAT-Music chansons
    console.log(`Création de ${SEED_COUNTS.batChansons} chansons...`);
    for (let i = 0; i < SEED_COUNTS.batChansons; i++) {
      const titre = faker.lorem.words(3).slice(0, 200);
      const paroles = faker.lorem.paragraphs(2);
      const contexte = faker.helpers.arrayElement(['general', 'feux', 'repetition']);
      const created_by = faker.helpers.arrayElement(userIds);
      await client.query(
        `INSERT INTO bat_chansons (titre, paroles, contexte, created_by)
         VALUES ($1,$2,$3,$4)`,
        [titre, paroles, contexte, created_by]
      );
    }

    // 11. Entraînements
    console.log(`Création de ${SEED_COUNTS.entrainements} entraînements...`);
    for (let i = 0; i < SEED_COUNTS.entrainements; i++) {
      const titre = `Entraînement ${faker.lorem.word()}`.slice(0, 200);
      const type_seance = faker.helpers.arrayElement(['footing', 'parcours', 'musculation', 'sport collectif']);
      const date_seance = faker.date.between({ from: '2024-01-01', to: '2025-06-01' });
      const lieu = faker.location.city().slice(0, 200);
      const created_by = faker.helpers.arrayElement(userIds);
      const res = await client.query(
        `INSERT INTO entrainements (titre, type_seance, date_seance, lieu, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [titre, type_seance, date_seance, lieu, created_by]
      );
      for (const sid of soldierIds.slice(0, 30)) {
        const presence = faker.helpers.arrayElement(['present', 'absent']);
        await client.query(
          `INSERT INTO entrainement_presences (entrainement_id, participant_type, soldier_id, presence)
           VALUES ($1, 'soldier', $2, $3) ON CONFLICT DO NOTHING`,
          [res.rows[0].id, sid, presence]
        );
      }
    }

    // 12. Compétitions
    console.log(`Création de ${SEED_COUNTS.competitions} compétitions...`);
    for (let i = 0; i < SEED_COUNTS.competitions; i++) {
      const titre = `Compétition ${faker.lorem.word()}`.slice(0, 200);
      const sport = faker.helpers.arrayElement(['Football', 'Basketball', 'Athlétisme', 'Handball']);
      const date_debut = faker.date.between({ from: '2024-01-01', to: '2025-12-31' });
      const statut = faker.helpers.arrayElement(['planifie', 'termine']);
      await client.query(
        `INSERT INTO competitions (titre, sport, date_debut, statut)
         VALUES ($1,$2,$3,$4)`,
        [titre, sport, date_debut, statut]
      );
    }

    // 13. Formations
    console.log(`Création de ${SEED_COUNTS.formations} formations...`);
    for (let i = 0; i < SEED_COUNTS.formations; i++) {
      const soldierId = faker.helpers.arrayElement(soldierIds);
      const intitule = faker.lorem.words(4).slice(0, 200);
      const date_debut = faker.date.between({ from: '2023-01-01', to: '2025-01-01' });
      const date_fin = faker.date.between({ from: date_debut, to: '2025-12-31' });
      const statut = faker.helpers.arrayElement(['validee', 'en_cours']);
      const note_finale = faker.number.float({ min: 10, max: 20, fractionDigits: 2 });
      await client.query(
        `INSERT INTO formations (soldier_id, intitule, date_debut, date_fin, statut, note_finale)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [soldierId, intitule, date_debut, date_fin, statut, note_finale]
      );
    }

    // 14. Demandes sociales
    console.log(`Création de ${SEED_COUNTS.demandesSociales} demandes sociales...`);
    for (let i = 0; i < SEED_COUNTS.demandesSociales; i++) {
      const soldierId = faker.helpers.arrayElement(soldierIds);
      const type_aide = faker.helpers.arrayElement(['financière', 'matérielle', 'médicale', 'alimentaire']);
      const motif = faker.lorem.sentence().slice(0, 255);
      const montant_demande = faker.number.float({ min: 5000, max: 500000, fractionDigits: 0 });
      const statut = faker.helpers.arrayElement(['en_attente', 'approuvee', 'rejetee']);
      const date_demande = faker.date.between({ from: '2024-01-01', to: '2025-06-01' });
      await client.query(
        `INSERT INTO demandes_sociales (soldier_id, type_aide, motif, montant_demande, statut, date_demande)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [soldierId, type_aide, motif, montant_demande, statut, date_demande]
      );
    }

    // 15. Notifications
    console.log(`Création de ${SEED_COUNTS.notifications} notifications...`);
    for (let i = 0; i < SEED_COUNTS.notifications; i++) {
      const userId = faker.helpers.arrayElement(userIds);
      const titre = faker.lorem.words(3).slice(0, 200);
      const message = faker.lorem.sentence().slice(0, 255);
      const type = faker.helpers.arrayElement(['info', 'warning', 'success']);
      const lu = faker.datatype.boolean();
      await client.query(
        `INSERT INTO notifications (user_id, titre, message, type, lu)
         VALUES ($1,$2,$3,$4,$5)`,
        [userId, titre, message, type, lu]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Seeding terminé. Soldats: ${soldierIds.length}, Utilisateurs: ${userIds.length}, CRICs: ${cricIds.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur pendant le seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
