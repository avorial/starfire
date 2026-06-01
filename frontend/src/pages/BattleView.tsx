import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchBattle, resolveAttack } from "../api/combat";
import { fetchShips } from "../api/ships";
import HexCombatMap, { type HexShip } from "../components/HexCombatMap";
import type { RangeBand, BattleShipState, AttackResult, Ship } from "../types";
import { RANGE_BANDS } from "../types";

export default function BattleView() {
  const { id } = useParams();
  const battleId = Number(id);

  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ["battle", battleId],
    queryFn: () => fetchBattle(battleId),
    retry: false,
  });
  const { data: ships = [] } = useQuery({ queryKey: ["ships"], queryFn: fetchShips });

  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<number | null>(null);
  const [gunnerSkill, setGunnerSkill] = useState(1);
  const [currentRange, setCurrentRange] = useState<RangeBand>("short");
  const [lastResult, setLastResult] = useState<AttackResult | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<number, BattleShipState>>({});

  // Assign starting positions once ships load
  useEffect(() => {
    if (!battle || ships.length === 0) return;
    setPositions(prev => {
      const next = { ...prev };
      // Side A ships start at q=-3, Side B at q=+3, spread vertically
      const sideAIds: number[] = [];
      const sideBIds: number[] = [];

      ships.forEach((ship: Ship, idx: number) => {
        if (next[ship.id]) return; // already placed
        const onA = sideAIds.includes(ship.id);
        const onB = sideBIds.includes(ship.id);
        next[ship.id] = {
          hull_remaining: ship.hull_points,
          thrust_remaining: ship.m_drive_rating,
          evasive: false,
          disabled: false,
          q: onA ? -3 : onB ? 3 : (idx % 2 === 0 ? -3 : 3),
          r: Math.floor(idx / 2) - 1,
        };
      });
      return next;
    });
  }, [battle, ships]);

  const attack = useMutation({
    mutationFn: resolveAttack,
    onSuccess: (result) => {
      setLastResult(result);
      const attacker = ships.find((s: Ship) => s.id === selectedShipId);
      const target = ships.find((s: Ship) => s.id === selectedTargetId);
      const weapon = attacker?.weapons.find(w => w.id === selectedWeaponId);
      const line = `Round ${battle?.current_round ?? "?"}: ${attacker?.name} → ${target?.name} via ${weapon?.name}: ${result.hit ? `HIT ${result.damage} dmg${result.critical ? " CRITICAL!" : ""}` : "MISS"} (roll ${result.attack_roll}+${result.total_dm}=${result.total})`;
      setLog(l => [line, ...l]);

      // Apply damage locally
      if (result.hit && selectedTargetId != null) {
        setPositions(p => ({
          ...p,
          [selectedTargetId]: {
            ...p[selectedTargetId],
            hull_remaining: Math.max(0, (p[selectedTargetId]?.hull_remaining ?? 0) - result.damage),
            disabled: (p[selectedTargetId]?.hull_remaining ?? 0) - result.damage <= 0,
          },
        }));
      }
    },
  });

  function handleSelectShip(shipId: number | null) {
    if (shipId === null) {
      setSelectedShipId(null);
      return;
    }
    // If we already have an attacker and clicked a different ship, set as target
    if (selectedShipId !== null && shipId !== selectedShipId) {
      setSelectedTargetId(shipId);
    } else {
      setSelectedShipId(shipId);
      setSelectedTargetId(null);
      setSelectedWeaponId(null);
    }
  }

  function handleMoveShip(shipId: number, q: number, r: number) {
    setPositions(p => ({
      ...p,
      [shipId]: { ...(p[shipId] ?? defaultState(ships.find((s: Ship) => s.id === shipId)!)), q, r },
    }));
  }

  if (battleLoading) return <div style={{ color: "#94a3b8", padding: 24 }}>Loading battle…</div>;
  if (!battle) return (
    <div style={{ color: "#fca5a5", padding: 24 }}>
      Battle not found. <a href="/battle" style={{ color: "#3b82f6" }}>← Back to lobby</a>
    </div>
  );

  // Build hex ships — need fleet membership to determine side
  const hexShips: HexShip[] = ships.map((ship: Ship, idx: number) => ({
    ship,
    state: positions[ship.id] ?? defaultState(ship, idx),
    side: idx % 2 === 0 ? "a" : "b",
  }));

  const attacker = ships.find((s: Ship) => s.id === selectedShipId);
  const target = ships.find((s: Ship) => s.id === selectedTargetId);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, padding: 12, color: "#e2e8f0", height: "calc(100vh - 48px)", overflow: "hidden", background: "#0a0f1e" }}>
      {/* Left: map */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{battle.name}</h1>
            <div style={{ fontSize: 12, color: "#475569" }}>Round {battle.current_round}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "#64748b" }}>
              Range band:
              <select value={currentRange} onChange={e => setCurrentRange(e.target.value as RangeBand)}
                style={{ marginLeft: 6, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}>
                {RANGE_BANDS.map(b => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
              </select>
            </label>
            <a href="/battle" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← Lobby</a>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HexCombatMap
            ships={hexShips}
            selectedShipId={selectedShipId}
            onSelectShip={handleSelectShip}
            onMoveShip={handleMoveShip}
          />
        </div>
      </div>

      {/* Right: panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>

        {/* Selection status */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 12, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: 8 }}>Selection</div>
          <div style={{ color: "#64748b", marginBottom: 4 }}>
            Attacker: <span style={{ color: attacker ? "#60a5fa" : "#334155" }}>{attacker?.name ?? "— click a ship"}</span>
          </div>
          <div style={{ color: "#64748b", marginBottom: 8 }}>
            Target: <span style={{ color: target ? "#f87171" : "#334155" }}>{target?.name ?? "— click another ship"}</span>
          </div>
          <div style={{ fontSize: 11, color: "#334155" }}>
            Click a ship to select attacker. Click a second ship to set target. Click selected ship to deselect.
          </div>
          {(attacker || target) && (
            <button onClick={() => { setSelectedShipId(null); setSelectedTargetId(null); setSelectedWeaponId(null); }}
              style={btnSm}>Clear</button>
          )}
        </div>

        {/* Ship stats */}
        {attacker && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: "#60a5fa", marginBottom: 6 }}>{attacker.name}</div>
            <div style={{ color: "#64748b" }}>Hull: {positions[attacker.id]?.hull_remaining ?? attacker.hull_points} / {attacker.hull_points}</div>
            <div style={{ color: "#64748b" }}>Armour: {attacker.armor_value} · Thrust: {attacker.m_drive_rating}</div>
          </div>
        )}

        {/* Attack panel */}
        {attacker && target && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: 10, fontSize: 13 }}>Attack</div>

            <label style={labelStyle}>
              Weapon
              <select value={selectedWeaponId ?? ""} onChange={e => setSelectedWeaponId(Number(e.target.value))} style={selectStyle}>
                <option value="">— select weapon —</option>
                {attacker.weapons.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Range Band
              <select value={currentRange} onChange={e => setCurrentRange(e.target.value as RangeBand)} style={selectStyle}>
                {RANGE_BANDS.map(b => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
              </select>
            </label>

            <label style={labelStyle}>
              Gunner Skill
              <input type="number" min={0} max={5} value={gunnerSkill}
                onChange={e => setGunnerSkill(Number(e.target.value))} style={selectStyle} />
            </label>

            <button
              disabled={!selectedWeaponId || attack.isPending}
              onClick={() => attack.mutate({
                battle_id: battleId,
                attacker_ship_id: selectedShipId!,
                target_ship_id: selectedTargetId!,
                weapon_id: selectedWeaponId!,
                gunner_skill: gunnerSkill,
                pilot_skill: 0,
                range_band: currentRange,
              })}
              style={{ ...btnFire, opacity: selectedWeaponId ? 1 : 0.4 }}>
              🎯 Fire!
            </button>
          </div>
        )}

        {/* Last result */}
        {lastResult && (
          <div style={{ background: lastResult.hit ? "#052e16" : "#2d1b1b", border: `1px solid ${lastResult.hit ? "#16a34a" : "#7f1d1d"}`, borderRadius: 8, padding: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: lastResult.hit ? "#4ade80" : "#f87171", marginBottom: 4 }}>
              {lastResult.hit ? `HIT — ${lastResult.damage} damage${lastResult.critical ? " + CRITICAL!" : ""}` : "MISS"}
            </div>
            <div style={{ color: "#64748b" }}>2d6={lastResult.attack_roll} {lastResult.total_dm >= 0 ? "+" : ""}{lastResult.total_dm} = {lastResult.total} (need 8+)</div>
            {Object.entries(lastResult.breakdown).map(([k, v]) => (
              <div key={k} style={{ color: "#475569", fontSize: 11 }}>
                {k.replace(/_/g, " ")}: {(v as number) >= 0 ? "+" : ""}{v as number}
              </div>
            ))}
          </div>
        )}

        {/* Log */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 12, flex: 1, overflow: "auto", minHeight: 80 }}>
          <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: 8, fontSize: 12 }}>Combat Log</div>
          {log.length === 0 && <div style={{ fontSize: 11, color: "#334155" }}>No actions yet.</div>}
          {log.map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: "#64748b", borderBottom: "1px solid #1e293b", padding: "3px 0" }}>{e}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function defaultState(ship: Ship, idx = 0): BattleShipState {
  return {
    hull_remaining: ship.hull_points,
    thrust_remaining: ship.m_drive_rating,
    evasive: false,
    disabled: false,
    q: idx % 2 === 0 ? -3 : 3,
    r: Math.floor(idx / 2) - 1,
  };
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "#64748b", marginBottom: 8 };
const selectStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 5, color: "#e2e8f0", padding: "5px 6px", fontSize: 12, width: "100%" };
const btnSm: React.CSSProperties = { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontSize: 11, marginTop: 8 };
const btnFire: React.CSSProperties = { width: "100%", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "9px 0", cursor: "pointer", fontSize: 14, fontWeight: 700, marginTop: 4 };
