/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserRole, Station, Alert } from './types';
import { MOCK_STATIONS, getStationById, MOCK_ALERTS } from './data/mockData';
import { ApiService } from './services/api';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { PassengerHomeView } from './views/PassengerHomeView';
import { MapView } from './views/MapView';
import { StationDetailView } from './views/StationDetailView';
import { ControlRoomView } from './views/ControlRoomView';
import { PredictionsView } from './views/PredictionsView';
import { MethodologyView } from './views/MethodologyView';
import { LoginView } from './views/LoginView';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('passenger');
  const [activeRoute, setActiveRoute] = useState<string>('/home');
  const [selectedStation, setSelectedStation] = useState<Station>(() => getStationById('dadar'));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stationsList, setStationsList] = useState<Station[]>(MOCK_STATIONS);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>(MOCK_ALERTS);

  useEffect(() => {
    const initApp = async () => {
      try {
        const [stnRes, alertRes] = await Promise.all([
          ApiService.getStations(),
          ApiService.getAlerts({ resolved: false })
        ]);
        setStationsList(stnRes.stations);
        setActiveAlerts(alertRes.alerts);
      } catch (e) {
        console.warn('App init backend load failed:', e);
      }
    };
    initApp();
  }, []);

  // Handle station selection and synchronize route if viewing station
  const handleSelectStation = (station: Station) => {
    setSelectedStation(station);
  };

  const handleRouteChange = (route: string) => {
    if (route.startsWith('/station/')) {
      const stationId = route.split('/station/')[1];
      const found = stationsList.find(s => s.id === stationId) || getStationById(stationId);
      if (found) {
        setSelectedStation(found);
      }
    } else if (route === '/platforms') {
      // Ensure we maintain the current selected station or default to dadar
      if (!selectedStation) {
        setSelectedStation(stationsList.find(s => s.id === 'dadar') || getStationById('dadar'));
      }
    }
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter stations based on header search if active
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.trim().length > 1) {
      const found = stationsList.find((s) =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        (s.marathiName && s.marathiName.includes(q))
      );
      if (found && activeRoute.startsWith('/station')) {
        setSelectedStation(found);
      }
    }
  };

  // Render the current route view
  const renderCurrentView = () => {
    if (activeRoute === '/home') {
      return (
        <PassengerHomeView
          selectedStation={selectedStation}
          onSelectStation={handleSelectStation}
          onRouteChange={handleRouteChange}
        />
      );
    }

    if (activeRoute === '/map') {
      return (
        <MapView
          selectedStation={selectedStation}
          onSelectStation={handleSelectStation}
          onRouteChange={handleRouteChange}
        />
      );
    }

    if (activeRoute === '/platforms' || activeRoute.startsWith('/station')) {
      return (
        <StationDetailView
          station={selectedStation}
          onSelectStation={handleSelectStation}
          onRouteChange={handleRouteChange}
        />
      );
    }

    if (activeRoute === '/control-room') {
      return (
        <ControlRoomView
          selectedStation={selectedStation}
          onSelectStation={handleSelectStation}
          onRouteChange={handleRouteChange}
        />
      );
    }

    if (activeRoute === '/predictions') {
      return (
        <PredictionsView
          selectedStation={selectedStation}
          onSelectStation={handleSelectStation}
          onRouteChange={handleRouteChange}
        />
      );
    }

    if (activeRoute === '/methodology') {
      return <MethodologyView onRouteChange={handleRouteChange} />;
    }

    if (activeRoute === '/login') {
      return (
        <LoginView
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onRouteChange={handleRouteChange}
        />
      );
    }

    // Fallback to Home
    return (
      <PassengerHomeView
        selectedStation={selectedStation}
        onSelectStation={handleSelectStation}
        onRouteChange={handleRouteChange}
      />
    );
  };

  const criticalAlertsCount = activeAlerts.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* Sticky Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeRoute={activeRoute}
        onRouteChange={handleRouteChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        criticalAlertsCount={criticalAlertsCount}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Navigation Sidebar */}
        <Sidebar
          currentRole={currentRole}
          activeRoute={activeRoute}
          onRouteChange={handleRouteChange}
          selectedStationId={selectedStation.id}
          className="hidden md:flex"
        />

        {/* Dynamic Route View Content Area */}
        <main id="main-content-viewport" className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoute + (activeRoute.startsWith('/station') ? selectedStation.id : '')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {renderCurrentView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentRole={currentRole}
        activeRoute={activeRoute}
        onRouteChange={handleRouteChange}
        selectedStationId={selectedStation.id}
      />
    </div>
  );
}
