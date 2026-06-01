"""
Canonical High Guard 2022 ship data.
Auto-seeded on first boot when the ships table is empty.
All stats sourced directly from High Guard Update 2022 (Mongoose Publishing).
"""
from app.models.ship import Ship, Weapon

SOURCE = "High Guard Update 2022"


def _s(**kw):
    """Ship dict shorthand — fills defaults so each entry stays concise."""
    return dict(
        source=SOURCE, is_canonical=True,
        stealth=kw.pop("stealth", False),
        reflec=kw.pop("reflec", False),
        radiation_shielding=kw.pop("radiation_shielding", False),
        self_sealing=kw.pop("self_sealing", True),
        m_drive_type=kw.pop("m_drive_type", "maneuver"),
        j_drive_rating=kw.pop("j_drive_rating", 0),
        power_plant_type=kw.pop("power_plant_type", "fusion_tl12"),
        fuel_tons_jump=kw.pop("fuel_tons_jump", 0),
        fuel_tons_reaction=kw.pop("fuel_tons_reaction", 0),
        bridge_type=kw.pop("bridge_type", "standard"),
        computer_bis=kw.pop("computer_bis", False),
        computer_fib=kw.pop("computer_fib", False),
        staterooms=kw.pop("staterooms", 0),
        staterooms_double=kw.pop("staterooms_double", 0),
        low_berths=kw.pop("low_berths", 0),
        emergency_low_berths=kw.pop("emergency_low_berths", 0),
        common_area_tons=kw.pop("common_area_tons", 0),
        crew_captain=kw.pop("crew_captain", 0),
        crew_astrogator=kw.pop("crew_astrogator", 0),
        crew_engineer=kw.pop("crew_engineer", 0),
        crew_maintenance=kw.pop("crew_maintenance", 0),
        crew_sensor_op=kw.pop("crew_sensor_op", 0),
        crew_steward=kw.pop("crew_steward", 0),
        crew_medic=kw.pop("crew_medic", 0),
        crew_admin=kw.pop("crew_admin", 0),
        crew_officer=kw.pop("crew_officer", 0),
        crew_marines=kw.pop("crew_marines", 0),
        cargo_tons=kw.pop("cargo_tons", 0),
        **kw,
    )


def _w(name, mount, wtype, dice, dm=0, mult=1, power=4, tl=9, traits=None, ammo=0, count=1, pop_up=False):
    return dict(name=name, count=count, mount=mount, weapon_type=wtype,
                tl=tl, power=power, damage_dice=dice, damage_dm=dm,
                damage_multiple=mult, traits=traits or [], ammo_count=ammo, pop_up=pop_up)


