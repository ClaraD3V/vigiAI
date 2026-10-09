import { useAuth } from "../contexts/AuthContext";
import { useMonitorings } from "../hooks/useMonitorings";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { monitorings, loading, error } = useMonitorings();

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <h1>vigiAI</h1>
        <div>
          <span>{user?.email}</span>
          <button onClick={signOut}>Sair</button>
        </div>
      </nav>

      <main className="dashboard-main">
        <h2>Dashboard</h2>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <p>Carregando monitoramentos...</p>
        ) : monitorings.length === 0 ? (
          <p>Nenhum monitoramento ativo</p>
        ) : (
          <div className="monitorings-grid">
            {/* Placeholder para lista de monitoramentos */}
            <p>Monitoramentos carregados: {monitorings.length}</p>
          </div>
        )}
      </main>
    </div>
  );
}
