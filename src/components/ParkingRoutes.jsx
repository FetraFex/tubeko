import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import DashboardHome from './DashboardHome';
import DashboardSettings from './DashboardSettings';

const ParkingRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />}>
        <Route index element={<DashboardHome />} />  {/* Default route */}
        <Route path="settings" element={<DashboardSettings />} />
      </Route>
    </Routes>
  );
}

export default ParkingRoutes;
