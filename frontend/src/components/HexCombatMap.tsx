import { useState, useRef, useEffect } from "react";
import { HexGrid, Layout, Hexagon, Text } from "react-hexgrid";
import type { RangeBand, BattleShipState, Ship } from "../types";
import { RANGE_LABELS } from "../types";

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
  targetShipId?: number | null;
}

// ── Hex distance in Traveller range bands ──────────────────────────────────
// Each hex = roughly one range increment. Bands mapped to hex distances:
const RANGE_BAND_COLORS: Record<RangeBand, string> = {
  adjacent: "#f87171",   // 0 hexes  — red
  close:    "#fb923c",   // 1        — orange
  short:    "#facc15",   // 2–3      — yellow
  medium:   "#4ade80",   // 4–6      — green
  long:     "#38bdf8",   // 7–10     — sky
  very_long:"#818cf8",   // 11–15    — indigo
  distant:  "#a78bfa",   // 16+      — violet
};

export function distToRangeBand(dist: number): RangeBand {
  if (dist === 0) return "adjacent";
  if (dist === 1) return "close";
  if (dist <= 3)  return "short";
  if (dist <= 6)  return "medium";
  if (dist <= 10) return "long";
  if (dist <= 15) return "very_long";
  return "distant";
}

export function hexDist(aq: number, ar: number, bq: number, br: number) {
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs((-aq - ar) - (-bq - br)));
}

// ── Generate large wargame hex grid ───────────────────────────────────────
const GRID_RADIUS = 28;
const GRID_HEXES: { q: number; r: number }[] = [];
for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
  const r1 = Math.max(-GRID_RADIUS, -q - GRID_RADIUS);
  const r2 = Math.min(GRID_RADIUS, -q + GRID_RADIUS);
  for (let r = r1; r <= r2; r++) GRID_HEXES.push({ q, r });
}

// Coordinate labels — show every 4th hex
function coordLabel(q: number, r: number) {
  return `${q},${r}`;
}

