from pydantic import BaseModel
from typing import Optional
from app.models.ship import WeaponMount, WeaponType


class WeaponBase(BaseModel):
    name: str
    mount: WeaponMount
    weapon_type: WeaponType
    damage_dice: int = 1
    damage_dm: int = 0
    range_dms: dict = {}


class WeaponCreate(WeaponBase):
    pass


class WeaponRead(WeaponBase):
    id: int
    ship_id: int
    model_config = {"from_attributes": True}


class ShipBase(BaseModel):
    name: str
    hull_tons: int
    hull_points: int
    armor: int = 0
    thrust: int
    jump: int = 0
    power_plant: int
    crew_captain: int = 1
    crew_pilot: int = 1
    crew_engineer: int = 0
    crew_sensor_op: int = 0
    crew_gunners: int = 0
    crew_marines: int = 0
    sensor_dm: int = 0
    image_url: Optional[str] = None
    description: Optional[str] = None
    extra: dict = {}


class ShipCreate(ShipBase):
    weapons: list[WeaponCreate] = []


class ShipRead(ShipBase):
    id: int
    weapons: list[WeaponRead] = []
    model_config = {"from_attributes": True}
