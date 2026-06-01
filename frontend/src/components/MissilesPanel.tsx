/**
 * MissilesPanel — tracks missiles in flight and handles:
 *   - Countdown to arrival
 *   - Sandcaster defence (per-round, stacks)
 *   - Point defence attempts (beam laser shoots down individual missiles)
 *   - Auto-resolution when missiles arrive
 */
import { useMutation } from "@tanstack/react-query";
import { pointDefence, resolveMissile } from "../api/combat";
import type { PointDefenceResult, MissileArrivalResult } from "../api/combat";
import type { Ship, Weapon, RangeBand } from "../types";

export interface MissileInFlight {
  id: string;
  // Attacker info
  attacker_ship_id: number;
  attacker_name: string;
  weapon_id: number;
  weapon_name: string;
  weapon_type: string;
  gunner_skill: number;
  damage_dice: number;
  damage_dm: number;
  damage_multiple: number;
  ammo_used: number;          // how many missiles in the salvo
  // Target info
  target_ship_id: number;
  target_name: string;
  // Flight
  fired_round: number;
  arrival_round: number;      // round when they arrive
  range_band: RangeBand;
  // Accumulated defence
  sand_dm: number;            // DM-2 per sandcaster salvo fired
  missiles_destroyed: number; // by point defence
  evasive_target: boolean;
}

interface Props {
  missiles: MissileInFlight[];
  currentRound: number;
  ships: Ship[];
  onMissileDestroyed: (id: string) => void;
  onMissileResolved: (id: string, result: MissileArrivalResult) => void;
  onSandcaster: (missileId: string) => void;
  onLog: (line: string) => void;
  onDamage: (targetId: number, damage: number) => void;
}

const FLIGHT_ROUNDS: Record<RangeBand, number> = {
  adjacent: 0, close: 1, short: 1, medium: 2, long: 2, very_long: 3, distant: 3,
};

export function missileFlightRounds(band: RangeBand): number {
  return FLIGHT_ROUNDS[band] ?? 2;
}

