"""
Traveller Mongoose 2e starship combat rules engine.
Reference: High Guard 2022 + Core Rulebook.
"""
import random
from app.models.combat import RangeBand

A  = RangeBand.adjacent
C  = RangeBand.close
S  = RangeBand.short
M  = RangeBand.medium
L  = RangeBand.long
VL = RangeBand.very_long
D  = RangeBand.distant

WEAPON_RANGE_DMS: dict[str, dict[RangeBand, int]] = {
    "pulse_laser":          {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "beam_laser":           {A: -4, C: -2, S:  0, M:  0, L: -2, VL: -4, D: -6},
    "laser_drill":          {A:  0, C: -4, S: -8, M: -8, L: -8, VL: -8, D: -8},
    "fusion_gun":           {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "particle_beam":        {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    "plasma_gun":           {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "railgun":              {A: -2, C:  0, S:  0, M: -2, L: -6, VL: -8, D: -8},
    "missile_rack":         {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "sandcaster":           {A:  0, C:  0, S: -4, M: -8, L: -8, VL: -8, D: -8},
    "beam_laser_barbette":  {A: -4, C: -2, S:  0, M:  0, L: -2, VL: -4, D: -6},
    "pulse_laser_barbette": {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "particle_barbette":    {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    "fusion_barbette":      {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "plasma_barbette":      {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "railgun_barbette":     {A: -2, C:  0, S:  0, M: -2, L: -6, VL: -8, D: -8},
    "missile_barbette":     {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "torpedo":              {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "ion_cannon":           {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "missile_bay":          {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "torpedo_bay":          {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "particle_beam_bay":    {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    "fusion_gun_bay":       {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "meson_gun_bay":        {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    "meson_spinal":         {A: -4, C: -2, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "particle_spinal":      {A: -4, C: -2, S:  0, M:  0, L:  0, VL:  0, D: -2},
    "repulsor":             {A:  0, C: -2, S: -4, M: -8, L: -8, VL: -8, D: -8},
    "nuclear_damper":       {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "meson_screen":         {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "black_globe":          {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "white_globe":          {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
}

# Screens that reduce damage from specific weapon types
SCREEN_PROTECTION = {
    "nuclear_damper": {"missile_rack", "missile_barbette", "missile_bay", "torpedo", "torpedo_bay"},
    "meson_screen":   {"meson_gun_bay", "meson_spinal"},
}
SCREEN_REDUCTION = 20  # nuclear damper / meson screen reduce damage by this amount


def ship_size_dm(hull_tons: int) -> int:
    if hull_tons < 100:    return -1
    if hull_tons < 1000:   return  0
    if hull_tons < 10000:  return  1
    if hull_tons < 100000: return  2
    return 4


def roll_2d6() -> int:
    return random.randint(1, 6) + random.randint(1, 6)


def roll_d6(n: int = 1) -> int:
    return sum(random.randint(1, 6) for _ in range(n))


def roll_initiative(tactics_skill: int = 0) -> int:
    """2d6 + Tactics (naval) skill. Higher goes first."""
    return roll_2d6() + tactics_skill


def resolve_attack(
    weapon_type: str,
    range_band: RangeBand,
    gunner_skill: int,
    target_hull_tons: int,
    target_armor: int,
    weapon_damage_dice: int,
    weapon_damage_dm: int,
    weapon_damage_multiple: int = 1,
    evasive_action: bool = False,
    dogfight_dm: int = 0,
    sensor_dm: int = 0,
    target_screens: list[str] | None = None,
) -> dict:
    """
    Resolve a single weapon attack per Traveller Mongoose 2e rules.
    Returns a dict with roll details and damage dealt.
    """
    attack_roll = roll_2d6()
    wt = weapon_type if weapon_type in WEAPON_RANGE_DMS else "pulse_laser"
    range_dm    = WEAPON_RANGE_DMS[wt].get(range_band, -8)
    size_dm     = ship_size_dm(target_hull_tons)
    evasive_dm  = -2 if evasive_action else 0

    total_dm = gunner_skill + range_dm + size_dm + evasive_dm + dogfight_dm + sensor_dm
    total    = attack_roll + total_dm
    effect   = total - 8
    hit      = total >= 8
    damage   = 0
    critical = False
    screen_blocked = False

    if hit:
        raw_damage = roll_d6(weapon_damage_dice) + weapon_damage_dm
        raw_damage = max(0, raw_damage) * weapon_damage_multiple
        # Apply screens
        if target_screens:
            for screen, protected_weapons in SCREEN_PROTECTION.items():
                if screen in target_screens and wt in protected_weapons:
                    raw_damage = max(0, raw_damage - SCREEN_REDUCTION)
                    screen_blocked = True
        damage   = max(0, raw_damage - target_armor)
        critical = effect >= 6

    return {
        "attack_roll":   attack_roll,
        "total_dm":      total_dm,
        "total":         total,
        "effect":        effect,
        "hit":           hit,
        "damage":        damage,
        "critical":      critical,
        "screen_blocked": screen_blocked,
        "breakdown": {
            "range_dm":    range_dm,
            "size_dm":     size_dm,
            "gunner_skill": gunner_skill,
            "evasive_dm":  evasive_dm,
            "dogfight_dm": dogfight_dm,
            "sensor_dm":   sensor_dm,
        },
    }


# Critical hit tables (Core Rulebook p.168 / High Guard)
import random as _r

CRIT_LOCATIONS = ["Sensors", "Power Plant", "Fuel", "Weapon", "Armor", "Hull", "M-Drive", "Cargo", "J-Drive", "Crew", "Computer"]

CRIT_TABLE: dict[str, list[str]] = {
    "Sensors":     ["DM-2 to all sensor checks", "Sensor range reduced to Medium", "Sensor range reduced to Short",
                    "Sensor range reduced to Close", "Sensor range reduced to Adjacent", "Sensors disabled"],
    "Power Plant": ["Thrust-1, Power-10%", "Thrust-2, Power-10%", "Thrust-3, Power-10%",
                    "Thrust 0, Power 0", "Hull Severity+1", "Hull Severity+1; Power 0"],
    "Fuel":        ["Leak 1D tons/hr", "Leak 1D tons/hr", "Leak 1D tons/hr",
                    "Fuel Tank Destroyed, Severity+1", "Tank explodes, Severity+1", "Tank explodes, Severity+1D"],
    "Weapon":      ["Random weapon DM-2", "Random weapon disabled", "Random weapon disabled",
                    "Random weapon destroyed", "Random weapon destroyed, Severity+1", "All weapons destroyed"],
    "Armor":       ["Armor-1D", "Armor-1D", "Armor-1D", "Armor-1D", "Armor-2D", "Armor destroyed"],
    "Hull":        ["1D extra damage", "2D extra damage", "3D extra damage",
                    "4D extra damage", "Hull Severity+1", "Hull Severity+1; 5D damage"],
    "M-Drive":     ["Pilot checks DM-2", "Thrust-1", "Thrust halved",
                    "Thrust 0", "M-Drive destroyed", "M-Drive explodes, Severity+1"],
    "Cargo":       ["D3 tons cargo destroyed", "D6 tons cargo destroyed", "10% cargo destroyed",
                    "25% cargo destroyed", "50% cargo destroyed", "All cargo destroyed"],
    "J-Drive":     ["Jump disabled 1D rounds", "Jump-1", "Jump halved",
                    "Jump drive offline", "J-Drive destroyed", "J-Drive explodes, Severity+1"],
    "Crew":        ["1 crew casualty", "D3 crew casualties", "D6 crew casualties",
                    "2D crew casualties", "10% crew killed", "All crew killed"],
    "Computer":    ["Computer DM-2", "Computer Processing-5", "Computer offline 1D rounds",
                    "Backup computer destroyed", "Computer destroyed", "Computer destroyed; Hull Severity+1"],
}


def resolve_critical(effect: int) -> dict:
    """Roll on the critical hit table. Effect determines severity (1-6)."""
    severity = min(6, max(1, effect - 5))  # effect 6=sev1, effect 11=sev6
    location = _r.choice(CRIT_LOCATIONS)
    result   = CRIT_TABLE[location][severity - 1]
    return {"location": location, "severity": severity, "result": result}
