import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createShip } from "../api/ships";
import type { Ship } from "../types";

const WEAPON_TYPES = [
  "pulse_laser", "beam_laser", "missile_rack", "sandcaster",
  "particle_beam", "meson_gun", "fusion_gun", "repulsor",
];

const MOUNTS = [
  "turret_single", "turret_double", "turret_triple",
  "bay_small", "bay_medium", "bay_large", "spinal",
];

const DEFAULT_SHIP: Omit<Ship, "id"> = {
  name: "",
  hull_tons: 100,
  hull_points: 20,
  armor: 0,
  thrust: 2,
  jump: 1,
  power_plant: 2,
  crew_captain: 1,
  crew_pilot: 1,
  crew_engineer: 1,
  crew_sensor_op: 0,
  crew_gunners: 0,
  crew_marines: 0,
  sensor_dm: 0,
  description: "",
  weapons: [],
};

export default function ShipBuilder() {
  const [ship, setShip] = useState<Omit<Ship, "id">>(DEFAULT_SHIP);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: createShip,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ships"] });
      setShip(DEFAULT_SHIP);
      alert("Ship saved!");
    },
  });

  function field(label: string, key: keyof typeof ship, type: "text" | "number" = "text") {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#94a3b8" }}>
        {label}
        <input
          type={type}
          value={ship[key] as string | number}
          onChange={e => setShip(s => ({ ...s, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
          style={inputStyle}
        />
      </label>
    );
  }

  function addWeapon() {
    setShip(s => ({
      ...s,
      weapons: [...s.weapons, { id: 0, ship_id: 0, name: "Laser Turret", mount: "turret_double", weapon_type: "pulse_laser", damage_dice: 1, damage_dm: 0, range_dms: {} }],
    }));
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, color: "#e2e8f0" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Ship Builder</h1>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Hull & Drives</h2>
        <div style={gridStyle}>
          {field("Name", "name")}
          {field("Hull (tons)", "hull_tons", "number")}
          {field("Hull Points", "hull_points", "number")}
          {field("Armor", "armor", "number")}
          {field("Thrust", "thrust", "number")}
          {field("Jump", "jump", "number")}
          {field("Power Plant", "power_plant", "number")}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Crew</h2>
        <div style={gridStyle}>
          {field("Captain", "crew_captain", "number")}
          {field("Pilot", "crew_pilot", "number")}
          {field("Engineer", "crew_engineer", "number")}
          {field("Sensor Operator", "crew_sensor_op", "number")}
          {field("Gunners", "crew_gunners", "number")}
          {field("Marines", "crew_marines", "number")}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Sensors</h2>
        <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#94a3b8" }}>
          Sensor DM (Military=0, Civilian=-2, Basic=-4)
          <select
            value={ship.sensor_dm}
            onChange={e => setShip(s => ({ ...s, sensor_dm: Number(e.target.value) }))}
            style={inputStyle}
          >
            <option value={0}>Military Grade (+0)</option>
            <option value={-2}>Civilian Grade (-2)</option>
            <option value={-4}>Basic (-4)</option>
            <option value={1}>Improved (+1)</option>
            <option value={2}>Advanced (+2)</option>
          </select>
        </label>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={h2Style}>Weapons</h2>
          <button onClick={addWeapon} style={btnStyle}>+ Add Weapon</button>
        </div>
        {ship.weapons.map((w, i) => (
          <div key={i} style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={gridStyle}>
              <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#94a3b8" }}>
                Name
                <input value={w.name} onChange={e => {
                  const ws = [...ship.weapons]; ws[i] = { ...w, name: e.target.value };
                  setShip(s => ({ ...s, weapons: ws }));
                }} style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#94a3b8" }}>
                Mount
                <select value={w.mount} onChange={e => {
                  const ws = [...ship.weapons]; ws[i] = { ...w, mount: e.target.value as typeof w.mount };
                  setShip(s => ({ ...s, weapons: ws }));
                }} style={inputStyle}>
                  {MOUNTS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#94a3b8" }}>
                Weapon Type
                <select value={w.weapon_type} onChange={e => {
                  const ws = [...ship.weapons]; ws[i] = { ...w, weapon_type: e.target.value as typeof w.weapon_type };
                  setShip(s => ({ ...s, weapons: ws }));
                }} style={inputStyle}>
                  {WEAPON_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#94a3b8" }}>
                Damage Dice
                <input type="number" value={w.damage_dice} onChange={e => {
                  const ws = [...ship.weapons]; ws[i] = { ...w, damage_dice: Number(e.target.value) };
                  setShip(s => ({ ...s, weapons: ws }));
                }} style={inputStyle} />
              </label>
            </div>
            <button onClick={() => setShip(s => ({ ...s, weapons: s.weapons.filter((_, j) => j !== i) }))}
              style={{ ...btnStyle, background: "#7f1d1d", marginTop: 8 }}>Remove</button>
          </div>
        ))}
      </section>

      <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
        Description
        <textarea value={ship.description ?? ""} rows={3}
          onChange={e => setShip(s => ({ ...s, description: e.target.value }))}
          style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <button
        onClick={() => mutation.mutate(ship)}
        disabled={mutation.isPending || !ship.name}
        style={{ ...btnStyle, width: "100%", fontSize: 16, padding: "12px 0", background: "#1d4ed8" }}
      >
        {mutation.isPending ? "Saving…" : "Save Ship"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
  color: "#e2e8f0", padding: "6px 8px", fontSize: 13,
};
const btnStyle: React.CSSProperties = {
  background: "#1e40af", color: "#fff", border: "none", borderRadius: 6,
  padding: "6px 14px", cursor: "pointer", fontSize: 13,
};
const sectionStyle: React.CSSProperties = {
  background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginBottom: 16,
};
const h2Style: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "#93c5fd", marginBottom: 12 };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
