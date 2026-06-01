import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShips, deleteShip } from "../api/ships";
import { Link } from "react-router-dom";
import type { Ship } from "../types";

export default function ShipList() {
  const { data: ships = [], isLoading } = useQuery({ queryKey: ["ships"], queryFn: fetchShips });
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: deleteShip,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ships"] }),
  });

  if (isLoading) return <div style={{ color: "#94a3b8", padding: 24 }}>Loading ships…</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Ship Registry</h1>
        <Link to="/ships/new" style={{ background: "#1d4ed8", color: "#fff", padding: "8px 16px", borderRadius: 6, textDecoration: "none" }}>
          + New Ship
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {ships.map((ship: Ship) => (
          <div key={ship.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16 }}>
            {ship.image_url && (
              <img src={ship.image_url} alt={ship.name} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6, marginBottom: 10 }} />
            )}
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{ship.name}</h2>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
              {ship.hull_tons}t • Thrust {ship.thrust} • Jump-{ship.jump} • Armor {ship.armor}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              {ship.weapons.length} weapon{ship.weapons.length !== 1 ? "s" : ""}
              {" · "}
              Crew: {ship.crew_captain + ship.crew_pilot + ship.crew_engineer + ship.crew_gunners}
            </div>
            {ship.description && (
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{ship.description}</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Link to={`/ships/${ship.id}/edit`} style={{ flex: 1, textAlign: "center", background: "#1e40af", color: "#fff", padding: "6px 0", borderRadius: 5, textDecoration: "none", fontSize: 13 }}>
                Edit
              </Link>
              <button
                onClick={() => { if (confirm(`Delete ${ship.name}?`)) del.mutate(ship.id); }}
                style={{ background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {ships.length === 0 && (
        <div style={{ textAlign: "center", color: "#475569", marginTop: 60, fontSize: 16 }}>
          No ships yet. <Link to="/ships/new" style={{ color: "#3b82f6" }}>Build your first ship →</Link>
        </div>
      )}
    </div>
  );
}
