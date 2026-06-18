import { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar, Header, MainContent } from './components/Layout';

// Pages
import ProvinceSelect from './pages/ProvinceSelect';
import Dashboard from './pages/Dashboard';
import FarmerList from './pages/farmers/FarmerList';
import FarmerDetail from './pages/farmers/FarmerDetail';
import DrillDown from './pages/farmers/DrillDown';
import FarmList from './pages/farms/FarmList';
import FarmDetail from './pages/farms/FarmDetail';
import EUDRList from './pages/eudr/EUDRList';
import EUDRCompliance from './pages/eudr/EUDRCompliance';
import FarmerQuest from './pages/farmers/FarmerQuest';
import FieldQuest from './pages/farms/FieldQuest';
import TradeList from './pages/trade/TradeList';
import SupportList from './pages/support/SupportList';
import TrainingList from './pages/training/TrainingList';
import PersonnelList from './pages/personnel/PersonnelList';
import BudgetList from './pages/budget/BudgetList';
import SocialList from './pages/social/SocialList';
import FormList from './pages/forms/FormList';
import ImportExport from './pages/forms/ImportExport';
import GeographyList from './pages/geography/GeographyList';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import SettingsPage from './pages/settings/SettingsPage';

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? '' : 'hidden'}`}
        onClick={() => setMobileOpen(false)}
      />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <MainContent>
          <Outlet />
        </MainContent>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing: Province Selection (root URL) */}
        <Route path="/" element={<ProvinceSelect />} />

        {/* Auth pages (no sidebar layout) */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

        {/* Main app layout (after province selected) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/geography" element={<GeographyList />} />
          <Route path="/farmers" element={<FarmerList />} />
          <Route path="/farmers/:id" element={<FarmerDetail />} />
          <Route path="/drill/:partner" element={<DrillDown />} />
          <Route path="/farms" element={<FarmList />} />
          <Route path="/farms/:id" element={<FarmDetail />} />
          <Route path="/eudr" element={<EUDRList />} />
          <Route path="/eudr-compliance" element={<EUDRCompliance />} />
          <Route path="/farmer-quest" element={<FarmerQuest />} />
          <Route path="/field-quest" element={<FieldQuest />} />
          <Route path="/trade" element={<TradeList />} />
          <Route path="/support" element={<SupportList />} />
          <Route path="/training" element={<TrainingList />} />
          <Route path="/personnel" element={<PersonnelList />} />
          <Route path="/budget" element={<BudgetList />} />
          <Route path="/social" element={<SocialList />} />
          <Route path="/forms" element={<FormList />} />
          <Route path="/import" element={<ImportExport />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
