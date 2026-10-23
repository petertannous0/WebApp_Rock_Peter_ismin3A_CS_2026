import { Link } from 'react-router';

const TILES = [
  { to: '/admin/placement', title: 'Placement', text: 'Placer, déplacer les soutenances : chaque règle est vérifiée avant l’enregistrement' },
  { to: '/admin/session', title: 'Session', text: 'La semaine, les salles, leurs liens de visio, la fermeture du jeudi après-midi' },
  { to: '/admin/entreprises', title: 'Entreprises et tuteurs', text: 'Les entreprises et leurs tuteurs, sans compte' },
  { to: '/admin/enseignants', title: 'Enseignants', text: 'Les membres des jurys' },
  { to: '/admin/eleves', title: 'Élèves', text: 'Entreprise, tuteur entreprise, tuteur académique' },
  { to: '/admin/disponibilites', title: 'Disponibilités', text: 'Qui a saisi ses indisponibilités, et lesquelles' },
  { to: '/admin/comptes', title: 'Comptes', text: 'Créer les comptes des enseignants et des élèves' },
];

/** The administration's home, at /admin. */
export const AdminHomePage = () => {
  return (
    <section className="page">
      <h2>Tableau de bord</h2>
      <ul className="tiles">
        {TILES.map((tile) => (
          <li key={tile.to}>
            <Link className="tile" to={tile.to}>
              <strong>{tile.title}</strong>
              <span>{tile.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
