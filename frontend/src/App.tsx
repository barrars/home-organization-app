import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoomsProvider } from './contexts/RoomsContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RoomPage from './pages/RoomPage';
import Dumpster from './pages/Dumpster';
import SearchResults from './pages/SearchResults';

const App: React.FC = () => (
  <BrowserRouter>
    <RoomsProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="rooms/:roomId" element={<RoomPage />} />
          <Route path="dumpster" element={<Dumpster />} />
          <Route path="search" element={<SearchResults />} />
        </Route>
      </Routes>
    </RoomsProvider>
  </BrowserRouter>
);

export default App;
