export type WeaponMount =
  | "turret_single" | "turret_double" | "turret_triple"
  | "bay_small" | "bay_medium" | "bay_large" | "spinal";

export type WeaponType =
  | "pulse_laser" | "beam_laser" | "missile_rack" | "sandcaster"
  | "particle_beam" | "meson_gun" | "fusion_gun" | "repulsor";

export type RangeBand =
  | "adjacent" | "close" | "short" | "medium" | "long" | "very_long" | "distant";

export const RANGE_BANDS: RangeBand[] = [
  "adjacent", "close", "short", "medium", "long", "very_long", "distant",
];

export const RANGE_LABELS: Record<RangeBand, string> = {
  adjacent: "Adjacent\n(1–10m)",
  close:    "Close\n(11–1,250km)",
  short:    "Short\n(1,251–10,000km)",
  medium:   "Medium\n(10,001–25,000km)",
  long:     "Long\n(25,001–50,000km)",
  very_long:"Very Long\n(50,001–300,000km)",
  distant:  "Distant\n(>300,000km)",
};

export interface Weapon {
  id: number;
  ship_id: number;
  name: string;
  mount: WeaponMount;
  weapon_type: WeaponType;
  damage_dice: number;
  damage_dm: number;
  range_dms: Record<string, number>;
}

export interface Ship {
  id: number;
  name: string;
  hull_tons: number;
  hull_points: number;
  armor: number;
  thrust: number;
  jump: number;
  power_plant: number;
  crew_captain: number;
  crew_pilot: number;
  crew_engineer: number;
  crew_sensor_op: number;
  crew_gunners: number;
  crew_marines: number;
  sensor_dm: number;
  image_url?: string;
  description?: string;
  weapons: Weapon[];
}

export interface FleetMember {
  id: number;
  ship_id: number;
  count: number;
}

export interface Fleet {
  id: number;
  name: string;
  members: FleetMember[];
}

export interface Battle {
  id: number;
  name: string;
  fleet_a_id: number;
  fleet_b_id: number;
  current_round: number;
  active: boolean;
  state: BattleState;
}

export interface BattleState {
  range_band: RangeBand;
  round: number;
  ships: Record<number, BattleShipState>;
}

export interface BattleShipState {
  hull_remaining: number;
  thrust_remaining: number;
  evasive: boolean;
  disabled: boolean;
  // hex grid position
  q: number;
  r: number;
}

export interface AttackResult {
  attack_roll: number;
  total_dm: number;
  total: number;
  hit: boolean;
  damage: number;
  critical: boolean;
  breakdown: Record<string, number>;
}
