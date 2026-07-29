import { Link, Outlet } from "react-router-dom";

// Navigation principale du tableau de bord (cas d'utilisation Administrateur/Directeur,
// document de conception section 2.1).
export default function Layout() {
  return (
    <div className="sm-layout">
      <aside className="sm-sidebar">
        <h1>SchoolManage</h1>
        <nav>
          <Link to="/">Tableau de bord</Link>
          <Link to="/establishments">Etablissements</Link>
          <Link to="/payments">Paiements &amp; recettes</Link>
          <Link to="/announcements">Annonces</Link>
        </nav>
      </aside>
      <main className="sm-content">
        <Outlet />
      </main>
    </div>
  );
}
