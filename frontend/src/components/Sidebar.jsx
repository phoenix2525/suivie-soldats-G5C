import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';

const NAV = [
  { path: '/dashboard',      icon: '⬡',  label: 'Tableau de Bord' },
  { path: '/soldats',        icon: '◈',  label: 'Effectifs' },
  { path: '/statuts-campus', icon: '🏕️', label: 'Statuts Campus' },
  { path: '/presences',      icon: '◉',  label: 'Présences' },
  { path: '/sanctions',      icon: '⚠',  label: 'Sanctions' },
  { path: '/distinctions',   icon: '★',  label: 'Distinctions' },
  { path: '/mensurations',   icon: '▣',  label: 'Mensurations' },
  { path: '/rapports',       icon: '📋', label: 'Rapports' },
];

const NAV_ADMIN = [
  { path: '/gestion-utilisateurs', icon: '🔐', label: 'Utilisateurs' },
];

const SECTIONS = [
  { path: '/drapeau',     icon: '🚩', label: 'Section Drapeau' },
  { path: '/caporaux',    icon: '💪', label: 'Section Caporaux' },
  { path: '/bat-music',   icon: '🎵', label: 'BAT-MUSIC' },
  { path: '/restauration',icon: '🍽️', label: 'Section Restauration' },
];

const RECRUTEMENT = [
  { path: '/recrutement',            icon: '🏛️', label: "Vue d'ensemble" },
  { path: '/recrutement/crics',      icon: '◎',  label: 'CRICs' },
  { path: '/recrutement/assiduites', icon: '📅', label: 'Assiduité' },
];

const DIRECTIONS = [
  { path: '/drh',  icon: '⚔',  label: 'DRH' },
  { path: '/dsa',  icon: '✚',  label: 'DSA — Santé' },
  { path: '/dasc', icon: '⚽', label: 'DASC — Sports' },
  { path: '/dcsp', icon: '🎓', label: 'DCSP — Pédagogie' },
  { path: '/dasb', icon: '💼', label: 'DASB — Social' },
];

export default function Sidebar({ user, onLogout, darkMode, toggleTheme }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [openSections, setOpenSections] = useState(true);
  const [openRecrut,   setOpenRecrut]   = useState(false);
  const [openDirs,     setOpenDirs]     = useState(false);
  const location = useLocation();

  const isRecrutActive = location.pathname.startsWith('/recrutement');
  const isSectionActive = ['/drapeau','/caporaux','/bat-music','/restauration']
    .some(p => location.pathname.startsWith(p));
  const isDirActive = ['/drh','/dsa','/dasc','/dcsp','/dasb']
    .some(p => location.pathname.startsWith(p));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-emblem">
            <img src="/logo-g5c.png" alt="G5C" className="sidebar-logo-img" />
          </div>
          {!collapsed && (
            <div className="sidebar-brand">
              <div className="brand-name">Armée du G5C</div>
              <div className="brand-sub">Command Center</div>
            </div>
          )}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">

        {/* ── NAVIGATION ── */}
        {!collapsed && <div className="nav-section-label">NAVIGATION</div>}
        {NAV.map(item => (
          <NavLink key={item.path} to={item.path} title={collapsed ? item.label : ''}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <><span className="nav-label">{item.label}</span><span className="nav-arrow">›</span></>}
          </NavLink>
        ))}

        {/* Admin only */}
        {user?.role==='admin' && NAV_ADMIN.map(item => (
          <NavLink key={item.path} to={item.path} title={collapsed ? item.label : ''}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={({isActive})=>isActive?{color:'#C9A84C'}:{}}>
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <><span className="nav-label">{item.label}</span><span className="nav-arrow">›</span></>}
          </NavLink>
        ))}

        {/* ── SECTIONS ── */}
        <div className="sidebar-divider" style={{margin:'8px 0'}} />
        {collapsed ? (
          SECTIONS.map(item => (
            <NavLink key={item.path} to={item.path} title={item.label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
            </NavLink>
          ))
        ) : (
          <>
            <button className={`nav-group-btn ${isSectionActive ? 'active' : ''}`}
              onClick={() => setOpenSections(o => !o)}>
              <span className="nav-icon">⚜️</span>
              <span className="nav-label">Sections</span>
              <span className="nav-group-chevron">{openSections ? '▾' : '›'}</span>
            </button>
            {openSections && (
              <div className="nav-sub-group">
                {SECTIONS.map(item => (
                  <NavLink key={item.path} to={item.path}
                    className={({ isActive }) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-sub-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}

                {/* Section Recrutement imbriquée */}
                <button className={`nav-sub-item nav-sub-group-btn ${isRecrutActive ? 'active' : ''}`}
                  onClick={() => setOpenRecrut(o => !o)}
                  style={{width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',
                    display:'flex',alignItems:'center',gap:8}}>
                  <span className="nav-sub-icon">🎯</span>
                  <span className="nav-label" style={{flex:1}}>Section Recrutement</span>
                  <span style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{openRecrut ? '▾' : '›'}</span>
                </button>
                {openRecrut && (
                  <div className="nav-sub-group" style={{marginLeft:8}}>
                    {RECRUTEMENT.map(item => (
                      <NavLink key={item.path} to={item.path} end={item.path==='/recrutement'}
                        className={({ isActive }) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-sub-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── DIRECTIONS ── */}
        <div className="sidebar-divider" style={{margin:'8px 0'}} />
        {collapsed ? (
          DIRECTIONS.map(item => (
            <NavLink key={item.path} to={item.path} title={item.label}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
            </NavLink>
          ))
        ) : (
          <>
            <button className={`nav-group-btn ${isDirActive ? 'active' : ''}`}
              onClick={() => setOpenDirs(o => !o)}>
              <span className="nav-icon">🏛️</span>
              <span className="nav-label">Directions</span>
              <span className="nav-group-chevron">{openDirs ? '▾' : '›'}</span>
            </button>
            {openDirs && (
              <div className="nav-sub-group">
                {DIRECTIONS.map(item => (
                  <NavLink key={item.path} to={item.path}
                    className={({ isActive }) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-sub-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}

      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-divider" />

      {/* Theme */}
      <div className="sidebar-theme-toggle">
        <button className="theme-toggle-btn" onClick={toggleTheme}
          title={darkMode ? 'Mode clair' : 'Mode sombre'}>
          <span className="theme-icon">{darkMode ? '☀️' : '🌙'}</span>
          {!collapsed && <span className="theme-label">{darkMode ? 'Mode Clair' : 'Mode Sombre'}</span>}
        </button>
      </div>

      <div className="sidebar-divider" />

      {/* User */}
      <div className="sidebar-user">
        <div className="user-avatar">{user?.username?.slice(0,2).toUpperCase()||'AD'}</div>
        {!collapsed && <>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{user?.role?.toUpperCase()}</div>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Déconnexion">⏻</button>
        </>}
        {collapsed && <button className="logout-btn-collapsed" onClick={onLogout} title="Déconnexion">⏻</button>}
      </div>
    </aside>
  );
}
