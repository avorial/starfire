from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.ship import Ship, Weapon
from app.schemas.ship import ShipCreate, ShipRead

router = APIRouter(prefix="/ships", tags=["ships"])


@router.get("/", response_model=list[ShipRead])
async def list_ships(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ship).options(selectinload(Ship.weapons)))
    return result.scalars().all()


@router.get("/{ship_id}", response_model=ShipRead)
async def get_ship(ship_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ship).where(Ship.id == ship_id).options(selectinload(Ship.weapons))
    )
    ship = result.scalar_one_or_none()
    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found")
    return ship


@router.post("/", response_model=ShipRead, status_code=201)
async def create_ship(payload: ShipCreate, db: AsyncSession = Depends(get_db)):
    ship_data = payload.model_dump(exclude={"weapons"})
    ship = Ship(**ship_data)
    db.add(ship)
    await db.flush()
    for w in payload.weapons:
        weapon = Weapon(**w.model_dump(), ship_id=ship.id)
        db.add(weapon)
    await db.commit()
    await db.refresh(ship)
    result = await db.execute(
        select(Ship).where(Ship.id == ship.id).options(selectinload(Ship.weapons))
    )
    return result.scalar_one()


@router.put("/{ship_id}", response_model=ShipRead)
async def update_ship(ship_id: int, payload: ShipCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ship).where(Ship.id == ship_id).options(selectinload(Ship.weapons))
    )
    ship = result.scalar_one_or_none()
    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found")
    for field, value in payload.model_dump(exclude={"weapons"}).items():
        setattr(ship, field, value)
    # Replace weapons
    for w in ship.weapons:
        await db.delete(w)
    await db.flush()
    for w in payload.weapons:
        weapon = Weapon(**w.model_dump(), ship_id=ship.id)
        db.add(weapon)
    await db.commit()
    result = await db.execute(
        select(Ship).where(Ship.id == ship.id).options(selectinload(Ship.weapons))
    )
    return result.scalar_one()


@router.delete("/{ship_id}", status_code=204)
async def delete_ship(ship_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ship).where(Ship.id == ship_id))
    ship = result.scalar_one_or_none()
    if not ship:
        raise HTTPException(status_code=404, detail="Ship not found")
    await db.delete(ship)
    await db.commit()
