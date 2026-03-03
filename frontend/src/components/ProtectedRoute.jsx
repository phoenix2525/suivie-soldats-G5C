import { Navigate, useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

export default function ProtectedRoute({ user, allowedRoles, children }) {
  const location = useLocation();
  const perms = usePermissions(user, location.pathname);

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied role={user.role} section={perms.sectionSlug} />;
  }

  return children;
}

function AccessDenied({ role, section }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'70vh', gap:20, fontFamily:"'Cinzel',serif",
    }}>
      <div style={{fontSize:'4rem', opacity:.3}}>🔒</div>
      <div style={{fontSize:'.6rem', letterSpacing:'.35em', color:'var(--gold-main)'}}>
        ACCÈS REFUSÉ · ZONE RESTREINTE
      </div>
      <div style={{fontSize:'2rem', fontWeight:800, color:'#ef4444', letterSpacing:'.1em'}}>
        ERREUR 403
      </div>
      <div style={{
        background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)',
        borderRadius:12, padding:'16px 28px', textAlign:'center', maxWidth:420,
      }}>
        <div style={{color:'#f87171', fontSize:'.8rem', marginBottom:8}}>
          Votre niveau d'accréditation ({role?.toUpperCase()}) ne vous autorise pas à accéder à cette zone.
        </div>
        {section && (
          <div style={{color:'var(--text-muted)', fontSize:'.7rem'}}>
            Votre section : <span style={{color:'var(--gold-main)'}}>{section}</span>
          </div>
        )}
      </div>
      <button onClick={()=>window.history.back()}
        style={{background:'none', border:'1px solid rgba(201,168,76,.3)', borderRadius:8,
          color:'var(--gold-main)', padding:'9px 20px', cursor:'pointer',
          fontFamily:"'Cinzel',serif", fontSize:'.65rem', letterSpacing:'.12em'}}>
        ◀ RETOUR
      </button>
    </div>
  );
}
