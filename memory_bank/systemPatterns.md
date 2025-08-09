# System Patterns - Pot Odyssey

## How the System is Built

### Core Architecture Pattern
**Component-Based Game Objects**: Built on Phaser 3's GameObject system with custom components for:
- Movement physics (variable jump, coyote time, wall slide)
- Resource management (Moisture, Durability)
- Ability system (seed-grown powers with cooldowns)
- State persistence (save/restore, checkpoints)

### Engine Foundation
- **Phaser 3**: Primary game engine providing WebGL rendering with Canvas fallback
- **Scene Management**: Dedicated scenes for levels, menus, HUD overlay
- **Asset Pipeline**: Sprite atlases ≤2048px for mobile compatibility
- **Performance Strategy**: Object pooling for particles and temporary objects

## Key Technical Decisions

### Performance-First Design
1. **Rendering Optimization**
   - WebGL primary, Canvas fallback
   - Sprite atlas consolidation to minimize draw calls
   - Particle pooling for environmental effects
   - Target: 60fps on mid-range phones, 30fps fallback option

2. **Memory Management**
   - Object pooling for frequently created/destroyed objects
   - Asset preloading with progressive enhancement
   - Texture compression and optimal sprite packing

### Cross-Platform Strategy
1. **Input Abstraction**
   - Desktop: Keyboard controls with customizable mapping
   - Mobile: Virtual controls with configurable button sizes and positions
   - Unified input handling through Phaser's input system

2. **Responsive Design**
   - Fit scaling with safe UI margins
   - Landscape-first with portrait menu support
   - Dynamic button sizing based on device capabilities

### Data Architecture
1. **Save System**
   - **Primary**: IndexedDB for persistent game state
   - **Fallback**: localStorage for settings
   - **Structure**: Versioned schemas for save compatibility
   - **Backup Strategy**: Periodic save state snapshots

2. **Configuration Management**
   - JSON-based ability definitions with hot-loading capability
   - Level gate system for ability requirements and alternate routes
   - Modular content system for easy level iteration

## Architecture Patterns

### Movement System
```
PlayerController
├── PhysicsBody (Phaser physics)
├── InputHandler (unified input)
├── StateManager (grounded, jumping, wallslide)
├── AbilityManager (seed powers)
└── ResourceManager (moisture, durability)
```

### Ability System Pattern
- **Seed Definition**: JSON configs with parameters and cooldowns
- **Runtime Management**: Component-based ability instances
- **State Persistence**: Loadout system with 2 active + 1 passive + 1 soil type
- **Activation Pattern**: Input → Cooldown Check → Resource Check → Execute → Apply Effects

### Level Architecture
```
Level Scene
├── Background Layers (parallax)
├── Collision Tilemap
├── Interactive Objects (planter pads, wayposts)
├── Collectibles (species, seed shards)
├── Hazards (heat sources, patrol enemies)
└── Exit Gates (key bloom requirements)
```

### Checkpoint System
- **Waypost Strategy**: Player-placed checkpoints using Seed Shards
- **State Capture**: Position, abilities, collectibles, resource levels
- **Failure Recovery**: 50% moisture restoration, position reset
- **Accessibility**: Optional free mid-level waypost toggle

### Content Delivery Pattern
1. **Progressive Loading**: Core mechanics first, then environmental content
2. **PWA Shell**: Offline capability for core game scenes
3. **Asset Streaming**: Background loading of upcoming level content
4. **Graceful Degradation**: Reduced effects on lower-performance devices

### Accessibility Architecture
- **Modular Assist Options**: Toggleable features that don't affect core mechanics
- **Input Flexibility**: Remappable controls, hold-to-toggle options
- **Visual Accommodation**: High contrast themes, reduced motion settings
- **Progressive Enhancement**: Core experience works with all accessibility options disabled