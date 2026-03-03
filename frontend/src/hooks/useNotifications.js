import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [connected,     setConnected]     = useState(false);

  const fetchOnce = useCallback(async () => {
    try {
      const r = await api.get('/notifications');
      if (r.data?.success) setNotifications(r.data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchOnce();
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api','') || 'https://g5c-backend.onrender.com', { transports: ['websocket'] });
    socket.on('connect',       () => setConnected(true));
    socket.on('disconnect',    () => setConnected(false));
    socket.on('notifications', (data) => {
      if (data?.success) setNotifications(data.data || []);
    });
    return () => socket.disconnect();
  }, [fetchOnce]);

  return { notifications, count: notifications.length, connected };
}
