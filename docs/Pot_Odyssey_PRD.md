# Pot Odyssey: Quest for the Perfect Plant — Product Requirements Document (PRD)

**Document Owner:** Game Design  
**Version:** v1.0  
**Date:** 2025-08-09  
**Format:** 2D side‑view platformer  
**Platforms:** Web browser (desktop + mobile)  
**Engine Target:** Phaser 3 (WebGL, Canvas fallback)  
**Business Model:** Premium (with optional free demo)

---

## 1) Summary

**High Concept:** You are a sentient flowerpot searching diverse biomes for seeds to grow the “Perfect Plant.” Traversal, light resource management (**Moisture**), and ability‑granting seeds drive exploration, routing choices, and replayability.

**Player Promise**
- Tight, modern platforming (variable jump, coyote time, jump buffering).
- Abilities grown from seeds that open new routes and puzzle solutions.
- Short stages (6–10 minutes) with quick retries and optional detours.
- Collect, tend, and showcase plant species for cosmetics and 100% completion.

**Design Pillars**
1. **You are the pot** — weight, wobble, moisture, and cracks influence movement and risk.  
2. **Plants are power** — seeds grant traversal/combat abilities and light puzzle solutions.  
3. **Tend & traverse** — small “tend” beats (sun/water/soil) punctuate platforming.  
4. **Replay for 100%** — hidden species, time trials, and alternate routes reward mastery.

---

## 2) Goals & Non‑Goals

**Primary Goals**
- Ship a performant, responsive browser platformer that feels great on desktop and mobile.
- Deliver depth through routing and abilities, not grind.
- Support replay with collectibles, time trials, and New Game+ (NG+).

**Non‑Goals**
- No deep crafting/economy simulation.  
- No complex combat loop beyond simple hazards and ability use.

---

## 3) Audience

- Players 10+ who enjoy cozy exploration platformers with light challenge.  
- Session length target: 10–25 minutes.

---

## 4) Game Structure

### 4.1 Core Loop
1. **Scout** a level: navigate platforms, read environmental plant clues.  
2. **Harvest**: collect seeds, soil samples, and Seed Shards while managing **Moisture**.  
3. **Pot Up** on a **Planter Pad**: plant a seed to unlock/charge an ability.  
4. **Tend** briefly (micro‑puzzle: water/sun/defend) to activate the ability.  
5. **Traverse** new routes and gather **Key Bloom(s)** to open the exit.  
6. **Checkpoint**: optionally plant a **Waypost Sprout** (spend a Seed Shard).  
7. **Exit**: bank collectibles, unlock cosmetics, choose next level.

### 4.2 Session Loop
Select level → pick **Loadout** (1 Soil, 1 Passive, 2 Seed Abilities) → play & collect → exit & upgrade → pick next.

---

## 5) Systems

### 5.1 Player Movement & Feel (initial targets)
- **Run:** max 220–260 px/s; accel 1800; decel 2200.  
- **Jump:** variable height (apply lower gravity while held; higher when released).  
- **Coyote Time:** ~120 ms; **Jump Buffer:** ~120 ms.  
- **Wall Slide/Hop:** slide cap 60 px/s; hop gives small lateral burst.  
- **Dash (Bloom Dash):** 8‑way burst, 0.15 s duration, ~1.0 s cooldown.  
- **Ground‑pound (Thornspike):** fast downward impulse; breaks brittle blocks.

### 5.2 Meters
- **Moisture (primary):** drains over time and from heat; boosts glide/plant growth; low moisture reduces control and increases crack chance.  
- **Durability:** 2–4 pips; impacts cause cracks; at 0 → shatter → respawn at last Waypost.

### 5.3 Loadouts
- **Soils (pick 1 per level):**  
  - *Loam:* balanced stats.  
  - *Sandy:* faster, lower traction, quicker moisture drain.  
  - *Clay:* heavier, +durability, slower jump apex.  
