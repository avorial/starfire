# Starfire — Traveller Spaceship Combat Game Plan

## Vision

A real-time 2D top-down spaceship combat game faithful to Mongoose Traveller 2nd Edition rules,
built in Godot 4.x. Ships are loaded directly from Mongoose Traveller Foundry VTT JSON data.
Visual style and combat feel draw from Endless Sky: crisp sprites, layered defenses (armor + hull),
and tactical positioning within range bands.

---

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Engine | Godot 4.6 | Free, 2D-native, GDScript, exports to desktop/web |
| Language | GDScript (primary), C# optional for data parsing | Fast iteration, tight Godot integration |
| Ship Data | Mongoose Traveller Foundry VTT JSON | Canonical MGT2e stats; no manual data entry |
| Art reference | Endless Sky (CC-licensed sprites) | Placeholder assets; swap for custom art later |

---

## Traveller 2e Combat Rules to Implement

### Range Bands
```
Adjacent  <1km
Close      1–10km
Short     10–1,250km
Medium     1,250–10,000km
Long      10,000–25,000km
Very Long  25,000–50,000km
Distant   >50,000km
```

Each weapon has an optimal range band. Attacks outside optimal band suffer DM penalties.

### Combat Round Sequence
1. **Initiative** — each ship rolls 2D6 + crew skill; ties broken by maneuver drive rating
2. **Maneuver** — ships spend Thrust points to change speed/range band
3. **Attack** — each gunner rolls 2D6 + Gunner skill vs difficulty (base 8+); range DMs applied
4. **Damage** — roll weapon dice; subtract armor; apply remaining hits to Hull Hits
5. **Criticals** — every 4 hits of damage causes a Critical Hit roll on the table below
6. **Repeat** until one side is destroyed, disabled, or withdraws

### Critical Hit Table (abbreviated from MGT2e)
| Roll | Effect |
|---|---|
| 1 | Minor System Damage (cosmetic) |
| 2 | Crew Hit |
| 3 | Power Plant Hit (reduce power) |
| 4 | Fuel Hit (lose fuel) |
| 5 | Weapons Hit (disable one weapon) |
| 6 | Drive Hit (reduce thrust) |
| 7 | Computer Hit (DM penalty to all rolls) |
| 8 | Hull Breach |
| 9 | Crew Killed |
| 10 | Power Failure |
| 11 | Drive Destroyed |
| 12 | Destroyed |

Criticals are cumulative — a ship can suffer multiple critical systems.

---

## Ship Data Schema (from Foundry JSON)

Fields we consume from `mgt2e/template.json`:

```json
{
  "dtons": 200,
  "type": "Far Trader",
  "configuration": "standard",
  "armour": 4,
  "mdrive": 1,
  "jdrive": 2,
  "power": { "value": 60, "max": 60, "used": 45 },
  "fuel": { "value": 40, "max": 40 },
  "computer": { "processing": 10, "transponder": "ACTIVE" },
  "hits": { "value": 10, "max": 10, "damage": 0, "criticals": {} },
  "initiative": { "base": 0, "current": 0 }
}
```

Weapons are embedded items on the actor with their own damage dice, range, and special effects.

---

## Project Structure

```
starfire/
├── project.godot
├── PLAN.md
├── data/
│   ├── ships/                  # Foundry JSON exports (one file per ship)
│   └── weapons/                # Weapon definitions
├── src/
│   ├── core/
│   │   ├── ship_data.gd        # Parses Foundry JSON → Ship resource
│   │   ├── combat_manager.gd   # Turn/round sequencing, initiative
│   │   ├── attack_resolver.gd  # 2D6 rolls, DMs, hit/miss
│   │   └── damage_resolver.gd  # Armor soak, hull hits, critical table
│   ├── entities/
│   │   ├── ship.gd             # Ship node: movement, state, sprite
│   │   ├── weapon.gd           # Fires projectiles/beams
│   │   └── projectile.gd       # Missile/torpedo scene
│   ├── ui/
│   │   ├── hud.gd              # Ship status bars, weapon selection
│   │   ├── combat_log.gd       # Scrolling roll results
│   │   └── range_indicator.gd  # Visual range band overlay
│   └── scenes/
│       ├── main_menu.tscn
│       ├── ship_select.tscn
│       ├── combat.tscn         # Main battlefield
│       └── encounter_setup.tscn
├── assets/
│   ├── ships/                  # Sprite sheets
│   ├── effects/                # Laser, explosion particles
│   └── ui/                     # HUD elements
└── tests/
    └── test_combat_resolver.gd # GUT unit tests
```

