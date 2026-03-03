import { useMemo } from 'react';

const PERMISSIONS = {
  admin:       { level:4, label:'Administrateur',  icon:'⚜️',  color:'#C9A84C' },
  instructeur: { level:3, label:'Instructeur',     icon:'🎖️',  color:'#60a5fa' },
  officier:    { level:2, label:'Officier',        icon:'◈',   color:'#34d399' },
  soldat:      { level:1, label:'Soldat',          icon:'◉',   color:'#94a3b8' },
};

// Ce que chaque rôle peut faire
const CAN = {
  admin:       ['read','write','delete','manage_users','sanctions','drh','rapports'],
  instructeur: ['read','write','sanctions'],
  officier:    ['read'],
  soldat:      ['read_own'],
};

export default function useRole(user) {
  return useMemo(() => {
    const role = user?.role || 'soldat';
    const perms = PERMISSIONS[role] || PERMISSIONS.soldat;
    const can   = CAN[role] || CAN.soldat;
    return {
      role,
      ...perms,
      can:        (action) => can.includes(action),
      isAdmin:    role === 'admin',
      isInstructeur: role === 'instructeur',
      isOfficier:    role === 'officier',
      isSoldat:      role === 'soldat',
      canWrite:   can.includes('write'),
      canDelete:  can.includes('delete'),
      canManageUsers: can.includes('manage_users'),
    };
  }, [user]);
}
