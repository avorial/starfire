from pydantic import BaseModel
from typing import Optional
from app.models.ship import (
    HullConfig, HullType, ArmorType, DriveType, PowerPlantType,
    BridgeType, SensorType, WeaponMount, WeaponType
)


class WeaponBase(BaseModel):
    name: str
    count: int = 1
    mount: WeaponMount
    weapon_type: WeaponType
    tl: int = 9
    power: int = 4
    damage_dice: int = 1
    damage_dm: int = 0
    damage_multiple: int = 1
    traits: list[str] = []
    ammo_count: int = 0
    pop_up: bool = False


class WeaponCreate(WeaponBase):
    pass


class WeaponRead(WeaponBase):
    id: int
    ship_id: int
    model_config = {"from_attributes": True}


class ShipBase(BaseModel):
    name: str
    tech_level: int = 12

    # Hull
    hull_tons: int
    hull_config: HullConfig = HullConfig.standard
    hull_type: HullType = HullType.standard
    hull_points: int

    # Armour
    armor_type: ArmorType = ArmorType.none
    armor_value: int = 0

    # Hull options
    stealth: bool = False
    reflec: bool = False
    radiation_shielding: bool = False
    self_sealing: bool = True

    # Drives
    m_drive_rating: int = 1
    m_drive_type: DriveType = DriveType.maneuver
    j_drive_rating: int = 0

    # Power
    power_plant_type: PowerPlantType = PowerPlantType.fusion_tl8
    power_plant_tons: int = 0
    power_available: int = 0

    # Fuel
    fuel_tons_jump: int = 0
    fuel_tons_reaction: int = 0

    # Bridge & computer
    bridge_type: BridgeType = BridgeType.standard
    computer_model: str = "Computer/15"
    computer_processing: int = 15
    computer_bis: bool = False
    computer_fib: bool = False

    # Sensors
    sensor_type: SensorType = SensorType.military
    sensor_dm: int = 0

    # Crew
    crew_captain: int = 1
    crew_pilot: int = 1
    crew_astrogator: int = 0
    crew_engineer: int = 0
    crew_maintenance: int = 0
    crew_gunners: int = 0
    crew_sensor_op: int = 0
    crew_steward: int = 0
    crew_medic: int = 0
    crew_admin: int = 0
    crew_officer: int = 0
    crew_marines: int = 0

    # Accommodation
    staterooms: int = 0
    staterooms_double: int = 0
    low_berths: int = 0
    emergency_low_berths: int = 0
    common_area_tons: int = 0

    # Cargo
    cargo_tons: int = 0
    hardpoints: int = 0

    # Cost & meta
    total_cost_mcr: float = 0.0
    image_url: Optional[str] = None
    description: Optional[str] = None
    extra: dict = {}


class ShipCreate(ShipBase):
    weapons: list[WeaponCreate] = []


class ShipRead(ShipBase):
    id: int
    weapons: list[WeaponRead] = []
    model_config = {"from_attributes": True}
