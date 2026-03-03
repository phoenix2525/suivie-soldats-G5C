import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import '../styles/GestionUtilisateurs.css';

const ROLES = {
  admin:       { label:'Administrateur', icon:'⚜️',  color:'#C9A84C', bg:'rgba(201,168,76,.1)',  border:'rgba(201,168,76,.3)'  },
  instructeur: { label:'Instructeur',    icon:'🎖️',  color:'#60a5fa', bg:'rgba(96,165,250,.1)',  border:'rgba(96,165,250,.3)'  },
  officier:    { label:'Officier',       icon:'◈',   color:'#34d399', bg:'rgba(52,211,153,.1)',  border:'rgba(52,211,153,.3)'  },
  soldat:      { label:'Soldat',         icon:'◉',   color:'#94a3b8', bg:'rgba(148,163,184,.1)', border:'rgba(148,163,184,.3)' },
};

const SECTIONS = [
  'Section Drapeau','Section Caporaux','BAT-MUSIC','Section Restauration',
  'Section Recrutement','DRH','DSA','DASC','DCSP','DASB',
];

const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDT = d => d ? new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Jamais';

const ModalUser = ({ user, onClose, onDone }) => {
  const [form, setForm] = useState({
    username:     user?.username     || '',
    password:     '',
    role:         user?.role         || 'officier',
    nom_complet:  user?.nom_complet  || '',
    section_slug: user?.section_slug || '',
    is_active:    user?.is_active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const save = async () => {
    if (!form.username) return setErr("Nom d'utilisateur requis");
    if (!user && !form.password) return setErr('Mot de passe requis pour un nouveau compte');
    setSaving(true); setErr('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (user?.id) await api.put(`/users/${user.id}`, payload);
      else          await api.post('/users', payload);
      onDone(); onClose();
    } catch(e) {
      setErr(e.response?.data?.error || 'Erreur serveur');
    }
    setSaving(false);
  };

  return (
    <div className="gu-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="gu-modal">
        {/* Header */}
        <div className="gu-modal-header">
          <div className="gu-modal-header-left">
            <div className="gu-modal-eyebrow">SYSTÈME DE COMMANDEMENT · GESTION DES ACCÈS</div>
            <div className="gu-modal-title">{user?.id ? '✎ MODIFIER UTILISATEUR' : '+ NOUVEL UTILISATEUR'}</div>
          </div>
          <button className="gu-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="gu-modal-body">
          {err && (
            <div className="gu-error">
              <span>⚠</span> {err}
            </div>
          )}

          {/* Rôle — sélecteur visuel */}
          <div className="gu-field-group">
            <div className="gu-field-label">NIVEAU D'ACCRÉDITATION</div>
            <div className="gu-role-grid">
              {Object.entries(ROLES).map(([k,v]) => (
                <button key={k} onClick={()=>setForm(f=>({...f,role:k}))}
                  className={`gu-role-btn ${form.role===k?'selected':''}`}
                  style={{
                    borderColor: form.role===k ? v.color : 'var(--border-color)',
                    background:  form.role===k ? v.bg    : 'transparent',
                    color:       form.role===k ? v.color : 'var(--text-muted)',
                  }}>
                  <span className="gu-role-icon">{v.icon}</span>
                  <span className="gu-role-label">{v.label}</span>
                  {form.role===k && <span className="gu-role-check">●</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="gu-fields-row">
            <div className="gu-field">
              <label className="gu-label">IDENTIFIANT *</label>
              <input className="gu-input" value={form.username}
                onChange={e=>setForm(f=>({...f,username:e.target.value}))}
                placeholder="ex: khalil.ndiaye"/>
            </div>
            <div className="gu-field">
              <label className="gu-label">{user?.id ? 'NOUVEAU MOT DE PASSE (laisser vide = inchangé)' : 'MOT DE PASSE *'}</label>
              <input className="gu-input" type="password" value={form.password}
                onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                placeholder="••••••••"/>
            </div>
          </div>

          <div className="gu-field">
            <label className="gu-label">NOM COMPLET</label>
            <input className="gu-input" value={form.nom_complet}
              onChange={e=>setForm(f=>({...f,nom_complet:e.target.value}))}
              placeholder="Prénom NOM"/>
          </div>

          <div className="gu-fields-row">
            <div className="gu-field">
              <label className="gu-label">SECTION D'AFFECTATION</label>
              <select className="gu-input" value={form.section_slug}
                onChange={e=>setForm(f=>({...f,section_slug:e.target.value}))}>
                <option value="">— Aucune —</option>
                {SECTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {user?.id && (
              <div className="gu-field" style={{display:'flex',flexDirection:'column',gap:8,justifyContent:'flex-end'}}>
                <label className="gu-label">STATUT DU COMPTE</label>
                <button onClick={()=>setForm(f=>({...f,is_active:!f.is_active}))}
                  className={`gu-toggle-btn ${form.is_active?'active':''}`}>
                  <span className="gu-toggle-dot"/>
                  <span>{form.is_active ? '✅ Compte actif' : '🔴 Compte suspendu'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Niveau d'accès résumé */}
          <div className="gu-access-summary" style={{
            borderColor: ROLES[form.role]?.color+'40',
            background:  ROLES[form.role]?.bg,
          }}>
            <div className="gu-access-title" style={{color:ROLES[form.role]?.color}}>
              {ROLES[form.role]?.icon} {ROLES[form.role]?.label} — Niveau d'accès
            </div>
            <div className="gu-access-items">
              {form.role==='admin' && <>
                <span className="gu-access-item ok">✓ Accès total au système</span>
                <span className="gu-access-item ok">✓ Gestion des utilisateurs</span>
                <span className="gu-access-item ok">✓ Suppression de données</span>
                <span className="gu-access-item ok">✓ Tous les rapports</span>
              </>}
              {form.role==='instructeur' && <>
                <span className="gu-access-item ok">✓ Gestion des soldats</span>
                <span className="gu-access-item ok">✓ Toutes les sections</span>
                <span className="gu-access-item ok">✓ Sanctions</span>
                <span className="gu-access-item no">✗ Gestion des utilisateurs</span>
              </>}
              {form.role==='officier' && <>
                <span className="gu-access-item ok">✓ Lecture de toutes les données</span>
                <span className="gu-access-item no">✗ Modifications</span>
                <span className="gu-access-item no">✗ Suppressions</span>
                <span className="gu-access-item no">✗ Gestion des utilisateurs</span>
              </>}
              {form.role==='soldat' && <>
                <span className="gu-access-item ok">✓ Sa propre fiche uniquement</span>
                <span className="gu-access-item no">✗ Autres soldats</span>
                <span className="gu-access-item no">✗ Sections</span>
                <span className="gu-access-item no">✗ Gestion</span>
              </>}
            </div>
          </div>
        </div>

        <div className="gu-modal-footer">
          <button className="gu-btn-cancel" onClick={onClose}>ANNULER</button>
          <button className="gu-btn-confirm" onClick={save} disabled={saving}>
            {saving ? '⟳ TRAITEMENT...' : '◆ CONFIRMER'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GestionUtilisateurs({ user: currentUser }) {
  const [users,  setUsers]  = useState([]);
  const [stats,  setStats]  = useState(null);
  const [modal,  setModal]  = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast,  setToast]  = useState('');

  const notify = msg => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

  const load = useCallback(async () => {
    const [u, s] = await Promise.all([
      api.get('/users').catch(()=>({data:{data:[]}})),
      api.get('/users/stats').catch(()=>({data:{data:null}})),
    ]);
    setUsers(u.data.data || []);
    setStats(s.data.data);
  }, []);
  useEffect(()=>{ load(); }, [load]);

  const toggle = async (id) => {
    try {
      await api.put(`/users/${id}/toggle`);
      load(); notify('✅ Statut modifié');
    } catch(e) { notify('❌ ' + (e.response?.data?.error||'Erreur')); }
  };

  const del = async (id, username) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/users/${id}`);
      load(); notify('✅ Utilisateur supprimé');
    } catch(e) { notify('❌ ' + (e.response?.data?.error||'Erreur')); }
  };

  const filtered = users.filter(u =>
    (!filter || u.role===filter) &&
    (!search  || u.username.toLowerCase().includes(search.toLowerCase()) ||
                 (u.nom_complet||'').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="gu-page">
      {/* Header militaire */}
      <div className="gu-header">
        <div className="gu-header-left">
          <div className="gu-eyebrow">◆ ARMÉE DU G5C · ACCÈS RESTREINT ◆</div>
          <h1 className="gu-title">GESTION DES UTILISATEURS</h1>
          <div className="gu-subtitle">CONTRÔLE DES ACCRÉDITATIONS · SÉCURITÉ DU SYSTÈME</div>
        </div>
        <button className="gu-btn-add" onClick={()=>setModal({type:'create',data:null})}>
          + CRÉER UN COMPTE
        </button>
      </div>

      {/* KPIs par rôle */}
      {stats && (
        <div className="gu-kpis">
          <div className="gu-kpi-total">
            <div className="gu-kpi-total-val">{stats.total}</div>
            <div className="gu-kpi-total-lbl">UTILISATEURS TOTAL</div>
          </div>
          {Object.entries(ROLES).map(([k,v]) => {
            const d = stats.par_role.find(r=>r.role===k);
            return (
              <div key={k} className="gu-kpi" style={{borderColor:v.color+'33'}}>
                <div className="gu-kpi-icon">{v.icon}</div>
                <div className="gu-kpi-val" style={{color:v.color}}>{d?.count||0}</div>
                <div className="gu-kpi-lbl">{v.label}</div>
                {d && <div className="gu-kpi-sub">{d.actifs} actif{d.actifs>1?'s':''}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div className="gu-controls">
        <div className="gu-search-wrap">
          <span className="gu-search-icon">◈</span>
          <input className="gu-search" placeholder="Rechercher un utilisateur…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="gu-filters">
          {[{k:'',l:'TOUS'},...Object.entries(ROLES).map(([k,v])=>({k,l:v.label.toUpperCase()}))].map(f=>(
            <button key={f.k||'all'} onClick={()=>setFilter(f.k||'')}
              className={`gu-filter-btn ${filter===(f.k||'')?'active':''}`}
              style={filter===(f.k||'')&&f.k?{
                borderColor:ROLES[f.k]?.color,
                color:ROLES[f.k]?.color,
                background:ROLES[f.k]?.bg,
              }:{}}>
              {f.k && <span>{ROLES[f.k]?.icon} </span>}{f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="gu-table-wrap">
        <table className="gu-table">
          <thead>
            <tr>
              <th>UTILISATEUR</th>
              <th>ACCRÉDITATION</th>
              <th>SECTION</th>
              <th>STATUT</th>
              <th>DERNIÈRE CONNEXION</th>
              <th>CRÉÉ LE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={7} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>
                Aucun utilisateur trouvé
              </td></tr>
            ) : filtered.map(u => {
              const rc = ROLES[u.role]||ROLES.soldat;
              const isSelf = u.id===currentUser?.id;
              return (
                <tr key={u.id} className={isSelf?'gu-row-self':''}>
                  <td>
                    <div className="gu-user-cell">
                      <div className="gu-avatar" style={{background:`linear-gradient(135deg,${rc.color}30,${rc.color}10)`,
                        border:`1px solid ${rc.color}40`,color:rc.color}}>
                        {(u.nom_complet||u.username).slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="gu-username">{u.username} {isSelf&&<span className="gu-self-tag">MOI</span>}</div>
                        <div className="gu-nom-complet">{u.nom_complet||'—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="gu-role-badge" style={{color:rc.color,background:rc.bg,border:`1px solid ${rc.border}`}}>
                      {rc.icon} {rc.label}
                    </span>
                  </td>
                  <td style={{fontSize:'.72rem',color:'var(--text-muted)'}}>{u.section_slug||'—'}</td>
                  <td>
                    <span className="gu-statut-badge" style={{
                      color:    u.is_active?'#34d399':'#ef4444',
                      background:u.is_active?'rgba(52,211,153,.1)':'rgba(239,68,68,.1)',
                      border:   `1px solid ${u.is_active?'rgba(52,211,153,.3)':'rgba(239,68,68,.3)'}`,
                    }}>
                      {u.is_active?'● ACTIF':'○ SUSPENDU'}
                    </span>
                  </td>
                  <td style={{fontSize:'.68rem',color:'var(--text-muted)',fontFamily:"'Share Tech Mono',monospace"}}>
                    {fmtDT(u.last_login)}
                  </td>
                  <td style={{fontSize:'.68rem',color:'var(--text-muted)'}}>{fmt(u.created_at)}</td>
                  <td>
                    <div className="gu-actions">
                      <button className="gu-act-btn gu-act-edit"
                        onClick={()=>setModal({type:'edit',data:u})}
                        title="Modifier">✎</button>
                      {!isSelf && <>
                        <button className={`gu-act-btn ${u.is_active?'gu-act-suspend':'gu-act-activate'}`}
                          onClick={()=>toggle(u.id)}
                          title={u.is_active?'Suspendre':'Activer'}>
                          {u.is_active?'⊘':'✓'}
                        </button>
                        <button className="gu-act-btn gu-act-del"
                          onClick={()=>del(u.id, u.username)}
                          title="Supprimer">✕</button>
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer sécurité */}
      <div className="gu-security-footer">
        <span className="gu-sf-line"/>
        <span className="gu-sf-text">◆ ACCÈS RESTREINT · ADMINISTRATEURS AUTORISÉS UNIQUEMENT ◆</span>
        <span className="gu-sf-line"/>
      </div>

      {modal && (
        <ModalUser
          user={modal.data}
          onClose={()=>setModal(null)}
          onDone={()=>{ load(); notify('✅ Opération réussie'); }}
        />
      )}

      {toast && (
        <div className="gu-toast">{toast}</div>
      )}
    </div>
  );
}
