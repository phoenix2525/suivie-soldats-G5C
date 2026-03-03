import { useState } from 'react';
import { usePDF } from '../hooks/usePDF';

export default function PDFButton({ url, filename, label='📄 PDF', variant='gold', size='md', style={} }) {
  const [loading, setLoading] = useState(false);
  const { download } = usePDF();

  const COLORS = {
    gold:  { bg:'rgba(201,168,76,.1)',  border:'rgba(201,168,76,.3)',  color:'#C9A84C'  },
    blue:  { bg:'rgba(96,165,250,.1)',  border:'rgba(96,165,250,.3)',  color:'#60a5fa'  },
    green: { bg:'rgba(52,211,153,.1)',  border:'rgba(52,211,153,.3)',  color:'#34d399'  },
    red:   { bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.3)',   color:'#ef4444'  },
    purple:{ bg:'rgba(167,139,250,.1)', border:'rgba(167,139,250,.3)', color:'#a78bfa'  },
  };
  const c = COLORS[variant] || COLORS.gold;
  const pad = size === 'sm' ? '5px 12px' : '8px 18px';
  const fs  = size === 'sm' ? '.68rem'   : '.75rem';

  const handle = async () => {
    if (loading) return;
    setLoading(true);
    await download(url, filename);
    setLoading(false);
  };

  return (
    <button onClick={handle} disabled={loading} title={`Télécharger ${filename}`} style={{
      background:c.bg, border:`1px solid ${c.border}`, color:c.color,
      borderRadius:8, padding:pad, fontSize:fs, fontWeight:700,
      cursor:loading?'wait':'pointer', display:'inline-flex',
      alignItems:'center', gap:6, transition:'all .2s',
      letterSpacing:'.05em', whiteSpace:'nowrap', flexShrink:0,
      opacity:loading?.7:1, ...style
    }}>
      <span style={loading?{animation:'spin 1s linear infinite',display:'inline-block'}:{}}>
        {loading?'⏳':'📄'}
      </span>
      {loading?'Génération…':label}
    </button>
  );
}
