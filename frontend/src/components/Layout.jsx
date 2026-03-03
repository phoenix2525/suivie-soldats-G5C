import { Outlet, useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import NotificationBell from './NotificationBell';
import Sidebar from './Sidebar';
import "../styles/Layout.css";

const PAGE_TITLES = {
  '/dashboard':            { title:'Tableau de Bord',      icon:'⬡' },
  '/soldats':              { title:'Effectifs',            icon:'◈' },
  '/statuts-campus':       { title:'Statuts Campus',       icon:'🏕️' },
  '/presences':            { title:'Présences',            icon:'◉' },
  '/sanctions':            { title:'Sanctions',            icon:'⚠' },
  '/distinctions':         { title:'Distinctions',         icon:'★' },
  '/mensurations':         { title:'Mensurations',         icon:'▣' },
  '/rapports':             { title:'Rapports',             icon:'📋' },
  '/drapeau':              { title:'Section Drapeau',      icon:'🚩' },
  '/caporaux':             { title:'Section Caporaux',     icon:'💪' },
  '/bat-music':            { title:'BAT-MUSIC',            icon:'🎵' },
  '/restauration':         { title:'Section Restauration', icon:'🍽️' },
  '/recrutement':          { title:'Section Recrutement',  icon:'🎯' },
  '/drh':                  { title:'DRH',                  icon:'⚔'  },
  '/dsa':                  { title:'DSA — Santé',          icon:'✚'  },
  '/dasc':                 { title:'DASC — Sports',        icon:'⚽' },
  '/dcsp':                 { title:'DCSP — Pédagogie',     icon:'🎓' },
  '/dasb':                 { title:'DASB — Social',        icon:'💼' },
  '/annonces':              { title:'Annonces & Emails',    icon:'📢' },
  '/gestion-utilisateurs': { title:'Gestion Utilisateurs', icon:'🔐' },
};

const ROLE_CFG = {
  admin:       { label:'ADMIN',       color:'#C9A84C' },
  instructeur: { label:'INSTRUCTEUR', color:'#60a5fa' },
  officier:    { label:'OFFICIER',    color:'#34d399' },
  soldat:      { label:'SOLDAT',      color:'#94a3b8' },
};

export default function Layout({ user, onLogout, darkMode, toggleTheme }) {
  const location = useLocation();

  const pageKey = Object.keys(PAGE_TITLES)
    .sort((a,b) => b.length - a.length)
    .find(k => location.pathname.startsWith(k));
  const page = PAGE_TITLES[pageKey] || { title:'Command Center', icon:'⬡' };
  const perms = usePermissions(user, location.pathname);
  const rc = ROLE_CFG[user?.role] || ROLE_CFG.soldat;

  const now = new Date().toLocaleDateString('fr-FR', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric'
  }).toUpperCase();

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} darkMode={darkMode} toggleTheme={toggleTheme} />
      <div className="app-right">

        <header className="app-header">
          <div className="app-header-left">
            <span className="app-header-icon">{page.icon}</span>
            <div>
              <div className="app-header-title">{page.title}</div>
              <div className="app-header-date">{now}</div>
            </div>
          </div>
          <div className="app-header-right">
            {user?.role === 'officier' && !perms.canWrite && (
              <div style={{background:'rgba(148,163,184,.1)',border:'1px solid rgba(148,163,184,.25)',
                borderRadius:20,padding:'4px 12px',fontSize:'.58rem',color:'#94a3b8',
                fontWeight:700,letterSpacing:'.1em',display:'flex',alignItems:'center',gap:5}}>
                👁️ LECTURE SEULE
              </div>
            )}
            {user?.role === 'officier' && perms.canWrite && (
              <div style={{background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.25)',
                borderRadius:20,padding:'4px 12px',fontSize:'.58rem',color:'#34d399',
                fontWeight:700,letterSpacing:'.1em',display:'flex',alignItems:'center',gap:5}}>
                ✏️ ÉCRITURE ACTIVE
              </div>
            )}
            {user?.role === 'soldat' && (
              <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',
                borderRadius:20,padding:'4px 12px',fontSize:'.58rem',color:'#f87171',
                fontWeight:700,letterSpacing:'.1em'}}>
                🔒 ACCÈS LIMITÉ
              </div>
            )}
            <NotificationBell />
            <div className="app-header-divider" />
            <div className="app-header-user">
              <div className="app-header-avatar" style={{borderColor: rc.color+'60'}}>
                {(user?.username||'AD').slice(0,2).toUpperCase()}
              </div>
              <div className="app-header-user-info">
                <div className="app-header-username">{user?.username}</div>
                <div className="app-header-role" style={{color: rc.color}}>◆ {rc.label}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
