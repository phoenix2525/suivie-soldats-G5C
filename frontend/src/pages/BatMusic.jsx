import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/BatMusic.css';

const CONTEXTE_CFG = {
  feu_de_camp: { label:'Feu de camp',          icon:'🔥', color:'#f97316' },
  parcours:    { label:'Parcours militaire',    icon:'🏃', color:'#34d399' },
  ceremonie:   { label:'Cérémonie officielle',  icon:'🎖️', color:'#a78bfa' },
  general:     { label:'Général',               icon:'🎵', color:'#C9A84C' },
};
const PRES_CFG = {
  present: { label:'Présent', color:'#34d399', icon:'✅' },
  absent:  { label:'Absent',  color:'#ef4444', icon:'✗'  },
  retard:  { label:'Retard',  color:'#f59e0b', icon:'⏰' },
  excuse:  { label:'Excusé',  color:'#60a5fa', icon:'📝' },
};
const STATUT_FCF = {
  planifie: { label:'Planifié',  color:'#60a5fa', bg:'rgba(96,165,250,.12)' },
  en_cours: { label:'En cours',  color:'#f59e0b', bg:'rgba(245,158,11,.12)' },
  termine:  { label:'Terminé',   color:'#34d399', bg:'rgba(52,211,153,.12)' },
  annule:   { label:'Annulé',    color:'#ef4444', bg:'rgba(239,68,68,.12)'  },
};
const STATUT_REP = {
  planifiee: { label:'Planifiée', color:'#60a5fa', bg:'rgba(96,165,250,.12)' },
  terminee:  { label:'Terminée',  color:'#34d399', bg:'rgba(52,211,153,.12)' },
  annulee:   { label:'Annulée',   color:'#ef4444', bg:'rgba(239,68,68,.12)'  },
};

const fmt  = d => d ? new Date(d).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'}) : '—';
const fmtS = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtH = h => h ? h.slice(0,5) : '';

const Avatar = ({ nom, prenom, photo, size=36, color='#C9A84C' }) => (
  photo
    ? <img src={photo} alt="" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`1.5px solid ${color}44`}} />
    : <div style={{width:size,height:size,borderRadius:'50%',background:`${color}18`,border:`1.5px solid ${color}44`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.3,fontWeight:800,color,flexShrink:0}}>
        {(prenom?.[0]||'')+(nom?.[0]||'')}
      </div>
);