- **Passives (pick 1):** Porous Clay (+max moisture), Re‑firing (+1 durability), Lip Flange (lenient ledge grabs), Glaze Lines (reduced wind drag), Drain Pebbles (slower moisture loss while moving).  
- **Seeds (pick 2 active abilities):** see §6.

### 5.4 Checkpoints & Failure
- **Waypost Sprouts:** spend Seed Shard to plant a checkpoint on marked soil pads.  
- **Failure:** shatter, fall, or dry out → respawn with 50% Moisture.  
- **Assist Options (toggles):** free mid‑level Waypost, slower hazard cycles, larger mobile buttons.

### 5.5 Economy
- **Compost (soft currency):** from hidden species, challenges, and perfect exits.  
- Spend on **passives** and **cosmetics** (no power creep locks).

---

## 6) Abilities (Seed‑grown)

| Ability | Core Effect | Synergy & Uses | Cost/Constraint |
|---|---|---|---|
| **Glideleaf** | Hold jump mid‑air to reduce gravity | Wind tunnels, long gaps | Consumes small Moisture per second |
| **Tanglevine** | Fire a short vine to pull levers or grow a temporary bridge | Puzzles, create routes | Cooldown; anchored to vine nodes |
| **Thornspike** | Ground‑pound; break brittle blocks; contact thorns | Opens shortcuts; hazard counter | Small stun on landing |
| **Bloom Dash** | 8‑way burst; cancels light hazards (sprinklers) | Gap‑crossing; brief iframes | Short cooldown; small Moisture hit |
| **Sunbloom** | Charge in sunlight; release to super‑jump | Rooftop verticality | Overcharge drains Moisture quickly |
| **Moss Magnet** | Pull metal pollen/screws into clusters | Build stepable micro‑bridges | Limited radius; timed decay |
| **Spore Cloak** | Brief stealth; patrols ignore contact | Bypass chases, tight corridors | Cancels on jump/damage |
| **Root Anchor** | Stick/climb walls; slow drain while anchored | Endurance climbs | Steady Moisture drain |

---

## 7) World & Level Plan

### 7.1 Biomes & Teaching Focus
1. **Backyard Garden** — onboarding: movement, Moisture, Thornspike; slugs, puddles.  
2. **Rooftops** — wind physics, Sunbloom + Glideleaf; loose tiles, rooftop cats.  
3. **Park Paths** — timing hazards (sprinklers), Tanglevine puzzles; squirrels, rolling balls.  
4. **Greenhouse Lab** — precision cycles, conveyors; Bloom Dash + Moss Magnet; heat lamps.  
5. **Lost Valley** — endurance climbs, brittle routes; Root Anchor mastery; spore pods.  
6. **Final: Bloom Chamber** — boss arena remix of all hazards.

### 7.2 Level Anatomy (per stage)
- **Intro room** (safe read), **Teach room** (single mechanic), **Twist room** (combo), **Challenge room** (optional), **Gate room** (ability check), **Exit**.  
- **Length:** 6–10 minutes main line; +3–5 minutes optional.  
- **Hidden rooms:** 1–3 per stage; host species collectibles or Seed Shards.

### 7.3 Bosses
- **Rooftop Cat (mid‑boss):** telegraphed pounces; use Glideleaf/Tanglevine to bait into hazards.  
- **Final — Garden Crow → Weed Colossus (two‑phase):**  
  - P1 gusts and pecks; bait into brittle floor to open soil vents.  
  - P2 climb the colossus using Root Anchor; plant seeds on weak nodes; Bloom Dash between phases.

---

## 8) Progression & Difficulty

- **Ramp:** forgiving jumps and sparse hazards in World 1; add timing windows and combo hazards by Worlds 3–4; longer endurance and resource pressure in World 5.  
- **Optional challenge rooms:** “Dry Runs” (low starting Moisture), “Tempest Trials” (wind gauntlets), “No‑Crack” medals.  
- **NG+:** start with 2 passives; stormier hazard variants; time‑trial leaderboards.

