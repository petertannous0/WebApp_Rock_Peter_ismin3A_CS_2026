import { Link } from 'react-router';

export const NotFoundPage = () => {
  return (
    <section className="page not-found">
      <h2>Page introuvable</h2>
      <p>Cette adresse ne correspond à aucune page.</p>
      <Link to="/">Retour à l'accueil</Link>
    </section>
  );
};
