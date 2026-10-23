import { Link } from 'react-router';

/** The top of every page: the title, back to the home page. */
export const Header = () => {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">
          <Link to="/">Soutenances de stage</Link>
        </h1>
        <p className="app-tagline">École d'ingénieurs de Castelmont, 3A</p>
      </div>
    </header>
  );
};
