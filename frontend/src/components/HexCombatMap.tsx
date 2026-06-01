import { useState } from "react";
import { HexGrid, Layout, Hexagon, Text } from "react-hexgrid";
import type { Ship, RangeBand, BattleShipState } from "../types";
import { RANGE_BANDS, RANGE_LABELS } from "../types";

export interface HexShip {
  ship: Ship;
  state: BattleShipState;
  side: "a" | "b";
}

interface Props {
  ships: HexShip[];
  onMoveShip?: (shipId: number, q: number, r: number) => void;
  onSelectShip?: (shipId: number | null) => void;
  selectedShipId?: number | null;
}

const BAND_COLORS: Record<RangeBand, string> = {
  adjacent: "#f87171",
  close:    "#fb923c",
  short:    "#facc15",
  medium:   "#4ade80",
  long:     "#38bdf8",
  very_long:"#818cf8",
  distant:  "#a78bfa",
};

// Hex cube distance
function hexDist(aq: number, ar: number, bq: number, br: number): number {
  const as_ = -aq - ar;
  const bs = -bq - br;
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as_ - bs));
}

function hexRing(radius: number): { q: number; r: number }[] {
  if (radius === 0) return [{ q: 0, r: 0 }];
  const results: { q: number; r: number }[] = [];
  const dirs = [
    { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: 1, r: 0 },  { q: 0, r: 1 },
  ];
  let h = { q: radius, r: -radius };
  for (const dir of dirs) {
    for (let i = 0; i < radius; i++) {
      results.push({ ...h });
      h = { q: h.q + dir.q, r: h.r + dir.r };
    }
  }
  return results;
}

function allHexes() {
  const out: { q: number; r: number; ring: number }[] = [];
  for (let r = 0; r <= 6; r++)
    for (const h of hexRing(r)) out.push({ ...h, ring: r });
  return out;
}

const HEXES = allHexes();

