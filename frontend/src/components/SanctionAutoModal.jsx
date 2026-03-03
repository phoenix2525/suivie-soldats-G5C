import { useState } from 'react';
import api from '../utils/api';

const TYPES = ['Avertissement','Blâme','Consigne','Arrêts','Mise à pied','Exclusion temporaire'];
const SEVERITES = [
  {v:'mineure',    l:'Mineure',    color:'#60a5fa'},
  {v:'moyenne',    l:'Moyenne',    color:'#f59e0b'},
  {v:'grave',      l:'Grave',      color:'#ef4444'},
  {v:'tres_grave', l:'Très grave', color:'#dc2626'},
];

export default function SanctionAutoModal({ soldier, onClose, onSuccess }) {
  const [form, setForm] = useState({
    type_sanction:'Avertissement', severite:'moyenne',
    motif:'', faits:'', date_sanction:new Date().toISOString().slice(0,10)
  });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const submit = async () => {
    if (!form.motif.trim()) return alert('Le motif est obligatoire');
    setLoading(true);
    try {
      const r = await api.post('/pdf/sanction-auto', {
        soldier_id: soldier.id, ...form
      });
      setResult(r.data);
      onSuccess && onSuccess(r.data);
    } catch(e) {
      alert('Erreur : ' + (e.response?.data?.error || e.message));
    }
    setLoading(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:9999,padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#0d0e12',border:'1px solid rgba(239,68,68,.25)',borderRadius:16,
        width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',
        boxShadow:'0 24px 80px rgba(0,0,0,.6)'}}>

        {/* Header */}
        <div style={{padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,.07)',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.75rem',letterSpacing:'.2em',
              color:'#ef4444',textTransform:'uppercase'}}>⚖️ Sanction Automatique</div>
            <div style={{fontSize:'.85rem',fontWeight:700,color:'var(--text-primary)',marginTop:3}}>
              {soldier.prenom} {soldier.nom} · {soldier.matricule}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',
            color:'var(--text-muted)',cursor:'pointer',fontSize:'1.1rem'}}>✕</button>
        </div>

        {result ? (
          /* Résultat */
          <div style={{padding:24,textAlign:'center'}}>
            <div style={{fontSize:'3rem',marginBottom:12}}>✅</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.85rem',color:'#34d399',marginBottom:8}}>
              Sanction prononcée avec succès
            </div>
            <div style={{fontSize:'.82rem',color:'var(--text-secondary)',lineHeight:1.8}}>
              📧 <strong style={{color:'var(--text-primary)'}}>{result.data?.emails_sent}</strong> notifications envoyées<br/>
              📄 PDF joint à l'email du soldat concerné<br/>
              🔕 CRICs exclus des notifications
            </div>
            <button onClick={onClose} style={{marginTop:20,background:'rgba(52,211,153,.1)',
              border:'1px solid rgba(52,211,153,.3)',color:'#34d399',borderRadius:8,
              padding:'10px 24px',cursor:'pointer',fontWeight:700,fontSize:'.78rem'}}>
              Fermer
            </button>
          </div>
        ) : (
          /* Formulaire */
          <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>

            {/* Avertissement */}
            <div style={{background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)',
              borderRadius:10,padding:'12px 16px',fontSize:'.72rem',color:'#f87171',lineHeight:1.6}}>
              ⚠️ Cette action va créer une sanction officielle, générer un PDF et envoyer
              une notification par email à <strong>tous les soldats actifs</strong>
              (CRICs exclus). Cette action est irréversible.
            </div>

            {/* Type + Sévérité */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={{fontSize:'.65rem',letterSpacing:'.15em',color:'var(--text-muted)',
                  textTransform:'uppercase',display:'block',marginBottom:5}}>Type</label>
                <select value={form.type_sanction} onChange={e=>setForm(f=>({...f,type_sanction:e.target.value}))}
                  style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
                    borderRadius:8,padding:'9px 12px',color:'var(--text-primary)',fontSize:'.78rem',outline:'none'}}>
                  {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'.65rem',letterSpacing:'.15em',color:'var(--text-muted)',
                  textTransform:'uppercase',display:'block',marginBottom:5}}>Sévérité *</label>
                <select value={form.severite} onChange={e=>setForm(f=>({...f,severite:e.target.value}))}
                  style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
                    borderRadius:8,padding:'9px 12px',color:'var(--text-primary)',fontSize:'.78rem',outline:'none'}}>
                  {SEVERITES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label style={{fontSize:'.65rem',letterSpacing:'.15em',color:'var(--text-muted)',
                textTransform:'uppercase',display:'block',marginBottom:5}}>Date</label>
              <input type="date" value={form.date_sanction}
                onChange={e=>setForm(f=>({...f,date_sanction:e.target.value}))}
                style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:8,padding:'9px 12px',color:'var(--text-primary)',fontSize:'.78rem',outline:'none'}}/>
            </div>

            {/* Motif */}
            <div>
              <label style={{fontSize:'.65rem',letterSpacing:'.15em',color:'var(--text-muted)',
                textTransform:'uppercase',display:'block',marginBottom:5}}>Motif * (affiché dans l'email)</label>
              <input value={form.motif} onChange={e=>setForm(f=>({...f,motif:e.target.value}))}
                placeholder="Ex: Absence injustifiée à la cérémonie du 01/03/2026"
                style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:8,padding:'9px 12px',color:'var(--text-primary)',fontSize:'.78rem',outline:'none'}}/>
            </div>

            {/* Faits */}
            <div>
              <label style={{fontSize:'.65rem',letterSpacing:'.15em',color:'var(--text-muted)',
                textTransform:'uppercase',display:'block',marginBottom:5}}>Faits reprochés (détail PDF)</label>
              <textarea value={form.faits} onChange={e=>setForm(f=>({...f,faits:e.target.value}))}
                placeholder="Détail des faits pour le rapport officiel..."
                rows={3}
                style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:8,padding:'9px 12px',color:'var(--text-primary)',fontSize:'.78rem',
                  outline:'none',resize:'vertical',fontFamily:'inherit'}}/>
            </div>

            {/* Footer */}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:8,
              borderTop:'1px solid rgba(255,255,255,.06)'}}>
              <button onClick={onClose} style={{background:'rgba(255,255,255,.04)',
                border:'1px solid rgba(255,255,255,.1)',color:'var(--text-muted)',
                borderRadius:8,padding:'9px 20px',cursor:'pointer',fontSize:'.78rem',fontWeight:600}}>
                Annuler
              </button>
              <button onClick={submit} disabled={loading||!form.motif.trim()}
                style={{background:loading||!form.motif.trim()?'rgba(239,68,68,.2)':'rgba(239,68,68,.15)',
                  border:'1px solid rgba(239,68,68,.4)',color:'#f87171',
                  borderRadius:8,padding:'9px 24px',cursor:loading?'wait':'pointer',
                  fontSize:'.78rem',fontWeight:700,opacity:!form.motif.trim()?.5:1}}>
                {loading?'⏳ Envoi en cours…':'⚖️ PRONONCER LA SANCTION'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
