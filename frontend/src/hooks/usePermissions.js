import { useMemo } from 'react';

const SECTION_PATH_MAP = {
  'drapeau':      '/drapeau',
  'caporaux':     '/caporaux',
  'batmusic':     '/bat-music',
  'restauration': '/restauration',
  'recrutement':  '/recrutement',
  'drh':          '/drh',
  'dsa':          '/dsa',
  'dasc':         '/dasc',
  'dcsp':         '/dcsp',
  'dasb':         '/dasb',
};

/**
 * Hook central des permissions
 * @param {object} user - user connecté
 * @param {string} currentPath - useLocation().pathname
 */
export default function usePermissions(user, currentPath = '') {
  return useMemo(() => {
    const role        = user?.role        || 'soldat';
    const sectionSlug = user?.section_slug || null;

    // Section de l'utilisateur → chemin correspondant
    const myPath = sectionSlug ? SECTION_PATH_MAP[sectionSlug] : null;

    // Est-ce que la page courante est la section de l'officier ?
    const isMySection = myPath && currentPath.startsWith(myPath);

    const canWrite = (
      role === 'admin' ||
      role === 'instructeur' ||
      (role === 'officier' && isMySection)
    );

    const canDelete = (
      role === 'admin' ||
      role === 'instructeur' ||
      (role === 'officier' && isMySection)
    );

    const canRead         = role !== null; // tout le monde peut lire
    const canManageUsers  = role === 'admin';
    const canSeeSanctions = role === 'admin' || role === 'instructeur';
    const canSeeRapports  = role === 'admin' || role === 'instructeur';

    return {
      role,
      sectionSlug,
      myPath,
      isMySection,
      canWrite,
      canDelete,
      canRead,
      canManageUsers,
      canSeeSanctions,
      canSeeRapports,
      isAdmin:       role === 'admin',
      isInstructeur: role === 'instructeur',
      isOfficier:    role === 'officier',
      isSoldat:      role === 'soldat',
    };
  }, [user, currentPath]);
}
