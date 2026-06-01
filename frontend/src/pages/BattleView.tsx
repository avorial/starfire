import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchBattle, resolveAttack } from "../api/combat";
import { fetchShips } from "../api/ships";
import HexCombatMap from "../components/HexCombatMap";
import type { RangeBand, BattleShipState, AttackResult } from "../types";
import { RANGE_BANDS } from "../types";

interface Props { battleId: number; }

export default function BattleView({ battleId }: Props) {
  const { data: battle } = useQuery({ queryKey: ["battle", battleId], queryFn: () => fetchBattle(battleId) });
  const { data: ships = [] } = useQuery({ queryKey: ["ships"], queryFn: fetchShips });

  const [selectedAttacker, setSelectedAttacker] = useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<number | null>(null);
  const [gunnerSkill, setGunnerSkill] = useState(1);
  const [lastResult, setLastResult] = useState<AttackResult | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // Local ship positions (start them on center and offset)
  const [positions, setPositions] = useState<Record<number, BattleShipState>>({});

  const attack = useMutation({
    mutationFn: resolveAttack,
    onSuccess: (result) => {
      setLastResult(result);
      const attacker = ships.find(s => s.id === selectedAttacker);
      const target = ships.find(s => s.id === selectedTarget);
      const weapon = attacker?.weapons.find(w => w.id === selectedWeapon);
      const entry = `Round ${battle?.current_round ?? "?"}: ${attacker?.name} fires ${weapon?.name} at ${target?.name} — ${result.hit ? `HIT! ${result.damage} damage${result.critical ? " CRITICAL!" : ""}` : "MISS"}`;
      setLog(l => [entry, ...l]);
    },
  });

  if (!battle) return <div style={{ color: "#94a3b8", padding: 24 }}>Loading battle…</div>;

  const hexShips = ships.map((ship, i) => ({
    ship,
    state: positions[ship.id] ?? { hull_remaining: ship.hull_points, thrust_remaining: ship.thrust, evasive: false, disabled: false, q: i % 2 === 0 ? -3 : 3, r: 0 },
    side: (i % 2 === 0 ? "a" : "b") as "a" | "b",
  }));

  const attacker = ships.find(s => s.id === selectedAttacker);
  const currentRange: RangeBand = (battle.state as any)?.range_band ?? "short";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, padding: 16, color: "#e2e8f0", height: "100vh", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{battle.name} — Round {battle.current_round}</h1>
          <div style={{ fontSize: 13, color: "#fbbf24" }}>Range: {currentRange.replace("_", " ")}</div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HexCombatMap
            ships={hexShips}
            selectedShipId={selectedAttacker ?? selectedTarget ?? undefined}
            onSelectShip={(id) => {
              if (!selectedAttacker) setSelectedAttacker(id);
              else if (id !== selectedAttacker) setSelectedTarget(id);
            }}
            onMoveShip={(shipId, q, r) => {
              setPositions(p => ({
                ...p,
                [shipId]: { ...(p[shipId] ?? hexShips.find(h => h.ship.id === shipId)!.state), q, r },
              }));
            }}
          />
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
        {/* Attack panel */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#93c5fd", marginBottom: 10 }}>Attack</h2>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            Click a ship to select attacker, then click target.
          </div>
          <label style={labelStyle}>
            Attacker: <b style={{ color: "#e2e8f0" }}>{attacker?.name ?? "—"}</b>
          </label>
          <label style={labelStyle}>
            Target: <b style={{ color: "#e2e8f0" }}>{ships.find(s => s.id === selectedTarget)?.name ?? "—"}</b>
          </label>
          {attacker && (
            <label style={{ ...labelStyle, flexDirection: "column", gap: 4 }}>
              Weapon
              <select value={selectedWeapon ?? ""} onChange={e => setSelectedWeapon(Number(e.target.value))} style={selectStyle}>
                <option value="">— select —</option>
                {attacker.weapons.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.weapon_type.replace(/_/g, " ")})</option>
                ))}
              </select>
            </label>
          )}
          <label style={{ ...labelStyle, flexDirection: "column", gap: 4 }}>
            Gunner Skill
            <input type="number" min={0} max={4} value={gunnerSkill}
              onChange={e => setGunnerSkill(Number(e.target.value))} style={selectStyle} />
          </label>
          <label style={{ ...labelStyle, flexDirection: "column", gap: 4 }}>
            Range Band
            <select value={currentRange} style={selectStyle} onChange={() => {}}>
              {RANGE_BANDS.map(b => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
            </select>
          </label>
          <button
            disabled={!selectedAttacker || !selectedTarget || !selectedWeapon || attack.isPending}
            onClick={() => attack.mutate({
              battle_id: battleId,
              attacker_ship_id: selectedAttacker!,
              target_ship_id: selectedTarget!,
              weapon_id: selectedWeapon!,
              gunner_skill: gunnerSkill,
              pilot_skill: 0,
              range_band: currentRange,
            })}
            style={{ width: "100%", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", cursor: "pointer", marginTop: 8 }}
          >
            Fire!
          </button>
          <button onClick={() => { setSelectedAttacker(null); setSelectedTarget(null); setSelectedWeapon(null); }}
            style={{ width: "100%", background: "#334155", color: "#fff", border: "none", borderRadius: 6, padding: "6px 0", cursor: "pointer", marginTop: 4, fontSize: 12 }}>
            Clear Selection
          </button>
        </div>

        {/* Last result */}
        {lastResult && (
          <div style={{ background: lastResult.hit ? "#052e16" : "#2d1b1b", border: `1px solid ${lastResult.hit ? "#16a34a" : "#7f1d1d"}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, color: lastResult.hit ? "#4ade80" : "#f87171", marginBottom: 6 }}>
              {lastResult.hit ? `HIT — ${lastResult.damage} Hull damage${lastResult.critical ? " + CRITICAL" : ""}` : "MISS"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Roll: 2d6={lastResult.attack_roll} + DM {lastResult.total_dm >= 0 ? "+" : ""}{lastResult.total_dm} = {lastResult.total}
            </div>
            {Object.entries(lastResult.breakdown).map(([k, v]) => (
              <div key={k} style={{ fontSize: 11, color: "#64748b" }}>
                {k.replace(/_/g, " ")}: {(v as number) >= 0 ? "+" : ""}{v as number}
              </div>
            ))}
          </div>
        )}

        {/* Combat log */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 14, flex: 1, overflow: "auto" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#93c5fd", marginBottom: 8 }}>Combat Log</h2>
          {log.length === 0 && <div style={{ fontSize: 12, color: "#475569" }}>No actions yet.</div>}
          {log.map((entry, i) => (
            <div key={i} style={{ fontSize: 11, color: "#94a3b8", borderBottom: "1px solid #1e293b", padding: "4px 0" }}>
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "flex", fontSize: 12, color: "#64748b", marginBottom: 6, gap: 8, alignItems: "center" };
const selectStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 5, color: "#e2e8f0", padding: "5px 8px", fontSize: 12, width: "100%" };