export default function HexCombatMap({ ships, onMoveShip, onSelectShip, selectedShipId, targetShipId }: Props) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.7);
  const [hoveredHex, setHoveredHex] = useState<{ q: number; r: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Pan — window-level listeners so drag doesn't break when cursor leaves
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
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // Zoom — wheel on container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const factor = e.deltaY < 0 ? 1.1 : 0.91;
      setScale(s => Math.max(0.15, Math.min(4, s * factor)));
      setPan(p => ({ x: p.x + cx * (1 - factor), y: p.y + cy * (1 - factor) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Ships lookup ──────────────────────────────────────────────────────────
  const selectedShip = ships.find(s => s.ship.id === selectedShipId);
  const targetShip   = ships.find(s => s.ship.id === targetShipId);
  const isMoving     = selectedShipId != null;
  const thrust       = selectedShip?.state.thrust_remaining ?? 0;
  const srcQ         = selectedShip?.state.q ?? 0;
  const srcR         = selectedShip?.state.r ?? 0;
  const tgtQ         = targetShip?.state.q ?? null;
  const tgtR         = targetShip?.state.r ?? null;

  const shipsByHex: Record<string, HexShip[]> = {};
  for (const hs of ships) {
    const k = `${hs.state.q},${hs.state.r}`;
    (shipsByHex[k] ??= []).push(hs);
  }

  function isReachable(q: number, r: number) {
    if (!isMoving || !selectedShip) return false;
    const d = hexDist(srcQ, srcR, q, r);
    return d > 0 && d <= thrust;
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

  // Range band from target ship (for hex colouring)
  function hexRangeBand(q: number, r: number): RangeBand | null {
    if (tgtQ === null || tgtR === null) return null;
    return distToRangeBand(hexDist(q, r, tgtQ, tgtR));
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={e => {
        if (e.button !== 0) return;
        dragging.current = true;
        didDrag.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }}
      style={{
        width: "100%", height: "100%", position: "relative",
        overflow: "hidden", background: "#060d1a",
        cursor: "grab", userSelect: "none",
      }}
    >
      {/* ── Pannable / zoomable layer ── */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: `translate(-50%, -50%) translate(${pan.x}px,${pan.y}px) scale(${scale})`,
        transformOrigin: "50% 50%",
      }}>
        <HexGrid width={5200} height={5200} viewBox="-260 -260 520 520">
          <Layout size={{ x: 8.5, y: 8.5 }} flat={false} spacing={1.03} origin={{ x: 0, y: 0 }}>
            {GRID_HEXES.map(({ q, r }) => {
              const key = `${q},${r}`;
              const occupants = shipsByHex[key] ?? [];
              const reachable = isReachable(q, r);
              const hovered   = hoveredHex?.q === q && hoveredHex?.r === r;
              const isSrc     = selectedShip?.state.q === q && selectedShip?.state.r === r;
              const isTgt     = targetShip?.state.q === q && targetShip?.state.r === r;
              const rangeBand = hexRangeBand(q, r);
              const bandColor = rangeBand ? RANGE_BAND_COLORS[rangeBand] : null;
              const dist      = (tgtQ !== null && tgtR !== null) ? hexDist(q, r, tgtQ, tgtR) : null;
              const moveDist  = isMoving ? hexDist(srcQ, srcR, q, r) : null;

              // Hex fill colour logic:
              // 1. Source ship hex — gold tint
              // 2. Target ship hex — red tint
              // 3. Reachable + hovered — white highlight
              // 4. Reachable (in thrust range) — bright cyan
              // 5. If target set — colour by range band from target
              // 6. Default — dark space hex
              let fill = "#0d1b2a";
              let fillOpacity = 1;
              let strokeColor = "#1a2d45";
              let strokeOpacity = 1;
              let strokeWidth = 0.18;

              if (isSrc) {
                fill = "#92400e"; strokeColor = "#fbbf24"; strokeOpacity = 1; strokeWidth = 0.5;
              } else if (isTgt) {
                fill = "#7f1d1d"; strokeColor = "#ef4444"; strokeOpacity = 1; strokeWidth = 0.5;
              } else if (reachable && hovered) {
                fill = "#ffffff"; fillOpacity = 0.35; strokeColor = "#ffffff"; strokeOpacity = 0.9; strokeWidth = 0.4;
              } else if (reachable) {
                fill = "#164e63"; fillOpacity = 0.9; strokeColor = "#38bdf8"; strokeOpacity = 0.7; strokeWidth = 0.35;
              } else if (bandColor && !isMoving) {
                fill = bandColor; fillOpacity = 0.12; strokeColor = bandColor; strokeOpacity = 0.3; strokeWidth = 0.2;
              }

              return (
                <Hexagon
                  key={key} q={q} r={r} s={-q - r}
                  style={{ fill, fillOpacity, stroke: strokeColor, strokeOpacity, strokeWidth, cursor: reachable ? "pointer" : "inherit" }}
                  onMouseEnter={() => setHoveredHex({ q, r })}
                  onMouseLeave={() => setHoveredHex(null)}
                  onClick={() => handleHexClick(q, r)}
                >
                  {/* Coordinate label — every 4 hexes to keep it readable */}
                  {(q % 4 === 0 && r % 4 === 0) && (
                    <Text style={{ fontSize: "1.8px", fill: "#1e3a5f", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                      {coordLabel(q, r)}
                    </Text>
                  )}

                  {/* Movement cost on reachable hover */}
                  {reachable && hovered && moveDist != null && (
                    <Text style={{ fontSize: "3.5px", fill: "#fff", fontWeight: "bold", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                      {moveDist}T
                    </Text>
                  )}

                  {/* Range label on hovered hex when target set */}
                  {hovered && !isMoving && dist !== null && (
                    <Text style={{ fontSize: "2.8px", fill: bandColor ?? "#fff", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                      {distToRangeBand(dist).replace("_", " ")}
                    </Text>
                  )}

                  {/* Ships on this hex */}
                  {occupants.map((hs, idx) => {
                    const isSel     = hs.ship.id === selectedShipId;
                    const isTgtShip = hs.ship.id === targetShipId;
                    const total     = occupants.length;
                    const offset    = total > 1 ? (idx - (total - 1) / 2) * 5.5 : 0;
                    const hpPct     = hs.state.hull_remaining / hs.ship.hull_points;
                    const hpColor   = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#facc15" : "#f87171";
                    const shipColor = hs.side === "a" ? "#3b82f6" : "#ef4444";

                    return (
                      <g key={hs.ship.id}
                        transform={`translate(${offset}, -1)`}
                        style={{ cursor: "pointer" }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => handleShipClick(e, hs.ship.id)}
                      >
                        {/* Selection / target rings */}
                        {isSel     && <circle cx={0} cy={0} r={5.2} fill="none" stroke="#fbbf24" strokeWidth={0.8} />}
                        {isTgtShip && <circle cx={0} cy={0} r={5.2} fill="none" stroke="#ef4444" strokeWidth={0.8} strokeDasharray="1.5 1" />}

                        {/* Ship body */}
                        <circle cx={0} cy={0} r={3}
                          fill={shipColor}
                          stroke={isSel ? "#fbbf24" : isTgtShip ? "#ef4444" : "rgba(255,255,255,0.5)"}
                          strokeWidth={isSel || isTgtShip ? 0.6 : 0.2}
                          fillOpacity={hs.state.disabled ? 0.25 : 1}
                        />

                        {/* HP bar */}
                        <rect x={-3.3} y={4} width={6.6} height={1.2} fill="#0a0f1e" rx={0.4} />
                        <rect x={-3.3} y={4} width={Math.max(0, 6.6 * hpPct)} height={1.2} fill={hpColor} rx={0.4} />

                        {/* Thrust remaining when selected */}
                        {isSel && (
                          <Text y={-5.8} style={{ fontSize: "2.2px", fill: "#fbbf24", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                            {hs.state.thrust_remaining}T
                          </Text>
                        )}

                        {/* Ship name */}
                        <Text y={7.2} style={{ fontSize: "1.7px", fill: "#93c5fd", textAnchor: "middle", dominantBaseline: "middle", pointerEvents: "none" }}>
                          {hs.ship.name.slice(0, 12)}
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

      {/* ── Zoom controls ── */}
      <div style={{ position: "absolute", bottom: 100, left: 12, display: "flex", flexDirection: "column", gap: 4, zIndex: 20 }}>
        {([["＋", () => setScale(s => Math.min(4, s * 1.2))],
           ["－", () => setScale(s => Math.max(0.15, s / 1.2))],
           ["⌂",  () => { setScale(0.7); setPan({ x: 0, y: 0 }); }]] as const).map(([label, action]) => (
          <button key={label as string}
            onMouseDown={e => e.stopPropagation()}
            onClick={action as () => void}
            style={zBtn}>{label as string}</button>
        ))}
      </div>

      {/* ── Range band legend ── */}
      <div style={{
        position: "absolute", bottom: 10, left: 10, zIndex: 20,
        background: "rgba(6,13,26,0.93)", borderRadius: 8, padding: "7px 12px",
        border: "1px solid #1a2d45", pointerEvents: "none",
      }}>
        <div style={{ fontSize: 10, color: "#334155", marginBottom: 4 }}>
          Range bands (hex distance from target)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px" }}>
          {(["adjacent","close","short","medium","long","very_long","distant"] as RangeBand[]).map((band, i) => {
            const distances = ["0","1","2–3","4–6","7–10","11–15","16+"][i];
            return (
              <div key={band} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5 }}>
                <div style={{ width: 8, height: 8, background: RANGE_BAND_COLORS[band], borderRadius: 2, opacity: 0.9, flexShrink: 0 }} />
                <span style={{ color: "#475569" }}>{band.replace("_"," ")} <span style={{ color: "#1e3a5f" }}>({distances})</span></span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 5, fontSize: 9, color: "#1e3a5f", borderTop: "1px solid #1a2d45", paddingTop: 4 }}>
          Drag to pan · Scroll/pinch to zoom · Click ship → select · Click cyan hex → move
        </div>
      </div>

      {/* ── Moving banner ── */}
      {isMoving && selectedShip && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.5)",
          borderRadius: 20, padding: "5px 20px", fontSize: 12, color: "#fbbf24",
          backdropFilter: "blur(6px)", whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none",
        }}>
          Moving <b>{selectedShip.ship.name}</b> — {thrust}T remaining · cyan hexes reachable · click ship to cancel
        </div>
      )}

      {/* ── Range readout when hovering with target set ── */}
      {hoveredHex && targetShip && !isMoving && (() => {
        const d = hexDist(hoveredHex.q, hoveredHex.r, tgtQ!, tgtR!);
        const band = distToRangeBand(d);
        return (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            background: "rgba(6,13,26,0.9)", border: `1px solid ${RANGE_BAND_COLORS[band]}`,
            borderRadius: 20, padding: "4px 16px", fontSize: 12,
            color: RANGE_BAND_COLORS[band], whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none",
          }}>
            {d} hexes from {targetShip.ship.name} → <b>{band.replace("_"," ")}</b> range ({RANGE_LABELS[band]})
          </div>
        );
      })()}
    </div>
  );
}

const zBtn: React.CSSProperties = {
  width: 32, height: 32,
  background: "rgba(6,13,26,0.93)", border: "1px solid #1a2d45",
  borderRadius: 6, color: "#475569", cursor: "pointer",
  fontSize: 18, display: "flex", alignItems: "center",
  justifyContent: "center", padding: 0,
};