---

## 9) Win / Lose Conditions

- **Level win:** collect Key Bloom(s) and activate exit flower.  
- **World win:** grow a **Biome Keystone** from collected species.  
- **Game win:** defeat the boss and plant the Perfect Seed → ending sequence.  
- **Lose:** quit mid‑level or exhaust durability/moisture repeatedly (no meta‑loss).

---

## 10) Controls & UX

### Desktop
- **Move:** A/D or ←/→  
- **Jump (variable):** Space  
- **Ability 1/2:** Q/E  
- **Dash:** Shift (or double‑tap)  
- **Interact/Plant:** F  
- **Anchor:** Ctrl

### Mobile
- Virtual D‑pad + two main buttons (Jump / Ability).  
- Contextual **Interact** appears on Planter Pads.  
- Options: larger hit‑areas, button reposition, vibration toggle.

### HUD
- **Diegetic Moisture ring** around pot; **crack pips**; seed slots with cooldown ticks; subtle wind arrow; breadcrumb to last Waypost.

---

## 11) Art & Audio

**Art Style:** Cozy stylized 2D with layered parallax; readable silhouettes; limited palette per biome; subtle wind and water effects.  
**Animation:** Snappy anticipation on jumps; squash/stretch on landings; crack progression on pot.  
**Audio:** Environmental loops per biome; ability stingers; “Tap to Unmute” start gate for browsers.  
**SFX cues:** moisture tick, crack appear, seed sprout, checkpoint planted, exit bloom.

---

## 12) Accessibility

- Subtitles for all story beats.  
- High‑contrast UI theme; color‑blind safe VFX.  
- **Reduced motion** setting (less camera shake/particles).  
- Input remapping (desktop); larger mobile buttons; hold‑to‑toggle for Root Anchor.  
- Assist toggles: mid‑level Waypost, slower cycles, extended coyote time.

---

## 13) Technical (Web)

- **Target:** 60 fps on mid‑range phones; fallback 30 fps option.  
- **Rendering:** WebGL first, Canvas fallback.  
- **Assets:** sprite atlases ≤2048 px on mobile; pooled particles.  
- **Storage:** IndexedDB for saves; settings in localStorage.  
- **Offline:** Optional PWA shell with pre‑cache of core scenes.  
- **Responsive:** Fit scaling with safe UI margins; landscape default; portrait UI for menus as needed.

---

## 14) Content Scope

### Vertical Slice (VS)
- **Levels:** Backyard 1‑1, 1‑2; Rooftops 2‑1  
- **Abilities:** Glideleaf, Thornspike, Sunbloom, Tanglevine, Bloom Dash, Root Anchor  
- **Systems:** Moisture, Durability, Wayposts, Herbarium v1, cosmetics set v1  
- **Boss:** Rooftop Cat  
- **Platforms:** Desktop + Mobile controls

### Full Release
- **Worlds:** 5 + Final Boss level  
- **Abilities:** 18–22 total (including above)  
- **Collectibles:** 40+ species; Seed Shards in challenge rooms  
- **Modes:** Time trials, NG+, leaderboards, accessibility suite

---

## 15) Telemetry (optional, privacy‑first)

- Level attempts/completions, death causes, ability usage, performance bucket (fps tier/device class).  
- Opt‑in only; local anonymized session ID; no PII.

---

## 16) QA & Device Matrix

- **Browsers:** Latest Chrome/Edge/Firefox/Safari.  
- **Devices:** iPhone SE→Pro Max, common Android tiers, iPad, low/mid desktop GPUs.  
- **Scenarios:** Cold/warm load, offline start, orientation change, background/restore, audio unlock, controller plug/unplug.

---

## 17) Milestones & Deliverables

**VS (4–6 weeks)**  
- Movement, camera, collisions, Moisture/Durability  
- 3 levels, 6 abilities, Wayposts, Herbarium v1  
- Mobile UI, audio gate, basic PWA + IndexedDB save  
- First optimization pass (atlases, pooling)

