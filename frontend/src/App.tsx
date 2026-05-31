import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RoomsProvider } from './contexts/RoomsContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import RoomPage from './pages/RoomPage';
import Dumpster from './pages/Dumpster';
import YardSale from './pages/YardSale';
import SearchResults from './pages/SearchResults';
import SharedWithMe from './pages/SharedWithMe';
import Notifications from './pages/Notifications';
import SharedView from './pages/SharedView';
import InvitePage from './pages/InvitePage';

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <RoomsProvider>
        <NotificationsProvider>
          <Routes>
            {/* Public routes — no auth required */}
            <Route path="share/:token" element={<SharedView />} />
            <Route path="invite/:token" element={<InvitePage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="rooms/:roomId" element={<RoomPage />} />
              <Route path="dumpster" element={<Dumpster />} />
              <Route path="yard-sale" element={<YardSale />} />
              <Route path="search" element={<SearchResults />} />
              <Route path="shared-with-me" element={<SharedWithMe />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
          </Routes>
        </NotificationsProvider>
      </RoomsProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
