from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.combat import Fleet, FleetMember, Battle, BattleRound
from app.models.ship import Ship, Weapon  # noqa: F401
from app.schemas.combat import (
    FleetCreate, FleetRead, BattleCreate, BattleRead,
    AttackAction, ManeuverAction, MissileResolveAction, PointDefenceAction,
)
from app.services import rules_engine

router = APIRouter(prefix="/combat", tags=["combat"])


# ── Fleets ────────────────────────────────────────────────────────────────

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


# ── Battles ───────────────────────────────────────────────────────────────

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
        state={"round": 1, "ships": {}, "initiative_order": []},
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


@router.get("/battles/{battle_id}/ships")
async def get_battle_ships(battle_id: int, db: AsyncSession = Depends(get_db)):
    """Return ships for both fleets in a battle, tagged with their side."""
    battle = (await db.execute(select(Battle).where(Battle.id == battle_id))).scalar_one_or_none()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")

    async def fleet_ships(fleet_id: int, side: str):
        members = (await db.execute(
            select(FleetMember).where(FleetMember.fleet_id == fleet_id)
        )).scalars().all()
        ships = []
        for m in members:
            ship = (await db.execute(
                select(Ship).where(Ship.id == m.ship_id).options(selectinload(Ship.weapons))
            )).scalar_one_or_none()
            if ship:
                ships.append({"side": side, "count": m.count, "ship": ship})
        return ships

    side_a = await fleet_ships(battle.fleet_a_id, "a")
    side_b = await fleet_ships(battle.fleet_b_id, "b")
    return {"battle_id": battle_id, "ships": side_a + side_b}


# ── Initiative ────────────────────────────────────────────────────────────

@router.post("/battles/{battle_id}/initiative")
async def roll_initiative(battle_id: int, db: AsyncSession = Depends(get_db)):
    """Roll initiative for all ships in the battle (2d6 + Tactics)."""
    result = await db.execute(select(Battle).where(Battle.id == battle_id))
    battle = result.scalar_one_or_none()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")

    ships_result = await get_battle_ships(battle_id, db)
    rolls = []
    for entry in ships_result["ships"]:
        ship = entry["ship"]
        roll = rules_engine.roll_initiative(tactics_skill=0)
        rolls.append({
            "ship_id": ship.id,
            "ship_name": ship.name,
            "side": entry["side"],
            "roll": roll,
        })
    rolls.sort(key=lambda x: x["roll"], reverse=True)
    return {"initiative_order": rolls}


# ── Attack ────────────────────────────────────────────────────────────────

@router.post("/attack")
async def resolve_attack(action: AttackAction, db: AsyncSession = Depends(get_db)):
    weapon = (await db.execute(
        select(Weapon).where(Weapon.id == action.weapon_id)
    )).scalar_one_or_none()
    if not weapon:
        raise HTTPException(status_code=404, detail=f"Weapon id={action.weapon_id} not found")

    target = (await db.execute(
        select(Ship).options(selectinload(Ship.weapons)).where(Ship.id == action.target_ship_id)
    )).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail=f"Target ship id={action.target_ship_id} not found")

    attacker = (await db.execute(
        select(Ship).where(Ship.id == action.attacker_ship_id)
    )).scalar_one_or_none()

    # Collect target's active screens
    target_screens = [w.weapon_type.value for w in target.weapons
                      if w.weapon_type.value in {"nuclear_damper", "meson_screen", "black_globe"}]

    result = rules_engine.resolve_attack(
        weapon_type=weapon.weapon_type.value,
        range_band=action.range_band,
        gunner_skill=action.gunner_skill,
        target_hull_tons=target.hull_tons,
        target_armor=target.armor_value,
        weapon_damage_dice=weapon.damage_dice,
        weapon_damage_dm=weapon.damage_dm,
        weapon_damage_multiple=weapon.damage_multiple,
        evasive_action=action.evasive_target,
        dogfight_dm=action.dogfight_dm,
        sensor_dm=attacker.sensor_dm if attacker else 0,
        target_screens=target_screens,
    )

    # Resolve critical hit details if triggered
    if result["critical"]:
        result["critical_details"] = rules_engine.resolve_critical(result["effect"])

    return result