const ModalPointage = ({ type, item, onClose, onDone }) => {
  const [liste, setListe] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get(`/bat-music/pointage/${type}/${item.id}`).then(r => setListe(r.data.data || []));
  }, [type, item.id]);
  const setP = (id, val) => setListe(p => p.map(x => x.id===id ? {...x,presence:val} : x));
  const markAll = val => setListe(p => p.map(x => ({...x,presence:val})));
  const nbP = liste.filter(x=>x.presence==='present').length;
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/bat-music/pointage/${type}/${item.id}`, {
        pointages: liste.map(x => ({ id:x.id, presence:x.presence, motif:x.motif }))
      });
      onDone(); onClose();
    } catch { setSaving(false); }
  };
  return (
    <div className="bm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bm-modal bm-modal-lg">
        <div className="bm-modal-header">
          🎤 Pointage — {item.titre || `Répétition ${fmtS(item.date_rep)}`}
          <button className="bm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="bm-modal-body">
          <div className="bm-quick-row">
            <span style={{fontSize:'.68rem',color:'var(--text-muted)'}}>Tout marquer :</span>
            {Object.entries(PRES_CFG).map(([k,v]) => (
              <button key={k} className="bm-quick-btn" style={{color:v.color,borderColor:v.color+'44'}} onClick={()=>markAll(k)}>
                {v.icon} {v.label}
              </button>
            ))}
            <span style={{marginLeft:'auto',fontSize:'.75rem',color:'var(--gold-bright)',fontWeight:700}}>
              {nbP}/{liste.length} présents
            </span>
          </div>
          <div className="bm-point-list">
            {liste.length===0 && <div className="bm-empty"><p>Aucun membre dans la BAT-MUSIC</p></div>}
            {liste.map(p => {
              const cfg = PRES_CFG[p.presence] || PRES_CFG.absent;
              return (
                <div key={p.id} className="bm-point-row" style={{borderColor:cfg.color+'33',background:cfg.color+'08'}}>
                  <Avatar nom={p.nom} prenom={p.prenom} photo={p.photo_url} size={38} color={cfg.color} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:'.82rem',color:'var(--text-primary)'}}>{p.prenom} {p.nom}</div>
                    <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{p.grade} · {p.role}</div>
                  </div>
                  <div className="bm-pres-btns">
                    {Object.entries(PRES_CFG).map(([k,v]) => (
                      <button key={k} className={`bm-pres-btn ${p.presence===k?'active':''}`}
                        style={p.presence===k?{background:v.color,color:'#fff',borderColor:v.color}:{borderColor:v.color+'55',color:v.color}}
                        onClick={()=>setP(p.id,k)}>{v.icon} {v.label}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bm-modal-footer">
            <button className="bm-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="bm-btn-confirm" onClick={handleSave} disabled={saving}>{saving?'⏳…':'✓ Sauvegarder'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalChanson = ({ chanson, onClose, onDone }) => {
  const [form, setForm] = useState(chanson || { titre:'', contexte:'general', paroles:'', lien_externe:'', tags:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const handleSave = async () => {
    if (!form.titre) return;
    setSaving(true);
    try {
      if (chanson?.id) await api.put(`/bat-music/chansons/${chanson.id}`, form);
      else await api.post('/bat-music/chansons', form);
      onDone(); onClose();
    } catch { setSaving(false); }
  };
  return (
    <div className="bm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bm-modal bm-modal-xl">
        <div className="bm-modal-header">
          🎵 {chanson?.id ? 'Modifier' : 'Nouvelle'} chanson
          <button className="bm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="bm-modal-body">
          <div className="bm-field-row">
            <div className="bm-field" style={{flex:2}}>
              <label>Titre *</label>
              <input className="bm-input" value={form.titre} onChange={e=>set('titre',e.target.value)} placeholder="Nom de la chanson" />
            </div>
            <div className="bm-field">
              <label>Contexte</label>
              <select className="bm-input" value={form.contexte} onChange={e=>set('contexte',e.target.value)}>
                {Object.entries(CONTEXTE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="bm-field">
            <label>Lien externe (YouTube, Drive…)</label>
            <input className="bm-input" value={form.lien_externe||''} onChange={e=>set('lien_externe',e.target.value)} placeholder="https://..." />
          </div>
          <div className="bm-field">
            <label>Paroles</label>
            <textarea className="bm-input bm-textarea-lg" value={form.paroles||''} onChange={e=>set('paroles',e.target.value)} placeholder="Saisir les paroles complètes…" rows={10} />
          </div>
          <div className="bm-field-row">
            <div className="bm-field">
              <label>Tags (séparés par des virgules)</label>
              <input className="bm-input" value={form.tags||''} onChange={e=>set('tags',e.target.value)} placeholder="défilé, intégration…" />
            </div>
            <div className="bm-field">
              <label>Notes</label>
              <input className="bm-input" value={form.notes||''} onChange={e=>set('notes',e.target.value)} />
            </div>
          </div>
          <div className="bm-modal-footer">
            <button className="bm-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="bm-btn-confirm" onClick={handleSave} disabled={saving||!form.titre}>{saving?'⏳…':'✓ Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalParoles = ({ chanson, onClose }) => (
  <div className="bm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="bm-modal bm-modal-xl">
      <div className="bm-modal-header">
        {CONTEXTE_CFG[chanson.contexte]?.icon} {chanson.titre}
        <button className="bm-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="bm-modal-body">
        {chanson.lien_externe && (
          <a href={chanson.lien_externe} target="_blank" rel="noreferrer" className="bm-lien-btn">🔗 Écouter / Voir</a>
        )}
        {chanson.tags && (
          <div className="bm-tags-row">
            {chanson.tags.split(',').map((t,i)=><span key={i} className="bm-tag">{t.trim()}</span>)}
          </div>
        )}
        {chanson.paroles ? <pre className="bm-paroles">{chanson.paroles}</pre> : <div className="bm-empty"><p>Aucune parole enregistrée</p></div>}
        {chanson.notes && <div className="bm-notes-box">📝 {chanson.notes}</div>}
      </div>
    </div>
  </div>
);

const ModalPlaylist = ({ playlist, chansons, onClose, onDone }) => {
  const [form, setForm] = useState({ nom:'', contexte:'feu_de_camp', description:'', chanson_ids:[] });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (playlist?.id) {
      api.get(`/bat-music/playlists/${playlist.id}`).then(r => {
        const p = r.data.data;
        setForm({ nom:p.nom, contexte:p.contexte, description:p.description||'', chanson_ids:p.chansons?.map(c=>c.id)||[] });
      });
    }
  }, [playlist]);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggle = id => setForm(p=>({...p, chanson_ids:p.chanson_ids.includes(id)?p.chanson_ids.filter(x=>x!==id):[...p.chanson_ids,id]}));
  const filtered = chansons.filter(c=>c.titre.toLowerCase().includes(search.toLowerCase())||(c.tags||'').toLowerCase().includes(search.toLowerCase()));
  const selected = chansons.filter(c=>form.chanson_ids.includes(c.id));
  const handleSave = async () => {
    if (!form.nom) return;
    setSaving(true);
    try {
      if (playlist?.id) await api.put(`/bat-music/playlists/${playlist.id}`, form);
      else await api.post('/bat-music/playlists', form);
      onDone(); onClose();
    } catch { setSaving(false); }
  };
  return (
    <div className="bm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bm-modal bm-modal-xl">
        <div className="bm-modal-header">🎵 {playlist?.id?'Modifier':'Nouvelle'} playlist<button className="bm-modal-close" onClick={onClose}>✕</button></div>
        <div className="bm-modal-body">
          <div className="bm-field-row">
            <div className="bm-field" style={{flex:2}}><label>Nom *</label><input className="bm-input" value={form.nom} onChange={e=>set('nom',e.target.value)} /></div>
            <div className="bm-field"><label>Contexte</label>
              <select className="bm-input" value={form.contexte} onChange={e=>set('contexte',e.target.value)}>
                {Object.entries(CONTEXTE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="bm-field"><label>Description</label><input className="bm-input" value={form.description} onChange={e=>set('description',e.target.value)} /></div>
          {selected.length>0 && (
            <div className="bm-field"><label>Ordre de la playlist ({selected.length} chansons)</label>
              <div className="bm-selected-songs">
                {selected.map((c,i)=>(
                  <div key={c.id} className="bm-selected-song">
                    <span className="bm-song-num">{i+1}</span>
                    <span style={{flex:1,fontSize:'.78rem'}}>{c.titre}</span>
                    <button className="bm-remove-song" onClick={()=>toggle(c.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bm-field"><label>Ajouter des chansons</label>
            <input className="bm-input" placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} />
            <div className="bm-songs-picker">
              {filtered.map(c=>{
                const sel=form.chanson_ids.includes(c.id); const cfg=CONTEXTE_CFG[c.contexte]||CONTEXTE_CFG.general;
                return (<div key={c.id} className={`bm-song-option ${sel?'selected':''}`} onClick={()=>toggle(c.id)}>
                  <span style={{color:cfg.color}}>{cfg.icon}</span>
                  <span style={{flex:1,fontSize:'.78rem',fontWeight:sel?700:400}}>{c.titre}</span>
                  {sel && <span style={{color:'#34d399'}}>✓</span>}
                </div>);
              })}
              {filtered.length===0 && <div style={{padding:'12px',color:'var(--text-muted)',fontSize:'.75rem',textAlign:'center'}}>Aucun résultat</div>}
            </div>
          </div>
          <div className="bm-modal-footer">
            <button className="bm-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="bm-btn-confirm" onClick={handleSave} disabled={saving||!form.nom}>{saving?'⏳…':'✓ Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalFeu = ({ feu, playlists, onClose, onDone }) => {
  const [form, setForm] = useState(feu||{titre:'',date_evenement:new Date().toISOString().slice(0,10),heure_debut:'',lieu:'',groupe_beneficiaire:'',playlist_id:'',statut:'planifie',rapport:''});
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const handleSave = async () => {
    if (!form.titre||!form.date_evenement) return;
    setSaving(true);
    try {
      const payload={...form,playlist_id:form.playlist_id||null};
      if(feu?.id) await api.put(`/bat-music/feux/${feu.id}`,payload);
      else await api.post('/bat-music/feux',payload);
      onDone(); onClose();
    } catch { setSaving(false); }
  };
  return (
    <div className="bm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bm-modal">
        <div className="bm-modal-header">🔥 {feu?.id?'Modifier':'Nouveau'} feu de camp<button className="bm-modal-close" onClick={onClose}>✕</button></div>
        <div className="bm-modal-body">
          <div className="bm-field"><label>Titre *</label><input className="bm-input" value={form.titre} onChange={e=>set('titre',e.target.value)} placeholder="Ex: Feu de camp 36e Promotion" /></div>
          <div className="bm-field-row">
            <div className="bm-field"><label>Date *</label><input type="date" className="bm-input" value={form.date_evenement} onChange={e=>set('date_evenement',e.target.value)} /></div>
            <div className="bm-field"><label>Heure</label><input type="time" className="bm-input" value={form.heure_debut||''} onChange={e=>set('heure_debut',e.target.value)} /></div>
          </div>
          <div className="bm-field-row">
            <div className="bm-field"><label>Lieu</label><input className="bm-input" value={form.lieu||''} onChange={e=>set('lieu',e.target.value)} /></div>
            <div className="bm-field"><label>Groupe bénéficiaire</label><input className="bm-input" value={form.groupe_beneficiaire||''} onChange={e=>set('groupe_beneficiaire',e.target.value)} placeholder="Ex: 36e Promotion" /></div>
          </div>
          <div className="bm-field"><label>Playlist</label>
            <select className="bm-input" value={form.playlist_id||''} onChange={e=>set('playlist_id',e.target.value)}>
              <option value="">— Aucune —</option>
              {playlists.map(p=><option key={p.id} value={p.id}>{CONTEXTE_CFG[p.contexte]?.icon} {p.nom} ({p.nb_chansons} chansons)</option>)}
            </select>
          </div>
          {feu?.id && <>
            <div className="bm-field"><label>Statut</label>
              <select className="bm-input" value={form.statut} onChange={e=>set('statut',e.target.value)}>
                {Object.entries(STATUT_FCF).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="bm-field"><label>Rapport</label><textarea className="bm-input" rows={3} value={form.rapport||''} onChange={e=>set('rapport',e.target.value)} /></div>
          </>}
          <div className="bm-modal-footer">
            <button className="bm-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="bm-btn-confirm" onClick={handleSave} disabled={saving}>{saving?'⏳…':'✓ Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalRep = ({ onClose, onDone }) => {
  const [form, setForm] = useState({type_rep:'interne',date_rep:new Date().toISOString().slice(0,10),heure_debut:'14:00',heure_fin:'17:00',lieu:'',notes:''});
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const handleSave = async () => {
    setSaving(true);
    try { await api.post('/bat-music/repetitions',form); onDone(); onClose(); }
    catch { setSaving(false); }
  };
  return (
    <div className="bm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bm-modal">
        <div className="bm-modal-header">🎤 Nouvelle répétition<button className="bm-modal-close" onClick={onClose}>✕</button></div>
        <div className="bm-modal-body">
          <div className="bm-field"><label>Type</label>
            <div className="bm-type-toggle">
              {[['interne','🔒 Interne'],['generale','🌐 Générale']].map(([k,l])=>(
                <button key={k} className={`bm-type-btn ${form.type_rep===k?'active':''}`} onClick={()=>set('type_rep',k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="bm-field-row">
            <div className="bm-field"><label>Date</label><input type="date" className="bm-input" value={form.date_rep} onChange={e=>set('date_rep',e.target.value)} /></div>
            <div className="bm-field"><label>Début</label><input type="time" className="bm-input" value={form.heure_debut} onChange={e=>set('heure_debut',e.target.value)} /></div>
            <div className="bm-field"><label>Fin</label><input type="time" className="bm-input" value={form.heure_fin} onChange={e=>set('heure_fin',e.target.value)} /></div>
          </div>
          <div className="bm-field"><label>Lieu</label><input className="bm-input" value={form.lieu} onChange={e=>set('lieu',e.target.value)} /></div>
          <div className="bm-field"><label>Notes</label><textarea className="bm-input" rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} /></div>
          <div className="bm-modal-footer">
            <button className="bm-btn-cancel" onClick={onClose}>Annuler</button>
            {perms.canWrite && <button className="bm-btn-confirm" onClick={handleSave} disabled={saving}>{saving?'⏳…':'✓ Créer'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BatMusic() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [chansons, setChansons] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [feux, setFeux] = useState([]);
  const [reps, setReps] = useState([]);
  const [membres, setMembres] = useState([]);
  const [soldiers, setSoldiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCtx, setFilterCtx] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const notify = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st,ch,pl,fx,rp,mb,sol] = await Promise.all([
        api.get('/bat-music/stats'), api.get('/bat-music/chansons'),
        api.get('/bat-music/playlists'), api.get('/bat-music/feux'),
        api.get('/bat-music/repetitions'), api.get('/bat-music/membres'),
        api.get('/soldiers'),
      ]);
      setStats(st.data.data); setChansons(ch.data.data||[]);
      setPlaylists(pl.data.data||[]); setFeux(fx.data.data||[]);
      setReps(rp.data.data||[]); setMembres(mb.data.data||[]);
      setSoldiers(sol.data.data||[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  const filteredChansons = chansons.filter(c =>
    (!filterCtx||c.contexte===filterCtx) &&
    (!search||c.titre.toLowerCase().includes(search.toLowerCase())||(c.tags||'').toLowerCase().includes(search.toLowerCase()))
  );

  const TabDashboard = () => (
    <div className="bm-dashboard">
      <div className="bm-kpis">
        {[
          {val:stats?.total_chansons,label:'Chansons',color:'#C9A84C',icon:'🎵'},
          {val:stats?.total_playlists,label:'Playlists',color:'#f97316',icon:'📋'},
          {val:stats?.total_feux,label:'Feux de camp',color:'#ef4444',icon:'🔥'},
          {val:stats?.feux_a_venir,label:'À venir',color:'#60a5fa',icon:'📅'},
          {val:stats?.total_membres,label:'Membres BAT',color:'#34d399',icon:'🎤'},
        ].map((k,i)=>(
          <div key={i} className="bm-kpi" style={{borderColor:k.color+'44'}}>
            <div className="bm-kpi-icon">{k.icon}</div>
            <div className="bm-kpi-val" style={{color:k.color}}>{k.val||0}</div>
            <div className="bm-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="bm-dash-grid">
        <div className="bm-card">
          <div className="bm-card-title">🔥 PROCHAINS FEUX DE CAMP</div>
          {feux.filter(f=>f.statut==='planifie').slice(0,3).map(f=>(
            <div key={f.id} className="bm-dash-item">
              <div className="bm-dash-item-icon" style={{background:'rgba(249,115,22,.1)',color:'#f97316'}}>🔥</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:'.8rem',color:'var(--text-primary)'}}>{f.titre}</div>
                <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{fmtS(f.date_evenement)}{f.groupe_beneficiaire?` · ${f.groupe_beneficiaire}`:''}</div>
                {f.playlist_nom && <div style={{fontSize:'.62rem',color:'#f97316',marginTop:2}}>🎵 {f.playlist_nom}</div>}
              </div>
            </div>
          ))}
          {!feux.filter(f=>f.statut==='planifie').length && <div className="bm-empty-sm">Aucun feu planifié</div>}
        </div>
        <div className="bm-card">
          <div className="bm-card-title">🎤 PROCHAINES RÉPÉTITIONS</div>
          {reps.filter(r=>r.statut==='planifiee').slice(0,4).map(r=>(
            <div key={r.id} className="bm-dash-item">
              <div className="bm-dash-item-icon" style={{background:'rgba(167,139,250,.1)',color:'#a78bfa'}}>{r.type_rep==='interne'?'🔒':'🌐'}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:'.8rem',color:'var(--text-primary)'}}>Répétition {r.type_rep==='interne'?'Interne':'Générale'}</div>
                <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{fmt(r.date_rep)} · {fmtH(r.heure_debut)}–{fmtH(r.heure_fin)}</div>
              </div>
            </div>
          ))}
          {!reps.filter(r=>r.statut==='planifiee').length && <div className="bm-empty-sm">Aucune répétition planifiée</div>}
        </div>
        <div className="bm-card">
          <div className="bm-card-title">📊 RÉPERTOIRE PAR CONTEXTE</div>
          {Object.entries(CONTEXTE_CFG).map(([k,v])=>{
            const count=chansons.filter(c=>c.contexte===k).length;
            const pct=chansons.length?Math.round(count*100/chansons.length):0;
            return (
              <div key={k} className="bm-repartition-row">
                <span style={{width:22,textAlign:'center'}}>{v.icon}</span>
                <span style={{flex:1,fontSize:'.72rem',color:'var(--text-secondary)'}}>{v.label}</span>
                <div className="bm-rep-bar"><div style={{width:`${pct}%`,background:v.color,height:'100%',borderRadius:3}} /></div>
                <span style={{fontSize:'.72rem',color:v.color,fontWeight:700,minWidth:24,textAlign:'right'}}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const TabLivret = () => (
    <div>
      <div className="bm-toolbar">
        <input className="bm-search" placeholder="🔍 Rechercher titre, tags…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="bm-select" value={filterCtx} onChange={e=>setFilterCtx(e.target.value)}>
          <option value="">Tous les contextes</option>
          {Object.entries(CONTEXTE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        {perms.canWrite && <button className="bm-btn-gold" onClick={()=>setModal({type:'chanson',data:null})}>+ Nouvelle chanson</button>}
      </div>
      <div className="bm-livret-grid">
        {filteredChansons.map(c=>{
          const cfg=CONTEXTE_CFG[c.contexte]||CONTEXTE_CFG.general;
          return (
            <div key={c.id} className="bm-song-card" style={{borderColor:cfg.color+'33'}}>
              <div className="bm-song-card-top" style={{background:`linear-gradient(135deg,${cfg.color}18,transparent)`}}>
                <span className="bm-song-icon" style={{color:cfg.color}}>{cfg.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="bm-song-titre">{c.titre}</div>
                  <span className="bm-song-ctx-badge" style={{color:cfg.color,background:cfg.color+'15'}}>{cfg.label}</span>
                </div>
              </div>
              {c.tags && <div className="bm-tags-row bm-tags-small">{c.tags.split(',').slice(0,3).map((t,i)=><span key={i} className="bm-tag">{t.trim()}</span>)}</div>}
              {c.paroles && <div className="bm-song-preview">{c.paroles.slice(0,80)}…</div>}
              <div className="bm-song-actions">
                {c.lien_externe && <a href={c.lien_externe} target="_blank" rel="noreferrer" className="bm-btn-sm bm-btn-link">🔗</a>}
                <button className="bm-btn-sm bm-btn-view" onClick={()=>setModal({type:'paroles',data:c})}>👁 Paroles</button>
                <button className="bm-btn-sm bm-btn-edit" onClick={()=>setModal({type:'chanson',data:c})}>✎</button>
                {perms.canDelete && <button className="bm-btn-sm bm-btn-del" onClick={async()=>{if(confirm('Supprimer ?')){await api.delete(`/bat-music/chansons/${c.id}`);load();}}}>✕</button>}
              </div>
            </div>
          );
        })}
        {!filteredChansons.length && <div className="bm-empty bm-empty-full"><span>🎵</span><p>Aucune chanson dans le répertoire</p>{perms.canWrite && <button className="bm-btn-gold" onClick={()=>setModal({type:'chanson',data:null})}>+ Ajouter</button>}</div>}
      </div>
    </div>
  );

  const TabPlaylists = () => (
    <div>
      <div className="bm-toolbar">{perms.canWrite && <button className="bm-btn-gold" onClick={()=>setModal({type:'playlist',data:null})}>+ Nouvelle playlist</button>}</div>
      <div className="bm-playlists-grid">
        {playlists.map(p=>{
          const cfg=CONTEXTE_CFG[p.contexte]||CONTEXTE_CFG.general;
          return (
            <div key={p.id} className="bm-pl-card" style={{borderColor:cfg.color+'44'}}>
              <div className="bm-pl-header" style={{background:`linear-gradient(135deg,${cfg.color}20,transparent)`}}>
                <span style={{fontSize:'1.5rem'}}>{cfg.icon}</span>
                <div style={{flex:1}}><div className="bm-pl-nom">{p.nom}</div><div style={{fontSize:'.65rem',color:cfg.color}}>{cfg.label}</div></div>
                <div className="bm-pl-count" style={{color:cfg.color,borderColor:cfg.color+'44'}}>{p.nb_chansons}<div style={{fontSize:'.55rem',color:'var(--text-muted)'}}>chansons</div></div>
              </div>
              {p.description && <div style={{padding:'10px 14px',fontSize:'.72rem',color:'var(--text-muted)'}}>{p.description}</div>}
              <div className="bm-pl-actions">
                <button className="bm-btn-sm bm-btn-edit" onClick={()=>setModal({type:'playlist',data:p})}>✎ Modifier</button>
                {perms.canDelete && <button className="bm-btn-sm bm-btn-del" onClick={async()=>{if(confirm('Supprimer ?')){await api.delete(`/bat-music/playlists/${p.id}`);load();}}}>✕ Supprimer</button>}
              </div>
            </div>
          );
        })}
        {!playlists.length && <div className="bm-empty bm-empty-full"><span>📋</span><p>Aucune playlist créée</p>{perms.canWrite && <button className="bm-btn-gold" onClick={()=>setModal({type:'playlist',data:null})}>+ Créer</button>}</div>}
      </div>
    </div>
  );

  const TabFeux = () => (
    <div>
      <div className="bm-toolbar">{perms.canWrite && <button className="bm-btn-gold" onClick={()=>setModal({type:'feu',data:null})}>🔥 Nouveau feu de camp</button>}</div>
      <div className="bm-events-list">
        {feux.map(f=>{
          const scfg=STATUT_FCF[f.statut]||STATUT_FCF.planifie;
          const pct=f.total_membres>0?Math.round(f.nb_presents*100/f.total_membres):0;
          return (
            <div key={f.id} className="bm-event-card">
              <div className="bm-event-flame">🔥</div>
              <div className="bm-event-body">
                <div className="bm-event-top">
                  <div style={{flex:1}}>
                    <div className="bm-event-titre">{f.titre}</div>
                    <div className="bm-event-meta">
                      📅 {fmtS(f.date_evenement)}{f.heure_debut?<> · ⏰ {fmtH(f.heure_debut)}</>:null}
                      {f.lieu?<> · 📍 {f.lieu}</>:null}{f.groupe_beneficiaire?<> · 👥 {f.groupe_beneficiaire}</>:null}
                    </div>
                    {f.playlist_nom && <div style={{fontSize:'.68rem',color:'#f97316',marginTop:4}}>🎵 {f.playlist_nom}</div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                    <span className="bm-statut-badge" style={{color:scfg.color,background:scfg.bg}}>{scfg.label}</span>
                    {f.total_membres>0 && <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{f.nb_presents}/{f.total_membres} présents ({pct}%)</div>}
                  </div>
                </div>
                <div className="bm-event-actions">
                  <button className="bm-btn-sm bm-btn-point" onClick={()=>setModal({type:'pointage_feu',data:f})}>🎤 Pointer</button>
                  <button className="bm-btn-sm bm-btn-edit" onClick={()=>setModal({type:'feu',data:f})}>✎ Modifier</button>
                  {perms.canDelete && <button className="bm-btn-sm bm-btn-del" onClick={async()=>{if(confirm('Supprimer ?')){await api.delete(`/bat-music/feux/${f.id}`);load();}}}>✕</button>}
                </div>
              </div>
            </div>
          );
        })}
        {!feux.length && <div className="bm-empty"><span>🔥</span><p>Aucun feu de camp programmé</p></div>}
      </div>
    </div>
  );

  const TabRepetitions = () => (
    <div>
      <div className="bm-toolbar"><button className="bm-btn-gold" onClick={()=>setModal({type:'rep',data:null})}>🎤 Nouvelle répétition</button></div>
      <div className="bm-events-list">
        {reps.map(r=>{
          const scfg=STATUT_REP[r.statut]||STATUT_REP.planifiee;
          const pct=r.total_membres>0?Math.round(r.nb_presents*100/r.total_membres):0;
          return (
            <div key={r.id} className="bm-event-card">
              <div className="bm-event-flame" style={{background:'rgba(167,139,250,.1)',color:'#a78bfa'}}>{r.type_rep==='interne'?'🔒':'🌐'}</div>
              <div className="bm-event-body">
                <div className="bm-event-top">
                  <div style={{flex:1}}>
                    <div className="bm-event-titre">Répétition {r.type_rep==='interne'?'Interne':'Générale'}</div>
                    <div className="bm-event-meta">📅 {fmt(r.date_rep)} · ⏰ {fmtH(r.heure_debut)}–{fmtH(r.heure_fin)}{r.lieu?<> · 📍 {r.lieu}</>:null}</div>
                    {r.notes && <div style={{fontSize:'.68rem',color:'var(--text-muted)',marginTop:4}}>📝 {r.notes}</div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                    <span className="bm-statut-badge" style={{color:scfg.color,background:scfg.bg}}>{scfg.label}</span>
                    {r.total_membres>0 && <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{r.nb_presents}/{r.total_membres} présents</div>}
                  </div>
                </div>
                <div className="bm-event-actions">
                  <button className="bm-btn-sm bm-btn-point" onClick={()=>setModal({type:'pointage_rep',data:r})}>🎤 Pointer</button>
                  {perms.canDelete && <button className="bm-btn-sm bm-btn-del" onClick={async()=>{if(confirm('Supprimer ?')){await api.delete(`/bat-music/repetitions/${r.id}`);load();}}}>✕</button>}
                </div>
              </div>
            </div>
          );
        })}
        {!reps.length && <div className="bm-empty"><span>🎤</span><p>Aucune répétition planifiée</p></div>}
      </div>
    </div>
  );

  const TabMembres = () => {
    const [selS,setSelS]=useState(''); const [selR,setSelR]=useState('membre');
    const memIds=new Set(membres.map(m=>m.soldier_id));
    const dispo=soldiers.filter(s=>!memIds.has(s.id)&&s.statut==='actif');
    return (
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div className="bm-card">
          <div className="bm-card-title">🎤 MEMBRES DE LA BAT-MUSIC</div>
          {!membres.length ? <div className="bm-empty-sm">Aucun membre assigné</div> : (
            <div className="bm-membres-list">
              {membres.map(m=>(
                <div key={m.id} className="bm-membre-row">
                  <Avatar nom={m.nom} prenom={m.prenom} photo={m.photo_url} size={42} color='#C9A84C' />
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:'.85rem',color:'var(--text-primary)'}}>{m.prenom} {m.nom}</div><div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{m.grade}</div></div>
                  <span className={`bm-role-badge bm-role-${m.role}`}>{m.role==='chef'?'👑 Chef':m.role==='second'?'⭐ Second':'Membre'}</span>
                  <button className="bm-btn-remove" onClick={async()=>{if(confirm('Retirer ?')){await api.delete(`/bat-music/membres/${m.soldier_id}`);load();}}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bm-card">
          <div className="bm-card-title">➕ AJOUTER UN MEMBRE</div>
          <div className="bm-field-row">
            <div className="bm-field"><label>Soldat</label>
              <select className="bm-input" value={selS} onChange={e=>setSelS(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {dispo.map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>)}
              </select>
            </div>
            <div className="bm-field"><label>Rôle</label>
              <select className="bm-input" value={selR} onChange={e=>setSelR(e.target.value)}>
                <option value="chef">👑 Chef</option><option value="second">⭐ Second</option><option value="membre">Membre</option>
              </select>
            </div>
            <div className="bm-field" style={{justifyContent:'flex-end'}}><label style={{opacity:0}}>_</label>
              {perms.canWrite && <button className="bm-btn-gold" disabled={!selS} onClick={async()=>{await api.post('/bat-music/membres',{soldier_id:parseInt(selS),role:selR});setSelS('');load();}}>➕ Ajouter</button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TABS=[['dashboard','📊 Dashboard'],['livret','📖 Livret'],['playlists','🎵 Playlists'],['feux','🔥 Feux de Camp'],['repetitions','🎤 Répétitions'],['membres','👥 Membres']];

  return (
    <div className="bm-page">
      <div className="bm-header">
        <div>
          <div className="bm-eyebrow">G5C ARMÉE — SECTION</div>
          <h1 className="bm-title">🎵 BAT-MUSIC</h1>
          <div className="bm-subtitle">Bataillon de Musique · Animation & Chant Militaire</div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
          {perms.canWrite && <button className="bm-btn-gold" onClick={()=>setModal({type:'rep',data:null})}>+ Répétition</button>}
          <button className="bm-btn-gold" style={{background:'rgba(249,115,22,.15)',color:'#f97316',border:'1px solid rgba(249,115,22,.3)'}} onClick={()=>setModal({type:'feu',data:null})}>🔥 Feu de camp</button>
          {perms.canWrite && <button className="bm-btn-outline" onClick={()=>setModal({type:'chanson',data:null})}>+ Chanson</button>}
        </div>
      </div>
      <div className="bm-tabs">{TABS.map(([k,l])=><button key={k} className={`bm-tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>)}</div>
      {loading ? <div className="bm-empty">Chargement…</div> : <>
        {tab==='dashboard'   && <TabDashboard />}
        {tab==='livret'      && <TabLivret />}
        {tab==='playlists'   && <TabPlaylists />}
        {tab==='feux'        && <TabFeux />}
        {tab==='repetitions' && <TabRepetitions />}
        {tab==='membres'     && <TabMembres />}
      </>}
      {modal?.type==='chanson'      && <ModalChanson chanson={modal.data} onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Chanson enregistrée');}} />}
      {modal?.type==='paroles'      && <ModalParoles chanson={modal.data} onClose={()=>setModal(null)} />}
      {modal?.type==='playlist'     && <ModalPlaylist playlist={modal.data} chansons={chansons} onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Playlist enregistrée');}} />}
      {modal?.type==='feu'          && <ModalFeu feu={modal.data} playlists={playlists} onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Feu de camp enregistré');}} />}
      {modal?.type==='rep'          && <ModalRep onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Répétition créée');}} />}
      {modal?.type==='pointage_feu' && <ModalPointage type="feu" item={modal.data} onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Pointage sauvegardé');}} />}
      {modal?.type==='pointage_rep' && <ModalPointage type="rep" item={modal.data} onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Pointage sauvegardé');}} />}
      {toast && <div className="bm-toast">{toast}</div>}
    </div>
  );
}
