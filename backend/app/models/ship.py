from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class WeaponMount(str, enum.Enum):
    turret_single = "turret_single"
    turret_double = "turret_double"
    turret_triple = "turret_triple"
    bay_small = "bay_small"
    bay_medium = "bay_medium"
    bay_large = "bay_large"
    spinal = "spinal"


class WeaponType(str, enum.Enum):
    pulse_laser = "pulse_laser"
    beam_laser = "beam_laser"
    missile_rack = "missile_rack"
    sandcaster = "sandcaster"
    particle_beam = "particle_beam"
    meson_gun = "meson_gun"
    fusion_gun = "fusion_gun"
    repulsor = "repulsor"


class Ship(Base):
    __tablename__ = "ships"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    hull_tons = Column(Integer, nullable=False)  # displacement in tons
    hull_points = Column(Integer, nullable=False)
    armor = Column(Integer, default=0)           # armor value (reduces damage)
    thrust = Column(Integer, nullable=False)     # max thrust per round
    jump = Column(Integer, default=0)            # jump rating
    power_plant = Column(Integer, nullable=False)
    # Crew
    crew_captain = Column(Integer, default=1)
    crew_pilot = Column(Integer, default=1)
    crew_engineer = Column(Integer, default=0)
    crew_sensor_op = Column(Integer, default=0)
    crew_gunners = Column(Integer, default=0)
    crew_marines = Column(Integer, default=0)
    # Sensors
    sensor_dm = Column(Integer, default=0)       # DM from sensor grade: mil=+0, civil=-2, basic=-4
    # Visual / meta
    image_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    # Raw JSON for extended stats (future-proof)
    extra = Column(JSON, default=dict)

    weapons = relationship("Weapon", back_populates="ship", cascade="all, delete-orphan")
    fleet_members = relationship("FleetMember", back_populates="ship")


class Weapon(Base):
    __tablename__ = "weapons"

    id = Column(Integer, primary_key=True)
    ship_id = Column(Integer, ForeignKey("ships.id"), nullable=False)
    name = Column(String, nullable=False)
    mount = Column(SAEnum(WeaponMount), nullable=False)
    weapon_type = Column(SAEnum(WeaponType), nullable=False)
    damage_dice = Column(Integer, default=1)     # number of d6
    damage_dm = Column(Integer, default=0)       # bonus added to damage roll
    # Range modifiers per Traveller table (stored as JSON map of range_band -> DM)
    range_dms = Column(JSON, default=dict)

    ship = relationship("Ship", back_populates="weapons")
