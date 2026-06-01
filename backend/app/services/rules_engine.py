"""
Traveller Mongoose 2e starship combat rules engine.
Reference: High Guard + Core Rulebook combat chapter.
"""
import random
from app.models.combat import RangeBand, RANGE_BAND_ORDER, THRUST_TO_CLOSE

# Attack DMs by range band from the combat range table
WEAPON_RANGE_DMS: dict[str, dict[RangeBand, int]] = {
    "pulse_laser":    {RangeBand.adjacent: -2, RangeBand.close: 0,  RangeBand.short: 0,  RangeBand.medium: -2, RangeBand.long: -4, RangeBand.very_long: -6, RangeBand.distant: -8},
    "beam_laser":     {RangeBand.adjacent: -4, RangeBand.close: -2, RangeBand.short: 0,  RangeBand.medium: 0,  RangeBand.long: -2, RangeBand.very_long: -4, RangeBand.distant: -6},
    "missile_rack":   {RangeBand.adjacent: -6, RangeBand.close: -4, RangeBand.short: -2, RangeBand.medium: 0,  RangeBand.long: 0,  RangeBand.very_long: 0,  RangeBand.distant: 0},
    "sandcaster":     {RangeBand.adjacent: 0,  RangeBand.close: 0,  RangeBand.short: -4, RangeBand.medium: -8, RangeBand.long: -8, RangeBand.very_long: -8, RangeBand.distant: -8},
    "particle_beam":  {RangeBand.adjacent: -4, RangeBand.close: -2, RangeBand.short: 0,  RangeBand.medium: 0,  RangeBand.long: 0,  RangeBand.very_long: -2, RangeBand.distant: -4},
    "meson_gun":      {RangeBand.adjacent: -4, RangeBand.close: -2, RangeBand.short: 0,  RangeBand.medium: 0,  RangeBand.long: 0,  RangeBand.very_long: -2, RangeBand.distant: -4},
    "fusion_gun":     {RangeBand.adjacent: -2, RangeBand.close: 0,  RangeBand.short: 0,  RangeBand.medium: -2, RangeBand.long: -4, RangeBand.very_long: -6, RangeBand.distant: -8},
    "repulsor":       {RangeBand.adjacent: 0,  RangeBand.close: -2, RangeBand.short: -4, RangeBand.medium: -8, RangeBand.long: -8, RangeBand.very_long: -8, RangeBand.distant: -8},
}

# Hull size thresholds for size DM on attack
def ship_size_dm(hull_tons: int) -> int:
    if hull_tons < 100:
        return -1
    if hull_tons < 1000:
        return 0
    if hull_tons < 10000:
        return 1
    if hull_tons < 100000:
        return 2
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
    evasive_action: bool = False,
    dogfight_dm: int = 0,
    sensor_dm: int = 0,
) -> dict:
    """
    Resolve a single weapon attack per Traveller Mongoose 2e rules.
    Returns a dict with roll details and damage dealt.
    """
    attack_roll = roll_2d6()
    range_dm = WEAPON_RANGE_DMS.get(weapon_type, {}).get(range_band, -8)
    size_dm = ship_size_dm(target_hull_tons)
    evasive_dm = -2 if evasive_action else 0

    total_dm = gunner_skill + range_dm + size_dm + evasive_dm + dogfight_dm + sensor_dm
    total = attack_roll + total_dm

    hit = total >= 8
    damage = 0
    critical = False

    if hit:
        raw_damage = roll_d6(weapon_damage_dice) + weapon_damage_dm
        damage = max(0, raw_damage - target_armor)
        # Effect >= 6 triggers a critical hit
        effect = total - 8
        critical = effect >= 6

    return {
        "attack_roll": attack_roll,
        "total_dm": total_dm,
        "total": total,
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


def thrust_to_change_range(current: RangeBand, target: RangeBand) -> int:
    ci = RANGE_BAND_ORDER.index(current)
    ti = RANGE_BAND_ORDER.index(target)
    if ci == ti:
        return 0
    # Moving closer: costs are additive for each band crossed
    cost = 0
    step = 1 if ti < ci else -1
    for i in range(ci, ti, step):
        band = RANGE_BAND_ORDER[i]
        cost += THRUST_TO_CLOSE[band]
    return cost


CRITICAL_HIT_TABLE = {
    2: {
        "Sensors": ["Sensors Suffer DM-2", "Sensor range reduced to Medium Range", "Sensor range reduced to Short Range", "Sensor range reduced to Close Range", "Sensor range reduced to Adj Range", "Sensors disabled"],
        "Power Plant": ["Thrust -1, Power -10%", "Thrust -2, Power -10%", "Thrust -3, Power -10%", "Thrust 0, Power 0", "Hull Severity +1", "Hull Severity +1"],
        "Fuel": ["Leak 1D tons/hour", "Leak 1D tons/hour", "Leak 1D tons/hour", "Fuel Tank Destroyed, Hull Severity +1", "Fuel Tank explodes, Hull Severity +1", "Fuel Tank explodes, Hull Severity +1D"],
    }
}
