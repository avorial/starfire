import { api } from "./client";
import type { Ship } from "../types";

export const fetchShips = () => api.get<Ship[]>("/ships/").then(r => r.data);
export const fetchShip = (id: number) => api.get<Ship>(`/ships/${id}`).then(r => r.data);
export const createShip = (data: Omit<Ship, "id">) => api.post<Ship>("/ships/", data).then(r => r.data);
export const updateShip = (id: number, data: Omit<Ship, "id">) => api.put<Ship>(`/ships/${id}`, data).then(r => r.data);
export const deleteShip = (id: number) => api.delete(`/ships/${id}`);
