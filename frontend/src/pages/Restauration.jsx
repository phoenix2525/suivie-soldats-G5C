import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/Restauration.css';

const CAT_RECETTE = {
  petit_dejeuner: { label:'Petit-déjeuner', icon:'☕', color:'#f59e0b' },
  entree:         { label:'Entrée',          icon:'🥗', color:'#34d399' },
  plat:           { label:'Plat principal',  icon:'🍽️', color:'#C9A84C' },
  dessert:        { label:'Dessert',         icon:'🍰', color:'#f97316' },
  jus:            { label:'Jus / Boisson',   icon:'🥤', color:'#60a5fa' },
  autre:          { label:'Autre',           icon:'📋', color:'#94a3b8' },
};
const CAT_MAT = {
  ustensile:     { label:'Ustensile',      icon:'🍴' },
  electromenager:{ label:'Électroménager', icon:'🔌' },
  vaisselle:     { label:'Vaisselle',      icon:'🥣' },
  mobilier:      { label:'Mobilier',       icon:'🪑' },
  autre:         { label:'Autre',          icon:'📦' },
};
const ETAT_MAT = {
  bon:         { label:'Bon état',     color:'#34d399', bg:'rgba(52,211,153,.1)'  },
  defectueux:  { label:'Défectueux',   color:'#f59e0b', bg:'rgba(245,158,11,.1)'  },
  hors_service:{ label:'Hors service', color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
};
const STATUT_EVT = {
  planifie: { label:'Planifié',  color:'#60a5fa', bg:'rgba(96,165,250,.1)'  },
  en_cours: { label:'En cours',  color:'#f59e0b', bg:'rgba(245,158,11,.1)'  },
  termine:  { label:'Terminé',   color:'#34d399', bg:'rgba(52,211,153,.1)'  },
  annule:   { label:'Annulé',    color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
};
const CAT_DEP = {
  ingredients: { label:'Ingrédients', icon:'🛒', color:'#34d399' },
  restaurant:  { label:'Restaurant',  icon:'🍽️', color:'#f97316' },
  location:    { label:'Location',    icon:'📦', color:'#a78bfa' },
  autre:       { label:'Autre',       icon:'📋', color:'#94a3b8' },
};

const fmt  = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}) : '—';
const fmtM = n => Number(n||0).toLocaleString('fr-FR') + ' FCFA';
const pct  = (a,b) => b>0 ? Math.round(a*100/b) : 0;

const Toast = ({msg,onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[onDone]);
  return <div className="rs-toast">{msg}</div>;
};

