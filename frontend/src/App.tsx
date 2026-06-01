import { BrowserRouter, Routes, Route, Link, NavLink, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ShipList from "./pages/ShipList";
import ShipBuilder from "./pages/ShipBuilder";
import BattleView from "./pages/BattleView";

const qc = new QueryClient();

function Nav() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? "#93c5fd" : "#64748b",
    textDecoration: "none" as const,
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    padding: "4px 0",
    borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
  });
  return (
    <nav style={{ background: "#020617", borderBottom: "1px solid #0f172a", padding: "0 24px", display: "flex", alignItems: "center", gap: 24, height: 48 }}>
      <Link to="/" style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 18, textDecoration: "none", letterSpacing: 1 }}>
        ✦ STARFIRE
      </Link>
      <NavLink to="/ships" style={linkStyle}>Ships</NavLink>
      <NavLink to="/ships/new" style={linkStyle}>Build Ship</NavLink>
      <NavLink to="/battle/1" style={linkStyle}>Battle</NavLink>
    </nav>
  );
}

function BattleViewWrapper() {
  const { id } = useParams();
  return <BattleView battleId={Number(id) || 1} />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div style={{ background: "#0a0f1e", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
          <Nav />
          <Routes>
            <Route path="/" element={<ShipList />} />
            <Route path="/ships" element={<ShipList />} />
            <Route path="/ships/new" element={<ShipBuilder />} />
            <Route path="/ships/:id/edit" element={<ShipBuilder />} />
            <Route path="/battle/:id" element={<BattleViewWrapper />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
