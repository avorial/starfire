import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { createShip, updateShip, fetchShip } from "../api/ships";
import type { Ship, Weapon, SensorType } from "../types";
import { SENSOR_DM } from "../types";

// ── lookup tables from High Guard ──────────────────────────────────────────
const WEAPON_TYPES = [
  // turret
  { v: "beam_laser",       l: "Beam Laser" },
  { v: "pulse_laser",      l: "Pulse Laser" },
  { v: "fusion_gun",       l: "Fusion Gun" },
  { v: "particle_beam",    l: "Particle Beam" },
  { v: "plasma_gun",       l: "Plasma Gun" },
  { v: "railgun",          l: "Railgun" },
  { v: "missile_rack",     l: "Missile Rack" },
  { v: "sandcaster",       l: "Sandcaster" },
  { v: "laser_drill",      l: "Laser Drill" },
  // barbette
  { v: "beam_laser",       l: "--- Barbettes ---", disabled: true },
  { v: "missile_barbette", l: "Missile Barbette" },
  { v: "torpedo",          l: "Torpedo Barbette" },
  { v: "particle_barbette",l: "Particle Barbette" },
  { v: "fusion_barbette",  l: "Fusion Barbette" },
  { v: "plasma_barbette",  l: "Plasma Barbette" },
  { v: "railgun_barbette", l: "Railgun Barbette" },
  { v: "ion_cannon",       l: "Ion Cannon" },
  // bay
  { v: "missile_bay",      l: "--- Bays ---", disabled: true },
  { v: "missile_bay",      l: "Missile Bay" },
  { v: "torpedo_bay",      l: "Torpedo Bay" },
  { v: "particle_beam_bay",l: "Particle Beam Bay" },
  { v: "fusion_gun_bay",   l: "Fusion Gun Bay" },
  { v: "meson_gun_bay",    l: "Meson Gun Bay" },
  // spinal
  { v: "meson_spinal",     l: "--- Spinal ---", disabled: true },
  { v: "meson_spinal",     l: "Meson Spinal Mount" },
  { v: "particle_spinal",  l: "Particle Spinal Mount" },
  // screens
  { v: "nuclear_damper",   l: "--- Screens ---", disabled: true },
  { v: "nuclear_damper",   l: "Nuclear Damper" },
  { v: "meson_screen",     l: "Meson Screen" },
  { v: "black_globe",      l: "Black Globe" },
  { v: "white_globe",      l: "White Globe" },
];

const MOUNTS = [
  { v: "fixed",          l: "Fixed Mount" },
  { v: "single_turret",  l: "Single Turret" },
  { v: "double_turret",  l: "Double Turret" },
  { v: "triple_turret",  l: "Triple Turret" },
  { v: "barbette",       l: "Barbette" },
  { v: "small_bay",      l: "Small Bay (50t)" },
  { v: "medium_bay",     l: "Medium Bay (100t)" },
  { v: "large_bay",      l: "Large Bay (500t)" },
  { v: "spinal",         l: "Spinal Mount" },
];

const defaultWeapon = (): Omit<Weapon, "id" | "ship_id"> => ({
  name: "Pulse Laser Turret", count: 1,
  mount: "double_turret", weapon_type: "pulse_laser",
  tl: 9, power: 4, damage_dice: 2, damage_dm: 0, damage_multiple: 1,
  traits: [], ammo_count: 0, pop_up: false,
});

const DEFAULT: Omit<Ship, "id"> = {
  name: "", tech_level: 12,
  hull_tons: 200, hull_config: "standard", hull_type: "standard", hull_points: 80,
  armor_type: "none", armor_value: 0,
  stealth: false, reflec: false, radiation_shielding: false, self_sealing: true,
  m_drive_rating: 2, m_drive_type: "maneuver", j_drive_rating: 1,
  power_plant_type: "fusion_tl8", power_plant_tons: 10, power_available: 100,
  fuel_tons_jump: 20, fuel_tons_reaction: 0,
  bridge_type: "standard",
  computer_model: "Computer/15", computer_processing: 15, computer_bis: false, computer_fib: false,
  sensor_type: "military", sensor_dm: 0,
  crew_captain: 1, crew_pilot: 1, crew_astrogator: 1, crew_engineer: 1,
  crew_maintenance: 0, crew_gunners: 0, crew_sensor_op: 0, crew_steward: 0,
  crew_medic: 0, crew_admin: 0, crew_officer: 0, crew_marines: 0,
  staterooms: 6, staterooms_double: 0, low_berths: 0, emergency_low_berths: 0, common_area_tons: 4,
  cargo_tons: 10, hardpoints: 2,
  total_cost_mcr: 0, image_url: "", description: "", extra: {},
  weapons: [],
};

