import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchBattle, resolveAttack } from "../api/combat";
import { fetchShips } from "../api/ships";
import HexCombatMap, { type HexShip, hexDist as hexDistance, distToRangeBand } from "../components/HexCombatMap";
import type { RangeBand, BattleShipState, AttackResult, Ship } from "../types";

function defaultState(ship: Ship, idx = 0): BattleShipState {
  return {
    hull_remaining: ship.hull_points,
    thrust_remaining: ship.m_drive_rating,
    evasive: false,
    disabled: false,
    q: idx % 2 === 0 ? -4 : 4,
    r: (idx % 2 === 0 ? Math.floor(idx / 2) : Math.floor(idx / 2)) - 1,
  };
}

export default function BattleView() {
  const { id } = useParams();
  const battleId = Number(id);

  const { data: battle, isLoading } = useQuery({
    queryKey: ["battle", battleId],
    queryFn: () => fetchBattle(battleId),
    retry: false,
  });
  const { data: allShips = [] } = useQuery({ queryKey: ["ships"], queryFn: fetchShips });

  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<number | null>(null);
  const [gunnerSkill, setGunnerSkill] = useState(1);
  const [currentRange] = useState<RangeBand>("short");
  const [lastResult, setLastResult] = useState<AttackResult | null>(null);
  const [attackError, setAttackError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<number, BattleShipState>>({});
  const [panelOpen, setPanelOpen] = useState(true);
  const [round, setRound] = useState(1);

  // Determine which ships are in this battle via fleet membership
  // For now treat all ships as participants — in future filter by fleet
  const battleShips = allShips as Ship[];

  // Init positions once
  useEffect(() => {
    if (battleShips.length === 0) return;
    setPositions(prev => {
      const next = { ...prev };
      battleShips.forEach((ship, idx) => {
        if (!next[ship.id]) next[ship.id] = defaultState(ship, idx);
      });
      return next;
    });
  }, [battleShips.length]);

  // Build hex ships — alternate sides A/B
  const hexShips: HexShip[] = battleShips.map((ship, idx) => ({
    ship,
    state: positions[ship.id] ?? defaultState(ship, idx),
    side: idx % 2 === 0 ? "a" : "b",
  }));

  // Auto-calculate range band from hex positions
  const autoRange: RangeBand = (() => {
    if (selectedShipId == null || selectedTargetId == null) return currentRange;
    const aPos = positions[selectedShipId];
    const tPos = positions[selectedTargetId];
    if (!aPos || !tPos) return currentRange;
    return distToRangeBand(hexDistance(aPos.q, aPos.r, tPos.q, tPos.r));
  })();

  function handleSelectShip(shipId: number | null) {
    if (shipId === null) { setSelectedShipId(null); return; }
    if (selectedShipId != null && shipId !== selectedShipId) {
      setSelectedTargetId(shipId);
    } else {
      setSelectedShipId(shipId);
      setSelectedTargetId(null);
      setSelectedWeaponId(null);
    }
  }

  function handleMoveShip(shipId: number, q: number, r: number) {
    setPositions(prev => {
      const cur = prev[shipId] ?? defaultState(allShips.find((s: Ship) => s.id === shipId)!);
      const dist = hexDistance(cur.q, cur.r, q, r);
      return {
        ...prev,
        [shipId]: {
          ...cur,
          q, r,
          thrust_remaining: Math.max(0, cur.thrust_remaining - dist),
        },
      };
    });
  }

  function nextRound() {
    setRound(r => r + 1);
    // Reset thrust for all ships
    setPositions(prev => {
      const next = { ...prev };
      battleShips.forEach(ship => {
        if (next[ship.id]) next[ship.id] = { ...next[ship.id], thrust_remaining: ship.m_drive_rating };
      });
      return next;
    });
    setLog(l => [`── Round ${round + 1} ──`, ...l]);
    setSelectedShipId(null);
    setSelectedTargetId(null);
    setSelectedWeaponId(null);
    setLastResult(null);
  }

  const attackMutation = useMutation({
    mutationFn: resolveAttack,
    onSuccess: (result) => {
      setLastResult(result);
      const atk = allShips.find((s: Ship) => s.id === selectedShipId);
      const tgt = allShips.find((s: Ship) => s.id === selectedTargetId);
      const wpn = atk?.weapons.find(w => w.id === selectedWeaponId);
      const line = `R${round}: ${atk?.name} → ${tgt?.name} [${wpn?.name}]: ${result.hit ? `HIT ${result.damage}dmg${result.critical ? " CRIT" : ""}` : "MISS"} (${result.attack_roll}+${result.total_dm}=${result.total})`;
      setLog(l => [line, ...l]);
      setAttackError(null);
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
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      setAttackError(`Attack failed: ${msg}`);
    },
  });

  const attacker = allShips.find((s: Ship) => s.id === selectedShipId);
  const target = allShips.find((s: Ship) => s.id === selectedTargetId);

  if (isLoading) return <LoadingScreen />;
  if (!battle) return <NotFound />;

  return (
    <div style={{ position: "fixed", inset: 0, top: 48, background: "#080f1e", overflow: "hidden" }}>
      {/* ── Full-screen hex map ── */}
      <HexCombatMap
        ships={hexShips}
        selectedShipId={selectedShipId}
        targetShipId={selectedTargetId}
        onSelectShip={handleSelectShip}
        onMoveShip={handleMoveShip}
      />

      {/* ── Floating top bar ── */}
      <div style={{
        position: "absolute", top: 10, right: 10,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={floatChip}>
          <span style={{ color: "#64748b" }}>Round</span>
          <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{round}</span>
        </div>
        <button onClick={nextRound} style={btnFloat}>Next Round ↻</button>
        <button onClick={() => setPanelOpen(o => !o)} style={btnFloat}>
          {panelOpen ? "Hide Panel ◀" : "Panel ▶"}
        </button>
        <a href="/battle" style={{ ...btnFloat, textDecoration: "none" }}>← Lobby</a>
      </div>

      {/* ── Floating right panel ── */}
      {panelOpen && (
        <div style={{
          position: "absolute", top: 50, right: 10, bottom: 10,
          width: 280,
          display: "flex", flexDirection: "column", gap: 8,
          pointerEvents: "none", // panel itself doesn't block map clicks
        }}>
          {/* Selection */}
          <div style={{ ...floatPanel, pointerEvents: "all" }}>
            <div style={panelTitle}>Selection</div>
            <div style={row}>
              <span style={{ color: "#64748b" }}>Attacker</span>
              <span style={{ color: attacker ? "#60a5fa" : "#334155" }}>{attacker?.name ?? "click a ship"}</span>
            </div>
            <div style={row}>
              <span style={{ color: "#64748b" }}>Target</span>
              <span style={{ color: target ? "#f87171" : "#334155" }}>{target?.name ?? "click another"}</span>
            </div>
            {attacker && (
              <div style={row}>
                <span style={{ color: "#64748b" }}>Thrust left</span>
                <span style={{ color: "#fbbf24" }}>
                  {positions[attacker.id]?.thrust_remaining ?? attacker.m_drive_rating} / {attacker.m_drive_rating}
                </span>
              </div>
            )}
            {(attacker || target) && (
              <button onClick={() => { setSelectedShipId(null); setSelectedTargetId(null); }} style={{ ...btnSm, marginTop: 6 }}>
                Clear
              </button>
            )}
          </div>

          {/* Ship quick-stats */}
          {(attacker || target) && (
            <div style={{ ...floatPanel, pointerEvents: "all" }}>
              {[attacker, target].filter(Boolean).map(ship => {
                const st = positions[ship!.id];
                const hpPct = st ? st.hull_remaining / ship!.hull_points : 1;
                return (
                  <div key={ship!.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: allShips.findIndex((s: Ship) => s.id === ship!.id) % 2 === 0 ? "#60a5fa" : "#f87171" }}>
                        {ship!.name}
                      </span>
                      <span style={{ fontSize: 11, color: "#475569" }}>TL{ship!.tech_level}</span>
                    </div>
                    {/* HP bar */}
                    <div style={{ background: "#1e293b", borderRadius: 4, height: 6, marginBottom: 4 }}>
                      <div style={{ height: 6, borderRadius: 4, width: `${hpPct * 100}%`, background: hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#facc15" : "#f87171", transition: "width 0.3s" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, fontSize: 11, color: "#64748b" }}>
                      <span>HP {st?.hull_remaining ?? ship!.hull_points}/{ship!.hull_points}</span>
                      <span>Armour {ship!.armor_value}</span>
                      <span>Thrust {ship!.m_drive_rating}</span>
                      <span>Sensors DM{ship!.sensor_dm >= 0 ? "+" : ""}{ship!.sensor_dm}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Attack */}
          {attacker && target && (
            <div style={{ ...floatPanel, pointerEvents: "all" }}>
              <div style={panelTitle}>Attack</div>
              <label style={labelStyle}>
                Weapon
                <select value={selectedWeaponId ?? ""} onChange={e => setSelectedWeaponId(Number(e.target.value))} style={selectStyle}>
                  <option value="">— select —</option>
                  {attacker.weapons.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.weapon_type.replace(/_/g, " ")})</option>
                  ))}
                </select>
              </label>
              <div style={{ ...labelStyle, marginBottom: 7 }}>
                Range Band
                <div style={{ ...selectStyle, color: "#e2e8f0", fontWeight: 600 }}>
                  {autoRange.replace("_", " ")} (auto from hex distance)
                </div>
              </div>
              <label style={labelStyle}>
                Gunner Skill
                <input type="number" min={0} max={5} value={gunnerSkill}
                  onChange={e => setGunnerSkill(Number(e.target.value))} style={selectStyle} />
              </label>
              <button
                disabled={!selectedWeaponId || attackMutation.isPending}
                onClick={() => attackMutation.mutate({
                  battle_id: battleId,
                  attacker_ship_id: selectedShipId!,
                  target_ship_id: selectedTargetId!,
                  weapon_id: selectedWeaponId!,
                  gunner_skill: gunnerSkill,
                  pilot_skill: 0,
                  range_band: autoRange,
                })}
                style={{ ...btnFire, opacity: selectedWeaponId ? 1 : 0.5 }}>
                🎯 Fire!
              </button>
              {attackError && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#f87171", background: "#450a0a", borderRadius: 5, padding: "4px 8px" }}>
                  {attackError}
                </div>
              )}
            </div>
          )}

          {/* Last result */}
          {lastResult && (
            <div style={{
              ...floatPanel, pointerEvents: "all",
              borderColor: lastResult.hit ? "#16a34a" : "#7f1d1d",
              background: lastResult.hit ? "rgba(5,46,22,0.9)" : "rgba(45,27,27,0.9)",
            }}>
              <div style={{ fontWeight: 700, color: lastResult.hit ? "#4ade80" : "#f87171", marginBottom: 4, fontSize: 13 }}>
                {lastResult.hit ? `HIT — ${lastResult.damage} damage${lastResult.critical ? " + CRITICAL!" : ""}` : "MISS"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                2d6={lastResult.attack_roll} {lastResult.total_dm >= 0 ? "+" : ""}{lastResult.total_dm} = {lastResult.total} (need 8+)
              </div>
              {Object.entries(lastResult.breakdown).map(([k, v]) => (
                <div key={k} style={{ fontSize: 10, color: "#475569" }}>
                  {k.replace(/_/g, " ")}: {(v as number) >= 0 ? "+" : ""}{v as number}
                </div>
              ))}
            </div>
          )}

          {/* Log */}
          <div style={{ ...floatPanel, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", pointerEvents: "all" }}>
            <div style={panelTitle}>Combat Log</div>
            <div style={{ flex: 1, overflowY: "auto", fontSize: 11, color: "#475569" }}>
              {log.length === 0 && <div style={{ color: "#334155" }}>No actions yet.</div>}
              {log.map((e, i) => (
                <div key={i} style={{ borderBottom: "1px solid #0f172a", padding: "2px 0",
                  color: e.startsWith("──") ? "#475569" : e.includes("HIT") ? "#4ade80" : e.includes("MISS") ? "#f87171" : "#64748b" }}>
                  {e}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function LoadingScreen() {
  return <div style={{ color: "#94a3b8", padding: 24, position: "fixed", inset: 0, top: 48, background: "#080f1e" }}>Loading battle…</div>;
}
function NotFound() {
  return (
    <div style={{ color: "#fca5a5", padding: 24, position: "fixed", inset: 0, top: 48, background: "#080f1e" }}>
      Battle not found. <a href="/battle" style={{ color: "#3b82f6" }}>← Back to lobby</a>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const floatPanel: React.CSSProperties = {
  background: "rgba(10,15,30,0.88)",
  border: "1px solid #1e293b",
  borderRadius: 10,
  padding: "12px 12px 10px",
  backdropFilter: "blur(8px)",
  fontSize: 12,
  color: "#e2e8f0",
};
const floatChip: React.CSSProperties = {
  background: "rgba(10,15,30,0.88)",
  border: "1px solid #1e293b",
  borderRadius: 6,
  padding: "5px 10px",
  backdropFilter: "blur(8px)",
  fontSize: 12,
  display: "flex", gap: 6, alignItems: "center",
};
const panelTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#475569",
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
};
const row: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4,
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#64748b", marginBottom: 7,
};
const selectStyle: React.CSSProperties = {
  background: "#0f172a", border: "1px solid #1e293b", borderRadius: 4,
  color: "#e2e8f0", padding: "4px 6px", fontSize: 11, width: "100%",
};
const btnSm: React.CSSProperties = {
  background: "#1e293b", color: "#64748b", border: "1px solid #334155",
  borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 11,
};
const btnFire: React.CSSProperties = {
  width: "100%", background: "#dc2626", color: "#fff", border: "none",
  borderRadius: 6, padding: "8px 0", cursor: "pointer", fontSize: 13, fontWeight: 700,
};
const btnFloat: React.CSSProperties = {
  background: "rgba(10,15,30,0.88)", color: "#94a3b8",
  border: "1px solid #1e293b", borderRadius: 6,
  padding: "5px 12px", cursor: "pointer", fontSize: 12,
  backdropFilter: "blur(8px)",
};
