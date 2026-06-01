from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.combat import Fleet, FleetMember, Battle, BattleRound
from app.models.ship import Ship, Weapon
from app.schemas.combat import FleetCreate, FleetRead, BattleCreate, BattleRead, AttackAction, ManeuverAction
from app.services import rules_engine

router = APIRouter(prefix="/combat", tags=["combat"])


# --- Fleets ---

@router.get("/fleets", response_model=list[FleetRead])
async def list_fleets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Fleet).options(selectinload(Fleet.members)))
    return result.scalars().all()


@router.post("/fleets", response_model=FleetRead, status_code=201)
async def create_fleet(payload: FleetCreate, db: AsyncSession = Depends(get_db)):
    fleet = Fleet(name=payload.name)
    db.add(fleet)
    await db.flush()
    for m in payload.members:
        db.add(FleetMember(fleet_id=fleet.id, ship_id=m.ship_id, count=m.count))
    await db.commit()
    result = await db.execute(
        select(Fleet).where(Fleet.id == fleet.id).options(selectinload(Fleet.members))
    )
    return result.scalar_one()


# --- Battles ---

@router.get("/battles", response_model=list[BattleRead])
async def list_battles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Battle))
    return result.scalars().all()


@router.post("/battles", response_model=BattleRead, status_code=201)
async def create_battle(payload: BattleCreate, db: AsyncSession = Depends(get_db)):
    battle = Battle(
        name=payload.name,
        fleet_a_id=payload.fleet_a_id,
        fleet_b_id=payload.fleet_b_id,
        state={"range_band": "short", "round": 1, "ships": {}},
    )
    db.add(battle)
    await db.commit()
    await db.refresh(battle)
    return battle


@router.get("/battles/{battle_id}", response_model=BattleRead)
async def get_battle(battle_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = result.scalar_one_or_none()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    return battle


# --- Combat actions ---

@router.post("/attack")
async def resolve_attack(action: AttackAction, db: AsyncSession = Depends(get_db)):
    weapon_result = await db.execute(select(Weapon).where(Weapon.id == action.weapon_id))
    weapon = weapon_result.scalar_one_or_none()
    if not weapon:
        raise HTTPException(status_code=404, detail="Weapon not found")

    target_result = await db.execute(select(Ship).where(Ship.id == action.target_ship_id))
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target ship not found")

    result = rules_engine.resolve_attack(
        weapon_type=weapon.weapon_type.value,
        range_band=action.range_band,
        gunner_skill=action.gunner_skill,
        target_hull_tons=target.hull_tons,
        target_armor=target.armor,
        weapon_damage_dice=weapon.damage_dice,
        weapon_damage_dm=weapon.damage_dm,
    )
    return result


@router.post("/thrust-cost")
async def calculate_thrust(action: ManeuverAction):
    cost = rules_engine.thrust_to_change_range(
        current=action.target_range_band,
        target=action.target_range_band,
    )
    return {"thrust_cost": cost}
