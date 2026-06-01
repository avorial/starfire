import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchBattle, fetchBattleShips, rollInitiative, resolveAttack } from "../api/combat";
import type { BattleShipEntry, InitiativeEntry } from "../api/combat";
import HexCombatMap, { type HexShip, hexDist as hexDistance, distToRangeBand } from "../components/HexCombatMap";
import type { RangeBand, BattleShipState, AttackResult, Ship, Weapon } from "../types";

function defaultState(ship: Ship, idx: number, side: "a" | "b"): BattleShipState {
  // Side A starts left (-5 to -3), Side B starts right (+3 to +5), spread vertically
  const q = side === "a" ? -4 - (idx % 3) : 4 + (idx % 3);
  const r = Math.floor(idx / 3) - 2;
  return { hull_remaining: ship.hull_points, thrust_remaining: ship.m_drive_rating, evasive: false, disabled: false, q, r };
}

export default function BattleView() {
  const { id } = useParams();
  const battleId = Number(id);

  const { data: battle, isLoading } = useQuery({ queryKey: ["battle", battleId], queryFn: () => fetchBattle(battleId), retry: false });
  const { data: battleShipsData } = useQuery({ queryKey: ["battleShips", battleId], queryFn: () => fetchBattleShips(battleId), enabled: !!battle });

  const [selectedShipId, setSelectedShipId]   = useState<number | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<number | null>(null);
  const [gunnerSkill, setGunnerSkill]           = useState(1);
  const [lastResult, setLastResult]             = useState<AttackResult | null>(null);
  const [attackError, setAttackError]           = useState<string | null>(null);
  const [log, setLog]                           = useState<string[]>([]);
  const [positions, setPositions]               = useState<Record<number, BattleShipState>>({});
  const [ammo, setAmmo]                         = useState<Record<number, number>>({});  // weapon_id → remaining
  const [panelOpen, setPanelOpen]               = useState(true);
  const [round, setRound]                       = useState(1);
  const [initiative, setInitiative]             = useState<InitiativeEntry[]>([]);
  const [showInitiative, setShowInitiative]     = useState(false);

  // Ships from both fleets (fleet-filtered)
  const entries: BattleShipEntry[] = battleShipsData?.ships ?? [];
  const ships: Ship[] = entries.map(e => e.ship);

  // Init positions + ammo once ships load
  useEffect(() => {
    if (entries.length === 0) return;
    setPositions(prev => {
      const next = { ...prev };
      entries.forEach((e, idx) => {
        if (!next[e.ship.id]) next[e.ship.id] = defaultState(e.ship, idx, e.side);
      });
      return next;
    });
    setAmmo(prev => {
      const next = { ...prev };
      entries.forEach(e => {
        e.ship.weapons.forEach((w: Weapon) => {
          if (!(w.id in next)) next[w.id] = w.ammo_count;
        });
      });
      return next;
    });
  }, [entries.length]);

  const hexShips: HexShip[] = entries.map((e, idx) => ({
    ship: e.ship,
    state: positions[e.ship.id] ?? defaultState(e.ship, idx, e.side),
    side: e.side,
  }));

  // ── Ship selection ────────────────────────────────────────────────────
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
      const cur = prev[shipId];
      if (!cur) return prev;
      const dist = hexDistance(cur.q, cur.r, q, r);
      return { ...prev, [shipId]: { ...cur, q, r, thrust_remaining: Math.max(0, cur.thrust_remaining - dist) } };
    });
  }

  // Toggle evasive action for selected ship
  function toggleEvasion(shipId: number) {
    setPositions(prev => ({
      ...prev,
      [shipId]: { ...prev[shipId], evasive: !prev[shipId]?.evasive },
    }));
    const ship = ships.find(s => s.id === shipId);
    setLog(l => [`R${round}: ${ship?.name} ${positions[shipId]?.evasive ? "cancels" : "declares"} Evasive Action (DM-2 to attacks against them)`, ...l]);
  }

  // ── Attack ────────────────────────────────────────────────────────────
  const attackMutation = useMutation({
    mutationFn: resolveAttack,
    onSuccess: (result) => {
      setLastResult(result);
      setAttackError(null);
      const atk = ships.find(s => s.id === selectedShipId);
      const tgt = ships.find(s => s.id === selectedTargetId);
      const wpn = atk?.weapons.find((w: Weapon) => w.id === selectedWeaponId);
      let line = `R${round}: ${atk?.name} → ${tgt?.name} [${wpn?.name}]: `;
      line += result.hit
        ? `HIT ${result.damage}dmg${result.critical ? " 💥CRIT!" : ""}${result.screen_blocked ? " (screened)" : ""}`
        : "MISS";
      line += ` (2d6=${result.attack_roll}+${result.total_dm}=${result.total})`;
      setLog(l => [line, ...l]);

      // Deduct ammo for weapons that use it
      if (result.hit && wpn && wpn.ammo_count > 0) {
        setAmmo(prev => ({ ...prev, [wpn.id]: Math.max(0, (prev[wpn.id] ?? wpn.ammo_count) - 1) }));
      }

      // Apply damage to target
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

  // ── Initiative ────────────────────────────────────────────────────────
  const initiativeMutation = useMutation({
    mutationFn: () => rollInitiative(battleId),
    onSuccess: (data) => {
      setInitiative(data.initiative_order);
      setShowInitiative(true);
      setLog(l => [`── Round ${round} Initiative Rolled ──`, ...l]);
    },
  });

  // ── Next round ────────────────────────────────────────────────────────
  function nextRound() {
    setRound(r => r + 1);
    setPositions(prev => {
      const next = { ...prev };
      ships.forEach(ship => {
        if (next[ship.id]) next[ship.id] = { ...next[ship.id], thrust_remaining: ship.m_drive_rating, evasive: false };
      });
      return next;
    });
    setLog(l => [`── Round ${round + 1} begins ──`, ...l]);
    setSelectedShipId(null);
    setSelectedTargetId(null);
    setSelectedWeaponId(null);
    setLastResult(null);
    setInitiative([]);
  }

  const attacker = ships.find(s => s.id === selectedShipId);
  const target   = ships.find(s => s.id === selectedTargetId);
  const attackerPos = selectedShipId ? positions[selectedShipId] : null;
  const targetPos   = selectedTargetId ? positions[selectedTargetId] : null;
  const autoRange: RangeBand = (attackerPos && targetPos)
    ? distToRangeBand(hexDistance(attackerPos.q, attackerPos.r, targetPos.q, targetPos.r))
    : "short";
  const targetIsEvasive = selectedTargetId ? (positions[selectedTargetId]?.evasive ?? false) : false;

  if (isLoading) return <Overlay>Loading battle…</Overlay>;
  if (!battle)   return <Overlay><a href="/battle" style={{ color: "#3b82f6" }}>Battle not found ← Lobby</a></Overlay>;

  return (
    <div style={{ position: "fixed", inset: "48px 0 0 0", overflow: "hidden" }}>
      <HexCombatMap ships={hexShips} selectedShipId={selectedShipId} targetShipId={selectedTargetId}
        onSelectShip={handleSelectShip} onMoveShip={handleMoveShip} />

      {/* ── Top bar ── */}
      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <Chip>{battle.name} — Round {round}</Chip>
        <FBtn onClick={() => initiativeMutation.mutate()}>🎲 Roll Initiative</FBtn>
        <FBtn onClick={nextRound}>Next Round ↻</FBtn>
        <FBtn onClick={() => setPanelOpen(o => !o)}>{panelOpen ? "◀ Hide" : "▶ Panel"}</FBtn>
        <a href="/battle" style={{ ...fBtnStyle, textDecoration: "none" }}>← Lobby</a>
      </div>

      {/* ── Initiative overlay ── */}
      {showInitiative && initiative.length > 0 && (
        <div style={{
          position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)",
          background: "rgba(6,13,26,0.96)", border: "1px solid #1a2d45", borderRadius: 12,
          padding: 16, minWidth: 280, zIndex: 30,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Initiative Order — Round {round}</span>
            <button onClick={() => setShowInitiative(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          {initiative.map((e, i) => (
            <div key={e.ship_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px solid #0f172a" }}>
              <span style={{ color: "#475569", fontSize: 12, width: 20 }}>#{i + 1}</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.side === "a" ? "#3b82f6" : "#ef4444", flexShrink: 0 }} />
              <span style={{ flex: 1, color: "#e2e8f0", fontSize: 13 }}>{e.ship_name}</span>
              <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>{e.roll}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Right panel ── */}
      {panelOpen && (
        <div style={{
          position: "absolute", top: 50, right: 10, bottom: 10, width: 290,
          display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none",
        }}>

          {/* Selection */}
          <Panel>
            <PTitle>Selection</PTitle>
            <Row label="Attacker" value={attacker?.name ?? "click a ship"} valueColor={attacker ? "#60a5fa" : "#334155"} />
            <Row label="Target"   value={target?.name   ?? "click another"} valueColor={target   ? "#f87171" : "#334155"} />
            {attacker && (
              <Row label="Thrust left"
                value={`${positions[attacker.id]?.thrust_remaining ?? attacker.m_drive_rating} / ${attacker.m_drive_rating}`}
                valueColor="#fbbf24" />
            )}
            {attacker && (
              <Row label="Range" value={autoRange.replace("_", " ")} valueColor="#4ade80" />
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {selectedShipId && (
                <button onMouseDown={e => e.stopPropagation()}
                  onClick={() => toggleEvasion(selectedShipId)}
                  style={{ ...smallBtn, background: positions[selectedShipId]?.evasive ? "#065f46" : "#1e293b",
                    color: positions[selectedShipId]?.evasive ? "#34d399" : "#64748b",
                    border: `1px solid ${positions[selectedShipId]?.evasive ? "#34d399" : "#334155"}` }}>
                  {positions[selectedShipId]?.evasive ? "✓ Evasive" : "Evasive Action"}
                </button>
              )}
              {(attacker || target) && (
                <button onMouseDown={e => e.stopPropagation()}
                  onClick={() => { setSelectedShipId(null); setSelectedTargetId(null); setSelectedWeaponId(null); }}
                  style={smallBtn}>Clear</button>
              )}
            </div>
          </Panel>

          {/* Ship stats */}
          {(attacker || target) && (
            <Panel>
              {[attacker, target].filter(Boolean).map(ship => {
                const st  = positions[ship!.id];
                const hp  = st?.hull_remaining ?? ship!.hull_points;
                const pct = hp / ship!.hull_points;
                const hpColor = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#facc15" : "#f87171";
                const side = entries.find(e => e.ship.id === ship!.id)?.side;
                return (
                  <div key={ship!.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: side === "a" ? "#60a5fa" : "#f87171" }}>
                        {ship!.name}
                        {st?.evasive && <span style={{ color: "#34d399", marginLeft: 6, fontSize: 10 }}>EVASIVE</span>}
                        {st?.disabled && <span style={{ color: "#f87171", marginLeft: 6, fontSize: 10 }}>DISABLED</span>}
                      </span>
                      <span style={{ fontSize: 10, color: "#334155" }}>TL{ship!.tech_level}</span>
                    </div>
                    <div style={{ background: "#0a0f1e", borderRadius: 3, height: 5, marginBottom: 3 }}>
                      <div style={{ height: 5, borderRadius: 3, width: `${pct * 100}%`, background: hpColor, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, fontSize: 10, color: "#475569" }}>
                      <span>HP {hp}/{ship!.hull_points}</span>
                      <span>Armour {ship!.armor_value}</span>
                      <span>Thrust {ship!.m_drive_rating}</span>
                      <span>Sensors DM{ship!.sensor_dm >= 0 ? "+" : ""}{ship!.sensor_dm}</span>
                    </div>
                  </div>
                );
              })}
            </Panel>
          )}

          {/* Attack */}
          {attacker && target && (
            <Panel>
              <PTitle>Attack</PTitle>
              <label style={lbl}>
                Weapon
                <select value={selectedWeaponId ?? ""}
                  onChange={e => setSelectedWeaponId(Number(e.target.value))}
                  onMouseDown={e => e.stopPropagation()}
                  style={sel}>
                  <option value="">— select —</option>
                  {attacker.weapons.map((w: Weapon) => {
                    const remaining = w.ammo_count > 0 ? (ammo[w.id] ?? w.ammo_count) : null;
                    const outOfAmmo = remaining !== null && remaining <= 0;
                    return (
                      <option key={w.id} value={w.id} disabled={outOfAmmo}>
                        {w.name} ({w.weapon_type.replace(/_/g, " ")}){remaining !== null ? ` [${remaining}]` : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
              <div style={{ ...lbl, marginBottom: 7 }}>
                Range
                <div style={{ ...sel, color: "#4ade80", fontWeight: 600 }}>
                  {autoRange.replace("_", " ")} (from hex positions)
                </div>
              </div>
              <label style={lbl}>
                Gunner Skill
                <input type="number" min={0} max={5} value={gunnerSkill}
                  onChange={e => setGunnerSkill(Number(e.target.value))}
                  onMouseDown={e => e.stopPropagation()}
                  style={sel} />
              </label>
              {targetIsEvasive && (
                <div style={{ fontSize: 10, color: "#34d399", marginBottom: 6 }}>
                  ⚡ Target is Evasive — DM-2 applied
                </div>
              )}
              <button
                disabled={!selectedWeaponId || attackMutation.isPending}
                onMouseDown={e => e.stopPropagation()}
                onClick={() => attackMutation.mutate({
                  battle_id: battleId,
                  attacker_ship_id: selectedShipId!,
                  target_ship_id: selectedTargetId!,
                  weapon_id: selectedWeaponId!,
                  gunner_skill: gunnerSkill,
                  pilot_skill: 0,
                  dogfight_dm: 0,
                  evasive_target: targetIsEvasive,
                  range_band: autoRange,
                })}
                style={{ width: "100%", background: selectedWeaponId ? "#dc2626" : "#1e293b",
                  color: "#fff", border: "none", borderRadius: 6, padding: "8px 0",
                  cursor: selectedWeaponId ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700 }}>
                🎯 Fire!
              </button>
              {attackError && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#f87171", background: "#450a0a", borderRadius: 4, padding: "4px 8px" }}>
                  {attackError}
                </div>
              )}
            </Panel>
          )}

          {/* Last result */}
          {lastResult && (
            <Panel style={{ borderColor: lastResult.hit ? "#16a34a" : "#7f1d1d",
              background: lastResult.hit ? "rgba(5,46,22,0.9)" : "rgba(45,27,27,0.9)" }}>
              <div style={{ fontWeight: 700, color: lastResult.hit ? "#4ade80" : "#f87171", marginBottom: 4, fontSize: 13 }}>
                {lastResult.hit
                  ? `HIT — ${lastResult.damage} damage${lastResult.screen_blocked ? " (screened)" : ""}${lastResult.critical ? " 💥 CRITICAL!" : ""}`
                  : "MISS"}
              </div>
              {lastResult.critical && lastResult.critical_details && (
                <div style={{ background: "#450a0a", border: "1px solid #dc2626", borderRadius: 5, padding: "5px 8px", marginBottom: 6, fontSize: 11 }}>
                  <div style={{ color: "#f87171", fontWeight: 700 }}>
                    Critical: {lastResult.critical_details.location} (Severity {lastResult.critical_details.severity})
                  </div>
                  <div style={{ color: "#fca5a5" }}>{lastResult.critical_details.result}</div>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#64748b" }}>
                2d6={lastResult.attack_roll} {lastResult.total_dm >= 0 ? "+" : ""}{lastResult.total_dm} = {lastResult.total} (effect {lastResult.effect})
              </div>
              {Object.entries(lastResult.breakdown).map(([k, v]) => (
                <div key={k} style={{ fontSize: 10, color: "#334155" }}>
                  {k.replace(/_/g, " ")}: {(v as number) >= 0 ? "+" : ""}{v as number}
                </div>
              ))}
            </Panel>
          )}

          {/* Combat log */}
          <Panel style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <PTitle>Combat Log</PTitle>
            <div style={{ flex: 1, overflowY: "auto", fontSize: 11 }}>
              {log.length === 0 && <div style={{ color: "#1e293b" }}>No actions yet.</div>}
              {log.map((e, i) => (
                <div key={i} style={{ borderBottom: "1px solid #0a0f1e", padding: "2px 0",
                  color: e.startsWith("──") ? "#1e3a5f"
                    : e.includes("HIT") ? "#4ade80"
                    : e.includes("MISS") ? "#f87171"
                    : e.includes("Evasive") ? "#34d399"
                    : "#475569" }}>
                  {e}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────
function Overlay({ children }: { children: React.ReactNode }) {
  return <div style={{ position: "fixed", inset: "48px 0 0 0", background: "#060d1a", color: "#94a3b8", padding: 24 }}>{children}</div>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "rgba(6,13,26,0.9)", border: "1px solid #1a2d45", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#e2e8f0", backdropFilter: "blur(6px)" }}>{children}</div>;
}
function FBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} onMouseDown={e => e.stopPropagation()} style={fBtnStyle}>{children}</button>;
}
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(6,13,26,0.9)", border: "1px solid #1a2d45", borderRadius: 10,
      padding: "11px 12px", backdropFilter: "blur(8px)", pointerEvents: "all", ...style }}>
      {children}
    </div>
  );
}
function PTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{children}</div>;
}
function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: "#475569" }}>{label}</span>
      <span style={{ color: valueColor ?? "#e2e8f0" }}>{value}</span>
    </div>
  );
}

const fBtnStyle: React.CSSProperties = {
  background: "rgba(6,13,26,0.9)", color: "#64748b", border: "1px solid #1a2d45",
  borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12,
  backdropFilter: "blur(6px)",
};
const smallBtn: React.CSSProperties = {
  background: "#1e293b", color: "#64748b", border: "1px solid #334155",
  borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 11,
};
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#475569", marginBottom: 7 };
const sel: React.CSSProperties = { background: "#0a0f1e", border: "1px solid #1a2d45", borderRadius: 4, color: "#e2e8f0", padding: "4px 6px", fontSize: 11, width: "100%" };
