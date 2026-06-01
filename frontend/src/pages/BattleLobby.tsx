import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchShips } from "../api/ships";
import { fetchBattles, createBattle, createFleet } from "../api/combat";
import type { Ship, Battle } from "../types";

export default function BattleLobby() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: ships = [] } = useQuery({ queryKey: ["ships"], queryFn: fetchShips });
  const { data: battles = [] } = useQuery({ queryKey: ["battles"], queryFn: fetchBattles });

  // Quick-battle setup: pick ships for each side
  const [sideA, setSideA] = useState<number[]>([]);
  const [sideB, setSideB] = useState<number[]>([]);
  const [battleName, setBattleName] = useState("New Battle");
  const [error, setError] = useState<string | null>(null);

  const startBattle = useMutation({
    mutationFn: async () => {
      if (sideA.length === 0 || sideB.length === 0)
        throw new Error("Each side needs at least one ship.");

      // Create fleets
      const fleetA = await createFleet({
        name: `${battleName} — Side A`,
        members: sideA.map(id => ({ ship_id: id, count: 1 })),
      });
      const fleetB = await createFleet({
        name: `${battleName} — Side B`,
        members: sideB.map(id => ({ ship_id: id, count: 1 })),
      });
      return createBattle({ name: battleName, fleet_a_id: fleetA.id, fleet_b_id: fleetB.id });
    },
    onSuccess: (battle) => {
      qc.invalidateQueries({ queryKey: ["battles"] });
      navigate(`/battle/${battle.id}`);
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
  });

  function toggleShip(side: "a" | "b", id: number) {
    if (side === "a") {
      setSideA(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
      setSideB(s => s.filter(x => x !== id)); // can't be on both sides
    } else {
      setSideB(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
      setSideA(s => s.filter(x => x !== id));
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#e2e8f0" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Battle Setup</h1>
      <p style={{ color: "#475569", fontSize: 13, marginBottom: 20 }}>
        Assign ships to each side, then launch the battle.
      </p>

      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #b91c1c", borderRadius: 8,
          padding: "10px 14px", marginBottom: 14, color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Battle name */}
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
        Battle Name
        <input value={battleName} onChange={e => setBattleName(e.target.value)}
          style={inputStyle} />
      </label>

      {/* Ship picker */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {(["a", "b"] as const).map(side => (
          <div key={side} style={{ background: "#0f172a", border: `1px solid ${side === "a" ? "#1d4ed8" : "#b91c1c"}`, borderRadius: 10, padding: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: side === "a" ? "#60a5fa" : "#f87171", marginBottom: 10, marginTop: 0 }}>
              Side {side.toUpperCase()} {side === "a" ? "🔵" : "🔴"}
              <span style={{ fontWeight: 400, fontSize: 12, color: "#475569", marginLeft: 8 }}>
                {(side === "a" ? sideA : sideB).length} ship(s)
              </span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
              {ships.map((ship: Ship) => {
                const onThisSide = (side === "a" ? sideA : sideB).includes(ship.id);
                const onOtherSide = (side === "a" ? sideB : sideA).includes(ship.id);
                return (
                  <button key={ship.id} onClick={() => toggleShip(side, ship.id)}
                    disabled={onOtherSide}
                    style={{
                      background: onThisSide ? (side === "a" ? "#1e3a8a" : "#7f1d1d") : "#1e293b",
                      border: `1px solid ${onThisSide ? (side === "a" ? "#3b82f6" : "#ef4444") : "#334155"}`,
                      borderRadius: 6, padding: "8px 10px", cursor: onOtherSide ? "not-allowed" : "pointer",
                      opacity: onOtherSide ? 0.3 : 1, textAlign: "left", color: "#e2e8f0",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{ship.name}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>TL{ship.tech_level}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {ship.hull_tons}t · Thrust {ship.m_drive_rating} · Armour {ship.armor_value} · {ship.weapons.length} weapon(s)
                    </div>
                  </button>
                );
              })}
              {ships.length === 0 && (
                <div style={{ color: "#334155", fontSize: 13, padding: 8 }}>No ships in registry yet.</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => startBattle.mutate()}
        disabled={startBattle.isPending || sideA.length === 0 || sideB.length === 0}
        style={{ ...btnPrimary, width: "100%", fontSize: 16, padding: "12px 0",
          background: sideA.length > 0 && sideB.length > 0 ? "#dc2626" : "#1e293b" }}>
        {startBattle.isPending ? "Creating battle…" : "⚔️  Launch Battle"}
      </button>

      {/* Previous battles */}
      {battles.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#93c5fd", marginBottom: 12 }}>Previous Battles</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...battles].reverse().map((b: Battle) => (
              <div key={b.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
                padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{b.name}</span>
                  <span style={{ fontSize: 12, color: "#475569", marginLeft: 10 }}>Round {b.current_round}</span>
                </div>
                <button onClick={() => navigate(`/battle/${b.id}`)}
                  style={{ ...btnPrimary, padding: "5px 14px", fontSize: 12 }}>
                  Resume →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
  color: "#e2e8f0", padding: "7px 10px", fontSize: 14, width: "100%", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6,
  padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
};
