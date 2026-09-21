import React from 'react';
import AdminLayout from './AdminLayout';

export default function AdminDashboard({ user, onLogout }) {
  return <AdminLayout user={user} onLogout={onLogout} />;
}
