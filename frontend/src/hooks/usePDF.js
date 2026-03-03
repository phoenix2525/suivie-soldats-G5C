const API_BASE = 'import.meta.env.VITE_API_URL || 'https://g5c-backend.onrender.com/api'';

export const usePDF = () => {
  const download = async (url, filename) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur ' + res.status);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      return true;
    } catch(e) {
      alert('Erreur PDF : ' + e.message);
      return false;
    }
  };
  return { download };
};