const Calculateur = ({recette, onClose}) => {
  const [nb, setNb] = useState(recette.nb_personnes_base||1);
  const ratio = nb / (recette.nb_personnes_base||1);
  const total = (recette.ingredients||[]).reduce((s,i)=>s+(i.quantite*ratio*(i.prix_unitaire||0)),0);
  return (
    <div className="rs-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rs-modal rs-modal-lg">
        <div className="rs-modal-header">🧮 Calculateur — {recette.nom}
          <button className="rs-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rs-modal-body">
          <div style={{background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.2)',borderRadius:12,padding:'16px 20px'}}>
            <div style={{fontSize:'.62rem',letterSpacing:'.15em',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:10}}>Nombre de personnes</div>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <button className="rs-calc-btn" onClick={()=>setNb(p=>Math.max(1,p-1))}>−</button>
              <input type="number" min="1" value={nb} onChange={e=>setNb(Math.max(1,parseInt(e.target.value)||1))}
                style={{width:80,textAlign:'center',background:'var(--bg-hover)',border:'1px solid var(--border-color)',
                  borderRadius:8,padding:'8px',color:'var(--text-primary)',fontSize:'1.1rem',fontWeight:700}}/>
              {perms.canWrite && <button className="rs-calc-btn" onClick={()=>setNb(p=>p+1)}>+</button>}
              <span style={{fontSize:'.72rem',color:'var(--text-muted)'}}>base : {recette.nb_personnes_base} pers.</span>
            </div>
          </div>
          {recette.ingredients?.length>0 ? (
            <div className="rs-table-wrap">
              <table className="rs-table">
                <thead><tr><th>Ingrédient</th><th>Qté base</th><th>Qté ajustée</th><th>Prix/unité</th><th>Coût</th></tr></thead>
                <tbody>
                  {recette.ingredients.map((ing,i)=>{
                    const qa=(ing.quantite*ratio).toFixed(3);
                    const c=(ing.quantite*ratio*(ing.prix_unitaire||0)).toFixed(0);
                    return <tr key={i}>
                      <td style={{fontWeight:600,color:'var(--text-primary)'}}>{ing.nom}</td>
                      <td style={{color:'var(--text-muted)'}}>{ing.quantite} {ing.unite}</td>
                      <td style={{color:'#C9A84C',fontWeight:700}}>{qa} {ing.unite}</td>
                      <td style={{color:'var(--text-muted)'}}>{fmtM(ing.prix_unitaire)}/{ing.unite}</td>
                      <td style={{color:'#34d399',fontWeight:700}}>{fmtM(c)}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="rs-empty">Aucun ingrédient enregistré</div>}
          {recette.ingredients?.length>0&&(
            <div style={{background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.2)',borderRadius:10,
              padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'.62rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.1em'}}>Coût total estimé</div>
                <div style={{fontSize:'.68rem',color:'var(--text-muted)'}}>pour {nb} personne{nb>1?'s':''}</div>
              </div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.8rem',fontWeight:800,color:'#C9A84C'}}>{fmtM(total.toFixed(0))}</div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>Par personne</div>
                <div style={{fontWeight:700,color:'#34d399',fontSize:'1rem'}}>{fmtM((total/nb).toFixed(0))}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ModalRecette = ({recette, onClose, onDone}) => {
  const [form, setForm] = useState(recette||{nom:'',categorie:'plat',nb_personnes_base:10,notes:''});
  const [ings, setIngs] = useState(recette?.ingredients||[]);
  const [saving, setSaving] = useState(false);
  const addI = ()=>setIngs(p=>[...p,{nom:'',quantite:1,unite:'kg',prix_unitaire:0}]);
  const remI = i=>setIngs(p=>p.filter((_,j)=>j!==i));
  const updI = (i,k,v)=>setIngs(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));
  const save = async()=>{
    if(!form.nom) return; setSaving(true);
    try{
      if(recette?.id) await api.put(`/restauration/recettes/${recette.id}`,{...form,ingredients:ings});
      else await api.post('/restauration/recettes',{...form,ingredients:ings});
      onDone(); onClose();
    }catch{setSaving(false);}
  };
  const sousTotal = ings.reduce((s,i)=>s+(i.quantite*(i.prix_unitaire||0)),0);
  return (
    <div className="rs-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rs-modal rs-modal-xl">
        <div className="rs-modal-header">🍽️ {recette?.id?'Modifier':'Nouvelle'} recette
          <button className="rs-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rs-modal-body">
          <div className="rs-field-row" style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
            <div className="rs-field"><label>Nom *</label>
              <input className="rs-input" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Ex: Thiébou Yapp"/>
            </div>
            <div className="rs-field"><label>Catégorie</label>
              <select className="rs-input" value={form.categorie} onChange={e=>setForm(f=>({...f,categorie:e.target.value}))}>
                {Object.entries(CAT_RECETTE).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div className="rs-field"><label>Base (personnes)</label>
              <input type="number" min="1" className="rs-input" value={form.nb_personnes_base}
                onChange={e=>setForm(f=>({...f,nb_personnes_base:parseInt(e.target.value)||1}))}/>
            </div>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:'.6rem',letterSpacing:'.15em',color:'var(--text-muted)',textTransform:'uppercase'}}>Ingrédients ({ings.length})</div>
              {perms.canWrite && <button className="rs-btn-sm rs-btn-add" onClick={addI}>+ Ajouter</button>}
            </div>
            {ings.length===0
              ? <div style={{textAlign:'center',padding:'16px',color:'var(--text-muted)',fontSize:'.75rem',background:'var(--bg-hover)',borderRadius:8}}>Aucun ingrédient — cliquez + pour en ajouter</div>
              : <>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1.2fr auto',gap:8,
                    padding:'4px 8px',fontSize:'.58rem',letterSpacing:'.1em',color:'var(--text-muted)',textTransform:'uppercase'}}>
                    <span>Ingrédient</span><span>Quantité</span><span>Unité</span><span>Prix/unité (FCFA)</span><span/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {ings.map((ing,i)=>(
                      <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1.2fr auto',gap:8,alignItems:'center'}}>
                        <input className="rs-input" placeholder="Nom" value={ing.nom} onChange={e=>updI(i,'nom',e.target.value)}/>
                        <input type="number" step="0.1" min="0" className="rs-input" value={ing.quantite} onChange={e=>updI(i,'quantite',parseFloat(e.target.value)||0)}/>
                        <select className="rs-input" value={ing.unite} onChange={e=>updI(i,'unite',e.target.value)}>
                          {['kg','g','L','cl','pièce','sac','boîte','bouteille'].map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" min="0" className="rs-input" placeholder="0" value={ing.prix_unitaire} onChange={e=>updI(i,'prix_unitaire',parseFloat(e.target.value)||0)}/>
                        <button onClick={()=>remI(i)} style={{background:'none',border:'1px solid rgba(239,68,68,.3)',color:'#f87171',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:'.75rem'}}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 0',borderTop:'1px solid var(--border-color)',marginTop:6}}>
                    <span style={{fontSize:'.75rem',color:'var(--text-muted)'}}>Coût base ({form.nb_personnes_base} pers.) : </span>
                    <span style={{marginLeft:8,fontWeight:700,color:'#C9A84C'}}>{fmtM(sousTotal.toFixed(0))}</span>
                  </div>
                </>
            }
          </div>
          <div className="rs-field"><label>Notes</label>
            <textarea className="rs-input" rows={2} value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
          </div>
        </div>
        <div className="rs-modal-footer">
          <button className="rs-btn-cancel" onClick={onClose}>Annuler</button>
          <button className="rs-btn-confirm" onClick={save} disabled={saving||!form.nom}>{saving?'…':'✓ Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
};

const ModalEvenement = ({evt, onClose, onDone}) => {
  const [form, setForm] = useState(evt||{titre:'',date_evenement:new Date().toISOString().slice(0,10),description:'',nb_personnes:'',budget_previsionnel:'',statut:'planifie'});
  const [saving, setSaving] = useState(false);
  const save = async()=>{
    if(!form.titre||!form.date_evenement) return; setSaving(true);
    try{
      if(evt?.id) await api.put(`/restauration/evenements/${evt.id}`,form);
      else await api.post('/restauration/evenements',form);
      onDone(); onClose();
    }catch{setSaving(false);}
  };
  return (
    <div className="rs-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rs-modal">
        <div className="rs-modal-header">🎉 {evt?.id?'Modifier':'Nouvel'} événement
          <button className="rs-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rs-modal-body">
          <div className="rs-field"><label>Titre *</label>
            <input className="rs-input" value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} placeholder="Ex: Week-end d'intégration"/>
          </div>
          <div className="rs-field-row">
            <div className="rs-field"><label>Date *</label>
              <input type="date" className="rs-input" value={form.date_evenement} onChange={e=>setForm(f=>({...f,date_evenement:e.target.value}))}/>
            </div>
            <div className="rs-field"><label>Nb personnes</label>
              <input type="number" min="0" className="rs-input" value={form.nb_personnes} onChange={e=>setForm(f=>({...f,nb_personnes:e.target.value}))}/>
            </div>
          </div>
          <div className="rs-field"><label>Budget prévisionnel (FCFA)</label>
            <input type="number" min="0" className="rs-input" value={form.budget_previsionnel} onChange={e=>setForm(f=>({...f,budget_previsionnel:e.target.value}))} placeholder="Ex: 800000"/>
          </div>
          {evt?.id&&(
            <div className="rs-field"><label>Statut</label>
              <select className="rs-input" value={form.statut} onChange={e=>setForm(f=>({...f,statut:e.target.value}))}>
                {Object.entries(STATUT_EVT).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
          <div className="rs-field"><label>Description</label>
            <textarea className="rs-input" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
          </div>
        </div>
        <div className="rs-modal-footer">
          <button className="rs-btn-cancel" onClick={onClose}>Annuler</button>
          <button className="rs-btn-confirm" onClick={save} disabled={saving||!form.titre}>{saving?'…':'✓ Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
};

const DetailEvenement = ({evt, recettes, onClose, onRefresh, onToast}) => {
  const [detail, setDetail] = useState(null);
  const [showPlat, setShowPlat] = useState(false);
  const [showDep, setShowDep] = useState(false);
  const [pf, setPf] = useState({recette_id:'',nom_plat:'',nb_personnes:evt.nb_personnes||'',cout_reel:''});
  const [df, setDf] = useState({libelle:'',categorie:'ingredients',montant:'',notes:''});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    const r = await api.get(`/restauration/evenements/${evt.id}`).catch(()=>null);
    if(r) setDetail(r.data.data);
  },[evt.id]);
  useEffect(()=>{load();},[load]);

  if(!detail) return <div className="rs-overlay"><div className="rs-modal"><div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Chargement…</div></div></div>;

  const totalDep = detail.depenses.reduce((s,d)=>s+parseFloat(d.montant),0)
    + detail.plats.reduce((s,p)=>s+parseFloat(p.cout_reel||0),0);
  const budPct = pct(totalDep, parseFloat(detail.budget_previsionnel)||0);

  const ajouterPlat = async()=>{
    setSaving(true);
    try{
      const sel = recettes.find(r=>r.id===parseInt(pf.recette_id));
      await api.post(`/restauration/evenements/${evt.id}/plats`,{...pf,nom_plat:pf.nom_plat||sel?.nom||''});
      onToast('✅ Plat ajouté'); setShowPlat(false); load(); onRefresh();
    }catch{onToast('❌ Erreur');}
    setSaving(false);
  };

  const ajouterDep = async()=>{
    if(!df.libelle||!df.montant) return; setSaving(true);
    try{
      await api.post(`/restauration/evenements/${evt.id}/depenses`,df);
      onToast('✅ Dépense ajoutée'); setShowDep(false); load(); onRefresh();
    }catch{onToast('❌ Erreur');}
    setSaving(false);
  };

  return (
    <div className="rs-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rs-modal rs-modal-xl" style={{maxHeight:'92vh'}}>
        <div className="rs-modal-header">
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.62rem',letterSpacing:'.2em',color:'var(--gold-main)'}}>DÉTAIL ÉVÉNEMENT</div>
            <div style={{fontSize:'.9rem',fontWeight:700,color:'var(--text-primary)',marginTop:2}}>{detail.titre}</div>
            <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{fmt(detail.date_evenement)} · {detail.nb_personnes} personnes</div>
          </div>
          <button className="rs-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rs-modal-body">
          {/* Budget */}
          <div style={{background:'var(--bg-hover)',borderRadius:12,padding:'14px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div>
                <div style={{fontSize:'.58rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.1em'}}>Dépensé</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.3rem',fontWeight:800,
                  color:budPct>100?'#ef4444':budPct>80?'#f59e0b':'#34d399'}}>{fmtM(totalDep)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'.58rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.1em'}}>Budget prévu</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.3rem',fontWeight:800,color:'var(--gold-bright)'}}>{fmtM(detail.budget_previsionnel)}</div>
              </div>
            </div>
            <div style={{background:'var(--border-color)',borderRadius:4,height:8,overflow:'hidden'}}>
              <div style={{width:`${Math.min(budPct,100)}%`,height:'100%',borderRadius:4,
                background:budPct>100?'#ef4444':budPct>80?'#f59e0b':'#34d399',transition:'width .3s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:'.62rem',color:'var(--text-muted)'}}>
              <span>{budPct}% utilisé</span>
              <span style={{color:parseFloat(detail.budget_previsionnel)-totalDep>=0?'#34d399':'#ef4444',fontWeight:700}}>
                {parseFloat(detail.budget_previsionnel)-totalDep>=0?'Restant':'Dépassement'} : {fmtM(Math.abs(parseFloat(detail.budget_previsionnel)-totalDep))}
              </span>
            </div>
          </div>

          {/* Plats */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:'.6rem',letterSpacing:'.15em',color:'var(--text-muted)',textTransform:'uppercase'}}>🍽️ Plats ({detail.plats.length})</div>
              {perms.canWrite && <button className="rs-btn-sm rs-btn-add" onClick={()=>setShowPlat(p=>!p)}>+ Ajouter</button>}
            </div>
            {showPlat&&(
              <div style={{background:'var(--bg-hover)',borderRadius:10,padding:'12px',marginBottom:8,border:'1px solid rgba(201,168,76,.2)'}}>
                <div className="rs-field-row">
                  <div className="rs-field"><label>Recette (optionnel)</label>
                    <select className="rs-input" value={pf.recette_id} onChange={e=>{const r=recettes.find(x=>x.id===parseInt(e.target.value));setPf(f=>({...f,recette_id:e.target.value,nom_plat:r?.nom||f.nom_plat}));}}>
                      <option value="">— Aucune —</option>
                      {recettes.map(r=>{const c=CAT_RECETTE[r.categorie];return <option key={r.id} value={r.id}>{c?.icon} {r.nom}</option>;})}
                    </select>
                  </div>
                  <div className="rs-field"><label>Nom du plat</label>
                    <input className="rs-input" value={pf.nom_plat} onChange={e=>setPf(f=>({...f,nom_plat:e.target.value}))} placeholder="Ex: Thiébou Yapp"/>
                  </div>
                </div>
                <div className="rs-field-row">
                  <div className="rs-field"><label>Nb personnes</label>
                    <input type="number" className="rs-input" value={pf.nb_personnes} onChange={e=>setPf(f=>({...f,nb_personnes:e.target.value}))}/>
                  </div>
                  <div className="rs-field"><label>Coût réel (FCFA)</label>
                    <input type="number" className="rs-input" value={pf.cout_reel} onChange={e=>setPf(f=>({...f,cout_reel:e.target.value}))} placeholder="0"/>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
                  <button className="rs-btn-cancel" onClick={()=>setShowPlat(false)}>Annuler</button>
                  {perms.canWrite && <button className="rs-btn-confirm" onClick={ajouterPlat} disabled={saving}>✓ Ajouter</button>}
                </div>
              </div>
            )}
            {detail.plats.map(p=>{const c=CAT_RECETTE[p.categorie]||CAT_RECETTE.autre;return(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',
                background:'var(--bg-hover)',borderRadius:8,marginBottom:4,border:`1px solid ${c.color}22`}}>
                <span style={{fontSize:'1.1rem'}}>{c.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:'.8rem',color:'var(--text-primary)'}}>{p.nom_plat||p.recette_nom}</div>
                  {p.nb_personnes&&<div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>👥 {p.nb_personnes} pers.</div>}
                </div>
                <span style={{fontWeight:700,color:'#C9A84C',fontSize:'.82rem'}}>{fmtM(p.cout_reel)}</span>
                <button onClick={async()=>{await api.delete(`/restauration/evenements/${evt.id}/plats/${p.id}`);load();onRefresh();}}
                  style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>✕</button>
              </div>
            );})}
          </div>

          {/* Dépenses */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:'.6rem',letterSpacing:'.15em',color:'var(--text-muted)',textTransform:'uppercase'}}>💰 Autres dépenses ({detail.depenses.length})</div>
              {perms.canWrite && <button className="rs-btn-sm rs-btn-add" onClick={()=>setShowDep(p=>!p)}>+ Ajouter</button>}
            </div>
            {showDep&&(
              <div style={{background:'var(--bg-hover)',borderRadius:10,padding:'12px',marginBottom:8,border:'1px solid rgba(96,165,250,.2)'}}>
                <div className="rs-field-row" style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
                  <div className="rs-field"><label>Libellé *</label>
                    <input className="rs-input" value={df.libelle} onChange={e=>setDf(f=>({...f,libelle:e.target.value}))} placeholder="Ex: Poulet frites restaurant"/>
                  </div>
                  <div className="rs-field"><label>Catégorie</label>
                    <select className="rs-input" value={df.categorie} onChange={e=>setDf(f=>({...f,categorie:e.target.value}))}>
                      {Object.entries(CAT_DEP).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                  </div>
                  <div className="rs-field"><label>Montant *</label>
                    <input type="number" className="rs-input" value={df.montant} onChange={e=>setDf(f=>({...f,montant:e.target.value}))} placeholder="0"/>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
                  <button className="rs-btn-cancel" onClick={()=>setShowDep(false)}>Annuler</button>
                  {perms.canWrite && <button className="rs-btn-confirm" onClick={ajouterDep} disabled={saving||!df.libelle||!df.montant}>✓ Ajouter</button>}
                </div>
              </div>
            )}
            {detail.depenses.map(d=>{const c=CAT_DEP[d.categorie]||CAT_DEP.autre;return(
              <div key={d.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',
                background:'var(--bg-hover)',borderRadius:8,marginBottom:4}}>
                <span>{c.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:'.8rem',color:'var(--text-primary)'}}>{d.libelle}</div>
                  <div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>{c.label}</div>
                </div>
                <span style={{fontWeight:700,color:'#C9A84C',fontSize:'.82rem'}}>{fmtM(d.montant)}</span>
                <button onClick={async()=>{await api.delete(`/restauration/evenements/${evt.id}/depenses/${d.id}`);load();onRefresh();}}
                  style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>✕</button>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Restauration() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [tab,        setTab]        = useState('evenements');
  const [stats,      setStats]      = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [recettes,   setRecettes]   = useState([]);
  const [materiel,   setMateriel]   = useState([]);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState('');
  const [calcRec,    setCalcRec]    = useState(null);
  const [detailEvt,  setDetailEvt]  = useState(null);
  const [matFilter,  setMatFilter]  = useState('');
  const [showMatForm,setShowMatForm]= useState(false);
  const [editMat,    setEditMat]    = useState(null);
  const [matForm,    setMatForm]    = useState({nom:'',categorie:'ustensile',quantite:1,etat:'bon',notes:''});

  const notify = msg => { setToast(msg); setTimeout(()=>setToast(''),2800); };

  const load = useCallback(async()=>{
    const [st,ev,re,ma] = await Promise.all([
      api.get('/restauration/stats').catch(()=>({data:{data:null}})),
      api.get('/restauration/evenements').catch(()=>({data:{data:[]}})),
      api.get('/restauration/recettes').catch(()=>({data:{data:[]}})),
      api.get('/restauration/materiel').catch(()=>({data:{data:[]}})),
    ]);
    setStats(st.data.data); setEvenements(ev.data.data||[]);
    setRecettes(re.data.data||[]); setMateriel(ma.data.data||[]);
  },[]);
  useEffect(()=>{load();},[load]);

  const openCalc = async(r)=>{
    const d = await api.get(`/restauration/recettes/${r.id}`).catch(()=>null);
    if(d) setCalcRec(d.data.data);
  };

  const saveMat = async()=>{
    try{
      if(editMat) await api.put(`/restauration/materiel/${editMat.id}`,matForm);
      else await api.post('/restauration/materiel',matForm);
      notify('✅ Matériel enregistré');
      setShowMatForm(false); setEditMat(null);
      setMatForm({nom:'',categorie:'ustensile',quantite:1,etat:'bon',notes:''});
      load();
    }catch{notify('❌ Erreur');}
  };

  const matAff = materiel.filter(m=>!matFilter||m.categorie===matFilter||m.etat===matFilter);

  return (
    <div className="rs-page">
      <div className="rs-header">
        <div>
          <div className="rs-eyebrow">G5C ARMÉE · LOGISTIQUE ÉVÉNEMENTIELLE</div>
          <h1 className="rs-title">Section Restauration</h1>
          <div className="rs-subtitle">ÉVÉNEMENTS · RECETTES · INVENTAIRE</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="rs-btn-primary" onClick={()=>setModal({type:'evt',data:null})}>🎉 Nouvel événement</button>
          {perms.canWrite && <button className="rs-btn-outline" onClick={()=>setModal({type:'rec',data:null})}>+ Recette</button>}
        </div>
      </div>

      {stats&&(
        <div className="rs-kpis">
          {[
            {val:stats.evenements.total,           lbl:'Événements',  icon:'🎉',color:'#C9A84C'},
            {val:stats.evenements.planifies,        lbl:'Planifiés',   icon:'📅',color:'#60a5fa'},
            {val:fmtM(stats.budget.total_depense),  lbl:'Total dépensé',icon:'💰',color:'#ef4444'},
            {val:stats.materiel.total,              lbl:'Matériels',   icon:'📦',color:'#34d399'},
          ].map((k,i)=>(
            <div key={i} className="rs-kpi" style={{borderColor:k.color+'33'}}>
              <div style={{fontSize:'1.3rem'}}>{k.icon}</div>
              <div className="rs-kpi-val" style={{color:k.color}}>{k.val}</div>
              <div className="rs-kpi-lbl">{k.lbl}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rs-tabs">
        {[{k:'evenements',l:'🎉 Événements'},{k:'recettes',l:'🍽️ Recettes & Calculateur'},{k:'inventaire',l:'📦 Inventaire'}]
          .map(t=><button key={t.k} className={`rs-tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>

      {/* ÉVÉNEMENTS */}
      {tab==='evenements'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
            {perms.canWrite && <button className="rs-btn-primary" onClick={()=>setModal({type:'evt',data:null})}>+ Nouvel événement</button>}
          </div>
          {evenements.length===0
            ? <div className="rs-empty"><div style={{fontSize:'2rem'}}>🎉</div>Aucun événement</div>
            : <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {evenements.map(e=>{
                  const sc=STATUT_EVT[e.statut]||STATUT_EVT.planifie;
                  const dep=parseFloat(e.total_depense||0),prev=parseFloat(e.budget_previsionnel||0),p=pct(dep,prev);
                  return(
                    <div key={e.id} className="rs-evt-card" onClick={()=>setDetailEvt(e)}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                        <div style={{fontSize:'1.6rem'}}>🎉</div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                            <span style={{fontWeight:700,fontSize:'.88rem',color:'var(--text-primary)'}}>{e.titre}</span>
                            <span className="rs-badge" style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                          </div>
                          <div style={{fontSize:'.68rem',color:'var(--text-muted)',display:'flex',gap:12,flexWrap:'wrap'}}>
                            <span>📅 {fmt(e.date_evenement)}</span>
                            {e.nb_personnes>0&&<span>👥 {e.nb_personnes} personnes</span>}
                            {e.nb_plats>0&&<span>🍽️ {e.nb_plats} plat(s)</span>}
                          </div>
                          {prev>0&&(
                            <div style={{marginTop:8}}>
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:'.62rem',color:'var(--text-muted)',marginBottom:3}}>
                                <span>{fmtM(dep)}</span><span>Budget: {fmtM(prev)} ({p}%)</span>
                              </div>
                              <div style={{background:'var(--border-color)',borderRadius:3,height:5,overflow:'hidden'}}>
                                <div style={{width:`${Math.min(p,100)}%`,height:'100%',background:p>100?'#ef4444':p>80?'#f59e0b':'#34d399'}}/>
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{display:'flex',gap:6}} onClick={e2=>e2.stopPropagation()}>
                          <button className="rs-btn-sm rs-btn-edit" onClick={()=>setModal({type:'evt',data:e})}>✎</button>
                          {perms.canDelete && <button className="rs-btn-sm rs-btn-del" onClick={async()=>{if(confirm('Supprimer ?')){await api.delete(`/restauration/evenements/${e.id}`);load();}}}>✕</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* RECETTES */}
      {tab==='recettes'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
            {perms.canWrite && <button className="rs-btn-primary" onClick={()=>setModal({type:'rec',data:null})}>+ Nouvelle recette</button>}
          </div>
          {recettes.length===0
            ? <div className="rs-empty"><div style={{fontSize:'2rem'}}>🍽️</div>Aucune recette sauvegardée</div>
            : <div className="rs-recettes-grid">
                {recettes.map(r=>{
                  const c=CAT_RECETTE[r.categorie]||CAT_RECETTE.autre;
                  return(
                    <div key={r.id} className="rs-recette-card" style={{borderColor:c.color+'33'}}>
                      <div style={{padding:'14px 16px',background:`linear-gradient(135deg,${c.color}12,transparent)`,display:'flex',gap:12,alignItems:'flex-start'}}>
                        <span style={{fontSize:'1.4rem'}}>{c.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:800,fontSize:'.85rem',color:'var(--text-primary)'}}>{r.nom}</div>
                          <span style={{fontSize:'.6rem',color:c.color,fontWeight:700}}>{c.label}</span>
                        </div>
                      </div>
                      <div style={{padding:'8px 16px',display:'flex',gap:14,fontSize:'.68rem',color:'var(--text-muted)'}}>
                        <span>👥 Base: {r.nb_personnes_base} pers.</span>
                        <span>🧾 {r.nb_ingredients} ingrédients</span>
                        <span style={{color:'#C9A84C',fontWeight:700}}>{fmtM(r.cout_base)}</span>
                      </div>
                      <div style={{padding:'10px 14px',borderTop:'1px solid var(--border-color)',display:'flex',gap:6}}>
                        {perms.canWrite && <button style={{flex:1,background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.25)',
                          color:'#C9A84C',fontWeight:700,borderRadius:7,padding:'7px',cursor:'pointer',fontSize:'.7rem'}}
                          onClick={()=>openCalc(r)}>🧮 Calculer</button>}
                        <button className="rs-btn-sm rs-btn-edit" onClick={async()=>{const d=await api.get(`/restauration/recettes/${r.id}`);setModal({type:'rec',data:d.data.data});}}>✎</button>
                        {perms.canDelete && <button className="rs-btn-sm rs-btn-del" onClick={async()=>{if(confirm('Supprimer ?')){await api.delete(`/restauration/recettes/${r.id}`);load();}}}>✕</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* INVENTAIRE */}
      {tab==='inventaire'&&(
        <div>
          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
            <select className="rs-select" value={matFilter} onChange={e=>setMatFilter(e.target.value)}>
              <option value="">Tout afficher</option>
              {Object.entries(CAT_MAT).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              <option disabled>────────</option>
              {Object.entries(ETAT_MAT).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            {perms.canWrite && <button className="rs-btn-primary" onClick={()=>{setEditMat(null);setMatForm({nom:'',categorie:'ustensile',quantite:1,etat:'bon',notes:''});setShowMatForm(true);}}>+ Ajouter matériel</button>}
          </div>
          {showMatForm&&(
            <div style={{background:'var(--bg-card)',border:'1px solid rgba(201,168,76,.2)',borderRadius:12,padding:'16px 20px',marginBottom:16}}>
              <div style={{fontSize:'.6rem',letterSpacing:'.15em',color:'var(--gold-main)',textTransform:'uppercase',marginBottom:12}}>
                {editMat?'✎ Modifier':'+ Nouveau'} matériel
              </div>
              <div className="rs-field-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
                <div className="rs-field"><label>Nom *</label>
                  <input className="rs-input" value={matForm.nom} onChange={e=>setMatForm(f=>({...f,nom:e.target.value}))} placeholder="Ex: Marmite 20L"/>
                </div>
                <div className="rs-field"><label>Catégorie</label>
                  <select className="rs-input" value={matForm.categorie} onChange={e=>setMatForm(f=>({...f,categorie:e.target.value}))}>
                    {Object.entries(CAT_MAT).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div className="rs-field"><label>Quantité</label>
                  <input type="number" min="0" className="rs-input" value={matForm.quantite} onChange={e=>setMatForm(f=>({...f,quantite:parseInt(e.target.value)||0}))}/>
                </div>
                <div className="rs-field"><label>État</label>
                  <select className="rs-input" value={matForm.etat} onChange={e=>setMatForm(f=>({...f,etat:e.target.value}))}>
                    {Object.entries(ETAT_MAT).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="rs-field" style={{marginTop:8}}><label>Notes</label>
                <input className="rs-input" value={matForm.notes} onChange={e=>setMatForm(f=>({...f,notes:e.target.value}))}/>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:10}}>
                <button className="rs-btn-cancel" onClick={()=>setShowMatForm(false)}>Annuler</button>
                <button className="rs-btn-confirm" onClick={saveMat} disabled={!matForm.nom}>✓ Enregistrer</button>
              </div>
            </div>
          )}
          {matAff.length===0
            ? <div className="rs-empty"><div style={{fontSize:'2rem'}}>📦</div>Aucun matériel</div>
            : <div className="rs-table-wrap">
                <table className="rs-table">
                  <thead><tr>{['Matériel','Catégorie','Quantité','État','Notes','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {matAff.map(m=>{
                      const c=CAT_MAT[m.categorie]||CAT_MAT.autre;
                      const e=ETAT_MAT[m.etat]||ETAT_MAT.bon;
                      return(
                        <tr key={m.id}>
                          <td style={{fontWeight:700,color:'var(--text-primary)'}}>{m.nom}</td>
                          <td style={{color:'var(--text-muted)',fontSize:'.75rem'}}>{c.icon} {c.label}</td>
                          <td style={{fontWeight:700,color:'var(--gold-bright)',fontSize:'1rem'}}>{m.quantite}</td>
                          <td><span className="rs-badge" style={{color:e.color,background:e.bg}}>{e.label}</span></td>
                          <td style={{fontSize:'.7rem',color:'var(--text-muted)'}}>{m.notes||'—'}</td>
                          <td>
                            <div style={{display:'flex',gap:5}}>
                              <button className="rs-btn-sm rs-btn-edit" onClick={()=>{setEditMat(m);setMatForm({nom:m.nom,categorie:m.categorie,quantite:m.quantite,etat:m.etat,notes:m.notes||''});setShowMatForm(true);}}>✎</button>
                              {perms.canDelete && <button className="rs-btn-sm rs-btn-del" onClick={async()=>{if(confirm('Supprimer ?')){await api.delete(`/restauration/materiel/${m.id}`);load();}}}>✕</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {modal?.type==='evt'&&<ModalEvenement evt={modal.data} onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Événement enregistré');}}/>}
      {modal?.type==='rec'&&<ModalRecette recette={modal.data} onClose={()=>setModal(null)} onDone={()=>{load();notify('✅ Recette enregistrée');}}/>}
      {calcRec&&<Calculateur recette={calcRec} onClose={()=>setCalcRec(null)}/>}
      {detailEvt&&<DetailEvenement evt={detailEvt} recettes={recettes} onClose={()=>setDetailEvt(null)} onRefresh={load} onToast={notify}/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}
    </div>
  );
}
