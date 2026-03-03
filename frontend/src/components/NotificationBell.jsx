import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import './NotificationBell.css';

const TYPE_ICONS = {
  signalement: '⚠️', drapeau: '🚩', bat_music: '🎵',
  caporaux: '💪', info: 'ℹ️',
};

export default function NotificationBell({ user }) {
  const [notifs,   setNotifs]   = useState([]);
  const [open,     setOpen]     = useState(false);

  const unread = notifs.filter(n => !n.lu).length;

  const fetchNotifs = useCallback(async () => {
    try {
      const r = await api.get('/notifications');
      if (r.data?.success) setNotifs(r.data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000',
      { transports: ['websocket'] });
    socket.on('connect', () => { if (user?.id) socket.emit('join', user.id); });
    socket.on('notifications', data => { if (data?.success) setNotifs(data.data || []); });
    return () => socket.disconnect();
  }, [user?.id, fetchNotifs]);

  const handleMarkAll = async () => {
    await api.patch('/notifications/read-all');
    setNotifs(p => p.map(n => ({...n, lu:true})));
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`);
    setNotifs(p => p.filter(n => n.id !== id));
  };

  const handleRead = async (n) => {
    if (!n.lu) {
      await api.patch(`/notifications/${n.id}/read`);
      setNotifs(p => p.map(x => x.id===n.id ? {...x,lu:true} : x));
    }
  };

  const fmt = d => new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

  return (
    <div className="nb-wrap">
      <button className="nb-bell" onClick={() => setOpen(o => !o)}>
        🔔
        {unread > 0 && <span className="nb-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <>
          <div className="nb-backdrop" onClick={() => setOpen(false)} />
          <div className="nb-panel">
            <div className="nb-header">
              <span>Notifications {unread > 0 && <span className="nb-count">({unread} non lues)</span>}</span>
              {unread > 0 && <button className="nb-mark-all" onClick={handleMarkAll}>Tout lire</button>}
            </div>
            <div className="nb-list">
              {notifs.length === 0 && <div className="nb-empty">Aucune notification</div>}
              {notifs.map(n => (
                <div key={n.id} className={`nb-item ${n.lu ? 'read' : 'unread'}`} onClick={() => handleRead(n)}>
                  <div className="nb-item-icon">{TYPE_ICONS[n.type] || '🔔'}</div>
                  <div className="nb-item-body">
                    <div className="nb-item-titre">{n.titre}</div>
                    {n.corps && <div className="nb-item-corps">{n.corps}</div>}
                    <div className="nb-item-time">{fmt(n.created_at)}</div>
                  </div>
                  <button className="nb-item-del" onClick={e => handleDelete(n.id, e)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
