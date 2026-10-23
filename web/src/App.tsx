import { Route, Routes } from 'react-router';
import { RequireRole } from './auth/RequireRole';
import { Header } from './components/Header';
import { AccountsPage } from './pages/admin/AccountsPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { StudentHomePage } from './pages/student/StudentHomePage';
import { TeacherHomePage } from './pages/teacher/TeacherHomePage';

/**
 * The frame of every page: the header, then the page of the current URL.
 * One area per role: /admin, /enseignant, /eleve, each guarded by RequireRole.
 */
const App = () => {
  return (
    <main className="app">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/admin" element={<RequireRole roles={['ADMIN']}><AdminHomePage /></RequireRole>} />
        <Route path="/admin/comptes" element={<RequireRole roles={['ADMIN']}><AccountsPage /></RequireRole>} />

        <Route path="/enseignant" element={<RequireRole roles={['ENSEIGNANT']}><TeacherHomePage /></RequireRole>} />

        <Route path="/eleve" element={<RequireRole roles={['ELEVE']}><StudentHomePage /></RequireRole>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
};

export default App;
