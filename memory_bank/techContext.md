# Tech Context - Pot Odyssey

## Technologies Used

### Core Engine & Framework
- **Phaser 3**: Primary game engine
  - WebGL renderer with Canvas fallback
  - Built-in physics engine for platformer mechanics
  - Scene management and asset loading
  - Cross-platform input handling

### Platform & Distribution
- **Target Platform**: Web browser (desktop + mobile)
- **Rendering**: WebGL first, Canvas fallback for compatibility
- **PWA Support**: Progressive Web App for offline capability
- **Browser Targets**: Latest Chrome, Edge, Firefox, Safari

### Development Stack
- **JavaScript/TypeScript**: Core development language (PRD doesn't specify, but typical for Phaser)
- **Asset Pipeline**: Sprite atlases optimized for mobile (≤2048px)
- **Build Tools**: (Not specified in PRD - need clarification)
- **Version Control**: (Not specified in PRD - need clarification)

### Data & Storage
- **Primary Storage**: IndexedDB for game saves and progress
- **Settings Storage**: localStorage for user preferences
- **Save Format**: JSON with versioned schemas for compatibility
- **Backup Strategy**: Periodic save state snapshots

### Audio System
- **Web Audio API**: For dynamic audio processing
- **Browser Policy Compliance**: "Tap to Start/Unmute" gate
- **Audio Resume**: AudioContext management for mobile browsers
- **Format Support**: (Not specified in PRD - need clarification)

## Development Setup

### Performance Requirements
- **Target FPS**: 60fps on mid-range phones
- **Fallback Option**: 30fps cap for lower-end devices
- **Memory**: Object pooling for frequent allocations
- **Rendering**: Minimized draw calls through sprite atlasing

### Device Matrix Testing
- **Mobile Devices**: iPhone SE → Pro Max, Android range
- **Desktop**: Low/mid-range GPU support
- **Tablets**: iPad compatibility
- **Browsers**: Latest versions of major browsers

### Build & Optimization
- **Asset Optimization**: 
  - Sprite atlases for reduced draw calls
  - Texture compression for mobile
  - Progressive asset loading
- **Code Optimization**:
  - Object pooling for particles and temporary objects
  - Efficient collision detection
  - Memory-conscious resource management

## Technical Constraints

### Browser Limitations
- **Audio Policy**: Must handle browser autoplay restrictions
- **Performance Variance**: Wide range of device capabilities
- **Memory Constraints**: Mobile browser memory limitations
- **Network Dependency**: Initial asset loading requirements

### Platform Constraints
- **Input Differences**: Desktop keyboard vs mobile touch
- **Screen Sizes**: Responsive design across device ranges
- **Orientation**: Landscape primary, portrait menu support
- **Safe Areas**: UI margins for device notches and navigation

### Performance Constraints
- **Mobile Performance**: 60fps target with 30fps fallback
- **Asset Size**: Mobile-optimized sprite atlases
- **Memory Usage**: Pooled objects and careful resource management
- **Network**: Progressive loading for slower connections

### Accessibility Requirements
- **Input Flexibility**: Remappable controls, multiple input methods
- **Visual Accommodation**: High contrast, reduced motion options
- **Motor Accessibility**: Configurable button sizes, hold-to-toggle
- **Cognitive Load**: Optional assist features, clear visual feedback

## Development Environment Requirements

### Minimum Specifications (Inferred)
- **Development Machine**: Capable of running modern browsers and dev tools
- **Testing Devices**: Range of mobile devices for cross-platform testing
- **Network**: Reliable connection for asset testing and PWA validation

### Tools & Dependencies (Need Clarification)
- **Package Manager**: (npm/yarn - not specified)
- **Build System**: (webpack/vite/etc - not specified)
- **Asset Tools**: (Texture Packer/etc - not specified)
- **Development Server**: (Local dev server - not specified)
- **Testing Framework**: (Unit/integration testing - not specified)

## Missing Technical Information

The following technical details need clarification from the user:

1. **Development Tools**: 
   - Package manager (npm, yarn)
   - Build system (webpack, vite, rollup)
   - Development server setup

2. **Asset Pipeline**:
   - Texture packing tools
   - Audio format preferences
   - Asset optimization workflow

3. **Testing Strategy**:
   - Unit testing framework
   - Integration testing approach
   - Performance monitoring tools

4. **Deployment**:
   - Hosting platform
   - CI/CD pipeline
   - Performance monitoring

5. **Development Workflow**:
   - Code formatting/linting
   - Version control strategy
   - Asset version management