export default function HexCombatMap({ ships, onMoveShip, onSelectShip, selectedShipId }: Props) {
  const [hoveredHex, setHoveredHex] = useState<{ q: number; r: number } | null>(null);

  const selectedHexShip = ships.find(s => s.ship.id === selectedShipId);
  const isMoving = selectedShipId != null;

  // Occupied hexes (excluding selected ship so it can "leave")
  const occupiedByOther = new Set<string>();
  for (const hs of ships) {
    if (hs.ship.id === selectedShipId) continue;
    occupiedByOther.add(`${hs.state.q},${hs.state.r}`);
  }

  const shipsByHex: Record<string, HexShip[]> = {};
  for (const hs of ships) {
    const k = `${hs.state.q},${hs.state.r}`;
    if (!shipsByHex[k]) shipsByHex[k] = [];
    shipsByHex[k].push(hs);
  }

  // Thrust-reachable hexes for selected ship
  const thrustRemaining = selectedHexShip?.state.thrust_remaining ?? 0;
  const srcQ = selectedHexShip?.state.q ?? 0;
  const srcR = selectedHexShip?.state.r ?? 0;

  function isReachable(q: number, r: number) {
    if (!isMoving || !selectedHexShip) return false;
    const dist = hexDist(srcQ, srcR, q, r);
    return dist > 0 && dist <= thrustRemaining && !occupiedByOther.has(`${q},${r}`);
  }

  function handleHexClick(q: number, r: number) {
    if (!isMoving || !selectedShipId) return;
    if (!isReachable(q, r)) return;
    onMoveShip?.(selectedShipId, q, r);
    onSelectShip?.(null);
  }

  function handleShipClick(e: React.MouseEvent, shipId: number) {
    e.stopPropagation();
    onSelectShip?.(selectedShipId === shipId ? null : shipId);
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <HexGrid width="100%" height="100%" viewBox="-80 -78 160 156">
        <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.03} origin={{ x: 0, y: 0 }}>
          {HEXES.map(({ q, r, ring }) => {
            const key = `${q},${r}`;
            const occupants = shipsByHex[key] ?? [];
            const band = RANGE_BANDS[ring] as RangeBand;
            const fill = BAND_COLORS[band];
            const reachable = isReachable(q, r);
            const hovered = hoveredHex?.q === q && hoveredHex?.r === r;
            const isCurrentPos = selectedHexShip?.state.q === q && selectedHexShip?.state.r === r;
            const dist = isMoving ? hexDist(srcQ, srcR, q, r) : 0;

            return (
              <Hexagon
                key={key} q={q} r={r} s={-q - r}
                style={{
                  fill: isCurrentPos ? "#fbbf24"
                    : reachable && hovered ? "#fff"
                    : reachable ? fill
                    : fill,
                  fillOpacity: isCurrentPos ? 0.45
                    : reachable && hovered ? 0.55
                    : reachable ? 0.32
                    : isMoving ? 0.06   // dim unreachable hexes during move
                    : 0.16,
                  stroke: isCurrentPos ? "#fbbf24"
                    : reachable && hovered ? "#fff"
                    : reachable ? fill
                    : fill,
                  strokeOpacity: isCurrentPos ? 1
                    : reachable ? 0.7
                    : isMoving ? 0.12
                    : 0.35,
                  strokeWidth: isCurrentPos ? 0.7 : reachable ? 0.5 : 0.25,
                  cursor: reachable ? "pointer" : isMoving && !isCurrentPos ? "not-allowed" : "default",
                  transition: "fill-opacity 0.08s, stroke-opacity 0.08s",
                }}
                onMouseEnter={() => setHoveredHex({ q, r })}
                onMouseLeave={() => setHoveredHex(null)}
                onClick={() => handleHexClick(q, r)}
              >
                {/* Range label on leading edge */}
                {ring > 0 && q === ring && r === -ring && (
                  <Text style={{ fontSize: "2.8px", fill: fill, fillOpacity: isMoving ? 0.25 : 0.6, textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                    {band.replace("_", " ")}
                  </Text>
                )}

                {/* Thrust cost label on reachable hovered hex */}
                {reachable && hovered && dist > 0 && (
                  <Text style={{ fontSize: "3px", fill: "#fff", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none", fontWeight: "bold" }}>
                    {dist}T
                  </Text>
                )}

                {/* Ships */}
                {occupants.map((hs, idx) => {
                  const isSelected = hs.ship.id === selectedShipId;
                  const sideColor = hs.side === "a" ? "#3b82f6" : "#ef4444";
                  const offset = occupants.length > 1 ? (idx - (occupants.length - 1) / 2) * 5 : 0;
                  const hpPct = hs.state.hull_remaining / hs.ship.hull_points;
                  const hpColor = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#facc15" : "#f87171";

                  return (
                    <g key={hs.ship.id} transform={`translate(${offset}, 0)`}
                      onClick={e => handleShipClick(e, hs.ship.id)}
                      style={{ cursor: "pointer" }}>
                      {isSelected && (
                        <circle cx={0} cy={0} r={5.5} fill="none"
                          stroke="#fbbf24" strokeWidth={0.8} strokeOpacity={0.9} />
                      )}
                      <circle cx={0} cy={0} r={3.2}
                        fill={sideColor} stroke={isSelected ? "#fbbf24" : "#fff"}
                        strokeWidth={isSelected ? 0.7 : 0.3}
                        fillOpacity={hs.state.disabled ? 0.3 : 1} />
                      {/* HP bar */}
                      <rect x={-3.5} y={4.5} width={7} height={1.2} fill="#1e293b" rx={0.4} />
                      <rect x={-3.5} y={4.5} width={Math.max(0, 7 * hpPct)} height={1.2} fill={hpColor} rx={0.4} />
                      {/* Thrust remaining pip */}
                      {isSelected && (
                        <Text y={-5.5} style={{ fontSize: "2.5px", fill: "#fbbf24", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                          {hs.state.thrust_remaining}T
                        </Text>
                      )}
                      <Text y={7.5} style={{ fontSize: "2px", fill: "#cbd5e1", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                        {hs.ship.name.slice(0, 10)}
                      </Text>
                    </g>
                  );
                })}
              </Hexagon>
            );
          })}
        </Layout>
      </HexGrid>

      {/* Legend — bottom left overlay */}
      <div style={{
        position: "absolute", bottom: 8, left: 8,
        display: "flex", flexDirection: "column", gap: 3,
        background: "rgba(8,15,30,0.85)", borderRadius: 8, padding: "8px 10px",
        backdropFilter: "blur(4px)", border: "1px solid #1e293b",
      }}>
        {RANGE_BANDS.map((band, i) => (
          <div key={band} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#64748b" }}>
            <div style={{ width: 8, height: 8, background: BAND_COLORS[band], borderRadius: 2, opacity: 0.85, flexShrink: 0 }} />
            <span>Ring {i} — {RANGE_LABELS[band].split("(")[0].trim()}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #1e293b", marginTop: 4, paddingTop: 4, display: "flex", gap: 10, fontSize: 10, color: "#64748b" }}>
          <span><span style={{ color: "#3b82f6" }}>●</span> Side A</span>
          <span><span style={{ color: "#ef4444" }}>●</span> Side B</span>
          <span style={{ color: "#fbbf24" }}>○</span><span>Selected</span>
        </div>
      </div>

      {/* Status bar — top centre overlay */}
      {isMoving && (
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          background: "rgba(251,191,36,0.15)", border: "1px solid #fbbf24",
          borderRadius: 20, padding: "5px 16px", fontSize: 12, color: "#fbbf24",
          backdropFilter: "blur(4px)", whiteSpace: "nowrap",
        }}>
          Moving <b>{selectedHexShip?.ship.name}</b> — {thrustRemaining}T remaining — click a highlighted hex
          &nbsp;&nbsp;<span style={{ color: "#94a3b8" }}>|</span>&nbsp;&nbsp;
          <span style={{ color: "#94a3b8", cursor: "pointer" }} onClick={() => onSelectShip?.(null)}>✕ cancel</span>
        </div>
      )}
    </div>
  );
}