---

## Development Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Initialize Godot 4.6 project, configure 2D scene
- [ ] Write `ShipData` resource: parse Foundry JSON into typed GDScript objects
- [ ] Load 2–3 ships from data files (Far Trader, Type-S Scout, Patrol Cruiser)
- [ ] Basic ship scene: sprite + `CharacterBody2D`, thrust-based movement
- [ ] Repository CI: Godot export check on push

### Phase 2 — Combat Core (Week 3–4)
- [ ] `CombatManager`: initiative rolls, turn order queue
- [ ] Range band system: ships track distance, range band computed each frame
- [ ] `AttackResolver`: 2D6 + Gunner DM + range DM vs difficulty 8+
- [ ] `DamageResolver`: armor soak → hull hits → critical roll table
- [ ] Critical hit effects wired to ship state (disable drive, weapons, power)

### Phase 3 — Visuals (Week 5–6)
- [ ] Parallax starfield background
- [ ] Laser beam and missile projectile scenes with particles
- [ ] Shield/armor flash effect on hit
- [ ] Ship destruction animation (explosion sequence)
- [ ] Range band overlay (concentric rings or distance readout)

### Phase 4 — HUD & Game Loop (Week 7–8)
- [ ] HUD: hull bar, power bar, weapon slots, range readout
- [ ] Combat log: scrolling text showing each roll and result
- [ ] Ship select screen: pick player ship and enemy ship from JSON roster
- [ ] Encounter setup: set initial range band, facing
- [ ] Win/lose conditions: ship destroyed or crew incapacitated
- [ ] Pause menu + restart

### Phase 5 — AI & Polish (Week 9–10)
- [ ] Basic AI pilot: select target, choose weapon, manage range
- [ ] Multiple scenario presets (1v1 escort ambush, patrol encounter)
- [ ] Sound effects: weapons fire, impacts, engine hum
- [ ] Web export for browser play

### Phase 6 — Fleet Combat (Future)
- [ ] Multi-ship sides (2v2, 3v3)
- [ ] Fleet screen: assign crew roles (pilot, gunner, engineer)
- [ ] Boarding action trigger
- [ ] Sensor range and detection mechanics

---

## Key Design Decisions

**Real-time with pause** — Combat runs in real-time like Endless Sky but the player can pause
at any moment to issue orders. This preserves the MGT2e round structure while keeping it engaging.

**Range bands over exact distance** — Ships snap to range bands (not pixel-perfect range),
consistent with how MGT2e abstracts space combat. Movement spends Thrust to change bands.

**2D6 dice visible** — Every attack roll shows the dice and all modifiers in the combat log,
keeping the Traveller tabletop feel explicit.

**Foundry JSON is read-only source** — We never edit ship JSON; all runtime state lives in
GDScript objects. This means updated Foundry exports drop straight in.

---

## Inspirations & References

- **Endless Sky** — real-time combat loop, layered defense model, data-driven ship definitions
- **Mongoose Traveller 2e Core Rulebook** — combat rules, range bands, critical hit table
- **Mongoose Traveller Foundry VTT** (https://github.com/Mongoose-Publishing/traveller-foundryvtt) — ship JSON schema
- **Godot 4.6** — engine, 2D physics, GDScript
