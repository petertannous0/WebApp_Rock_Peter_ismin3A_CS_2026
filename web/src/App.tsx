import { Route, Routes } from 'react-router';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/** The frame of every page: the header, then the page of the current URL. */
const App = () => {
  return (
    <main className="app">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
};

export default App;
