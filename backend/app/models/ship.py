from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class HullConfig(str, enum.Enum):
    standard = "standard"
    streamlined = "streamlined"
    sphere = "sphere"
    close_structure = "close_structure"
    dispersed_structure = "dispersed_structure"
    planetoid = "planetoid"
    buffered_planetoid = "buffered_planetoid"


class HullType(str, enum.Enum):
    standard = "standard"
    reinforced = "reinforced"
    light = "light"
    military = "military"
    non_gravity = "non_gravity"


class ArmorType(str, enum.Enum):
    none = "none"
    titanium_steel = "titanium_steel"       # TL7
    crystaliron = "crystaliron"             # TL10
    bonded_superdense = "bonded_superdense" # TL14
    molecular_bonded = "molecular_bonded"   # TL16


class DriveType(str, enum.Enum):
    maneuver = "maneuver"
    reaction = "reaction"


class PowerPlantType(str, enum.Enum):
    fission = "fission"           # TL6
    chemical = "chemical"         # TL7
    fusion_tl8 = "fusion_tl8"     # TL8, 10 power/ton
    fusion_tl12 = "fusion_tl12"   # TL12, 15 power/ton
    fusion_tl15 = "fusion_tl15"   # TL15, 20 power/ton
    antimatter = "antimatter"     # TL20, 100 power/ton


class BridgeType(str, enum.Enum):
    standard = "standard"
    small = "small"
    command = "command"
    cockpit = "cockpit"
    dual_cockpit = "dual_cockpit"


class SensorType(str, enum.Enum):
    basic = "basic"           # DM-4, free
    civilian = "civilian"     # DM-2
    military = "military"     # DM+0
    improved = "improved"     # DM+1
    advanced = "advanced"     # DM+2


class WeaponMount(str, enum.Enum):
    fixed = "fixed"
    single_turret = "single_turret"
    double_turret = "double_turret"
    triple_turret = "triple_turret"
    barbette = "barbette"
    small_bay = "small_bay"       # 50 tons, DM x10
    medium_bay = "medium_bay"     # 100 tons, DM x20
    large_bay = "large_bay"       # 500 tons, DM x100
    spinal = "spinal"


class WeaponType(str, enum.Enum):
    # Turret / Barbette / Bay weapons
    beam_laser = "beam_laser"
    pulse_laser = "pulse_laser"
    laser_drill = "laser_drill"
    fusion_gun = "fusion_gun"
    particle_beam = "particle_beam"
    plasma_gun = "plasma_gun"
    railgun = "railgun"
    missile_rack = "missile_rack"
    missile_barbette = "missile_barbette"
    torpedo = "torpedo"
    sandcaster = "sandcaster"
    ion_cannon = "ion_cannon"
    plasma_barbette = "plasma_barbette"
    fusion_barbette = "fusion_barbette"
    particle_barbette = "particle_barbette"
    railgun_barbette = "railgun_barbette"
    # Bay weapons
    missile_bay = "missile_bay"
    torpedo_bay = "torpedo_bay"
    particle_beam_bay = "particle_beam_bay"
    fusion_gun_bay = "fusion_gun_bay"
    meson_gun_bay = "meson_gun_bay"
    # Spinal
    meson_spinal = "meson_spinal"
    particle_spinal = "particle_spinal"
    # Screens (defensive)
    nuclear_damper = "nuclear_damper"
    meson_screen = "meson_screen"
    black_globe = "black_globe"
    white_globe = "white_globe"


class Ship(Base):
    __tablename__ = "ships"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    tech_level = Column(Integer, default=12)

    # Hull
    hull_tons = Column(Integer, nullable=False)
    hull_config = Column(SAEnum(HullConfig), default=HullConfig.standard)
    hull_type = Column(SAEnum(HullType), default=HullType.standard)
    hull_points = Column(Integer, nullable=False)

    # Armour
    armor_type = Column(SAEnum(ArmorType), default=ArmorType.none)
    armor_value = Column(Integer, default=0)

    # Hull options (booleans)
    stealth = Column(Boolean, default=False)
    reflec = Column(Boolean, default=False)
    radiation_shielding = Column(Boolean, default=False)
    self_sealing = Column(Boolean, default=True)

    # Drives
    m_drive_rating = Column(Integer, default=1)   # 0-16, gives Thrust score
    m_drive_type = Column(SAEnum(DriveType), default=DriveType.maneuver)
    j_drive_rating = Column(Integer, default=0)   # 0-9, 0 = no jump drive

    # Power plant
    power_plant_type = Column(SAEnum(PowerPlantType), default=PowerPlantType.fusion_tl8)
    power_plant_tons = Column(Integer, default=0)
    power_available = Column(Integer, default=0)  # computed: tons * power_per_ton

    # Fuel
    fuel_tons_jump = Column(Integer, default=0)
    fuel_tons_reaction = Column(Integer, default=0)

    # Bridge & computer
    bridge_type = Column(SAEnum(BridgeType), default=BridgeType.standard)
    computer_model = Column(String, default="Computer/15")
    computer_processing = Column(Integer, default=15)
    computer_bis = Column(Boolean, default=False)  # jump specialisation
    computer_fib = Column(Boolean, default=False)  # hardened

    # Sensors
    sensor_type = Column(SAEnum(SensorType), default=SensorType.military)
    sensor_dm = Column(Integer, default=0)

    # Crew
    crew_captain = Column(Integer, default=1)
    crew_pilot = Column(Integer, default=1)
    crew_astrogator = Column(Integer, default=0)
    crew_engineer = Column(Integer, default=0)
    crew_maintenance = Column(Integer, default=0)
    crew_gunners = Column(Integer, default=0)
    crew_sensor_op = Column(Integer, default=0)
    crew_steward = Column(Integer, default=0)
    crew_medic = Column(Integer, default=0)
    crew_admin = Column(Integer, default=0)
    crew_officer = Column(Integer, default=0)
    crew_marines = Column(Integer, default=0)

    # Accommodation
    staterooms = Column(Integer, default=0)
    staterooms_double = Column(Integer, default=0)
    low_berths = Column(Integer, default=0)
    emergency_low_berths = Column(Integer, default=0)
    common_area_tons = Column(Integer, default=0)

    # Cargo & misc
    cargo_tons = Column(Integer, default=0)
    hardpoints = Column(Integer, default=0)   # hull_tons // 100

    # Cost & meta
    total_cost_mcr = Column(Float, default=0.0)
    image_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    extra = Column(JSON, default=dict)

    weapons = relationship("Weapon", back_populates="ship", cascade="all, delete-orphan")
    fleet_members = relationship("FleetMember", back_populates="ship")


class Weapon(Base):
    __tablename__ = "weapons"

    id = Column(Integer, primary_key=True)
    ship_id = Column(Integer, ForeignKey("ships.id"), nullable=False)

    name = Column(String, nullable=False)
    count = Column(Integer, default=1)           # how many of this weapon installed
    mount = Column(SAEnum(WeaponMount), nullable=False)
    weapon_type = Column(SAEnum(WeaponType), nullable=False)

    tl = Column(Integer, default=9)
    power = Column(Integer, default=4)
    damage_dice = Column(Integer, default=1)
    damage_dm = Column(Integer, default=0)
    damage_multiple = Column(Integer, default=1)  # 1=turret, 3=barbette, 10/20/100=bay
    # Traits stored as list: ["AP 3", "Radiation", "Smart", "Ion"]
    traits = Column(JSON, default=list)
    ammo_count = Column(Integer, default=0)      # missiles, railgun rounds etc.
    pop_up = Column(Boolean, default=False)

    ship = relationship("Ship", back_populates="weapons")
