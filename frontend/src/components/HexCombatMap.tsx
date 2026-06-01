import { useState, useRef, useCallback, useEffect } from "react";
import { HexGrid, Layout, Hexagon, Text } from "react-hexgrid";
import type { RangeBand, BattleShipState, Ship } from "../types";
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

function hexRing(radius: number) {
  if (radius === 0) return [{ q: 0, r: 0 }];
  const dirs = [
    { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  ];
  const results: { q: number; r: number }[] = [];
  let h = { q: radius, r: -radius };
  for (const dir of dirs)
    for (let i = 0; i < radius; i++) { results.push({ ...h }); h = { q: h.q + dir.q, r: h.r + dir.r }; }
  return results;
}

const HEXES = (() => {
  const out: { q: number; r: number; ring: number }[] = [];
  for (let r = 0; r <= 6; r++)
    for (const h of hexRing(r)) out.push({ ...h, ring: r });
  return out;
})();

export default function HexCombatMap({ ships, onMoveShip, onSelectShip, selectedShipId }: Props) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [hoveredHex, setHoveredHex] = useState<{ q: number; r: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // ── Pan: mousedown on container, move/up on window ──
  const onContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    didDrag.current = false;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) didDrag.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ── Zoom: wheel on container ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setScale(s => Math.max(0.2, Math.min(5, s * factor)));
      setPan(p => ({
        x: p.x + cx * (1 - factor),
        y: p.y + cy * (1 - factor),
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Ship / hex logic ──
  const selectedHexShip = ships.find(s => s.ship.id === selectedShipId);
  const isMoving = selectedShipId != null;
  const thrustRemaining = selectedHexShip?.state.thrust_remaining ?? 0;
  const srcQ = selectedHexShip?.state.q ?? 0;
  const srcR = selectedHexShip?.state.r ?? 0;

  const shipsByHex: Record<string, HexShip[]> = {};
  for (const hs of ships) {
    const k = `${hs.state.q},${hs.state.r}`;
    if (!shipsByHex[k]) shipsByHex[k] = [];
    shipsByHex[k].push(hs);
  }

  function isReachable(q: number, r: number) {
    if (!isMoving || !selectedHexShip) return false;
    return hexDist(srcQ, srcR, q, r) > 0 && hexDist(srcQ, srcR, q, r) <= thrustRemaining;
  }

  function handleHexClick(q: number, r: number) {
    if (didDrag.current) return;
    if (isMoving && selectedShipId != null && isReachable(q, r)) {
      onMoveShip?.(selectedShipId, q, r);
      onSelectShip?.(null);
    }
  }

  function handleShipClick(e: React.MouseEvent, shipId: number) {
    e.stopPropagation();
    if (didDrag.current) return;
    onSelectShip?.(selectedShipId === shipId ? null : shipId);
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={onContainerMouseDown}
      style={{
        width: "100%", height: "100%",
        position: "relative", overflow: "hidden",
        background: "#080f1e",
        cursor: dragging.current ? "grabbing" : "grab",
        userSelect: "none",
      }}
    >
      {/* Pannable / zoomable layer — centred, then offset by pan */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        transformOrigin: "50% 50%",
      }}>
        <HexGrid width={1100} height={1100} viewBox="-95 -95 190 190">
          <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.04} origin={{ x: 0, y: 0 }}>
            {HEXES.map(({ q, r, ring }) => {
              const key = `${q},${r}`;
              const occupants = shipsByHex[key] ?? [];
              const band = RANGE_BANDS[ring] as RangeBand;
              const fill = BAND_COLORS[band];
              const reachable = isReachable(q, r);
              const hovered = hoveredHex?.q === q && hoveredHex?.r === r;
              const isCurrentPos = selectedHexShip?.state.q === q && selectedHexShip?.state.r === r;
              const dist = reachable ? hexDist(srcQ, srcR, q, r) : 0;

              return (
                <Hexagon
                  key={key} q={q} r={r} s={-q - r}
                  style={{
                    fill: isCurrentPos ? "#92400e" : fill,
                    fillOpacity: isCurrentPos ? 0.6
                      : reachable && hovered ? 0.55
                      : reachable ? 0.32
                      : isMoving ? 0.05
                      : 0.15,
                    stroke: isCurrentPos ? "#fbbf24" : reachable ? "#fff" : fill,
                    strokeOpacity: isCurrentPos ? 1 : reachable ? 0.5 : isMoving ? 0.1 : 0.35,
                    strokeWidth: isCurrentPos ? 0.6 : reachable ? 0.4 : 0.22,
                    cursor: reachable ? "pointer" : "inherit",
                  }}
                  onMouseEnter={() => setHoveredHex({ q, r })}
                  onMouseLeave={() => setHoveredHex(null)}
                  onClick={() => handleHexClick(q, r)}
                >
                  {/* Range label at tip of each ring */}
                  {ring > 0 && q === ring && r === -ring && (
                    <Text style={{ fontSize: "2.8px", fill: fill, fillOpacity: isMoving ? 0.2 : 0.65, textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                      {band.replace("_", " ")}
                    </Text>
                  )}

                  {/* Thrust cost while hovering reachable hex */}
                  {reachable && hovered && (
                    <Text style={{ fontSize: "4px", fill: "#fff", fontWeight: "bold", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                      {dist}T
                    </Text>
                  )}

                  {/* Ships */}
                  {occupants.map((hs, idx) => {
                    const isSelected = hs.ship.id === selectedShipId;
                    const sideColor = hs.side === "a" ? "#3b82f6" : "#ef4444";
                    const total = occupants.length;
                    const offset = total > 1 ? (idx - (total - 1) / 2) * 6.5 : 0;
                    const hpPct = hs.state.hull_remaining / hs.ship.hull_points;
                    const hpColor = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#facc15" : "#f87171";

                    return (
                      <g key={hs.ship.id}
                        transform={`translate(${offset}, -1)`}
                        style={{ cursor: "pointer" }}
                        onMouseDown={e => e.stopPropagation()} // don't start pan when clicking a ship
                        onClick={e => handleShipClick(e, hs.ship.id)}
                      >
                        {isSelected && (
                          <circle cx={0} cy={0} r={5.8} fill="none" stroke="#fbbf24" strokeWidth={0.9} />
                        )}
                        <circle cx={0} cy={0} r={3.3}
                          fill={sideColor}
                          stroke={isSelected ? "#fbbf24" : "rgba(255,255,255,0.6)"}
                          strokeWidth={isSelected ? 0.7 : 0.25}
                          fillOpacity={hs.state.disabled ? 0.3 : 1}
                        />
                        {/* HP bar */}
                        <rect x={-3.8} y={4.3} width={7.6} height={1.4} fill="#0f172a" rx={0.4} />
                        <rect x={-3.8} y={4.3} width={Math.max(0, 7.6 * hpPct)} height={1.4} fill={hpColor} rx={0.4} />
                        {/* Thrust label when selected */}
                        {isSelected && (
                          <Text y={-6.5} style={{ fontSize: "2.4px", fill: "#fbbf24", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                            {hs.state.thrust_remaining}T
                          </Text>
                        )}
                        {/* Ship name */}
                        <Text y={7.8} style={{ fontSize: "2px", fill: "#cbd5e1", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
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
      </div>

      {/* Zoom buttons */}
      <div style={{ position: "absolute", bottom: 80, left: 12, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 }}>
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setScale(s => Math.min(5, s * 1.25))} style={zBtn}>+</button>
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setScale(s => Math.max(0.2, s / 1.25))} style={zBtn}>−</button>
        <button onMouseDown={e => e.stopPropagation()} onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} style={{ ...zBtn, fontSize: 13 }}>⌂</button>
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 10, left: 10, zIndex: 10,
        background: "rgba(8,15,30,0.92)", borderRadius: 8, padding: "7px 10px",
        backdropFilter: "blur(6px)", border: "1px solid #1e293b", pointerEvents: "none",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", maxWidth: 340 }}>
          {RANGE_BANDS.map((band, i) => (
            <div key={band} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#64748b" }}>
              <div style={{ width: 7, height: 7, background: BAND_COLORS[band], borderRadius: 2, opacity: 0.85, flexShrink: 0 }} />
              <span>Ring {i} — {RANGE_LABELS[band].split("(")[0].trim()}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 3, fontSize: 9, color: "#334155" }}>
          Drag to pan · Scroll to zoom · Click ship to select · Click lit hex to move
        </div>
      </div>

      {/* Moving status banner */}
      {isMoving && selectedHexShip && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(251,191,36,0.13)", border: "1px solid rgba(251,191,36,0.5)",
          borderRadius: 20, padding: "5px 20px", fontSize: 12, color: "#fbbf24",
          backdropFilter: "blur(6px)", whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none",
        }}>
          Moving <b>{selectedHexShip.ship.name}</b> — {thrustRemaining}T remaining · click ship again to cancel
        </div>
      )}
    </div>
  );
}

const zBtn: React.CSSProperties = {
  width: 30, height: 30,
  background: "rgba(10,15,30,0.92)", border: "1px solid #1e293b",
  borderRadius: 6, color: "#94a3b8", cursor: "pointer",
  fontSize: 18, display: "flex", alignItems: "center",
  justifyContent: "center", backdropFilter: "blur(6px)", padding: 0,
};
