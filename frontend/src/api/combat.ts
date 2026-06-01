import { api } from "./client";
import type { Fleet, Battle, AttackResult, RangeBand, Ship } from "../types";

export const fetchFleets = () => api.get<Fleet[]>("/combat/fleets").then(r => r.data);
export const createFleet = (data: { name: string; members: { ship_id: number; count: number }[] }) =>
  api.post<Fleet>("/combat/fleets", data).then(r => r.data);

export const fetchBattles = () => api.get<Battle[]>("/combat/battles").then(r => r.data);
export const fetchBattle  = (id: number) => api.get<Battle>(`/combat/battles/${id}`).then(r => r.data);
export const createBattle = (data: { name: string; fleet_a_id: number; fleet_b_id: number }) =>
  api.post<Battle>("/combat/battles", data).then(r => r.data);

export interface BattleShipEntry { side: "a" | "b"; count: number; ship: Ship; }
export const fetchBattleShips = (battleId: number) =>
  api.get<{ battle_id: number; ships: BattleShipEntry[] }>(`/combat/battles/${battleId}/ships`).then(r => r.data);

export interface InitiativeEntry { ship_id: number; ship_name: string; side: "a" | "b"; roll: number; }
export const rollInitiative = (battleId: number) =>
  api.post<{ initiative_order: InitiativeEntry[] }>(`/combat/battles/${battleId}/initiative`).then(r => r.data);

export interface PointDefenceResult {
  missiles_in_salvo: number; missiles_destroyed: number; missiles_surviving: number;
  rolls: { missile: number; roll: number; total: number; destroyed: boolean }[];
  weapon_pd_dm: number;
}
export const pointDefence = (data: {
  defender_ship_id: number; defence_weapon_id: number;
  gunner_skill: number; missiles_in_salvo: number;
}) => api.post<PointDefenceResult>("/combat/missile/point-defence", data).then(r => r.data);

export interface MissileArrivalResult {
  surviving_missiles: number; hit: boolean; damage: number; critical: boolean;
  screen_blocked: boolean; attack_roll?: number; total_dm?: number; total?: number;
  effect?: number; breakdown?: Record<string, number>;
  critical_details?: { location: string; severity: number; result: string };
  message?: string;
}
export const resolveMissile = (data: {
  attacker_ship_id: number; target_ship_id: number; weapon_id: number;
  gunner_skill: number; range_band: string; sand_dm: number;
  missiles_destroyed: number; missiles_total: number; evasive_target: boolean;
}) => api.post<MissileArrivalResult>("/combat/missile/resolve", data).then(r => r.data);

export const resolveAttack = (data: {
  battle_id: number;
  attacker_ship_id: number;
  target_ship_id: number;
  weapon_id: number;
  gunner_skill: number;
  pilot_skill: number;
  dogfight_dm: number;
  evasive_target: boolean;
  range_band: RangeBand;
}) => api.post<AttackResult>("/combat/attack", data).then(r => r.data);