@router.post("/missile/flight-time")
async def missile_flight_time(range_band: str):
    """How many rounds until missiles at this range band arrive."""
    from app.models.combat import RangeBand as RB
    try:
        rb = RB(range_band)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid range band: {range_band}")
    return {"range_band": range_band, "rounds": rules_engine.missile_flight_rounds(rb)}


@router.post("/missile/point-defence")
async def point_defence(action: PointDefenceAction, db: AsyncSession = Depends(get_db)):
    """Attempt to shoot down incoming missiles with a point-defence weapon."""
    weapon = (await db.execute(
        select(Weapon).where(Weapon.id == action.defence_weapon_id)
    )).scalar_one_or_none()
    if not weapon:
        raise HTTPException(status_code=404, detail=f"Weapon id={action.defence_weapon_id} not found")

    result = rules_engine.resolve_point_defence(
        gunner_skill=action.gunner_skill,
        missiles_in_salvo=action.missiles_in_salvo,
        weapon_type=weapon.weapon_type.value,
    )
    if result["missiles_destroyed"] > 0 and result["missiles_destroyed"] < action.missiles_in_salvo:
        result["critical_details"] = None
    return result


@router.post("/missile/resolve")
async def resolve_missile(action: MissileResolveAction, db: AsyncSession = Depends(get_db)):
    """Resolve a missile salvo that has arrived at its target."""
    weapon = (await db.execute(
        select(Weapon).where(Weapon.id == action.weapon_id)
    )).scalar_one_or_none()
    if not weapon:
        raise HTTPException(status_code=404, detail=f"Weapon id={action.weapon_id} not found")

    target = (await db.execute(
        select(Ship).options(selectinload(Ship.weapons)).where(Ship.id == action.target_ship_id)
    )).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail=f"Target ship id={action.target_ship_id} not found")

    attacker = (await db.execute(
        select(Ship).where(Ship.id == action.attacker_ship_id)
    )).scalar_one_or_none()

    target_screens = [w.weapon_type.value for w in target.weapons
                      if w.weapon_type.value in {"nuclear_damper", "meson_screen", "black_globe"}]

    result = rules_engine.resolve_missile_arrival(
        range_band=action.range_band,
        gunner_skill=action.gunner_skill,
        target_hull_tons=target.hull_tons,
        target_armor=target.armor_value,
        weapon_damage_dice=weapon.damage_dice,
        weapon_damage_dm=weapon.damage_dm,
        weapon_damage_multiple=weapon.damage_multiple,
        missiles_total=action.missiles_total,
        missiles_destroyed=action.missiles_destroyed,
        sand_dm=action.sand_dm,
        evasive_action=action.evasive_target,
        sensor_dm=attacker.sensor_dm if attacker else 0,
        target_screens=target_screens,
    )

    if result.get("critical") and result.get("effect"):
        result["critical_details"] = rules_engine.resolve_critical(result["effect"])

    return result


@router.post("/thrust-cost")
async def calculate_thrust(action: ManeuverAction):
    from app.models.combat import RANGE_BAND_ORDER, THRUST_TO_CLOSE
    src_idx = RANGE_BAND_ORDER.index(action.current_range_band)
    tgt_idx = RANGE_BAND_ORDER.index(action.target_range_band)
    if src_idx == tgt_idx:
        return {"thrust_cost": 0}
    cost = 0
    step = 1 if tgt_idx < src_idx else -1
    for i in range(src_idx, tgt_idx, step):
        cost += THRUST_TO_CLOSE[RANGE_BAND_ORDER[i]]
    return {"thrust_cost": cost}
