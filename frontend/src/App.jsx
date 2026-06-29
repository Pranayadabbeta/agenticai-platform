import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ICPConfigPage from './pages/ICPConfigPage';
import PipelineViewPage from './pages/PipelineViewPage';
import CompanyIntelligencePage from './pages/CompanyIntelligencePage';
import PersonaPage from './pages/PersonaPage';
import HITLApprovalPage from './pages/HITLApprovalPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/icp" element={<ICPConfigPage />} />
          <Route path="/pipeline/:workflowId" element={<PipelineViewPage />} />
          <Route path="/companies" element={<CompanyIntelligencePage />} />
          <Route path="/personas" element={<PersonaPage />} />
          <Route path="/approval/:workflowId" element={<HITLApprovalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
