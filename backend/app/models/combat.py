from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class RangeBand(str, enum.Enum):
    adjacent = "adjacent"    # 1-10m
    close = "close"          # 11-1,250km
    short = "short"          # 1,251-10,000km
    medium = "medium"        # 10,001-25,000km
    long = "long"            # 25,001-50,000km
    very_long = "very_long"  # 50,001-300,000km
    distant = "distant"      # 50,000-300,000km (within jump limit)


# Thrust cost to close one band (from the range table diagram)
RANGE_BAND_ORDER = [
    RangeBand.adjacent,
    RangeBand.close,
    RangeBand.short,
    RangeBand.medium,
    RangeBand.long,
    RangeBand.very_long,
    RangeBand.distant,
]

THRUST_TO_CLOSE = {
    RangeBand.distant: 50,
    RangeBand.very_long: 25,
    RangeBand.long: 10,
    RangeBand.medium: 5,
    RangeBand.short: 2,
    RangeBand.close: 1,
    RangeBand.adjacent: 0,
}


class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    members = relationship("FleetMember", back_populates="fleet", cascade="all, delete-orphan")
    battles_as_side_a = relationship("Battle", foreign_keys="Battle.fleet_a_id", back_populates="fleet_a")
    battles_as_side_b = relationship("Battle", foreign_keys="Battle.fleet_b_id", back_populates="fleet_b")


class FleetMember(Base):
    __tablename__ = "fleet_members"

    id = Column(Integer, primary_key=True)
    fleet_id = Column(Integer, ForeignKey("fleets.id"), nullable=False)
    ship_id = Column(Integer, ForeignKey("ships.id"), nullable=False)
    count = Column(Integer, default=1)  # number of identical ships in this slot

    fleet = relationship("Fleet", back_populates="members")
    ship = relationship("Ship", back_populates="fleet_members")


class Battle(Base):
    __tablename__ = "battles"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, default="New Battle")
    fleet_a_id = Column(Integer, ForeignKey("fleets.id"))
    fleet_b_id = Column(Integer, ForeignKey("fleets.id"))
    current_round = Column(Integer, default=1)
    active = Column(Boolean, default=True)
    # Full battle state stored as JSON for replay / undo
    state = Column(JSON, default=dict)

    fleet_a = relationship("Fleet", foreign_keys=[fleet_a_id], back_populates="battles_as_side_a")
    fleet_b = relationship("Fleet", foreign_keys=[fleet_b_id], back_populates="battles_as_side_b")
    rounds = relationship("BattleRound", back_populates="battle", cascade="all, delete-orphan")


class BattleRound(Base):
    __tablename__ = "battle_rounds"

    id = Column(Integer, primary_key=True)
    battle_id = Column(Integer, ForeignKey("battles.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    # Snapshot of hex positions, damage, actions taken
    snapshot = Column(JSON, nullable=False, default=dict)
    log = Column(JSON, nullable=False, default=list)  # list of event strings

    battle = relationship("Battle", back_populates="rounds")
