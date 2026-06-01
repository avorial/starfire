import { useState, useRef, useCallback, useEffect } from "react";
import { HexGrid, Layout, Hexagon, Text } from "react-hexgrid";
import type { RangeBand, BattleShipState } from "../types";
import { RANGE_BANDS, RANGE_LABELS } from "../types";
import type { Ship } from "../types";

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
    { q: 1, r: -1 }, { q: 1, r: 0 },  { q: 0, r: 1 },
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
  // Pan/zoom stored as CSS transform values
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [hoveredHex, setHoveredHex] = useState<{ q: number; r: number } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  // Attach wheel listener imperatively so we can use passive:false
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // Mouse position relative to wrapper centre
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setScale(s => Math.max(0.25, Math.min(4, s * factor)));
      // Adjust pan so zoom centres on cursor
      setPan(p => ({
        x: p.x - mx * (factor - 1) / factor,
        y: p.y - my * (factor - 1) / factor,
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan with left button on background (not on ship circles)
    if (e.button !== 0) return;
    dragging.current = true;
    didDrag.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  // ── Ship/hex logic ──
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
    const dist = hexDist(srcQ, srcR, q, r);
    return dist > 0 && dist <= thrustRemaining;
  }

  function handleHexClick(q: number, r: number) {
    if (didDrag.current) return; // was a pan, not a click
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
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#080f1e" }}>
      {/* Pannable / zoomable layer */}
      <div
        ref={wrapperRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          width: "100%", height: "100%",
          cursor: dragging.current ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        {/* Inner transform layer */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
          transformOrigin: "center center",
          transition: dragging.current ? "none" : "transform 0.05s",
        }}>
          <HexGrid width={800} height={800} viewBox="-85 -85 170 170">
            <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.03} origin={{ x: 0, y: 0 }}>
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
                      fill: isCurrentPos ? "#fbbf24" : fill,
                      fillOpacity: isCurrentPos ? 0.45
                        : reachable && hovered ? 0.5
                        : reachable ? 0.28
                        : isMoving ? 0.05
                        : 0.14,
                      stroke: isCurrentPos ? "#fbbf24" : fill,
                      strokeOpacity: isCurrentPos ? 1 : reachable ? 0.7 : isMoving ? 0.1 : 0.3,
                      strokeWidth: isCurrentPos ? 0.7 : reachable ? 0.5 : 0.22,
                      cursor: reachable ? "pointer" : "inherit",
                    }}
                    onMouseEnter={() => setHoveredHex({ q, r })}
                    onMouseLeave={() => setHoveredHex(null)}
                    onClick={() => handleHexClick(q, r)}
                  >
                    {/* Range label */}
                    {ring > 0 && q === ring && r === -ring && (
                      <Text style={{ fontSize: "2.8px", fill: fill, fillOpacity: isMoving ? 0.2 : 0.55, textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                        {band.replace("_", " ")}
                      </Text>
                    )}

                    {/* Thrust cost on reachable hover */}
                    {reachable && hovered && (
                      <Text style={{ fontSize: "3.8px", fill: "#fff", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none", fontWeight: "bold" }}>
                        {dist}T
                      </Text>
                    )}

                    {/* Ships */}
                    {occupants.map((hs, idx) => {
                      const isSelected = hs.ship.id === selectedShipId;
                      const sideColor = hs.side === "a" ? "#3b82f6" : "#ef4444";
                      const total = occupants.length;
                      const offset = total > 1 ? (idx - (total - 1) / 2) * 6 : 0;
                      const hpPct = hs.state.hull_remaining / hs.ship.hull_points;
                      const hpColor = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#facc15" : "#f87171";

                      return (
                        <g key={hs.ship.id} transform={`translate(${offset}, -1)`}
                          onClick={e => handleShipClick(e, hs.ship.id)}
                          style={{ cursor: "pointer" }}>
                          {isSelected && (
                            <circle cx={0} cy={0} r={5.5} fill="none" stroke="#fbbf24" strokeWidth={0.8} strokeOpacity={0.95} />
                          )}
                          <circle cx={0} cy={0} r={3.2} fill={sideColor}
                            stroke={isSelected ? "#fbbf24" : "#fff"}
                            strokeWidth={isSelected ? 0.7 : 0.25}
                            fillOpacity={hs.state.disabled ? 0.3 : 1} />
                          <rect x={-3.5} y={4.2} width={7} height={1.3} fill="#0f172a" rx={0.4} />
                          <rect x={-3.5} y={4.2} width={Math.max(0, 7 * hpPct)} height={1.3} fill={hpColor} rx={0.4} />
                          {isSelected && (
                            <Text y={-6} style={{ fontSize: "2.4px", fill: "#fbbf24", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                              {hs.state.thrust_remaining}T
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
        </div>
      </div>

      {/* Zoom controls */}
      <div style={{ position: "absolute", bottom: 80, left: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { label: "+", action: () => setScale(s => Math.min(4, s * 1.25)) },
          { label: "−", action: () => setScale(s => Math.max(0.25, s / 1.25)) },
          { label: "⌂", action: () => { setScale(1); setPan({ x: 0, y: 0 }); } },
        ].map(({ label, action }) => (
          <button key={label} onClick={action} style={zoomBtn}>{label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 8, left: 8,
        background: "rgba(8,15,30,0.9)", borderRadius: 8, padding: "7px 10px",
        backdropFilter: "blur(6px)", border: "1px solid #1e293b", pointerEvents: "none",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", maxWidth: 300 }}>
          {RANGE_BANDS.map((band, i) => (
            <div key={band} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#64748b" }}>
              <div style={{ width: 7, height: 7, background: BAND_COLORS[band], borderRadius: 2, opacity: 0.85 }} />
              <span>R{i} {RANGE_LABELS[band].split("(")[0].trim()}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 4, fontSize: 9.5, color: "#334155" }}>
          Drag to pan · Scroll to zoom · Click ship · Click hex to move
        </div>
      </div>

      {/* Moving banner */}
      {isMoving && selectedHexShip && (
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.6)",
          borderRadius: 20, padding: "5px 18px", fontSize: 12, color: "#fbbf24",
          backdropFilter: "blur(6px)", whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          Moving <b>{selectedHexShip.ship.name}</b> — {thrustRemaining}T remaining · click ship again to cancel
        </div>
      )}
    </div>
  );
}

const zoomBtn: React.CSSProperties = {
  width: 30, height: 30, background: "rgba(10,15,30,0.9)",
  border: "1px solid #1e293b", borderRadius: 6, color: "#94a3b8",
  cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center",
  justifyContent: "center", backdropFilter: "blur(6px)", padding: 0,
};
