import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { DocumentsListPage } from './pages/DocumentsListPage';
import { DocumentReviewPage } from './pages/DocumentReviewPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { TimelinePage } from './pages/TimelinePage';
import { MedicationsPage } from './pages/MedicationsPage';
import { WellnessPage } from './pages/WellnessPage';
import { AssistantPage } from './pages/AssistantPage';
import { FhirAbhaPage } from './pages/FhirAbhaPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="documents" element={<DocumentsListPage />} />
            <Route path="documents/:id" element={<DocumentReviewPage />} />
            <Route path="comparison" element={<ComparisonPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="medications" element={<MedicationsPage />} />
            <Route path="wellness" element={<WellnessPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="fhir-abha" element={<FhirAbhaPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
