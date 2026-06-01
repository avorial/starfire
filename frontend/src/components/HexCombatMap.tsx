import { useState, useRef, useCallback } from "react";
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

function hexDist(aq: number, ar: number, bq: number, br: number) {
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs((-aq - ar) - (-bq - br)));
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

const HEXES = (() => {
  const out: { q: number; r: number; ring: number }[] = [];
  for (let r = 0; r <= 6; r++)
    for (const h of hexRing(r)) out.push({ ...h, ring: r });
  return out;
})();

const HEX_SIZE = 10; // logical units per hex radius in the viewBox

export default function HexCombatMap({ ships, onMoveShip, onSelectShip, selectedShipId }: Props) {
  // ViewBox pan/zoom state
  const [vb, setVb] = useState({ x: -90, y: -90, w: 180, h: 180 });
  const [hoveredHex, setHoveredHex] = useState<{ q: number; r: number } | null>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Pan via drag on SVG background ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      dragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = vb.w / rect.width;
    const scaleY = vb.h / rect.height;
    const dx = (e.clientX - lastMouse.current.x) * scaleX;
    const dy = (e.clientY - lastMouse.current.y) * scaleY;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setVb(v => ({ ...v, x: v.x - dx, y: v.y - dy }));
  }, [vb.w, vb.h]);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 0.89;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Zoom toward mouse pointer
    const mx = vb.x + (e.clientX - rect.left) / rect.width * vb.w;
    const my = vb.y + (e.clientY - rect.top) / rect.height * vb.h;
    setVb(v => {
      const nw = Math.max(60, Math.min(600, v.w * factor));
      const nh = Math.max(60, Math.min(600, v.h * factor));
      return {
        x: mx - (mx - v.x) * (nw / v.w),
        y: my - (my - v.y) * (nh / v.h),
        w: nw,
        h: nh,
      };
    });
  }, [vb]);

  const selectedHexShip = ships.find(s => s.ship.id === selectedShipId);
  const isMoving = selectedShipId != null;
  const thrustRemaining = selectedHexShip?.state.thrust_remaining ?? 0;
  const srcQ = selectedHexShip?.state.q ?? 0;
  const srcR = selectedHexShip?.state.r ?? 0;

  // Ships indexed by hex — multiple ships allowed on same hex (same range band)
  const shipsByHex: Record<string, HexShip[]> = {};
  for (const hs of ships) {
    const k = `${hs.state.q},${hs.state.r}`;
    if (!shipsByHex[k]) shipsByHex[k] = [];
    shipsByHex[k].push(hs);
  }

  function isReachable(q: number, r: number) {
    if (!isMoving || !selectedHexShip) return false;
    const dist = hexDist(srcQ, srcR, q, r);
    // Any hex within thrust range is reachable — multiple ships share range bands
    return dist > 0 && dist <= thrustRemaining;
  }

  // Track whether this click was a drag or a true click
  const mouseDownPos = useRef({ x: 0, y: 0 });

  function handleSvgMouseDown(e: React.MouseEvent) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    onMouseDown(e);
  }

  function handleHexClick(e: React.MouseEvent, q: number, r: number) {
    e.stopPropagation();
    // If mouse moved significantly it was a drag, not a click
    const moved = Math.abs(e.clientX - mouseDownPos.current.x) > 4 ||
                  Math.abs(e.clientY - mouseDownPos.current.y) > 4;
    if (moved) return;

    if (isMoving && selectedShipId != null && isReachable(q, r)) {
      onMoveShip?.(selectedShipId, q, r);
      onSelectShip?.(null);
    }
  }

  function handleShipClick(e: React.MouseEvent, shipId: number) {
    e.stopPropagation();
    const moved = Math.abs(e.clientX - mouseDownPos.current.x) > 4 ||
                  Math.abs(e.clientY - mouseDownPos.current.y) > 4;
    if (moved) return;
    onSelectShip?.(selectedShipId === shipId ? null : shipId);
  }

  const viewBoxStr = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", cursor: dragging.current ? "grabbing" : "grab" }}>
      <HexGrid
        width="100%" height="100%"
        viewBox={viewBoxStr}
        style={{ display: "block" }}
      >
        {/* Attach pan/zoom to the SVG element via a transparent rect background */}
        <rect
          x={vb.x} y={vb.y} width={vb.w} height={vb.h}
          fill="transparent"
          onMouseDown={handleSvgMouseDown as React.MouseEventHandler<SVGRectElement>}
          onMouseMove={onMouseMove as React.MouseEventHandler<SVGRectElement>}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel as React.WheelEventHandler<SVGRectElement>}
        />

        <Layout size={{ x: HEX_SIZE, y: HEX_SIZE }} flat={false} spacing={1.03} origin={{ x: 0, y: 0 }}>
          {HEXES.map(({ q, r, ring }) => {
            const key = `${q},${r}`;
            const occupants = shipsByHex[key] ?? [];
            const band = RANGE_BANDS[ring] as RangeBand;
            const fill = BAND_COLORS[band];
            const reachable = isReachable(q, r);
            const hovered = hoveredHex?.q === q && hoveredHex?.r === r;
            const isCurrentPos = selectedHexShip?.state.q === q && selectedHexShip?.state.r === r;
            const dist = isMoving && reachable ? hexDist(srcQ, srcR, q, r) : 0;

            return (
              <Hexagon
                key={key} q={q} r={r} s={-q - r}
                style={{
                  fill: isCurrentPos ? "#fbbf24"
                    : reachable && hovered ? "#fff"
                    : fill,
                  fillOpacity: isCurrentPos ? 0.45
                    : reachable && hovered ? 0.5
                    : reachable ? 0.28
                    : isMoving ? 0.05
                    : 0.14,
                  stroke: isCurrentPos ? "#fbbf24"
                    : reachable ? fill
                    : fill,
                  strokeOpacity: isCurrentPos ? 1
                    : reachable ? 0.65
                    : isMoving ? 0.1
                    : 0.3,
                  strokeWidth: isCurrentPos ? 0.6 : reachable ? 0.45 : 0.22,
                  cursor: reachable ? "pointer" : "inherit",
                  transition: "fill-opacity 0.08s",
                }}
                onMouseEnter={() => setHoveredHex({ q, r })}
                onMouseLeave={() => setHoveredHex(null)}
                onClick={e => handleHexClick(e, q, r)}
                onMouseDown={handleSvgMouseDown as React.MouseEventHandler<SVGGElement>}
                onMouseMove={onMouseMove as React.MouseEventHandler<SVGGElement>}
                onMouseUp={onMouseUp}
                onWheel={onWheel as React.WheelEventHandler<SVGGElement>}
              >
                {/* Range band label */}
                {ring > 0 && q === ring && r === -ring && (
                  <Text style={{ fontSize: "2.8px", fill: fill, fillOpacity: isMoving ? 0.2 : 0.55, textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                    {band.replace("_", " ")}
                  </Text>
                )}

                {/* Thrust cost on hover */}
                {reachable && hovered && (
                  <Text style={{ fontSize: "3.5px", fill: "#fff", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none", fontWeight: "bold" }}>
                    {dist}T
                  </Text>
                )}

                {/* Ships on this hex */}
                {occupants.map((hs, idx) => {
                  const isSelected = hs.ship.id === selectedShipId;
                  const sideColor = hs.side === "a" ? "#3b82f6" : "#ef4444";
                  const total = occupants.length;
                  // Stack multiple ships side by side
                  const offset = total > 1 ? (idx - (total - 1) / 2) * 6 : 0;
                  const hpPct = hs.state.hull_remaining / hs.ship.hull_points;
                  const hpColor = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#facc15" : "#f87171";

                  return (
                    <g key={hs.ship.id} transform={`translate(${offset}, -1)`}
                      onClick={e => handleShipClick(e, hs.ship.id)}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ cursor: "pointer" }}>
                      {isSelected && (
                        <circle cx={0} cy={0} r={5.5} fill="none"
                          stroke="#fbbf24" strokeWidth={0.8} strokeOpacity={0.95} />
                      )}
                      <circle cx={0} cy={0} r={3.2}
                        fill={sideColor}
                        stroke={isSelected ? "#fbbf24" : "#fff"}
                        strokeWidth={isSelected ? 0.7 : 0.25}
                        fillOpacity={hs.state.disabled ? 0.3 : 1}
                      />
                      {/* HP bar */}
                      <rect x={-3.5} y={4.2} width={7} height={1.3} fill="#0f172a" rx={0.4} />
                      <rect x={-3.5} y={4.2} width={Math.max(0, 7 * hpPct)} height={1.3} fill={hpColor} rx={0.4} />
                      {/* Thrust pip when selected */}
                      {isSelected && (
                        <Text y={-5.8} style={{ fontSize: "2.4px", fill: "#fbbf24", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                          {hs.state.thrust_remaining}T left
                        </Text>
                      )}
                      <Text y={7.5} style={{ fontSize: "1.9px", fill: "#cbd5e1", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
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

      {/* Zoom controls */}
      <div style={{ position: "absolute", bottom: 70, left: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <button onClick={() => setVb(v => zoom(v, 0.8))} style={zoomBtn}>+</button>
        <button onClick={() => setVb(v => zoom(v, 1.25))} style={zoomBtn}>−</button>
        <button onClick={() => setVb({ x: -90, y: -90, w: 180, h: 180 })} style={{ ...zoomBtn, fontSize: 10 }}>⌂</button>
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 8, left: 8,
        background: "rgba(8,15,30,0.88)", borderRadius: 8, padding: "7px 10px",
        backdropFilter: "blur(6px)", border: "1px solid #1e293b",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", maxWidth: 280 }}>
          {RANGE_BANDS.map((band, i) => (
            <div key={band} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#64748b" }}>
              <div style={{ width: 7, height: 7, background: BAND_COLORS[band], borderRadius: 2, opacity: 0.85, flexShrink: 0 }} />
              <span>R{i} {RANGE_LABELS[band].split("(")[0].trim()}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 4, fontSize: 9.5, color: "#334155" }}>
          Drag to pan · Scroll to zoom · Click ship to select · Click hex to move
        </div>
      </div>

      {/* Moving status banner */}
      {isMoving && selectedHexShip && (
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.6)",
          borderRadius: 20, padding: "5px 18px", fontSize: 12, color: "#fbbf24",
          backdropFilter: "blur(6px)", whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          Moving <b>{selectedHexShip.ship.name}</b> — {thrustRemaining}T remaining
          &nbsp;·&nbsp; <span style={{ color: "#94a3b8" }}>click ship again to cancel</span>
        </div>
      )}
    </div>
  );
}

function zoom(v: { x: number; y: number; w: number; h: number }, factor: number) {
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const nw = Math.max(60, Math.min(600, v.w * factor));
  const nh = Math.max(60, Math.min(600, v.h * factor));
  return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
}

const zoomBtn: React.CSSProperties = {
  width: 28, height: 28, background: "rgba(10,15,30,0.88)",
  border: "1px solid #1e293b", borderRadius: 6, color: "#94a3b8",
  cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center",
  justifyContent: "center", backdropFilter: "blur(6px)", padding: 0,
};
