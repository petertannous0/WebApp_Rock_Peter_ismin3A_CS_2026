import { Link } from 'react-router';

/** The administration's home, at /admin. Its tiles grow with each feature. */
export const AdminHomePage = () => {
  return (
    <section className="page">
      <h2>Tableau de bord</h2>
      <ul className="tiles">
        <li>
          <Link className="tile" to="/admin/comptes">
            <strong>Comptes</strong>
            <span>Créer les comptes des enseignants et des élèves</span>
          </Link>
        </li>
      </ul>
    </section>
  );
};
