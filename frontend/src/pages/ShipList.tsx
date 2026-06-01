import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShips, deleteShip } from "../api/ships";
import { Link } from "react-router-dom";
import type { Ship } from "../types";

export default function ShipList() {
  const { data: ships = [], isLoading, error } = useQuery({ queryKey: ["ships"], queryFn: fetchShips });
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: deleteShip,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ships"] }),
  });

  if (isLoading) return <div style={{ color: "#94a3b8", padding: 24 }}>Loading ships…</div>;
  if (error) return (
    <div style={{ color: "#fca5a5", padding: 24, background: "#450a0a", margin: 24, borderRadius: 8 }}>
      Failed to load ships. Is the backend running?<br />
      <code style={{ fontSize: 11 }}>{String(error)}</code>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Ship Registry</h1>
        <Link to="/ships/new" style={{ background: "#1d4ed8", color: "#fff", padding: "8px 18px", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>
          + New Ship
        </Link>
      </div>

      {ships.length === 0 && (
        <div style={{ textAlign: "center", color: "#475569", marginTop: 80, fontSize: 16 }}>
          No ships yet. <Link to="/ships/new" style={{ color: "#3b82f6" }}>Build your first ship →</Link>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {ships.map((ship: Ship) => (
          <div key={ship.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column" }}>
            {ship.image_url && (
              <img src={ship.image_url} alt={ship.name} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6, marginBottom: 10 }} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{ship.name}</h2>
              <span style={{ fontSize: 11, background: "#1e293b", color: "#64748b", borderRadius: 4, padding: "2px 6px" }}>TL{ship.tech_level}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 10, fontSize: 12, color: "#64748b" }}>
              <span>Hull: {ship.hull_tons}t {ship.hull_config !== "standard" ? `(${ship.hull_config})` : ""}</span>
              <span>HP: {ship.hull_points}</span>
              <span>Thrust: {ship.m_drive_rating}-G</span>
              <span>Jump: {ship.j_drive_rating > 0 ? `J-${ship.j_drive_rating}` : "None"}</span>
              <span>Armour: {ship.armor_value > 0 ? `${ship.armor_value} (${ship.armor_type.replace(/_/g, " ")})` : "None"}</span>
              <span>Sensors: DM{ship.sensor_dm >= 0 ? "+" : ""}{ship.sensor_dm}</span>
              <span>Weapons: {ship.weapons.length}</span>
              <span>Crew: {
                ship.crew_captain + ship.crew_pilot + ship.crew_astrogator + ship.crew_engineer +
                ship.crew_gunners + ship.crew_marines
              }+</span>
            </div>

            {ship.weapons.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
                {ship.weapons.slice(0, 3).map((w, i) => (
                  <span key={i} style={{ marginRight: 6 }}>
                    {w.count > 1 ? `${w.count}× ` : ""}{w.name}
                  </span>
                ))}
                {ship.weapons.length > 3 && <span>+{ship.weapons.length - 3} more</span>}
              </div>
            )}

            {ship.description && (
              <p style={{ fontSize: 12, color: "#475569", margin: "8px 0 0" }}>{ship.description}</p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 }}>
              <Link to={`/ships/${ship.id}/edit`}
                style={{ flex: 1, textAlign: "center", background: "#1e40af", color: "#fff", padding: "7px 0", borderRadius: 5, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                Edit
              </Link>
              <button
                onClick={() => { if (window.confirm(`Delete ${ship.name}?`)) del.mutate(ship.id); }}
                style={{ background: "#450a0a", color: "#fca5a5", border: "none", borderRadius: 5, padding: "7px 12px", cursor: "pointer", fontSize: 13 }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
