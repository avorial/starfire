from pydantic import BaseModel
from typing import Optional
from app.models.combat import RangeBand


class FleetMemberCreate(BaseModel):
    ship_id: int
    count: int = 1


class FleetMemberRead(BaseModel):
    id: int
    ship_id: int
    count: int
    model_config = {"from_attributes": True}


class FleetCreate(BaseModel):
    name: str
    members: list[FleetMemberCreate] = []


class FleetRead(BaseModel):
    id: int
    name: str
    members: list[FleetMemberRead] = []
    model_config = {"from_attributes": True}


class BattleCreate(BaseModel):
    name: str
    fleet_a_id: int
    fleet_b_id: int


class BattleRead(BaseModel):
    id: int
    name: str
    fleet_a_id: int
    fleet_b_id: int
    current_round: int
    active: bool
    state: dict
    model_config = {"from_attributes": True}


class AttackAction(BaseModel):
    battle_id: int
    attacker_ship_id: int
    target_ship_id: int
    weapon_id: int
    gunner_skill: int = 0
    pilot_skill: int = 0
    dogfight_dm: int = 0
    evasive_target: bool = False   # target declared evasive action this round
    range_band: RangeBand


class ManeuverAction(BaseModel):
    battle_id: int
    ship_id: int
    thrust_spent: int
    current_range_band: RangeBand
    target_range_band: RangeBand
