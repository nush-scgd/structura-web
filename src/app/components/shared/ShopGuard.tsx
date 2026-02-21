import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { db } from '../../../lib/db';

export function ShopGuard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    db.getPlatformSettings().then(s => setEnabled(s.shopEnabled));
  }, []);

  if (enabled === null) return null; // Loading

  if (!enabled) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}