export default function MissilesPanel({
  missiles, currentRound, ships, onMissileDestroyed,
  onMissileResolved, onSandcaster, onLog, onDamage,
}: Props) {
  if (missiles.length === 0) return null;

  return (
    <div style={{
      background: "rgba(6,13,26,0.92)", border: "1px solid #7f1d1d",
      borderRadius: 10, padding: "11px 12px",
      backdropFilter: "blur(8px)", pointerEvents: "all",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        ⚠ Missiles in Flight ({missiles.length})
      </div>

      {missiles.map(m => (
        <MissileRow key={m.id}
          missile={m}
          currentRound={currentRound}
          ships={ships}
          onDestroyed={() => onMissileDestroyed(m.id)}
          onResolved={result => onMissileResolved(m.id, result)}
          onSandcaster={() => onSandcaster(m.id)}
          onLog={onLog}
          onDamage={onDamage}
        />
      ))}
    </div>
  );
}

function MissileRow({ missile, currentRound, ships, onDestroyed, onResolved, onSandcaster, onLog, onDamage }: {
  missile: MissileInFlight;
  currentRound: number;
  ships: Ship[];
  onDestroyed: () => void;
  onResolved: (r: MissileArrivalResult) => void;
  onSandcaster: () => void;
  onLog: (s: string) => void;
  onDamage: (targetId: number, damage: number) => void;
}) {
  const roundsLeft = missile.arrival_round - currentRound;
  const arriving   = roundsLeft <= 0;
  const targetShip = ships.find(s => s.id === missile.target_ship_id);
  const surviving  = missile.ammo_used - missile.missiles_destroyed;

  // Sandcasters on the defending ship
  const sandcasters = targetShip?.weapons.filter(
    (w: Weapon) => w.weapon_type === "sandcaster"
  ) ?? [];

  // Point-defence capable weapons (beam lasers, pulse lasers)
  const pdWeapons = targetShip?.weapons.filter(
    (w: Weapon) => ["beam_laser", "pulse_laser", "laser_drill"].includes(w.weapon_type)
  ) ?? [];

  const pdMutation = useMutation({
    mutationFn: (wpn: Weapon) => pointDefence({
      defender_ship_id: missile.target_ship_id,
      defence_weapon_id: wpn.id,
      gunner_skill: 1,
      missiles_in_salvo: surviving,
    }),
    onSuccess: (result: PointDefenceResult, wpn: Weapon) => {
      onLog(`PD: ${targetShip?.name} fires ${wpn.name} at ${missile.weapon_name} — ${result.missiles_destroyed}/${result.missiles_in_salvo} missiles destroyed`);
      if (result.missiles_surviving <= 0) {
        onLog(`✓ All ${missile.weapon_name} missiles destroyed by point defence!`);
        onDestroyed();
      }
      // Update the missile's destroyed count via parent
      onResolved({ ...emptyResult, surviving_missiles: result.missiles_surviving, hit: false, damage: 0, critical: false, screen_blocked: false, message: `${result.missiles_destroyed} missiles shot down` } as MissileArrivalResult);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => resolveMissile({
      attacker_ship_id: missile.attacker_ship_id,
      target_ship_id: missile.target_ship_id,
      weapon_id: missile.weapon_id,
      gunner_skill: missile.gunner_skill,
      range_band: missile.range_band,
      sand_dm: missile.sand_dm,
      missiles_destroyed: missile.missiles_destroyed,
      missiles_total: missile.ammo_used,
      evasive_target: missile.evasive_target,
    }),
    onSuccess: (result: MissileArrivalResult) => {
      const verdict = result.hit
        ? `HIT ${result.damage} damage${result.critical ? " 💥CRIT" : ""}${result.screen_blocked ? " (screened)" : ""}`
        : "MISS";
      onLog(`MISSILES ARRIVE: ${missile.weapon_name} from ${missile.attacker_name} → ${missile.target_name}: ${verdict}`);
      if (result.hit && result.damage) onDamage(missile.target_ship_id, result.damage);
      onResolved(result);
    },
  });

  return (
    <div style={{ borderBottom: "1px solid #1a1a2e", paddingBottom: 10, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#fca5a5" }}>
          🚀 {missile.weapon_name}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
          background: arriving ? "#7f1d1d" : "#1a2d45",
          color: arriving ? "#fca5a5" : "#64748b",
        }}>
          {arriving ? "ARRIVING!" : `${roundsLeft} round${roundsLeft !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>
        {missile.attacker_name} → {missile.target_name} &nbsp;·&nbsp;
        {surviving}/{missile.ammo_used} missiles surviving
        {missile.sand_dm < 0 && <span style={{ color: "#818cf8" }}> · Sand DM{missile.sand_dm}</span>}
      </div>

      {/* Defence options */}
      {!arriving && surviving > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {/* Sandcasters */}
          {sandcasters.map((sc: Weapon) => (
            <button key={sc.id}
              onClick={() => {
                onSandcaster();
                onLog(`SAND: ${targetShip?.name} fires ${sc.name} — missiles suffer DM-2`);
              }}
              style={defBtn("#4c1d95", "#818cf8")}>
              🪣 Sandcaster DM-2
            </button>
          ))}

          {/* Point defence */}
          {pdWeapons.map((wpn: Weapon) => (
            <button key={wpn.id}
              disabled={pdMutation.isPending}
              onClick={() => pdMutation.mutate(wpn)}
              style={defBtn("#1e3a5f", "#38bdf8")}>
              🔫 Point Defence ({wpn.name.slice(0, 12)})
            </button>
          ))}
        </div>
      )}

      {/* Resolve button when missiles arrive */}
      {arriving && surviving > 0 && (
        <button
          disabled={resolveMutation.isPending}
          onClick={() => resolveMutation.mutate()}
          style={{ width: "100%", marginTop: 4, background: "#dc2626", color: "#fff",
            border: "none", borderRadius: 5, padding: "6px 0", cursor: "pointer",
            fontSize: 12, fontWeight: 700 }}>
          💥 Resolve Impact!
        </button>
      )}

      {surviving <= 0 && (
        <div style={{ fontSize: 11, color: "#4ade80" }}>✓ All missiles destroyed</div>
      )}
    </div>
  );
}

const emptyResult = { surviving_missiles: 0, hit: false, damage: 0, critical: false, screen_blocked: false };

const defBtn = (bg: string, color: string): React.CSSProperties => ({
  background: bg, color, border: `1px solid ${color}`, borderRadius: 4,
  padding: "3px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600,
});