SHIPS = [
    # ─────────────────────────────────────────────────────────────────────
    # SMALL CRAFT (no jump drive)
    # ─────────────────────────────────────────────────────────────────────
    {
        "ship": _s(
            name="Ultralight Fighter", tech_level=12,
            hull_tons=6, hull_config="streamlined", hull_type="standard", hull_points=2,
            armor_type="crystaliron", armor_value=3, stealth=True,
            m_drive_rating=6, power_plant_type="fusion_tl12", power_plant_tons=1, power_available=15,
            fuel_tons_reaction=1, bridge_type="cockpit",
            computer_model="Computer/5", computer_processing=5,
            sensor_type="civilian", sensor_dm=-2,
            crew_pilot=1, crew_gunners=1, hardpoints=0, total_cost_mcr=6.33,
            description="6-ton carrier-based fighter. Carried in flights of four in a Fighter Frame Module. Fast but fragile.",
        ),
        "weapons": [_w("Fixed Pulse Laser", "fixed", "pulse_laser", 2, power=3)],
    },
    {
        "ship": _s(
            name="Light Fighter", tech_level=12,
            hull_tons=10, hull_config="streamlined", hull_type="standard", hull_points=4,
            armor_type="crystaliron", armor_value=2,
            m_drive_rating=6, power_plant_type="fusion_tl12", power_plant_tons=1, power_available=15,
            fuel_tons_reaction=1, bridge_type="cockpit",
            computer_model="Computer/5", computer_processing=5,
            sensor_type="improved", sensor_dm=1,
            crew_pilot=1, crew_gunners=1, cargo_tons=1, hardpoints=0, total_cost_mcr=9.62,
            description="10-ton light fighter. Fast, manoeuvrable, improved sensors. Budget space-defence craft.",
        ),
        "weapons": [_w("Fixed Pulse Laser", "fixed", "pulse_laser", 2, power=3)],
    },
    {
        "ship": _s(
            name="Heavy Fighter", tech_level=15,
            hull_tons=50, hull_config="streamlined", hull_type="reinforced", hull_points=22,
            armor_type="bonded_superdense", armor_value=15,
            m_drive_rating=9, power_plant_type="fusion_tl15", power_plant_tons=4, power_available=70,
            fuel_tons_reaction=1,
            computer_model="Computer/35", computer_processing=35,
            sensor_type="advanced", sensor_dm=2,
            crew_pilot=1, crew_gunners=1, staterooms=2, cargo_tons=1, hardpoints=1, total_cost_mcr=68.92,
            description="50-ton space superiority fighter. Bonded Superdense armour 15, Thrust 9, Computer/35, Evade/2. Endures days on patrol.",
        ),
        "weapons": [
            _w("Single Turret (Beam Laser)", "single_turret", "beam_laser", 1, tl=10, power=4),
            _w("Fixed Missile Rack", "fixed", "missile_rack", 4, power=0, tl=7, traits=["Smart"], ammo=60),
        ],
    },
    {
        "ship": _s(
            name="Military Gig", tech_level=14,
            hull_tons=20, hull_config="streamlined", hull_type="standard", hull_points=8,
            armor_type="bonded_superdense", armor_value=4, stealth=True,
            m_drive_rating=8, power_plant_type="fusion_tl12", power_plant_tons=2, power_available=30,
            fuel_tons_reaction=1,
            computer_model="Computer/5", computer_processing=5,
            sensor_type="basic", sensor_dm=-4,
            crew_pilot=1, crew_gunners=1, low_berths=3, cargo_tons=2, hardpoints=0, total_cost_mcr=13.67,
            description="Armoured 20-ton gig carried on the Gazelle. Thrust 8, Bonded Superdense 4, Stealth. For high-speed intercepts.",
        ),
        "weapons": [_w("Fixed Pulse Laser (Intense Focus, High Yield)", "fixed", "pulse_laser", 2, dm=2, power=3)],
    },
    {
        "ship": _s(
            name="Troop Transport", tech_level=15,
            hull_tons=50, hull_config="streamlined", hull_type="reinforced", hull_points=22,
            armor_type="bonded_superdense", armor_value=5, stealth=True,
            m_drive_rating=9, power_plant_type="fusion_tl15", power_plant_tons=3, power_available=60,
            fuel_tons_reaction=1,
            computer_model="Computer/25", computer_processing=25,
            sensor_type="improved", sensor_dm=1,
            crew_pilot=1, crew_gunners=1, cargo_tons=2, hardpoints=1, total_cost_mcr=45.72,
            description="50-ton Imperial Navy orbital assault craft. 50 acceleration seats, no airlock. Stealth. Thrust 9.",
        ),
        "weapons": [
            _w("Single Turret (Sandcaster)", "single_turret", "sandcaster", 0, power=0, tl=7, ammo=30),
            _w("Fixed Missile Rack", "fixed", "missile_rack", 4, power=0, tl=7, traits=["Smart"], ammo=18),
        ],
    },

    # ─────────────────────────────────────────────────────────────────────
    # 100-TON SHIPS
    # ─────────────────────────────────────────────────────────────────────
    {
        "ship": _s(
            name="Scout/Courier — Type S (Sulieman)", tech_level=12,
            hull_tons=100, hull_config="streamlined", hull_type="standard", hull_points=40,
            armor_type="crystaliron", armor_value=4,
            m_drive_rating=2, j_drive_rating=2,
            power_plant_type="fusion_tl12", power_plant_tons=4, power_available=60,
            fuel_tons_jump=20, computer_model="Computer/5", computer_processing=5, computer_bis=True,
            sensor_type="military", sensor_dm=0,
            crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_gunners=1,
            staterooms=4, cargo_tons=11, hardpoints=1, total_cost_mcr=36.94,
            description="Iconic IISS 100-ton multi-role scout. Jump-2, Thrust 2, Crystaliron 4. Carries air/raft. Thousands in service.",
        ),
        "weapons": [_w("Double Turret (Pulse Laser)", "double_turret", "pulse_laser", 2, dm=1)],
    },
    {
        "ship": _s(
            name="Seeker Mining Ship — Type J", tech_level=12,
            hull_tons=100, hull_config="streamlined", hull_type="standard", hull_points=40,
            armor_type="crystaliron", armor_value=4,
            m_drive_rating=2, j_drive_rating=2,
            power_plant_type="fusion_tl12", power_plant_tons=4, power_available=60,
            fuel_tons_jump=20, computer_model="Computer/5", computer_processing=5, computer_bis=True,
            sensor_type="military", sensor_dm=0,
            crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_gunners=1,
            staterooms=2, cargo_tons=30, hardpoints=1, total_cost_mcr=34.30,
            description="Scout-derived asteroid miner. Larger cargo hold, prospecting buggy, fuel processor. Common among belters.",
        ),
        "weapons": [_w("Double Turret (empty)", "double_turret", "pulse_laser", 2, dm=1)],
    },
    {
        "ship": _s(
            name="Scout — Serpent Class", tech_level=14,
            hull_tons=100, hull_config="streamlined", hull_type="standard", hull_points=40,
            armor_type="bonded_superdense", armor_value=4,
            m_drive_rating=2, j_drive_rating=2,
            power_plant_type="fusion_tl12", power_plant_tons=4, power_available=60,
            fuel_tons_jump=22, computer_model="Computer/5", computer_processing=5, computer_bis=True,
            sensor_type="military", sensor_dm=0,
            crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_gunners=1,
            staterooms=4, common_area_tons=1, cargo_tons=8, hardpoints=1, total_cost_mcr=40.97,
            description="TL14 upgrade of the Type S. Bonded Superdense armour, advanced probes, aerofins, life scanner. Allotted to senior scouts.",
        ),
        "weapons": [_w("Double Turret (Pulse Laser)", "double_turret", "pulse_laser", 2, dm=1)],
    },

    # ─────────────────────────────────────────────────────────────────────
    # 200-TON SHIPS
    # ─────────────────────────────────────────────────────────────────────
    {
        "ship": _s(
            name="Free Trader — Type A (Beowulf)", tech_level=12,
            hull_tons=200, hull_config="streamlined", hull_type="standard", hull_points=80,
            armor_type="crystaliron", armor_value=2,
            m_drive_rating=1, j_drive_rating=1,
            power_plant_type="fusion_tl12", power_plant_tons=5, power_available=75,
            fuel_tons_jump=20, computer_model="Computer/5", computer_processing=5,
            sensor_type="civilian", sensor_dm=-2,
            crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_steward=1,
            staterooms=10, low_berths=20, common_area_tons=10,
            cargo_tons=82, hardpoints=2, total_cost_mcr=45.79,
            description="The archetypal tramp freighter. 200 tons, Jump-1, Thrust 1. Crystaliron 2. The most common ship in Charted Space.",
        ),
        "weapons": [],
    },
    {
        "ship": _s(
            name="Far Trader — Empress Marava Class", tech_level=12,
            hull_tons=200, hull_config="streamlined", hull_type="standard", hull_points=80,
            armor_type="none", armor_value=0,
            m_drive_rating=1, j_drive_rating=2,
            power_plant_type="fusion_tl12", power_plant_tons=6, power_available=90,
            fuel_tons_jump=40, computer_model="Computer/5", computer_processing=5, computer_bis=True,
            sensor_type="civilian", sensor_dm=-2,
            crew_captain=1, crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_gunners=2, crew_steward=1,
            staterooms=10, low_berths=4, common_area_tons=10,
            cargo_tons=62, hardpoints=2, total_cost_mcr=54.04,
            description="Common 200-ton far trader ranging the full Imperium. Jump-2, Thrust 1. Two double beam laser turrets.",
        ),
        "weapons": [_w("Double Turret (Beam Lasers)", "double_turret", "beam_laser", 1, tl=10, count=2)],
    },
    {
        "ship": _s(
            name="Safari Ship — Type K (Animal Class)", tech_level=12,
            hull_tons=200, hull_config="streamlined", hull_type="standard", hull_points=80,
            armor_type="none", armor_value=0,
            m_drive_rating=1, j_drive_rating=2,
            power_plant_type="fusion_tl12", power_plant_tons=7, power_available=105,
            fuel_tons_jump=40, computer_model="Computer/5", computer_processing=5, computer_bis=True,
            sensor_type="civilian", sensor_dm=-2,
            crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_steward=1, crew_medic=1,
            staterooms=11, common_area_tons=13,
            cargo_tons=13, hardpoints=1, total_cost_mcr=61.23,
            description="Excursion vessel for trophy expeditions. Holding tanks, trophy lounge, launch and ATV. Often more luxurious than yachts.",
        ),
        "weapons": [_w("Double Turret (empty)", "double_turret", "pulse_laser", 2)],
    },
    {
        "ship": _s(
            name="Yacht — Type Y", tech_level=12,
            hull_tons=200, hull_config="standard", hull_type="standard", hull_points=80,
            armor_type="none", armor_value=0,
            m_drive_rating=1, j_drive_rating=1,
            power_plant_type="fusion_tl12", power_plant_tons=6, power_available=90,
            fuel_tons_jump=20, computer_model="Computer/5", computer_processing=5,
            sensor_type="civilian", sensor_dm=-2,
            crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_steward=1, crew_medic=1,
            staterooms=12, common_area_tons=13, cargo_tons=16, hardpoints=2, total_cost_mcr=62.53,
            description="Noble's plaything. Luxury stateroom, gourmet kitchen, hot tub, theatre. Carries air/raft and ship's boat.",
        ),
        "weapons": [],
    },
    {
        "ship": _s(
            name="System Defence Boat (TL15)", tech_level=15,
            hull_tons=200, hull_config="standard", hull_type="reinforced", hull_points=88,
            armor_type="crystaliron", armor_value=13, radiation_shielding=True,
            m_drive_rating=9, power_plant_type="fusion_tl12", power_plant_tons=16, power_available=240,
            fuel_tons_reaction=6,
            computer_model="Computer/35", computer_processing=35,
            sensor_type="improved", sensor_dm=1,
            crew_captain=1, crew_pilot=3, crew_engineer=1, crew_maintenance=1, crew_gunners=4,
            crew_medic=1, crew_admin=1, crew_officer=1,
            staterooms=15, common_area_tons=4, cargo_tons=14, hardpoints=2, total_cost_mcr=134.44,
            description="200-ton no-jump SDB. Thrust 9, Armour 13, Radiation Shielding, Computer/35. Deadly in its home system.",
        ),
        "weapons": [
            _w("Triple Turret (Beam Lasers)", "triple_turret", "beam_laser", 1, dm=2, tl=10),
            _w("Triple Turret (Missile Racks)", "triple_turret", "missile_rack", 4, power=0, tl=7, traits=["Smart"], ammo=240),
        ],
    },

    # ─────────────────────────────────────────────────────────────────────
    # 400-TON SHIPS
    # ─────────────────────────────────────────────────────────────────────
    {
        "ship": _s(
            name="Close Escort — Gazelle Class", tech_level=14,
            hull_tons=400, hull_config="close_structure", hull_type="standard", hull_points=160,
            armor_type="bonded_superdense", armor_value=3,
            m_drive_rating=5, j_drive_rating=3,
            power_plant_type="fusion_tl12", power_plant_tons=47, power_available=555,
            fuel_tons_jump=120, bridge_type="small",
            computer_model="Computer/20", computer_processing=20, computer_bis=True,
            sensor_type="military", sensor_dm=0,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=4,
            crew_maintenance=1, crew_gunners=8, crew_medic=1, crew_officer=1, crew_marines=12,
            staterooms=5, common_area_tons=11, cargo_tons=12, hardpoints=4, total_cost_mcr=188.57,
            description="400-ton Imperial Navy anti-piracy escort. Carries military gig. Particle barbettes + beam laser turrets.",
        ),
        "weapons": [
            _w("Particle Barbettes", "barbette", "particle_barbette", 4, mult=3, power=15, tl=11, traits=["Radiation"], count=2),
            _w("Triple Turret (Intense Focus Beam Lasers)", "triple_turret", "beam_laser", 1, dm=2, tl=10, count=2),
        ],
    },
    {
        "ship": _s(
            name="Fleet Courier (TL15)", tech_level=15,
            hull_tons=400, hull_config="streamlined", hull_type="standard", hull_points=160,
            armor_type="none", armor_value=0,
            m_drive_rating=5, j_drive_rating=5,
            power_plant_type="fusion_tl15", power_plant_tons=19, power_available=380,
            fuel_tons_jump=200, bridge_type="small",
            computer_model="Computer/30", computer_processing=30,
            sensor_type="advanced", sensor_dm=2,
            crew_captain=1, crew_pilot=2, crew_astrogator=1, crew_engineer=2,
            crew_maintenance=1, crew_gunners=4,
            staterooms=8, common_area_tons=6, cargo_tons=5, hardpoints=4, total_cost_mcr=229.41,
            description="400-ton fast courier. Jump-5, Thrust 5 (energy efficient). Advanced sensors, Evade/3, Fire Control/4. Defensive armament only.",
        ),
        "weapons": [
            _w("Triple Turret (Beam Lasers)", "triple_turret", "beam_laser", 1, dm=2, tl=10, count=2),
            _w("Triple Turret (Sandcasters)", "triple_turret", "sandcaster", 0, power=0, tl=7, ammo=40, count=2),
        ],
    },
    {
        "ship": _s(
            name="Laboratory Ship — Type L", tech_level=12,
            hull_tons=400, hull_config="dispersed_structure", hull_type="standard", hull_points=144,
            armor_type="none", armor_value=0,
            m_drive_rating=2, j_drive_rating=2,
            power_plant_type="fusion_tl12", power_plant_tons=12, power_available=180,
            fuel_tons_jump=80, computer_model="Computer/10", computer_processing=10,
            sensor_type="improved", sensor_dm=1,
            crew_pilot=1, crew_astrogator=1, crew_engineer=2, crew_medic=1, crew_sensor_op=5,
            staterooms=20, common_area_tons=15, cargo_tons=22, hardpoints=4, total_cost_mcr=115.55,
            description="400-ton IISS survey laboratory. Dispersed structure for spin gravity. 80-ton labs, research pinnace, 15 air/rafts. Unarmed.",
        ),
        "weapons": [],
    },
    {
        "ship": _s(
            name="Patrol Corvette — Type T", tech_level=12,
            hull_tons=400, hull_config="streamlined", hull_type="standard", hull_points=160,
            armor_type="crystaliron", armor_value=4,
            m_drive_rating=4, j_drive_rating=3,
            power_plant_type="fusion_tl12", power_plant_tons=20, power_available=300,
            fuel_tons_jump=120, computer_model="Computer/15", computer_processing=15,
            sensor_type="military", sensor_dm=0,
            crew_pilot=1, crew_astrogator=1, crew_engineer=2, crew_medic=1, crew_gunners=4, crew_marines=8,
            staterooms=12, low_berths=4, common_area_tons=10, cargo_tons=47, hardpoints=4, total_cost_mcr=178.43,
            description="400-ton military patrol corvette. Thrust 4, Jump-3, Crystaliron 4. Carries ship's boat and G/carrier. Evade/1.",
        ),
        "weapons": [
            _w("Triple Turret (Pulse Lasers)", "triple_turret", "pulse_laser", 2, dm=1, count=2),
            _w("Triple Turret (Missile Racks)", "triple_turret", "missile_rack", 4, power=0, tl=7, traits=["Smart"], count=2),
        ],
    },
    {
        "ship": _s(
            name="Subsidised Merchant — Type R", tech_level=12,
            hull_tons=400, hull_config="streamlined", hull_type="standard", hull_points=160,
            armor_type="none", armor_value=0,
            m_drive_rating=1, j_drive_rating=1,
            power_plant_type="fusion_tl12", power_plant_tons=9, power_available=135,
            fuel_tons_jump=40, computer_model="Computer/5", computer_processing=5,
            sensor_type="civilian", sensor_dm=-2,
            crew_pilot=1, crew_astrogator=1, crew_engineer=1, crew_medic=1, crew_steward=1,
            staterooms=19, low_berths=9, common_area_tons=6,
            cargo_tons=201, hardpoints=4, total_cost_mcr=78.58,
            description="Fat trader. 400 tons, Jump-1, Thrust 1. Cavernous 201-ton cargo bay. No weapons. Backbone of Imperial commerce.",
        ),
        "weapons": [],
    },
    {
        "ship": _s(
            name="System Defence Boat — Dragon Class (TL13)", tech_level=13,
            hull_tons=400, hull_config="streamlined", hull_type="reinforced", hull_points=176,
            armor_type="crystaliron", armor_value=13,
            radiation_shielding=True, stealth=True,
            m_drive_rating=7, power_plant_type="fusion_tl12", power_plant_tons=30, power_available=450,
            fuel_tons_reaction=12, computer_model="Computer/25", computer_processing=25, computer_fib=True,
            sensor_type="improved", sensor_dm=1,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=2, crew_maintenance=1,
            crew_medic=1, crew_gunners=6, crew_sensor_op=3, crew_officer=1,
            staterooms=10, common_area_tons=10, cargo_tons=18, hardpoints=4, total_cost_mcr=277.43,
            description="400-ton heavy SDB. Thrust 7, Armour 13, Stealth, Radiation Shielding, Computer/25fib. Particle barbettes and missile bay.",
        ),
        "weapons": [
            _w("Particle Barbettes", "barbette", "particle_barbette", 4, mult=3, power=15, tl=11, traits=["Radiation"], count=2),
            _w("Small Missile Bay", "small_bay", "missile_bay", 4, mult=10, power=0, tl=7, traits=["Smart"], ammo=480),
            _w("Point Defence Laser Battery II", "medium_bay", "beam_laser", 1, dm=0, tl=12, power=20),
        ],
    },
    {
        "ship": _s(
            name="Corsair — Type P (Nishemani Class)", tech_level=15,
            hull_tons=400, hull_config="standard", hull_type="standard", hull_points=160,
            armor_type="bonded_superdense", armor_value=5,
            m_drive_rating=3, j_drive_rating=2,
            power_plant_type="fusion_tl15", power_plant_tons=11, power_available=220,
            fuel_tons_jump=70, computer_model="Computer/10", computer_processing=10,
            sensor_type="advanced", sensor_dm=2,
            crew_pilot=1, crew_astrogator=1, crew_engineer=2, crew_gunners=3, crew_marines=4,
            staterooms=10, low_berths=20, common_area_tons=10, cargo_tons=46, hardpoints=4, total_cost_mcr=175.15,
            description="Infamous 400-ton pirate ship. Adjustable hull disguises it as a trader. 100-ton docking bay to swallow victims whole.",
        ),
        "weapons": [
            _w("Triple Turret (Beam Laser)", "triple_turret", "beam_laser", 1, dm=0, tl=10, count=3),
        ],
    },

    # ─────────────────────────────────────────────────────────────────────
    # 600–1000 TON SHIPS
    # ─────────────────────────────────────────────────────────────────────
    {
        "ship": _s(
            name="Subsidised Liner — Type M", tech_level=12,
            hull_tons=600, hull_config="standard", hull_type="standard", hull_points=240,
            armor_type="none", armor_value=0,
            m_drive_rating=1, j_drive_rating=3,
            power_plant_type="fusion_tl12", power_plant_tons=24, power_available=360,
            fuel_tons_jump=180, computer_model="Computer/10", computer_processing=10, computer_bis=True,
            sensor_type="civilian", sensor_dm=-2,
            crew_captain=1, crew_pilot=2, crew_astrogator=1, crew_engineer=3, crew_maintenance=1,
            crew_medic=1, crew_steward=10, crew_officer=1,
            staterooms=34, low_berths=20, common_area_tons=34,
            cargo_tons=60, hardpoints=6, total_cost_mcr=166.72,
            description="600-ton passenger liner. Jump-3, Thrust 1. 24 passengers in comfort plus 20 in low berths. Gourmet kitchen, pool, theatre.",
        ),
        "weapons": [],
    },
    {
        "ship": _s(
            name="Mercenary Cruiser — Type C", tech_level=12,
            hull_tons=800, hull_config="sphere", hull_type="standard", hull_points=320,
            armor_type="crystaliron", armor_value=3, radiation_shielding=True,
            m_drive_rating=3, j_drive_rating=3,
            power_plant_type="fusion_tl12", power_plant_tons=36, power_available=530,
            fuel_tons_jump=250, bridge_type="standard",
            computer_model="Computer/20", computer_processing=20, computer_fib=True,
            sensor_type="military", sensor_dm=0,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=4, crew_maintenance=1,
            crew_medic=1, crew_steward=1, crew_officer=0,
            staterooms=16, low_berths=0, common_area_tons=24,
            cargo_tons=22, hardpoints=8, total_cost_mcr=345.88,
            description="800-ton troop transport. Thrust 3, Jump-3. Carries 30 marines, two modular cutters, luxury captain's stateroom. Turrets unarmed as standard.",
        ),
        "weapons": [
            _w("Triple Turrets (unarmed)", "triple_turret", "pulse_laser", 2, count=8),
        ],
    },
    {
        "ship": _s(
            name="X-Boat Tender — Class XT", tech_level=14,
            hull_tons=1000, hull_config="standard", hull_type="standard", hull_points=400,
            armor_type="none", armor_value=0,
            m_drive_rating=1, j_drive_rating=1,
            power_plant_type="fusion_tl12", power_plant_tons=30, power_available=450,
            fuel_tons_jump=100, computer_model="Computer/15", computer_processing=15,
            sensor_type="civilian", sensor_dm=-2,
            crew_captain=1, crew_pilot=1, crew_astrogator=1, crew_engineer=2, crew_maintenance=1, crew_medic=1,
            staterooms=11, low_berths=20, common_area_tons=23, cargo_tons=80, hardpoints=3, total_cost_mcr=280.04,
            description="1000-ton express boat tender. Carries up to 4 x-boats. Relay station and refuelling service for the Imperial communication network.",
        ),
        "weapons": [
            _w("Single Turrets (empty)", "single_turret", "pulse_laser", 2, count=2),
            _w("Pop-Up Single Turret (empty)", "single_turret", "pulse_laser", 2, pop_up=True),
        ],
    },

    # ─────────────────────────────────────────────────────────────────────
    # DESTROYER ESCORTS (1000 tons)
    # ─────────────────────────────────────────────────────────────────────
    {
        "ship": _s(
            name="Destroyer Escort — Chrysanthemum Class", tech_level=15,
            hull_tons=1000, hull_config="close_structure", hull_type="reinforced", hull_points=440,
            armor_type="bonded_superdense", armor_value=2,
            m_drive_rating=6, j_drive_rating=4,
            power_plant_type="fusion_tl15", power_plant_tons=64, power_available=1280,
            fuel_tons_jump=400, bridge_type="standard",
            computer_model="Computer/35", computer_processing=35, computer_fib=True,
            sensor_type="advanced", sensor_dm=2,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=7, crew_maintenance=2,
            crew_medic=1, crew_gunners=20, crew_admin=7, crew_officer=3,
            staterooms=24, common_area_tons=24, cargo_tons=33, hardpoints=10, total_cost_mcr=559.60,
            description="1000-ton Imperial Navy destroyer escort. Ubiquitous fleet workhorse over 100 years in service. Thrust 6, Jump-4, Computer/35fib.",
        ),
        "weapons": [
            _w("Fusion Barbette", "barbette", "fusion_barbette", 5, mult=3, power=20, tl=12, traits=["AP 3", "Radiation"]),
            _w("Particle Barbettes", "barbette", "particle_barbette", 4, mult=3, power=15, tl=11, traits=["Radiation"], count=2),
            _w("Triple Turret (Missile Racks)", "triple_turret", "missile_rack", 4, power=0, tl=7, traits=["Smart"], ammo=384, count=2),
            _w("Triple Turret (Sandcasters)", "triple_turret", "sandcaster", 0, power=0, tl=7, ammo=640, count=5),
        ],
    },
    {
        "ship": _s(
            name="Destroyer Escort — Fer-de-Lance Class", tech_level=15,
            hull_tons=1000, hull_config="close_structure", hull_type="reinforced", hull_points=440,
            armor_type="bonded_superdense", armor_value=2, radiation_shielding=True,
            m_drive_rating=6, j_drive_rating=4,
            power_plant_type="fusion_tl15", power_plant_tons=50, power_available=1000,
            fuel_tons_jump=370, bridge_type="standard",
            computer_model="Computer/35", computer_processing=35, computer_fib=True,
            sensor_type="advanced", sensor_dm=2,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=7, crew_maintenance=2,
            crew_medic=1, crew_gunners=20, crew_admin=1, crew_sensor_op=3, crew_officer=4,
            staterooms=28, common_area_tons=11, cargo_tons=42, hardpoints=10, total_cost_mcr=654.96,
            description="1000-ton convoy escort from the Third Frontier War era. Thrust 6 (energy efficient), Jump-4 (reduced fuel), Radiation Shielding. Missile barbettes and beam laser turrets.",
        ),
        "weapons": [
            _w("Missile Barbettes (accurate)", "barbette", "missile_barbette", 4, mult=3, power=0, tl=7, traits=["Smart", "Accurate"], ammo=360, count=4),
            _w("Triple Turret (Accurate High Yield Beam Lasers)", "triple_turret", "beam_laser", 1, dm=2, tl=10, count=6),
        ],
    },

    # ─────────────────────────────────────────────────────────────────────
    # CAPITAL SHIPS
    # ─────────────────────────────────────────────────────────────────────
    {
        "ship": _s(
            name="Colonial Cruiser — Kinunir Class", tech_level=15,
            hull_tons=1200, hull_config="standard", hull_type="reinforced", hull_points=528,
            armor_type="bonded_superdense", armor_value=4,
            m_drive_rating=4, j_drive_rating=4,
            power_plant_type="fusion_tl15", power_plant_tons=70, power_available=1400,
            fuel_tons_jump=463, bridge_type="standard",
            computer_model="Computer/35", computer_processing=35,
            sensor_type="advanced", sensor_dm=2,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=6, crew_maintenance=2,
            crew_medic=1, crew_gunners=4, crew_admin=1, crew_officer=1, crew_marines=35,
            staterooms=20, common_area_tons=29, cargo_tons=21, hardpoints=12, total_cost_mcr=864.59,
            description="1200-ton experimental vanguard cruiser. Ill-fated class of 20. Black globe generator, nuclear dampers, point defence. Carries marines for boarding.",
        ),
        "weapons": [
            _w("Triple Turret (Missile Racks)", "triple_turret", "missile_rack", 4, power=0, tl=7, traits=["Smart"], ammo=120, count=2),
            _w("Particle Barbettes", "barbette", "particle_barbette", 4, mult=3, power=15, tl=11, traits=["Radiation"], count=2),
            _w("Point Defence Laser Battery III", "large_bay", "beam_laser", 1, tl=12, power=20),
        ],
    },
    {
        "ship": _s(
            name="Merchant Cruiser — Leviathan Class", tech_level=12,
            hull_tons=1800, hull_config="standard", hull_type="standard", hull_points=720,
            armor_type="none", armor_value=0,
            m_drive_rating=4, j_drive_rating=3,
            power_plant_type="fusion_tl12", power_plant_tons=111, power_available=1665,
            fuel_tons_jump=540, computer_model="Computer/10", computer_processing=10, computer_bis=True, computer_fib=True,
            sensor_type="civilian", sensor_dm=-2,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=13, crew_maintenance=2,
            crew_medic=2, crew_gunners=10, crew_steward=1, crew_admin=1, crew_officer=1,
            staterooms=30, common_area_tons=20, cargo_tons=200, hardpoints=18, total_cost_mcr=840.20,
            description="1800-ton independent merchant cruiser. High survivability, dual drives and bridges. Beam lasers, torpedoes. Carries multiple small craft.",
        ),
        "weapons": [
            _w("Double Turret (Energy Efficient Beam Lasers)", "double_turret", "beam_laser", 1, tl=10, count=6),
            _w("Fixed Mount (Missile Racks)", "fixed", "missile_rack", 4, power=0, tl=7, traits=["Smart"], ammo=48, count=2),
            _w("Torpedo Barbettes", "barbette", "torpedo", 6, mult=3, power=2, tl=7, traits=["Smart"], ammo=12, count=2),
        ],
    },
    {
        "ship": _s(
            name="Destroyer — Midu Agashaam Class", tech_level=15,
            hull_tons=3000, hull_config="streamlined", hull_type="reinforced", hull_points=1320,
            armor_type="bonded_superdense", armor_value=4,
            m_drive_rating=6, j_drive_rating=4,
            power_plant_type="fusion_tl15", power_plant_tons=177, power_available=3540,
            fuel_tons_jump=1236,
            computer_model="Core/70", computer_processing=70, computer_fib=True,
            sensor_type="advanced", sensor_dm=2,
            crew_captain=1, crew_pilot=3, crew_astrogator=1, crew_engineer=19, crew_maintenance=6,
            crew_medic=1, crew_gunners=54, crew_admin=3, crew_officer=8, crew_sensor_op=0,
            staterooms=96, common_area_tons=96, cargo_tons=53, hardpoints=30, total_cost_mcr=1843.88,
            description="3000-ton experimental destroyer. Anti-fighter/small craft specialist. Small particle beam bay, meson screens, nuclear dampers. Still developmental.",
        ),
        "weapons": [
            _w("Small Particle Beam Bay", "small_bay", "particle_beam_bay", 4, mult=10, power=80, tl=12, traits=["Radiation"]),
            _w("Triple Turret (Missile Racks)", "triple_turret", "missile_rack", 4, power=0, tl=7, traits=["Smart"], ammo=288, count=6),
            _w("Triple Turret (Pulse Lasers)", "triple_turret", "pulse_laser", 2, dm=1, count=8),
            _w("Triple Turret (Sandcasters)", "triple_turret", "sandcaster", 0, power=0, tl=7, ammo=480, count=6),
        ],
    },
    {
        "ship": _s(
            name="Fleet Escort — P.F. Sloan Class", tech_level=15,
            hull_tons=5000, hull_config="standard", hull_type="standard", hull_points=2000,
            armor_type="bonded_superdense", armor_value=15, radiation_shielding=True,
            m_drive_rating=6, j_drive_rating=4,
            power_plant_type="fusion_tl15", power_plant_tons=338, power_available=6750,
            fuel_tons_jump=2068,
            computer_model="Core/70", computer_processing=70, computer_fib=True,
            sensor_type="advanced", sensor_dm=2,
            crew_captain=1, crew_pilot=6, crew_astrogator=1, crew_engineer=28, crew_maintenance=9,
            crew_medic=1, crew_gunners=51, crew_admin=4, crew_sensor_op=2, crew_officer=11,
            staterooms=77, common_area_tons=77, cargo_tons=222, hardpoints=50, total_cost_mcr=2957.80,
            description="5000-ton fleet escort. Thrust 6, Jump-4, Armour 15, Radiation Shielding. Small missile bays, beam lasers, meson screens. Routine fleet security.",
        ),
        "weapons": [
            _w("Small Missile Bays", "small_bay", "missile_bay", 4, mult=10, power=0, tl=7, traits=["Smart"], ammo=240, count=2),
            _w("Triple Turret (Beam Lasers)", "triple_turret", "beam_laser", 1, dm=2, tl=10, count=30),
        ],
    },
    {
        "ship": _s(
            name="Frontier Cruiser — Azhanti High Lightning", tech_level=14,
            hull_tons=60000, hull_config="standard", hull_type="reinforced", hull_points=33000,
            armor_type="bonded_superdense", armor_value=9, radiation_shielding=True,
            m_drive_rating=2, j_drive_rating=5,
            power_plant_type="fusion_tl12", power_plant_tons=2850, power_available=42750,
            fuel_tons_jump=30570,
            computer_model="Core/80", computer_processing=80,
            sensor_type="improved", sensor_dm=1,
            crew_captain=1, crew_pilot=88, crew_astrogator=1, crew_engineer=168, crew_maintenance=61,
            crew_medic=7, crew_gunners=377, crew_admin=30, crew_officer=75, crew_sensor_op=12,
            staterooms=500, common_area_tons=200, cargo_tons=500, hardpoints=600, total_cost_mcr=27411.35,
            description="60,000-ton multi-purpose cruiser. Jump-5 gives reactive mobility. Particle spinal mount, missile bays, fusion barbettes. 80 light fighters.",
        ),
        "weapons": [
            _w("Particle Accelerator Spinal Mount (TL12)", "spinal", "particle_spinal", 6, mult=1, power=800, tl=12, traits=["Radiation"]),
            _w("Small Missile Bays", "small_bay", "missile_bay", 4, mult=10, power=0, tl=7, traits=["Smart"], ammo=2880, count=24),
            _w("Fusion Barbettes", "barbette", "fusion_barbette", 5, mult=3, power=20, tl=12, traits=["AP 3", "Radiation"], count=30),
            _w("Triple Turret (Pulse Lasers)", "triple_turret", "pulse_laser", 2, dm=1, count=150),
            _w("Triple Turret (Sandcasters)", "triple_turret", "sandcaster", 0, power=0, tl=7, ammo=3900, count=130),
        ],
    },
    {
        "ship": _s(
            name="Dreadnought — Tigress Class", tech_level=15,
            hull_tons=500000, hull_config="sphere", hull_type="reinforced", hull_points=366666,
            armor_type="bonded_superdense", armor_value=17, radiation_shielding=True,
            m_drive_rating=6, j_drive_rating=4,
            power_plant_type="fusion_tl15", power_plant_tons=22000, power_available=440000,
            fuel_tons_jump=191000,
            computer_model="Core/100", computer_processing=100,
            sensor_type="advanced", sensor_dm=2,
            crew_captain=1, crew_pilot=603, crew_astrogator=1, crew_engineer=922, crew_maintenance=339,
            crew_medic=23, crew_gunners=509, crew_admin=165, crew_officer=262, crew_sensor_op=65,
            staterooms=1780, common_area_tons=1780, cargo_tons=7555, hardpoints=5000, total_cost_mcr=356884.57,
            description="500,000-ton Tigress-class dreadnought — largest line-of-battle vessel in the Spinward Marches. Meson spinal, 430 missile bays, 300 heavy fighters. A BatRon is virtually a fleet unto itself.",
        ),
        "weapons": [
            _w("Meson Spinal Mount (TL15)", "spinal", "meson_spinal", 6, mult=1, power=6000, tl=15),
            _w("Small Missile Bays (size reduction x3)", "small_bay", "missile_bay", 4, mult=10, power=0, tl=7, traits=["Smart"], count=430),
            _w("Medium Repulsor Bays", "medium_bay", "repulsor", 0, mult=20, power=100, tl=12, count=22),
            _w("Triple Turret (Long Range Beam Lasers)", "triple_turret", "beam_laser", 1, dm=2, tl=10, count=100),
            _w("Triple Turret (Sandcasters)", "triple_turret", "sandcaster", 0, power=0, tl=7, count=100),
            _w("Double Turret (High Yield Fusion Guns)", "double_turret", "fusion_gun", 4, dm=2, tl=14, traits=["Radiation"], count=30),
        ],
    },
]


async def run_seed(db):
    """Insert all canonical ships. Call only when ships table is empty."""
    print(f"  Seeding {len(SHIPS)} canonical High Guard 2022 ships...")
    for entry in SHIPS:
        ship = Ship(**entry["ship"])
        db.add(ship)
        await db.flush()
        for w in entry["weapons"]:
            db.add(Weapon(**w, ship_id=ship.id))
        print(f"    + {entry['ship']['name']}")
    await db.commit()
    print(f"  Seed complete — {len(SHIPS)} ships added.")
