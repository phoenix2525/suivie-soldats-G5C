const axios = require('axios');
const { faker } = require('@faker-js/faker');
const API = 'http://localhost:5000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let token = null;
let soldiers = [];
let crics = [];

async function login() {
  try {
    const res = await axios.post(`${API}/auth/login`, {
      username: 'admin',
      password: 'Admin@G5C-2024'
    });
    token = res.data.data.token;
    console.log(colors.green + '✅ Connexion réussie' + colors.reset);
  } catch (err) {
    console.error(colors.red + '❌ Échec de connexion' + colors.reset, err.message);
    process.exit(1);
  }
}

function headers() {
  return { Authorization: `Bearer ${token}` };
}

function generateSoldier() {
  const sexe = faker.helpers.arrayElement(['M', 'F']);
  return {
    prenom: faker.person.firstName(sexe === 'M' ? 'male' : 'female'),
    nom: faker.person.lastName(),
    date_naissance: faker.date.birthdate({ min: 18, max: 35, mode: 'age' }).toISOString().split('T')[0],
    lieu_naissance: faker.location.city(),
    matricule: faker.string.alphanumeric(8).toUpperCase(),
    grade: faker.helpers.arrayElement(['Légionnaire', 'Caporal', 'Sergent', 'Adjudant', 'Major']),
    promotion: faker.number.int({ min: 2020, max: 2026 }).toString(),
    date_integration: faker.date.past({ years: 2 }).toISOString().split('T')[0], // AJOUTÉ
    ufr: faker.helpers.arrayElement(['Sciences', 'Lettres', 'Droit', 'Médecine', 'Économie']),
    departement: faker.person.jobArea(),
    filiere: faker.person.jobType(),
    annee_etude: faker.helpers.arrayElement(['L1', 'L2', 'L3', 'M1', 'M2']),
    telephone: faker.phone.number('+221 7# ## ## ##'),
    email: faker.internet.email(),
    adresse: faker.location.streetAddress(),
    village: faker.helpers.arrayElement(['Cité', 'Hors campus', 'Village 1', 'Village 2']),
    batiment: faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
    numero_chambre: faker.number.int({ min: 1, max: 20 }).toString(),
    statut: 'actif',
    fonction: faker.helpers.arrayElement(['', 'Instructeur', 'Responsable', 'Agent']),
    section_affectation: faker.helpers.arrayElement(['DRH', 'DSA', 'DCSP', 'DASC', 'DASB', 'DGMI', 'Section Drapeau', '']),
  };
}

function generateCric() {
  return {
    prenom: faker.person.firstName(),
    nom: faker.person.lastName(),
    matricule_etudiant: faker.string.alphanumeric(10).toUpperCase(),
    date_naissance: faker.date.birthdate({ min: 18, max: 30, mode: 'age' }).toISOString().split('T')[0],
    ufr: faker.helpers.arrayElement(['Sciences', 'Lettres', 'Droit']),
    departement: faker.person.jobArea(),
    filiere: faker.person.jobType(),
    niveau: faker.helpers.arrayElement(['L1', 'L2', 'L3', 'M1']),
    telephone: faker.phone.number('+221 7# ## ## ##'),
    email: faker.internet.email(),
  };
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createSoldiers(n = 5) {
  console.log(colors.blue + `\n📦 Création de ${n} soldats...` + colors.reset);
  for (let i = 0; i < n; i++) {
    try {
      const data = generateSoldier();
      const res = await axios.post(`${API}/soldiers`, data, { headers: headers() });
      soldiers.push(res.data.data);
      process.stdout.write('.');
      await delay(50);
    } catch (err) {
      console.error(colors.red + `\n❌ Erreur création soldat ${i}:` + colors.reset, err.response?.data || err.message);
    }
  }
  console.log(colors.green + `\n✅ ${soldiers.length} soldats créés` + colors.reset);
}

async function createCrics(n = 3) {
  console.log(colors.blue + `\n📦 Création de ${n} CRICs...` + colors.reset);
  for (let i = 0; i < n; i++) {
    try {
      const data = generateCric();
      const res = await axios.post(`${API}/crics`, data, { headers: headers() });
      crics.push(res.data.data);
      process.stdout.write('.');
      await delay(50);
    } catch (err) {
      console.error(colors.red + `\n❌ Erreur création CRIC ${i}:` + colors.reset, err.response?.data || err.message);
    }
  }
  console.log(colors.green + `\n✅ ${crics.length} CRICs créés` + colors.reset);
}

async function run() {
  console.log(colors.yellow + '\n🚀 DÉMARRAGE DES TESTS D\'INJECTION MASSIVE G5C' + colors.reset);
  await login();

  await createSoldiers(5);
  await createCrics(3);

  console.log(colors.green + '\n✅ TESTS TERMINÉS. Vérifiez les logs pour les éventuelles erreurs.' + colors.reset);
}

run();
