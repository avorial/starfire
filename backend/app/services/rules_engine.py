"""
Traveller Mongoose 2e starship combat rules engine.
Reference: High Guard 2022 + Core Rulebook.
"""
import random
from app.models.combat import RangeBand

# Shorthand
A  = RangeBand.adjacent
C  = RangeBand.close
S  = RangeBand.short
M  = RangeBand.medium
L  = RangeBand.long
VL = RangeBand.very_long
D  = RangeBand.distant

# Range DMs per weapon type — all High Guard 2022 weapon types covered.
# Unknown types default to pulse_laser profile.
WEAPON_RANGE_DMS: dict[str, dict[RangeBand, int]] = {
    # ── Turret weapons ────────────────────────────────────────────────────
    "pulse_laser":         {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "beam_laser":          {A: -4, C: -2, S:  0, M:  0, L: -2, VL: -4, D: -6},
    "laser_drill":         {A:  0, C: -4, S: -8, M: -8, L: -8, VL: -8, D: -8},
    "fusion_gun":          {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "particle_beam":       {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    "plasma_gun":          {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "railgun":             {A: -2, C:  0, S:  0, M: -2, L: -6, VL: -8, D: -8},
    "missile_rack":        {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "sandcaster":          {A:  0, C:  0, S: -4, M: -8, L: -8, VL: -8, D: -8},
    # ── Barbettes (same range profile, damage x3) ─────────────────────────
    "beam_laser_barbette": {A: -4, C: -2, S:  0, M:  0, L: -2, VL: -4, D: -6},
    "pulse_laser_barbette":{A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "particle_barbette":   {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    "fusion_barbette":     {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "plasma_barbette":     {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "railgun_barbette":    {A: -2, C:  0, S:  0, M: -2, L: -6, VL: -8, D: -8},
    "missile_barbette":    {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "torpedo":             {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "ion_cannon":          {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    # ── Bay weapons ───────────────────────────────────────────────────────
    "missile_bay":         {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "torpedo_bay":         {A: -6, C: -4, S: -2, M:  0, L:  0, VL:  0, D:  0},
    "particle_beam_bay":   {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    "fusion_gun_bay":      {A: -2, C:  0, S:  0, M: -2, L: -4, VL: -6, D: -8},
    "meson_gun_bay":       {A: -4, C: -2, S:  0, M:  0, L:  0, VL: -2, D: -4},
    # ── Spinal mounts ─────────────────────────────────────────────────────
    "meson_spinal":        {A: -4, C: -2, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "particle_spinal":     {A: -4, C: -2, S:  0, M:  0, L:  0, VL:  0, D: -2},
    # ── Screens / defensive ───────────────────────────────────────────────
    "repulsor":            {A:  0, C: -2, S: -4, M: -8, L: -8, VL: -8, D: -8},
    "nuclear_damper":      {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "meson_screen":        {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "black_globe":         {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
    "white_globe":         {A:  0, C:  0, S:  0, M:  0, L:  0, VL:  0, D:  0},
}

# Bay weapons suffer DM-2 against small craft
BAY_SMALL_CRAFT_DM = -2

# Hull size DM to hit (larger = easier to hit)
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
) -> dict:
    """
    Resolve a single weapon attack per Traveller Mongoose 2e rules.
    Returns a dict with roll details and damage dealt.
    """
    attack_roll = roll_2d6()

    # Look up range DM — fall back to pulse_laser if weapon not in table
    wt = weapon_type if weapon_type in WEAPON_RANGE_DMS else "pulse_laser"
    range_dm = WEAPON_RANGE_DMS[wt].get(range_band, -8)
    size_dm = ship_size_dm(target_hull_tons)
    evasive_dm = -2 if evasive_action else 0

    total_dm = gunner_skill + range_dm + size_dm + evasive_dm + dogfight_dm + sensor_dm
    total = attack_roll + total_dm
    effect = total - 8

    hit = total >= 8
    damage = 0
    critical = False

    if hit:
        raw_damage = roll_d6(weapon_damage_dice) + weapon_damage_dm
        raw_damage *= weapon_damage_multiple          # barbettes x3, bays x10/20/100
        damage = max(0, raw_damage - target_armor)
        critical = effect >= 6

    return {
        "attack_roll": attack_roll,
        "total_dm": total_dm,
        "total": total,
        "effect": effect,
        "hit": hit,
        "damage": damage,
        "critical": critical,
        "breakdown": {
            "range_dm": range_dm,
            "size_dm": size_dm,
            "gunner_skill": gunner_skill,
            "evasive_dm": evasive_dm,
            "dogfight_dm": dogfight_dm,
            "sensor_dm": sensor_dm,
        },
    }
