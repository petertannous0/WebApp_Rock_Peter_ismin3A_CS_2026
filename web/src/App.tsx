import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { RequireRole } from './auth/RequireRole';
import { Header } from './components/Header';
import { ServiceDown } from './components/ServiceDown';
import { useApiHealth } from './components/useApiHealth';
import { AccountsPage } from './pages/admin/AccountsPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AvailabilityPage } from './pages/admin/AvailabilityPage';
import { CompaniesPage } from './pages/admin/CompaniesPage';
import { CompanyTutorsPage } from './pages/admin/CompanyTutorsPage';
import { PlacementPage } from './pages/admin/PlacementPage';
import { SessionPage } from './pages/admin/SessionPage';
import { StudentsPage } from './pages/admin/StudentsPage';
import { TeachersPage } from './pages/admin/TeachersPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { StudentHomePage } from './pages/student/StudentHomePage';
import { TeacherHomePage } from './pages/teacher/TeacherHomePage';

const admin = (page: ReactNode) => <RequireRole roles={['ADMIN']}>{page}</RequireRole>;

const App = () => {
  const health = useApiHealth();

  return (
    <main className="app">
      <Header />
      {health.down ? (
        <ServiceDown onRetry={health.retry} retrying={health.retrying} />
      ) : (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={admin(<AdminHomePage />)} />
          <Route path="/admin/placement" element={admin(<PlacementPage />)} />
          <Route path="/admin/tuteurs" element={admin(<CompanyTutorsPage />)} />
          <Route path="/admin/session" element={admin(<SessionPage />)} />
          <Route path="/admin/entreprises" element={admin(<CompaniesPage />)} />
          <Route path="/admin/enseignants" element={admin(<TeachersPage />)} />
          <Route path="/admin/eleves" element={admin(<StudentsPage />)} />
          <Route path="/admin/disponibilites" element={admin(<AvailabilityPage />)} />
          <Route path="/admin/comptes" element={admin(<AccountsPage />)} />

          <Route path="/enseignant" element={<RequireRole roles={['ENSEIGNANT']}><TeacherHomePage /></RequireRole>} />

          <Route path="/eleve" element={<RequireRole roles={['ELEVE']}><StudentHomePage /></RequireRole>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
    </main>
  );
};

export default App;