type Tab = "hull"|"drives"|"bridge"|"crew"|"accommodation"|"weapons";

export default function ShipBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ship, setShip] = useState<Omit<Ship, "id">>(DEFAULT);
  const [tab, setTab] = useState<Tab>("hull");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load existing ship if editing
  useQuery({
    queryKey: ["ship", id],
    queryFn: () => fetchShip(Number(id)),
    enabled: !!id && id !== "new",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (data: any) => { setShip(data); return data; },
  });

  const saveMutation = useMutation({
    mutationFn: (s: Omit<Ship, "id">) =>
      id && id !== "new" ? updateShip(Number(id), s) : createShip(s),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["ships"] });
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
      if (!id || id === "new") navigate(`/ships/${saved.id}/edit`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Save failed: ${msg}`);
    },
  });

  function set<K extends keyof typeof ship>(k: K, v: typeof ship[K]) {
    setShip(s => ({ ...s, [k]: v }));
  }

  function numField(label: string, key: keyof typeof ship, opts?: { min?: number; max?: number; help?: string }) {
    return (
      <label style={labelStyle}>
        {label}{opts?.help && <span style={{ color: "#475569", fontWeight: 400, marginLeft: 4 }}>({opts.help})</span>}
        <input type="number" min={opts?.min ?? 0} max={opts?.max}
          value={ship[key] as number}
          onChange={e => set(key, Number(e.target.value) as typeof ship[typeof key])}
          style={inputStyle} />
      </label>
    );
  }

  function selectField<T extends string>(label: string, key: keyof typeof ship, options: { v: string; l: string; disabled?: boolean }[]) {
    return (
      <label style={labelStyle}>
        {label}
        <select value={ship[key] as T} onChange={e => set(key, e.target.value as typeof ship[typeof key])} style={inputStyle}>
          {options.map(o => <option key={o.v + o.l} value={o.v} disabled={o.disabled}>{o.l}</option>)}
        </select>
      </label>
    );
  }

  function boolField(label: string, key: keyof typeof ship) {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", cursor: "pointer" }}>
        <input type="checkbox" checked={ship[key] as boolean}
          onChange={e => set(key, e.target.checked as typeof ship[typeof key])}
          style={{ width: 16, height: 16, accentColor: "#3b82f6" }} />
        {label}
      </label>
    );
  }

  function addWeapon() {
    setShip(s => ({ ...s, weapons: [...s.weapons, { ...defaultWeapon(), id: 0, ship_id: 0 } as Weapon] }));
  }

  function updateWeapon(i: number, k: keyof Weapon, v: unknown) {
    setShip(s => {
      const ws = [...s.weapons];
      ws[i] = { ...ws[i], [k]: v };
      return { ...s, weapons: ws };
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "hull", label: "Hull & Armour" },
    { id: "drives", label: "Drives & Power" },
    { id: "bridge", label: "Bridge & Sensors" },
    { id: "crew", label: "Crew" },
    { id: "accommodation", label: "Accommodation" },
    { id: "weapons", label: `Weapons (${ship.weapons.length})` },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24, color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            {id && id !== "new" ? "Edit Ship" : "Build New Ship"}
          </h1>
          {ship.name && <div style={{ color: "#93c5fd", marginTop: 2 }}>{ship.name}</div>}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#94a3b8" }}>
          Ship Name *
          <input value={ship.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Type S Scout/Courier"
            style={{ ...inputStyle, width: 260, fontSize: 15, fontWeight: 600 }} />
        </label>
      </div>

      {/* Error / success banners */}
      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #b91c1c", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#fca5a5" }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ background: "#052e16", border: "1px solid #16a34a", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#86efac" }}>
          Ship saved successfully.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: "1px solid #1e293b", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "#1e40af" : "transparent",
            color: tab === t.id ? "#fff" : "#64748b",
            border: "none", borderRadius: "6px 6px 0 0", padding: "6px 14px",
            cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── HULL TAB ─────────────────────────────── */}
      {tab === "hull" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={sectionStyle}>
            <h2 style={h2Style}>Hull</h2>
            <div style={gridStyle}>
              {numField("Hull Tons", "hull_tons", { min: 5 })}
              {numField("Hull Points", "hull_points", { help: "1 per 2.5t standard" })}
              {numField("Tech Level", "tech_level", { min: 7, max: 20 })}
              {numField("Hardpoints", "hardpoints", { help: "hull_tons ÷ 100" })}
              {selectField("Hull Configuration", "hull_config", [
                { v: "standard",          l: "Standard" },
                { v: "streamlined",       l: "Streamlined (+20% cost, atmo capable)" },
                { v: "sphere",            l: "Sphere (-10% armour vol, +10% cost)" },
                { v: "close_structure",   l: "Close Structure (+50% armour vol, -20% cost)" },
                { v: "dispersed_structure",l:"Dispersed Structure (+100% armour vol, -50% cost)" },
                { v: "planetoid",         l: "Planetoid" },
                { v: "buffered_planetoid",l: "Buffered Planetoid" },
              ])}
              {selectField("Hull Type", "hull_type", [
                { v: "standard",   l: "Standard" },
                { v: "reinforced", l: "Reinforced (+50% cost, +10% HP)" },
                { v: "light",      l: "Light (-25% cost, -10% HP)" },
                { v: "military",   l: "Military (+25% cost, double armour cap, >5000t only)" },
                { v: "non_gravity",l: "Non-Gravity (-50% cost)" },
              ])}
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Armour</h2>
            <div style={gridStyle}>
              {selectField("Armour Type", "armor_type", [
                { v: "none",             l: "None" },
                { v: "titanium_steel",   l: "Titanium Steel (TL7, 2.5%/ton)" },
                { v: "crystaliron",      l: "Crystaliron (TL10, 1.25%/ton)" },
                { v: "bonded_superdense",l: "Bonded Superdense (TL14, 0.8%/ton)" },
                { v: "molecular_bonded", l: "Molecular Bonded (TL16, 0.5%/ton)" },
              ])}
              {numField("Armour Value", "armor_value", { help: "protection points" })}
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Hull Options</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {boolField("Self-Sealing (TL9+, auto-repairs minor breaches)", "self_sealing")}
              {boolField("Radiation Shielding — crew absorb 1,000 rads less; bridge hardened", "radiation_shielding")}
              {boolField("Reflec (+3 Protection vs lasers; cannot combine with Stealth)", "reflec")}
              {boolField("Stealth (DM to sensors checks to detect this ship)", "stealth")}
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Cost & Notes</h2>
            <div style={gridStyle}>
              {numField("Total Cost (MCr)", "total_cost_mcr")}
              {numField("Cargo Tons", "cargo_tons")}
            </div>
            <label style={{ ...labelStyle, marginTop: 12 }}>
              Description
              <textarea value={ship.description ?? ""} rows={3}
                onChange={e => set("description", e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            <label style={{ ...labelStyle, marginTop: 8 }}>
              Image URL
              <input value={ship.image_url ?? ""} onChange={e => set("image_url", e.target.value)} style={inputStyle} />
            </label>
          </div>
        </div>
      )}

      {/* ── DRIVES & POWER TAB ─────────────────── */}
      {tab === "drives" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={sectionStyle}>
            <h2 style={h2Style}>Manoeuvre Drive</h2>
            <div style={gridStyle}>
              {selectField("Drive Type", "m_drive_type", [
                { v: "maneuver", l: "Manoeuvre Drive (gravitic, no fuel)" },
                { v: "reaction", l: "Reaction Drive (uses fuel)" },
              ])}
              {numField("Drive Rating / Thrust", "m_drive_rating", { min: 0, max: 16, help: "0–16" })}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
              Manoeuvre drive tonnage = hull_tons × rating% (1%/rating). Cost MCr2/ton.
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Jump Drive</h2>
            <div style={gridStyle}>
              {numField("Jump Rating", "j_drive_rating", { min: 0, max: 9, help: "0 = no jump drive" })}
              {numField("Jump Fuel Tons", "fuel_tons_jump", { help: "10% hull × jump rating" })}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
              Jump drive tonnage = hull_tons × 2.5% × rating + 5 tons. Cost MCr1.5/ton. Min 100t hull to jump.
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Power Plant</h2>
            <div style={gridStyle}>
              {selectField("Power Plant Type", "power_plant_type", [
                { v: "fission",      l: "Fission (TL6, 8 Power/ton)" },
                { v: "chemical",     l: "Chemical (TL7, 5 Power/ton)" },
                { v: "fusion_tl8",   l: "Fusion TL8 (10 Power/ton)" },
                { v: "fusion_tl12",  l: "Fusion TL12 (15 Power/ton)" },
                { v: "fusion_tl15",  l: "Fusion TL15 (20 Power/ton)" },
                { v: "antimatter",   l: "Antimatter TL20 (100 Power/ton)" },
              ])}
              {numField("Power Plant Tons", "power_plant_tons")}
              {numField("Power Available", "power_available", { help: "tons × power_per_ton" })}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
              Power needs: Basic systems = 20% hull tons. M-Drive = 10% hull × thrust. Jump = 10% hull × jump rating.
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Fuel</h2>
            <div style={gridStyle}>
              {numField("Reaction Drive Fuel Tons", "fuel_tons_reaction", { help: "reaction drives only" })}
              {numField("Jump Fuel Tons", "fuel_tons_jump", { help: "10% hull × jump rating" })}
            </div>
          </div>
        </div>
      )}

      {/* ── BRIDGE & SENSORS TAB ──────────────── */}
      {tab === "bridge" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={sectionStyle}>
            <h2 style={h2Style}>Bridge</h2>
            <div style={gridStyle}>
              {selectField("Bridge Type", "bridge_type", [
                { v: "standard",    l: "Standard" },
                { v: "small",       l: "Small (one size down, DM-1 to ops checks)" },
                { v: "command",     l: "Command (+40t, ships >5000t, DM+1 Tactics)" },
                { v: "cockpit",     l: "Cockpit (1.5t, ships ≤50t, 24h life support)" },
                { v: "dual_cockpit",l: "Dual Cockpit (2.5t, ships ≤50t)" },
              ])}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
              Bridge sizes: ≤50t → 3t | 51–99t → 6t | 100–200t → 10t | 201–1000t → 20t | 1001–2000t → 40t | 2001–100000t → 60t
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Computer</h2>
            <div style={gridStyle}>
              {selectField("Computer Model", "computer_model", [
                { v: "Computer/5",  l: "Computer/5  (TL7,  Cr30k)" },
                { v: "Computer/10", l: "Computer/10 (TL9,  Cr160k)" },
                { v: "Computer/15", l: "Computer/15 (TL11, MCr2)" },
                { v: "Computer/20", l: "Computer/20 (TL12, MCr5)" },
                { v: "Computer/25", l: "Computer/25 (TL13, MCr10)" },
                { v: "Computer/30", l: "Computer/30 (TL14, MCr20)" },
                { v: "Computer/35", l: "Computer/35 (TL15, MCr30)" },
                { v: "Core/40",     l: "Core/40 (TL9,  MCr45)" },
                { v: "Core/50",     l: "Core/50 (TL10, MCr60)" },
                { v: "Core/60",     l: "Core/60 (TL11, MCr75)" },
                { v: "Core/70",     l: "Core/70 (TL12, MCr80)" },
                { v: "Core/80",     l: "Core/80 (TL13, MCr95)" },
                { v: "Core/90",     l: "Core/90 (TL14, MCr120)" },
                { v: "Core/100",    l: "Core/100 (TL15, MCr130)" },
              ])}
              {numField("Processing", "computer_processing")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {boolField("/bis — Jump Control Specialisation (+5 processing for Jump Control, +50% cost)", "computer_bis")}
              {boolField("/fib — Hardened Systems (immune to Ion weapons, +50% cost)", "computer_fib")}
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Sensors</h2>
            <div style={gridStyle}>
              {selectField("Sensor Suite", "sensor_type", [
                { v: "basic",    l: "Basic (DM-4, free, Lidar/Radar)" },
                { v: "civilian", l: "Civilian Grade (DM-2, MCr3, 1t)" },
                { v: "military", l: "Military Grade (DM+0, MCr4.1, 2t)" },
                { v: "improved", l: "Improved (DM+1, MCr4.3, 3t, +Densitometer)" },
                { v: "advanced", l: "Advanced (DM+2, MCr5.3, 5t, +NAS)" },
              ])}
              {numField("Sensor DM Override", "sensor_dm", { help: "auto-set by suite" })}
            </div>
            <button onClick={() => set("sensor_dm", SENSOR_DM[ship.sensor_type as SensorType])}
              style={{ ...btnSecondary, marginTop: 8 }}>
              Auto-set DM from suite
            </button>
          </div>
        </div>
      )}

      {/* ── CREW TAB ─────────────────────────────── */}
      {tab === "crew" && (
        <div style={sectionStyle}>
          <h2 style={h2Style}>Crew Complement</h2>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
            Commercial: 1 engineer per 35t drives+PP | 1 maintenance per 1000t | 1 gunner per turret/barbette/screen
            <br />Military: 1 gunner per small bay, 2 per turret/barbette/medium bay, 4 per large bay
          </div>
          <div style={gridStyle}>
            {numField("Captain", "crew_captain")}
            {numField("Pilot(s)", "crew_pilot")}
            {numField("Astrogator(s)", "crew_astrogator")}
            {numField("Engineer(s)", "crew_engineer")}
            {numField("Maintenance", "crew_maintenance")}
            {numField("Gunner(s)", "crew_gunners")}
            {numField("Sensor Operator(s)", "crew_sensor_op")}
            {numField("Steward(s)", "crew_steward")}
            {numField("Medic(s)", "crew_medic")}
            {numField("Administrator(s)", "crew_admin")}
            {numField("Officer(s)", "crew_officer")}
            {numField("Marines", "crew_marines")}
          </div>
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#0f172a", borderRadius: 6, fontSize: 12, color: "#94a3b8" }}>
            Total crew: {
              ship.crew_captain + ship.crew_pilot + ship.crew_astrogator + ship.crew_engineer +
              ship.crew_maintenance + ship.crew_gunners + ship.crew_sensor_op + ship.crew_steward +
              ship.crew_medic + ship.crew_admin + ship.crew_officer + ship.crew_marines
            }
          </div>
        </div>
      )}

      {/* ── ACCOMMODATION TAB ──────────────────── */}
      {tab === "accommodation" && (
        <div style={sectionStyle}>
          <h2 style={h2Style}>Accommodation</h2>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
            Standard stateroom: 4 tons, MCr0.5. Low berth: 0.5 ton, Cr50,000. Common areas: MCr0.1/ton.
          </div>
          <div style={gridStyle}>
            {numField("Staterooms (single)", "staterooms")}
            {numField("Staterooms (double occupancy)", "staterooms_double")}
            {numField("Low Berths", "low_berths")}
            {numField("Emergency Low Berths", "emergency_low_berths")}
            {numField("Common Area (tons)", "common_area_tons")}
          </div>
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#0f172a", borderRadius: 6, fontSize: 12, color: "#94a3b8" }}>
            Accommodation tonnage: {ship.staterooms * 4 + ship.staterooms_double * 4 + ship.low_berths * 0.5 + ship.emergency_low_berths + ship.common_area_tons}t
          </div>
        </div>
      )}

      {/* ── WEAPONS TAB ──────────────────────────── */}
      {tab === "weapons" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Hardpoints available: {ship.hardpoints} (1 per 100 tons)
            </div>
            <button onClick={addWeapon} style={btnPrimary}>+ Add Weapon / Screen</button>
          </div>

          {ship.weapons.length === 0 && (
            <div style={{ textAlign: "center", color: "#334155", padding: 40, fontSize: 14 }}>
              No weapons installed. Click + Add Weapon to begin.
            </div>
          )}

          {ship.weapons.map((w, i) => (
            <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: "#93c5fd" }}>Weapon #{i + 1}</span>
                <button onClick={() => setShip(s => ({ ...s, weapons: s.weapons.filter((_, j) => j !== i) }))}
                  style={{ ...btnSecondary, background: "#450a0a", color: "#fca5a5", fontSize: 11 }}>Remove</button>
              </div>
              <div style={gridStyle}>
                <label style={labelStyle}>
                  Name
                  <input value={w.name} onChange={e => updateWeapon(i, "name", e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Count (number installed)
                  <input type="number" min={1} value={w.count} onChange={e => updateWeapon(i, "count", Number(e.target.value))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Mount Type
                  <select value={w.mount} onChange={e => updateWeapon(i, "mount", e.target.value)} style={inputStyle}>
                    {MOUNTS.map(m => <option key={m.v + m.l} value={m.v}>{m.l}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Weapon Type
                  <select value={w.weapon_type} onChange={e => updateWeapon(i, "weapon_type", e.target.value)} style={inputStyle}>
                    {WEAPON_TYPES.map(t => <option key={t.v + t.l} value={t.v} disabled={t.disabled}>{t.l}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  TL
                  <input type="number" min={7} max={20} value={w.tl} onChange={e => updateWeapon(i, "tl", Number(e.target.value))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Power Required
                  <input type="number" min={0} value={w.power} onChange={e => updateWeapon(i, "power", Number(e.target.value))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Damage Dice (d6)
                  <input type="number" min={1} value={w.damage_dice} onChange={e => updateWeapon(i, "damage_dice", Number(e.target.value))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Damage DM (bonus)
                  <input type="number" value={w.damage_dm} onChange={e => updateWeapon(i, "damage_dm", Number(e.target.value))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Damage Multiple
                  <select value={w.damage_multiple} onChange={e => updateWeapon(i, "damage_multiple", Number(e.target.value))} style={inputStyle}>
                    <option value={1}>×1 (turret/fixed)</option>
                    <option value={3}>×3 (barbette)</option>
                    <option value={10}>×10 (small bay)</option>
                    <option value={20}>×20 (medium bay)</option>
                    <option value={100}>×100 (large bay)</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Ammo Count (0 if unlimited)
                  <input type="number" min={0} value={w.ammo_count} onChange={e => updateWeapon(i, "ammo_count", Number(e.target.value))} style={inputStyle} />
                </label>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>
                  Traits (comma-separated, e.g.: AP 3, Radiation, Smart)
                  <input value={w.traits.join(", ")} onChange={e => updateWeapon(i, "traits", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} style={inputStyle} />
                </label>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", marginTop: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={w.pop_up} onChange={e => updateWeapon(i, "pop_up", e.target.checked)} style={{ accentColor: "#3b82f6" }} />
                Pop-Up Mount (concealed until deployed)
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Save bar */}
      <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => saveMutation.mutate(ship)}
          disabled={saveMutation.isPending || !ship.name}
          style={{ ...btnPrimary, fontSize: 15, padding: "10px 32px", background: ship.name ? "#1d4ed8" : "#1e293b" }}
        >
          {saveMutation.isPending ? "Saving…" : !ship.name ? "Enter a ship name first" : "Save Ship"}
        </button>
        <button onClick={() => navigate("/ships")} style={{ ...btnSecondary }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
  color: "#e2e8f0", padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#94a3b8",
};
const btnPrimary: React.CSSProperties = {
  background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6,
  padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
};
const btnSecondary: React.CSSProperties = {
  background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6,
  padding: "7px 14px", cursor: "pointer", fontSize: 13,
};
const sectionStyle: React.CSSProperties = {
  background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16,
};
const h2Style: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: "#93c5fd", marginBottom: 12, marginTop: 0,
};
const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
};
