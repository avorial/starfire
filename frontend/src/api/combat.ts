import { api } from "./client";
import type { Fleet, Battle, AttackResult, RangeBand } from "../types";

export const fetchFleets = () => api.get<Fleet[]>("/combat/fleets").then(r => r.data);
export const createFleet = (data: { name: string; members: { ship_id: number; count: number }[] }) =>
  api.post<Fleet>("/combat/fleets", data).then(r => r.data);

export const fetchBattles = () => api.get<Battle[]>("/combat/battles").then(r => r.data);
export const fetchBattle = (id: number) => api.get<Battle>(`/combat/battles/${id}`).then(r => r.data);
export const createBattle = (data: { name: string; fleet_a_id: number; fleet_b_id: number }) =>
  api.post<Battle>("/combat/battles", data).then(r => r.data);

export const resolveAttack = (data: {
  battle_id: number;
  attacker_ship_id: number;
  target_ship_id: number;
  weapon_id: number;
  gunner_skill: number;
  pilot_skill: number;
  range_band: RangeBand;
}) => api.post<AttackResult>("/combat/attack", data).then(r => r.data);
