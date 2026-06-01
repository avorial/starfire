import React, { useState } from "react";
import { HexGrid, Layout, Hexagon, Text, GridGenerator } from "react-hexgrid";
import type { Ship, RangeBand, BattleShipState } from "../types";
import { RANGE_BANDS, RANGE_LABELS } from "../types";

interface HexShip {
  ship: Ship;
  state: BattleShipState;
  side: "a" | "b";
}

interface Props {
  ships: HexShip[];
  selectedShipId?: number;
  onSelectShip?: (shipId: number) => void;
  onMoveShip?: (shipId: number, q: number, r: number) => void;
}

// Range band ring radii — each ring represents a range band
const RING_RADII: Record<RangeBand, number> = {
  adjacent: 1,
  close:    2,
  short:    3,
  medium:   4,
  long:     5,
  very_long:6,
  distant:  7,
};

const BAND_COLORS: Record<RangeBand, string> = {
  adjacent: "#f87171",   // red-400
  close:    "#fb923c",   // orange-400
  short:    "#facc15",   // yellow-400
  medium:   "#4ade80",   // green-400
  long:     "#38bdf8",   // sky-400
  very_long:"#818cf8",   // indigo-400
  distant:  "#a78bfa",   // violet-400
};

function hexRing(center: { q: number; r: number }, radius: number) {
  const results: { q: number; r: number }[] = [];
  if (radius === 0) return [center];
  let h = { q: center.q + radius, r: center.r - radius };
  const directions = [
    { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  ];
  for (const dir of directions) {
    for (let i = 0; i < radius; i++) {
      results.push({ ...h });
      h = { q: h.q + dir.q, r: h.r + dir.r };
    }
  }
  return results;
}

function hexesUpToRadius(radius: number) {
  const all: { q: number; r: number; band: RangeBand }[] = [];
  for (let r = 0; r <= radius; r++) {
    const band = RANGE_BANDS[Math.min(r, RANGE_BANDS.length - 1)];
    for (const hex of hexRing({ q: 0, r: 0 }, r)) {
      all.push({ ...hex, band });
    }
  }
  return all;
}

const CENTER = { q: 0, r: 0 };

export default function HexCombatMap({ ships, selectedShipId, onSelectShip, onMoveShip }: Props) {
  const [moveMode, setMoveMode] = useState<number | null>(null);
  const hexes = hexesUpToRadius(7);

  const shipsByHex: Record<string, HexShip[]> = {};
  for (const hs of ships) {
    const key = `${hs.state.q},${hs.state.r}`;
    if (!shipsByHex[key]) shipsByHex[key] = [];
    shipsByHex[key].push(hs);
  }

  function handleHexClick(q: number, r: number) {
    if (moveMode !== null && onMoveShip) {
      onMoveShip(moveMode, q, r);
      setMoveMode(null);
    }
  }

  return (
    <div className="hex-combat-map" style={{ width: "100%", background: "#0f172a", borderRadius: 12, padding: 8 }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 8px", marginBottom: 4 }}>
        {RANGE_BANDS.map(band => (
          <div key={band} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#e2e8f0" }}>
            <div style={{ width: 12, height: 12, background: BAND_COLORS[band], borderRadius: 2, opacity: 0.7 }} />
            <span>{band.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      <HexGrid width={700} height={700} viewBox="-75 -75 150 150">
        <Layout size={{ x: 8, y: 8 }} flat={false} spacing={1.05} origin={{ x: 0, y: 0 }}>
          {hexes.map(({ q, r, band }) => {
            const key = `${q},${r}`;
            const occupants = shipsByHex[key] ?? [];
            const isMoveTarget = moveMode !== null;
            const fill = BAND_COLORS[band];

            return (
              <Hexagon
                key={key}
                q={q}
                r={r}
                s={-q - r}
                style={{
                  fill: fill,
                  fillOpacity: 0.25,
                  stroke: isMoveTarget ? "#fff" : fill,
                  strokeOpacity: isMoveTarget ? 0.6 : 0.5,
                  strokeWidth: 0.3,
                  cursor: isMoveTarget ? "crosshair" : "default",
                }}
                onClick={() => handleHexClick(q, r)}
              >
                {occupants.map((hs, i) => (
                  <g key={hs.ship.id} transform={`translate(${i * 2 - 1}, 0)`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={2.5}
                      fill={hs.side === "a" ? "#3b82f6" : "#ef4444"}
                      stroke={selectedShipId === hs.ship.id ? "#fbbf24" : "#fff"}
                      strokeWidth={selectedShipId === hs.ship.id ? 0.8 : 0.3}
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectShip?.(hs.ship.id);
                      }}
                    />
                    <Text
                      style={{ fontSize: "2px", fill: "#fff", textAnchor: "middle", dominantBaseline: "middle" }}
                      y={5}
                    >
                      {hs.ship.name.slice(0, 6)}
                    </Text>
                  </g>
                ))}
              </Hexagon>
            );
          })}
          {/* Center marker (ship A anchor) */}
          <Hexagon q={0} r={0} s={0} style={{ fill: "none", stroke: "#fbbf24", strokeWidth: 0.5, fillOpacity: 0 }}>
            <Text style={{ fontSize: "3px", fill: "#fbbf24", textAnchor: "middle" }}>⚓</Text>
          </Hexagon>
        </Layout>
      </HexGrid>

      {/* Range band labels sidebar */}
      <div style={{ padding: "4px 8px" }}>
        {RANGE_BANDS.map(band => (
          <div key={band} style={{
            display: "flex", alignItems: "center", gap: 8,
            borderLeft: `3px solid ${BAND_COLORS[band]}`,
            paddingLeft: 6, marginBottom: 2, fontSize: 11, color: "#94a3b8"
          }}>
            <span style={{ color: BAND_COLORS[band], fontWeight: 600, minWidth: 70, textTransform: "capitalize" }}>
              {band.replace("_", " ")}
            </span>
            <span>{RANGE_LABELS[band].replace("\n", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
