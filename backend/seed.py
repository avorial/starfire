"""
Seed script — posts canonical High Guard 2022 ships to the running API.
Usage:
  python seed.py                      # targets http://localhost:8000
  python seed.py http://192.168.1.67:8888
"""
import sys
import httpx

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

SHIPS = [
    # ── Small craft ────────────────────────────────────────────────────────
    {
        "name": "Ultralight Fighter",
        "tech_level": 12,
        "hull_tons": 6, "hull_config": "streamlined", "hull_type": "standard",
        "hull_points": 2,
        "armor_type": "crystaliron", "armor_value": 3,
        "stealth": True, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 6, "m_drive_type": "maneuver", "j_drive_rating": 0,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 1, "power_available": 15,
        "fuel_tons_jump": 0, "fuel_tons_reaction": 1,
        "bridge_type": "cockpit",
        "computer_model": "Computer/5", "computer_processing": 5,
        "computer_bis": False, "computer_fib": False,
        "sensor_type": "civilian", "sensor_dm": -2,
        "crew_captain": 0, "crew_pilot": 1, "crew_astrogator": 0, "crew_engineer": 0,
        "crew_maintenance": 0, "crew_gunners": 1, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 0, "crew_admin": 0, "crew_officer": 0, "crew_marines": 0,
        "staterooms": 0, "staterooms_double": 0, "low_berths": 0,
        "emergency_low_berths": 0, "common_area_tons": 0,
        "cargo_tons": 0, "hardpoints": 0,
        "total_cost_mcr": 6.33,
        "description": "Tiny 6-ton carrier-based fighter. Carried in flights of four. Fast but fragile.",
        "weapons": [
            {"name": "Fixed Pulse Laser", "count": 1, "mount": "fixed", "weapon_type": "pulse_laser",
             "tl": 9, "power": 3, "damage_dice": 2, "damage_dm": 0, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
        ],
    },
    {
        "name": "Light Fighter",
        "tech_level": 12,
        "hull_tons": 10, "hull_config": "streamlined", "hull_type": "standard",
        "hull_points": 4,
        "armor_type": "crystaliron", "armor_value": 2,
        "stealth": False, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 6, "m_drive_type": "maneuver", "j_drive_rating": 0,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 1, "power_available": 15,
        "fuel_tons_jump": 0, "fuel_tons_reaction": 1,
        "bridge_type": "cockpit",
        "computer_model": "Computer/5", "computer_processing": 5,
        "computer_bis": False, "computer_fib": False,
        "sensor_type": "improved", "sensor_dm": 1,
        "crew_captain": 0, "crew_pilot": 1, "crew_astrogator": 0, "crew_engineer": 0,
        "crew_maintenance": 0, "crew_gunners": 1, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 0, "crew_admin": 0, "crew_officer": 0, "crew_marines": 0,
        "staterooms": 0, "staterooms_double": 0, "low_berths": 0,
        "emergency_low_berths": 0, "common_area_tons": 0,
        "cargo_tons": 1, "hardpoints": 0,
        "total_cost_mcr": 9.62,
        "description": "10-ton light fighter. Fast and manoeuvrable. Pulse laser on a fixed mount.",
        "weapons": [
            {"name": "Fixed Pulse Laser", "count": 1, "mount": "fixed", "weapon_type": "pulse_laser",
             "tl": 9, "power": 3, "damage_dice": 2, "damage_dm": 0, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
        ],
    },
    {
        "name": "Military Gig",
        "tech_level": 14,
        "hull_tons": 20, "hull_config": "streamlined", "hull_type": "standard",
        "hull_points": 8,
        "armor_type": "bonded_superdense", "armor_value": 4,
        "stealth": True, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 8, "m_drive_type": "maneuver", "j_drive_rating": 0,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 2, "power_available": 30,
        "fuel_tons_jump": 0, "fuel_tons_reaction": 1,
        "bridge_type": "standard",
        "computer_model": "Computer/5", "computer_processing": 5,
        "computer_bis": False, "computer_fib": False,
        "sensor_type": "basic", "sensor_dm": -4,
        "crew_captain": 0, "crew_pilot": 1, "crew_astrogator": 0, "crew_engineer": 0,
        "crew_maintenance": 0, "crew_gunners": 1, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 0, "crew_admin": 0, "crew_officer": 0, "crew_marines": 0,
        "staterooms": 0, "staterooms_double": 0, "low_berths": 3,
        "emergency_low_berths": 0, "common_area_tons": 0,
        "cargo_tons": 2, "hardpoints": 0,
        "total_cost_mcr": 13.67,
        "description": "Armoured 20-ton gig. Carried on the Gazelle Close Escort. Thrust 8, Stealth.",
        "weapons": [
            {"name": "Fixed Pulse Laser (Intense Focus, High Yield)", "count": 1,
             "mount": "fixed", "weapon_type": "pulse_laser",
             "tl": 9, "power": 3, "damage_dice": 2, "damage_dm": 2, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
        ],
    },
    # ── 100-ton ships ──────────────────────────────────────────────────────
    {
        "name": "Scout/Courier — Type S (Sulieman)",
        "tech_level": 12,
        "hull_tons": 100, "hull_config": "streamlined", "hull_type": "standard",
        "hull_points": 40,
        "armor_type": "crystaliron", "armor_value": 4,
        "stealth": False, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 2, "m_drive_type": "maneuver", "j_drive_rating": 2,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 4, "power_available": 60,
        "fuel_tons_jump": 20, "fuel_tons_reaction": 0,
        "bridge_type": "standard",
        "computer_model": "Computer/5", "computer_processing": 5,
        "computer_bis": True, "computer_fib": False,
        "sensor_type": "military", "sensor_dm": 0,
        "crew_captain": 0, "crew_pilot": 1, "crew_astrogator": 1, "crew_engineer": 1,
        "crew_maintenance": 0, "crew_gunners": 1, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 0, "crew_admin": 0, "crew_officer": 0, "crew_marines": 0,
        "staterooms": 4, "staterooms_double": 0, "low_berths": 0,
        "emergency_low_berths": 0, "common_area_tons": 0,
        "cargo_tons": 11, "hardpoints": 1,
        "total_cost_mcr": 36.94,
        "description": "Iconic 100-ton multi-role scout. Thousands in service. Carries an air/raft. Jump-2, Thrust 2.",
        "weapons": [
            {"name": "Double Turret (Pulse Laser)", "count": 1, "mount": "double_turret", "weapon_type": "pulse_laser",
             "tl": 9, "power": 4, "damage_dice": 2, "damage_dm": 1, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
        ],
    },
    {
        "name": "Scout — Serpent Class",
        "tech_level": 14,
        "hull_tons": 100, "hull_config": "streamlined", "hull_type": "standard",
        "hull_points": 40,
        "armor_type": "bonded_superdense", "armor_value": 4,
        "stealth": False, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 2, "m_drive_type": "maneuver", "j_drive_rating": 2,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 4, "power_available": 60,
        "fuel_tons_jump": 22, "fuel_tons_reaction": 0,
        "bridge_type": "standard",
        "computer_model": "Computer/5", "computer_processing": 5,
        "computer_bis": True, "computer_fib": False,
        "sensor_type": "military", "sensor_dm": 0,
        "crew_captain": 0, "crew_pilot": 1, "crew_astrogator": 1, "crew_engineer": 1,
        "crew_maintenance": 0, "crew_gunners": 1, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 0, "crew_admin": 0, "crew_officer": 0, "crew_marines": 0,
        "staterooms": 4, "staterooms_double": 0, "low_berths": 0,
        "emergency_low_berths": 0, "common_area_tons": 1,
        "cargo_tons": 7, "hardpoints": 1,
        "total_cost_mcr": 40.97,
        "description": "TL14 upgrade of the Type S. Bonded Superdense armour, advanced probes, aerofins. Allotted to senior scouts.",
        "weapons": [
            {"name": "Double Turret (Pulse Laser)", "count": 1, "mount": "double_turret", "weapon_type": "pulse_laser",
             "tl": 9, "power": 4, "damage_dice": 2, "damage_dm": 1, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
        ],
    },
    # ── 200-ton ships ──────────────────────────────────────────────────────
    {
        "name": "Far Trader — Empress Marava Class",
        "tech_level": 12,
        "hull_tons": 200, "hull_config": "streamlined", "hull_type": "standard",
        "hull_points": 80,
        "armor_type": "none", "armor_value": 0,
        "stealth": False, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 1, "m_drive_type": "maneuver", "j_drive_rating": 2,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 6, "power_available": 90,
        "fuel_tons_jump": 40, "fuel_tons_reaction": 0,
        "bridge_type": "standard",
        "computer_model": "Computer/5", "computer_processing": 5,
        "computer_bis": True, "computer_fib": False,
        "sensor_type": "civilian", "sensor_dm": -2,
        "crew_captain": 1, "crew_pilot": 1, "crew_astrogator": 1, "crew_engineer": 1,
        "crew_maintenance": 0, "crew_gunners": 2, "crew_sensor_op": 0, "crew_steward": 1,
        "crew_medic": 0, "crew_admin": 0, "crew_officer": 0, "crew_marines": 0,
        "staterooms": 10, "staterooms_double": 0, "low_berths": 4,
        "emergency_low_berths": 0, "common_area_tons": 10,
        "cargo_tons": 62, "hardpoints": 2,
        "total_cost_mcr": 54.04,
        "description": "Common 200-ton far trader. Jump-2, Thrust 1. Ranges far and wide. Two double turrets.",
        "weapons": [
            {"name": "Double Turret (Beam Lasers)", "count": 2, "mount": "double_turret", "weapon_type": "beam_laser",
             "tl": 10, "power": 4, "damage_dice": 1, "damage_dm": 0, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
        ],
    },
    {
        "name": "System Defence Boat (TL15)",
        "tech_level": 15,
        "hull_tons": 200, "hull_config": "standard", "hull_type": "reinforced",
        "hull_points": 88,
        "armor_type": "crystaliron", "armor_value": 13,
        "stealth": False, "reflec": False, "radiation_shielding": True, "self_sealing": True,
        "m_drive_rating": 9, "m_drive_type": "maneuver", "j_drive_rating": 0,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 16, "power_available": 240,
        "fuel_tons_jump": 0, "fuel_tons_reaction": 6,
        "bridge_type": "standard",
        "computer_model": "Computer/35", "computer_processing": 35,
        "computer_bis": False, "computer_fib": False,
        "sensor_type": "improved", "sensor_dm": 1,
        "crew_captain": 1, "crew_pilot": 3, "crew_astrogator": 0, "crew_engineer": 1,
        "crew_maintenance": 1, "crew_gunners": 4, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 1, "crew_admin": 1, "crew_officer": 1, "crew_marines": 0,
        "staterooms": 15, "staterooms_double": 0, "low_berths": 0,
        "emergency_low_berths": 0, "common_area_tons": 4,
        "cargo_tons": 14, "hardpoints": 2,
        "total_cost_mcr": 134.44,
        "description": "200-ton no-jump system defence boat. Thrust 9, Armour 13, Radiation Shielding. Computer/35. Deadly in its home system.",
        "weapons": [
            {"name": "Triple Turret (Beam Lasers)", "count": 1, "mount": "triple_turret", "weapon_type": "beam_laser",
             "tl": 10, "power": 4, "damage_dice": 1, "damage_dm": 2, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
            {"name": "Triple Turret (Missile Racks)", "count": 1, "mount": "triple_turret", "weapon_type": "missile_rack",
             "tl": 7, "power": 0, "damage_dice": 4, "damage_dm": 0, "damage_multiple": 1,
             "traits": ["Smart"], "ammo_count": 240, "pop_up": False},
        ],
    },
    # ── 400-ton ships ──────────────────────────────────────────────────────
    {
        "name": "Close Escort — Gazelle Class",
        "tech_level": 14,
        "hull_tons": 400, "hull_config": "close_structure", "hull_type": "standard",
        "hull_points": 160,
        "armor_type": "bonded_superdense", "armor_value": 3,
        "stealth": False, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 5, "m_drive_type": "maneuver", "j_drive_rating": 3,
        "power_plant_type": "fusion_tl12", "power_plant_tons": 47, "power_available": 555,
        "fuel_tons_jump": 120, "fuel_tons_reaction": 0,
        "bridge_type": "small",
        "computer_model": "Computer/20", "computer_processing": 20,
        "computer_bis": True, "computer_fib": False,
        "sensor_type": "military", "sensor_dm": 0,
        "crew_captain": 1, "crew_pilot": 3, "crew_astrogator": 1, "crew_engineer": 4,
        "crew_maintenance": 1, "crew_gunners": 8, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 1, "crew_admin": 0, "crew_officer": 1, "crew_marines": 12,
        "staterooms": 5, "staterooms_double": 0, "low_berths": 0,
        "emergency_low_berths": 0, "common_area_tons": 11,
        "cargo_tons": 12, "hardpoints": 4,
        "total_cost_mcr": 188.57,
        "description": "400-ton Imperial Navy close escort. Anti-piracy & revenue patrol. Carries a military gig. Particle barbettes and beam laser turrets.",
        "weapons": [
            {"name": "Particle Barbettes", "count": 2, "mount": "barbette", "weapon_type": "particle_barbette",
             "tl": 11, "power": 15, "damage_dice": 4, "damage_dm": 0, "damage_multiple": 3,
             "traits": ["Radiation"], "ammo_count": 0, "pop_up": False},
            {"name": "Triple Turret (Intense Focus Beam Lasers)", "count": 2, "mount": "triple_turret", "weapon_type": "beam_laser",
             "tl": 10, "power": 4, "damage_dice": 1, "damage_dm": 2, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
        ],
    },
    {
        "name": "Fleet Courier (TL15)",
        "tech_level": 15,
        "hull_tons": 400, "hull_config": "streamlined", "hull_type": "standard",
        "hull_points": 160,
        "armor_type": "none", "armor_value": 0,
        "stealth": False, "reflec": False, "radiation_shielding": False, "self_sealing": True,
        "m_drive_rating": 5, "m_drive_type": "maneuver", "j_drive_rating": 5,
        "power_plant_type": "fusion_tl15", "power_plant_tons": 19, "power_available": 380,
        "fuel_tons_jump": 200, "fuel_tons_reaction": 0,
        "bridge_type": "small",
        "computer_model": "Computer/30", "computer_processing": 30,
        "computer_bis": False, "computer_fib": False,
        "sensor_type": "advanced", "sensor_dm": 2,
        "crew_captain": 1, "crew_pilot": 1, "crew_astrogator": 1, "crew_engineer": 2,
        "crew_maintenance": 0, "crew_gunners": 4, "crew_sensor_op": 0, "crew_steward": 0,
        "crew_medic": 0, "crew_admin": 0, "crew_officer": 0, "crew_marines": 0,
        "staterooms": 8, "staterooms_double": 0, "low_berths": 0,
        "emergency_low_berths": 0, "common_area_tons": 6,
        "cargo_tons": 5, "hardpoints": 4,
        "total_cost_mcr": 254.9,
        "description": "400-ton Imperial Navy fast courier. Jump-5, Thrust 5 (energy efficient). Advanced sensors. Evade/3, Fire Control/4.",
        "weapons": [
            {"name": "Triple Turret (Beam Lasers)", "count": 2, "mount": "triple_turret", "weapon_type": "beam_laser",
             "tl": 10, "power": 4, "damage_dice": 1, "damage_dm": 2, "damage_multiple": 1,
             "traits": [], "ammo_count": 0, "pop_up": False},
            {"name": "Triple Turret (Sandcasters)", "count": 2, "mount": "triple_turret", "weapon_type": "sandcaster",
             "tl": 7, "power": 0, "damage_dice": 0, "damage_dm": 0, "damage_multiple": 1,
             "traits": [], "ammo_count": 40, "pop_up": False},
        ],
    },
]


def main():
    print(f"Seeding {len(SHIPS)} ships to {BASE} ...")
    with httpx.Client(timeout=30) as client:
        # Check health first
        try:
            r = client.get(f"{BASE}/health")
            r.raise_for_status()
            print(f"  Backend healthy: {r.json()}")
        except Exception as e:
            print(f"ERROR: Cannot reach backend at {BASE}: {e}")
            print("  Make sure the stack is running and the URL is correct.")
            return

        for ship in SHIPS:
            name = ship["name"]
            r = client.post(f"{BASE}/ships/", json=ship)
            if r.status_code == 201:
                data = r.json()
                print(f"  ✓ Created: {name} (id={data['id']}, {len(data['weapons'])} weapons)")
            else:
                print(f"  ✗ FAILED {name}: {r.status_code} {r.text[:200]}")

    print("Done.")


if __name__ == "__main__":
    main()
