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
