/**
 * Middleware de protection par section
 * - admin       : accès total
 * - instructeur : accès total
 * - officier    : lecture partout, écriture uniquement sur sa section
 * - soldat      : accès uniquement à sa propre fiche
 */

// Mapping route-prefix → section_slug dans la DB
const ROUTE_SECTION_MAP = {
  'drapeau':      'Section Drapeau',
  'caporaux':     'Section Caporaux',
  'bat-music':    'BAT-MUSIC',
  'restauration': 'Section Restauration',
  'recrutement':  'Section Recrutement',
  'crics':        'Section Recrutement',
  'assiduites':   'Section Recrutement',
  'drh':          'DRH',
  'dsa':          'DSA',
  'dasc':         'DASC',
  'dcsp':         'DCSP',
  'dasb':         'DASB',
};

/**
 * Extraire la section depuis l'URL
 * ex: /api/drapeau/ceremonies → 'drapeau'
 */
const getSectionFromPath = (path) => {
  const parts = path.replace('/api/', '').split('/');
  return parts[0] || null;
};

/**
 * Middleware pour les routes d'écriture (POST, PUT, DELETE)
 * Usage: router.post('/', protect, authorizeSection('drapeau'), handler)
 */
const authorizeSection = (sectionKey) => {
  return (req, res, next) => {
    const { role, section_slug } = req.user;

    // Admin et instructeur : accès total
    if (role === 'admin' || role === 'instructeur') return next();

    // Soldat : aucun droit d'écriture
    if (role === 'soldat') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé — soldats en lecture seule',
        code: 'SOLDAT_NO_WRITE',
      });
    }

    // Officier : écriture uniquement sur sa section
    if (role === 'officier') {
      const sectionRequired = ROUTE_SECTION_MAP[sectionKey];
      if (!sectionRequired || section_slug === sectionRequired) return next();
      return res.status(403).json({
        success: false,
        error: `Accès refusé — vous n'êtes pas affecté à cette section`,
        code: 'WRONG_SECTION',
        required: sectionRequired,
        yours: section_slug || 'Non affecté',
      });
    }

    return res.status(403).json({ success:false, error:'Rôle non reconnu' });
  };
};

/**
 * Middleware global pour les soldats (uniquement leur propre fiche)
 * À utiliser sur /api/soldats/:id
 */
const soldatOwnOnly = (req, res, next) => {
  const { role, soldier_id } = req.user;
  if (role === 'admin' || role === 'instructeur' || role === 'officier') return next();
  if (role === 'soldat') {
    const requestedId = parseInt(req.params.id);
    if (soldier_id && requestedId === soldier_id) return next();
    return res.status(403).json({
      success: false,
      error: 'Accès refusé — vous ne pouvez accéder qu\'à votre propre fiche',
      code: 'SOLDAT_OWN_ONLY',
    });
  }
  next();
};

module.exports = { authorizeSection, soldatOwnOnly, ROUTE_SECTION_MAP };