**Alpha (8–10 weeks)**  
- Worlds 2–3 content, 12–14 abilities total  
- Accessibility v1 (contrast, reduced motion), time trials  
- Performance pass; stability target (<1 crash/1k sessions)

**Beta (6–8 weeks)**  
- Worlds 4–5, final boss, NG+  
- Cosmetic sets, leaderboards  
- Full QA matrix, optimization & polish

**Gold (2 weeks)**  
- Bug triage, perf locks, localization (UI strings)  
- Achievements, release assets

---

## 18) Definition of Done (DoD)

- Stable 60/30 fps across device matrix.  
- All core mechanics and abilities functional on desktop & mobile.  
- Accessibility options verified; UI text meets contrast targets.  
- Save/restore reliable; offline shell loads VS content.  
- No blocking defects in critical flows (start, play, save, exit).

---

## 19) Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Mobile performance dips | Input lag, dropped frames | Sprite atlases, pooled objects, draw‑call minimization, optional 30 fps cap |
| Browser audio policies | Muted music/SFX | “Tap to Start/Unmute” gate; resume AudioContext on first input |
| Aspect ratio fragmentation | UI overlap | Fit scaling + safe margins; separate HUD scaling |
| Save corruption | Progress loss | IndexedDB schema versioning; periodic compaction; fallback backups |
| Scope creep | Delays | Strict ability/level counts; backlog triage; maintain MVP scope for VS |

---

## 20) Open Questions

1. Monetization: premium vs. demo + full unlock?  
2. Leaderboards backend: third‑party vs. lightweight serverless?  
3. Photo mode or simple replay cam for captures?  
4. Localization languages at launch (EN+??).  
5. Optional controller support at launch or post‑launch?

---

## 21) Appendices

### A) Ability Tuning (initial targets)
- **Glideleaf:** gravity scale 0.35 while held; Moisture drain 0.5/s.  
- **Tanglevine:** range 240 px; bridge lasts 6 s; cooldown 3 s.  
- **Thornspike:** set vY = 1100 px/s; breaks *brittle* tiles; 0.2 s stun.  
- **Bloom Dash:** 8‑way, 180 px in 0.15 s; 1.0 s cooldown; 0.1 s invulnerability.  
- **Sunbloom:** 0.6 s charge → +60% jump; overcharge doubles Moisture drain.  
- **Moss Magnet:** radius 160 px; cluster decay 8 s.  
- **Spore Cloak:** 2.5 s stealth; breaks on jump/damage.  
- **Root Anchor:** stick while held; climb 80 px/s; drain 1.0/s.

### B) Collectible Types
- **Species (Herbarium):** unlock cosmetics upon completing families.  
- **Seed Shards:** economy for Wayposts; rare in challenge rooms.  
- **Key Blooms:** level exits (mandatory).

### C) Data Schemas (examples)

```json
// seed_abilities.json (excerpt)
{
  "glideleaf": {
    "name": "Glideleaf",
    "type": "mobility",
    "params": { "gravityScale": 0.35, "moisturePerSecond": 0.5 },
    "cooldown": 0
  },
  "tanglevine": {
    "name": "Tanglevine",
    "type": "utility",
    "params": { "range": 240, "bridgeDuration": 6.0 },
    "cooldown": 3.0
  }
}
```

```json
// level_gate.json (excerpt)
{
  "gateId": "roof_2_bridge",
  "requires": ["tanglevine"],
  "fallbackRoute": "roof_2_alt_gap"
}
```

### D) Test Plan (VS)
- **Movement feel:** coyote time & jump buffer verified with frame step.  
- **Moisture:** drain/refill pacing targets (90–150 s from full→empty without hazards).  
- **Abilities:** each has at least one mandatory check and one optional reward path.  
- **Wayposts:** shard consumption & respawn state restoration.  
- **Mobile:** touch targets ≥48 dp; orientation changes don’t lose state.

---

**End of PRD**
