import React, { useState, useEffect } from 'react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      fetchNotifications();
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: '16px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontSize: '20px' }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white',
            borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '40px', right: '0', width: '320px', background: '#2C2D30',
          border: '1px solid #444', borderRadius: '8px', zIndex: 1000, color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '400px', overflowY: 'auto'
        }}>
          <h4 style={{ margin: 0, padding: '12px', borderBottom: '1px solid #444' }}>Thông báo</h4>
          {notifications.length === 0 ? (
            <p style={{ padding: '12px', textAlign: 'center', color: '#aaa', margin: 0 }}>Không có thông báo mới</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifications.map(n => (
                <li key={n.id} style={{ 
                  padding: '12px', borderBottom: '1px solid #444', 
                  backgroundColor: n.isRead ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                  cursor: n.isRead ? 'default' : 'pointer'
                }} onClick={() => !n.isRead && handleMarkAsRead(n.id)}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{n.title}</div>
                  <div style={{ fontSize: '13px', color: '#ccc' }}>{n.message}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
