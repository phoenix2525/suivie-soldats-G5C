import { useState } from 'react';
import api from '../utils/api';

export default function PdfButton({ endpoint, filename, label = 'Télécharger PDF', variant = 'default', style = {} }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    default: {
      background: 'rgba(201,168,76,.1)',
      border: '1px solid rgba(201,168,76,.3)',
      color: 'var(--gold-main)',
    },
    danger: {
      background: 'rgba(239,68,68,.1)',
      border: '1px solid rgba(239,68,68,.3)',
      color: '#f87171',
    },
    success: {
      background: 'rgba(52,211,153,.1)',
      border: '1px solid rgba(52,211,153,.3)',
      color: '#34d399',
    },
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
        fontFamily: "'Cinzel', serif", fontSize: '.62rem', letterSpacing: '.1em',
        transition: 'all .2s', opacity: loading ? .6 : 1,
        ...styles[variant],
        ...style,
      }}
    >
      {loading ? '⏳' : '📄'} {loading ? 'Génération...' : label}
    </button>
  );
}
