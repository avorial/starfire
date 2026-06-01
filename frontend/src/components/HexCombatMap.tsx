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

// Which ring (0–6) a hex belongs to — ring = range band index
function hexRing(radius: number): { q: number; r: number }[] {
  if (radius === 0) return [{ q: 0, r: 0 }];
  const results: { q: number; r: number }[] = [];
  const dirs = [
    { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
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
  for (let r = 0; r <= 6; r++) {
    for (const h of hexRing(r)) out.push({ ...h, ring: r });
  }
  return out;
}

const HEXES = allHexes();

export default function HexCombatMap({ ships, onMoveShip, onSelectShip, selectedShipId }: Props) {
  const [hoveredHex, setHoveredHex] = useState<{ q: number; r: number } | null>(null);

  const selectedShip = ships.find(s => s.ship.id === selectedShipId);
  const isMoving = selectedShipId !== null && selectedShipId !== undefined;

  // Map hex key → ships on it
  const shipsByHex: Record<string, HexShip[]> = {};
  for (const hs of ships) {
    const key = `${hs.state.q},${hs.state.r}`;
    if (!shipsByHex[key]) shipsByHex[key] = [];
    shipsByHex[key].push(hs);
  }

  function handleHexClick(q: number, r: number) {
    if (isMoving && onMoveShip && selectedShipId != null) {
      // Don't move onto a hex occupied by another ship
      const key = `${q},${r}`;
      const occupants = shipsByHex[key] ?? [];
      const blockedByOther = occupants.some(o => o.ship.id !== selectedShipId);
      if (!blockedByOther) {
        onMoveShip(selectedShipId, q, r);
        onSelectShip?.(null); // deselect after move
      }
    }
  }

  function handleShipClick(e: React.MouseEvent, shipId: number) {
    e.stopPropagation();
    if (selectedShipId === shipId) {
      onSelectShip?.(null); // deselect
    } else {
      onSelectShip?.(shipId);
    }
  }

  const selectedPos = selectedShip
    ? { q: selectedShip.state.q, r: selectedShip.state.r }
    : null;

  return (
    <div style={{ width: "100%", background: "#080f1e", borderRadius: 12, padding: 8, userSelect: "none" }}>
      {/* Status bar */}
      <div style={{ padding: "4px 8px 8px", fontSize: 12, color: "#64748b", minHeight: 22 }}>
        {isMoving && selectedShip ? (
          <span style={{ color: "#fbbf24" }}>
            Moving <b style={{ color: "#e2e8f0" }}>{selectedShip.ship.name}</b>
            {" "}— click a hex to move, click ship again to cancel
          </span>
        ) : (
          <span>Click a ship to select it, then click a hex to move it</span>
        )}
      </div>

      <HexGrid width={700} height={660} viewBox="-75 -72 150 145">
        <Layout size={{ x: 9, y: 9 }} flat={false} spacing={1.04} origin={{ x: 0, y: 0 }}>
          {HEXES.map(({ q, r, ring }) => {
            const key = `${q},${r}`;
            const occupants = shipsByHex[key] ?? [];
            const band = RANGE_BANDS[ring] as RangeBand;
            const fill = BAND_COLORS[band];
            const isHovered = hoveredHex?.q === q && hoveredHex?.r === r;
            const isSelectedShipHex = selectedPos?.q === q && selectedPos?.r === r;
            const isValidTarget = isMoving && !occupants.some(o => o.ship.id !== selectedShipId);

            return (
              <Hexagon
                key={key} q={q} r={r} s={-q - r}
                style={{
                  fill: isSelectedShipHex
                    ? "#fbbf24"
                    : isHovered && isMoving && isValidTarget
                    ? "#ffffff"
                    : fill,
                  fillOpacity: isSelectedShipHex ? 0.5 : isHovered && isMoving ? 0.5 : 0.18,
                  stroke: isSelectedShipHex ? "#fbbf24" : isHovered && isMoving ? "#fff" : fill,
                  strokeOpacity: isSelectedShipHex ? 1 : isHovered && isMoving ? 0.8 : 0.4,
                  strokeWidth: isSelectedShipHex ? 0.6 : 0.3,
                  cursor: isMoving && isValidTarget ? "crosshair" : isMoving ? "not-allowed" : "default",
                  transition: "fill-opacity 0.1s",
                }}
                onMouseEnter={() => setHoveredHex({ q, r })}
                onMouseLeave={() => setHoveredHex(null)}
                onClick={() => handleHexClick(q, r)}
              >
                {/* Range band label on ring-edge hexes */}
                {ring > 0 && q === ring && r === -ring && (
                  <Text style={{ fontSize: "2.5px", fill: fill, fillOpacity: 0.7, textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                    {band.replace("_", " ")}
                  </Text>
                )}

                {/* Ships on this hex */}
                {occupants.map((hs, idx) => {
                  const isSelected = hs.ship.id === selectedShipId;
                  const sideColor = hs.side === "a" ? "#3b82f6" : "#ef4444";
                  const offset = occupants.length > 1 ? (idx - (occupants.length - 1) / 2) * 4 : 0;

                  return (
                    <g key={hs.ship.id}
                      transform={`translate(${offset}, 0)`}
                      onClick={e => handleShipClick(e, hs.ship.id)}
                      style={{ cursor: "pointer" }}>
                      {/* Outer glow when selected */}
                      {isSelected && (
                        <circle cx={0} cy={0} r={4.5}
                          fill="none" stroke="#fbbf24" strokeWidth={0.8} strokeOpacity={0.9} />
                      )}
                      {/* Ship dot */}
                      <circle cx={0} cy={0} r={3}
                        fill={sideColor}
                        stroke={isSelected ? "#fbbf24" : "#fff"}
                        strokeWidth={isSelected ? 0.7 : 0.3}
                        fillOpacity={hs.state.disabled ? 0.4 : 1}
                      />
                      {/* HP bar */}
                      <rect x={-3} y={4} width={6} height={1}
                        fill="#334155" rx={0.3} />
                      <rect x={-3} y={4}
                        width={Math.max(0, 6 * (hs.state.hull_remaining / hs.ship.hull_points))}
                        height={1}
                        fill={hs.state.hull_remaining / hs.ship.hull_points > 0.5 ? "#4ade80" : hs.state.hull_remaining / hs.ship.hull_points > 0.25 ? "#facc15" : "#f87171"}
                        rx={0.3} />
                      {/* Name label */}
                      <Text y={8} style={{ fontSize: "2px", fill: "#e2e8f0", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                        {hs.ship.name.slice(0, 8)}
                      </Text>
                    </g>
                  );
                })}
              </Hexagon>
            );
          })}
        </Layout>
      </HexGrid>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 8px 2px", borderTop: "1px solid #1e293b", marginTop: 4 }}>
        {RANGE_BANDS.map((band, i) => (
          <div key={band} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#64748b" }}>
            <div style={{ width: 8, height: 8, background: BAND_COLORS[band], borderRadius: 2, opacity: 0.8 }} />
            <span>Ring {i}: {RANGE_LABELS[band].split("(")[0].trim()}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 10, color: "#64748b" }}>
          <span>🔵 Side A</span><span>🔴 Side B</span>
        </div>
      </div>
    </div>
  );
}
