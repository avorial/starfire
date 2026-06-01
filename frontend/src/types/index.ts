export type HullConfig = "standard"|"streamlined"|"sphere"|"close_structure"|"dispersed_structure"|"planetoid"|"buffered_planetoid";
export type HullType = "standard"|"reinforced"|"light"|"military"|"non_gravity";
export type ArmorType = "none"|"titanium_steel"|"crystaliron"|"bonded_superdense"|"molecular_bonded";
export type DriveType = "maneuver"|"reaction";
export type PowerPlantType = "fission"|"chemical"|"fusion_tl8"|"fusion_tl12"|"fusion_tl15"|"antimatter";
export type BridgeType = "standard"|"small"|"command"|"cockpit"|"dual_cockpit";
export type SensorType = "basic"|"civilian"|"military"|"improved"|"advanced";

export type WeaponMount =
  |"fixed"|"single_turret"|"double_turret"|"triple_turret"
  |"barbette"|"small_bay"|"medium_bay"|"large_bay"|"spinal";

export type WeaponType =
  |"beam_laser"|"pulse_laser"|"laser_drill"|"fusion_gun"|"particle_beam"
  |"plasma_gun"|"railgun"|"missile_rack"|"missile_barbette"|"torpedo"
  |"sandcaster"|"ion_cannon"|"plasma_barbette"|"fusion_barbette"
  |"particle_barbette"|"railgun_barbette"|"missile_bay"|"torpedo_bay"
  |"particle_beam_bay"|"fusion_gun_bay"|"meson_gun_bay"
  |"meson_spinal"|"particle_spinal"
  |"repulsor"
  |"nuclear_damper"|"meson_screen"|"black_globe"|"white_globe";

export type RangeBand = "adjacent"|"close"|"short"|"medium"|"long"|"very_long"|"distant";

export const RANGE_BANDS: RangeBand[] = ["adjacent","close","short","medium","long","very_long","distant"];

export const RANGE_LABELS: Record<RangeBand, string> = {
  adjacent:  "Adjacent (1–10m)",
  close:     "Close (11–1,250km)",
  short:     "Short (1,251–10,000km)",
  medium:    "Medium (10,001–25,000km)",
  long:      "Long (25,001–50,000km)",
  very_long: "Very Long (50,001–300,000km)",
  distant:   "Distant (>300,000km)",
};

export const SENSOR_DM: Record<SensorType, number> = {
  basic: -4, civilian: -2, military: 0, improved: 1, advanced: 2,
};

export interface Weapon {
  id: number;
  ship_id: number;
  name: string;
  count: number;
  mount: WeaponMount;
  weapon_type: WeaponType;
  tl: number;
  power: number;
  damage_dice: number;
  damage_dm: number;
  damage_multiple: number;
  traits: string[];
  ammo_count: number;
  pop_up: boolean;
}

export interface Ship {
  id: number;
  name: string;
  tech_level: number;
  hull_tons: number;
  hull_config: HullConfig;
  hull_type: HullType;
  hull_points: number;
  armor_type: ArmorType;
  armor_value: number;
  stealth: boolean;
  reflec: boolean;
  radiation_shielding: boolean;
  self_sealing: boolean;
  m_drive_rating: number;
  m_drive_type: DriveType;
  j_drive_rating: number;
  power_plant_type: PowerPlantType;
  power_plant_tons: number;
  power_available: number;
  fuel_tons_jump: number;
  fuel_tons_reaction: number;
  bridge_type: BridgeType;
  computer_model: string;
  computer_processing: number;
  computer_bis: boolean;
  computer_fib: boolean;
  sensor_type: SensorType;
  sensor_dm: number;
  crew_captain: number;
  crew_pilot: number;
  crew_astrogator: number;
  crew_engineer: number;
  crew_maintenance: number;
  crew_gunners: number;
  crew_sensor_op: number;
  crew_steward: number;
  crew_medic: number;
  crew_admin: number;
  crew_officer: number;
  crew_marines: number;
  staterooms: number;
  staterooms_double: number;
  low_berths: number;
  emergency_low_berths: number;
  common_area_tons: number;
  cargo_tons: number;
  hardpoints: number;
  total_cost_mcr: number;
  image_url?: string;
  description?: string;
  extra: Record<string, unknown>;
  weapons: Weapon[];
}

export interface FleetMember { id: number; ship_id: number; count: number; }
export interface Fleet { id: number; name: string; members: FleetMember[]; }

export interface Battle {
  id: number; name: string; fleet_a_id: number; fleet_b_id: number;
  current_round: number; active: boolean; state: BattleState;
}

export interface BattleState {
  range_band: RangeBand; round: number; ships: Record<number, BattleShipState>;
}

export interface BattleShipState {
  hull_remaining: number; thrust_remaining: number; evasive: boolean; disabled: boolean; q: number; r: number;
}

export interface AttackResult {
  attack_roll: number; total_dm: number; total: number;
  hit: boolean; damage: number; critical: boolean; breakdown: Record<string, number>;
}
