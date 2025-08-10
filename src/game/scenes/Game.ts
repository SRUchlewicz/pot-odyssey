import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.Physics.Arcade.Sprite;
    platforms: Phaser.Physics.Arcade.StaticGroup;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    spaceKey: Phaser.Input.Keyboard.Key;
    
    // Ability system keys
    qKey: Phaser.Input.Keyboard.Key;
    eKey: Phaser.Input.Keyboard.Key;
    ctrlKey: Phaser.Input.Keyboard.Key;
    fKey: Phaser.Input.Keyboard.Key; // Tanglevine ability key
    
    // Ability system state
    isGliding: boolean = false;
    isGroundPounding: boolean = false;
    isDashing: boolean = false;
    isTanglevining: boolean = false; // Tanglevine state
    dashDirection: { x: number, y: number } = { x: 0, y: 0 };
    dashCount: number = 0; // Track number of dashes since last ground contact
    groundPoundCooldown: number = 0;
    dashCooldown: number = 0;
    tanglevineCooldown: number = 0; // Tanglevine cooldown
    dashInvulnerabilityTimer: number = 0;
    readonly GROUND_POUND_COOLDOWN_MS: number = 1000; // 1 second cooldown
    readonly GROUND_POUND_VELOCITY: number = 1100; // Downward velocity for ground pound
    readonly DASH_COOLDOWN_MS: number = 1000; // 1 second cooldown for dash
    readonly DASH_DURATION_MS: number = 150; // 0.15 seconds dash duration
    readonly DASH_DISTANCE: number = 180; // 180px dash distance
    readonly DASH_INVULNERABILITY_MS: number = 100; // 0.1 seconds invulnerability
    readonly DASH_MOISTURE_COST: number = 5; // 5% moisture cost per dash
    readonly GLIDE_GRAVITY_SCALE: number = 0.35; // Reduced gravity while gliding
    readonly GLIDE_MOISTURE_DRAIN: number = 0.5; // Moisture drain per second while gliding
    readonly NORMAL_GRAVITY_SCALE: number = 1.0; // Normal gravity scale
    readonly TANGLEVINE_COOLDOWN_MS: number = 3000; // 3 second cooldown for Tanglevine
    readonly TANGLEVINE_RANGE: number = 240; // 240px range as per PRD
    readonly TANGLEVINE_BRIDGE_DURATION: number = 6000; // 6 seconds bridge duration as per PRD
    
    // Jump state management
    canJump: boolean = true;
    jumpPressed: boolean = false;
    jumpTimer: number = 0;
    
    // Variable jump parameters (based on Amphibian Abstracts pattern)
    readonly MAX_JUMP_FRAMES: number = 30; // ~500ms at 60fps
    readonly INITIAL_JUMP_VELOCITY: number = -400; // Base jump strength
    readonly JUMP_VELOCITY_BOOST: number = 7; // Additional upward force per frame
    
    // Coyote time parameters (based on GDQuest/GDevelop patterns)
    coyoteTimer: number = 0;
    readonly COYOTE_TIME_MS: number = 40; // Grace period in milliseconds (~2.5 frames at 60fps)
    wasOnGround: boolean = false;
    
    // Jump buffering parameters (based on GameMaker Flynn pattern)
    jumpBufferTimer: number = 0;
    readonly JUMP_BUFFER_MS: number = 180; // Buffer early inputs for 180ms
    
    // Wall slide parameters (based on PRD specs)
    isWallSliding: boolean = false;
    wallSideDetected: 'left' | 'right' | null = null;
    readonly WALL_SLIDE_SPEED: number = 60; // Max fall speed when wall sliding (px/s)
    
    // Resource systems (Moisture & Durability)
    moisture: number = 100; // 0-100
    durability: number = 4; // 2-4 pips as per PRD
    lastMoistureDrain: number = 0;
    readonly MOISTURE_DRAIN_RATE: number = 5; // % per second when idle
    readonly MOISTURE_DRAIN_INTERVAL: number = 10000; // Drain every 10 seconds
    lastImpactTime: number = 0;
    readonly IMPACT_COOLDOWN: number = 500; // 500ms cooldown between impacts
    wasGrounded: boolean = false; // Track previous ground state for impact detection
    timeLeftGround: number = 0; // Track when we left the ground
    lastLandingTime: number = 0; // Track last landing to prevent duplicate detections
    
    // HUD elements
    moistureBar: Phaser.GameObjects.Graphics;
    durabilityPips: Phaser.GameObjects.Graphics;
    hudGroup: Phaser.GameObjects.Group;
    debugText: Phaser.GameObjects.Text;
    collectibleText: Phaser.GameObjects.Text;
    
    // Mobile controls
    leftButton: Phaser.GameObjects.Text;
    rightButton: Phaser.GameObjects.Text;
    jumpButton: Phaser.GameObjects.Text;
    ability1Button: Phaser.GameObjects.Text; // Q key equivalent
    ability2Button: Phaser.GameObjects.Text; // E key equivalent
    groundPoundButton: Phaser.GameObjects.Text; // Ctrl key equivalent
    tanglevineButton: Phaser.GameObjects.Text; // F key equivalent
    
    // Collectibles and progression
    collectibles: Phaser.GameObjects.Group;
    seedShards: number = 0;
    speciesCollected: string[] = [];

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x87CEEB); // Sky blue

        // Set larger world bounds for extended test level
        this.physics.world.setBounds(0, 0, 8000, 1024);
        this.cameras.main.setBounds(0, 0, 8000, 1024);

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();
        
        // Create collectibles group - use a regular group instead of physics group for static objects
        this.collectibles = this.add.group();

        // Create extended ground platform (bottom safety net)
        const ground = this.platforms.create(1024, 950, 'ground'); // Lower and centered
        ground.setScale(8, 1).refreshBody(); // Much wider to catch falls
        
        // Add invisible boundary walls to prevent going too far off-screen
        const leftWall = this.platforms.create(-50, 500, 'ground');
        leftWall.setScale(0.1, 20).refreshBody().setVisible(false); // Invisible left boundary
        
        const rightWall = this.platforms.create(8048, 500, 'ground'); 
        rightWall.setScale(0.1, 20).refreshBody().setVisible(false); // Invisible right boundary

        // ===== HORIZONTAL MARIO-STYLE TEST LEVEL =====
        
        // ===== MAIN HORIZONTAL PROGRESSION PATH =====
        
        // Starting area - flat ground
        this.platforms.create(200, 700, 'ground'); // Main spawn platform
        this.platforms.create(400, 700, 'ground'); // Starting walkway
        this.platforms.create(600, 700, 'ground'); // Continue flat
        
        // ===== SECTION 1: BASIC GAPS (X: 600-900) =====
        // Simple horizontal gaps with moderate vertical variation
        this.platforms.create(800, 650, 'ground'); // Small step down
        this.platforms.create(1000, 600, 'ground'); // Another step down
        this.platforms.create(1200, 650, 'ground'); // Step back up
        
        // ===== SECTION 2: VARIABLE JUMP CHALLENGES (X: 1200-1600) =====
        this.platforms.create(1400, 600, 'ground'); // Approach platform
        this.platforms.create(1600, 550, 'ground'); // Medium gap (tap jump)
        this.platforms.create(1800, 500, 'ground'); // Larger gap (hold jump)
        this.platforms.create(2000, 550, 'ground'); // Landing platform
        
        // ===== SECTION 3: COYOTE TIME TEST (X: 2000-2400) =====
        this.platforms.create(2200, 600, 'ground'); // Approach
        // 180px gap for coyote time testing
        this.platforms.create(2380, 600, 'ground'); // Landing (needs coyote time)
        
        // ===== SECTION 4: WALL SLIDE AREA (X: 2400-2800) =====
        this.platforms.create(2600, 650, 'ground'); // Approach platform
        
        // Horizontal wall for sliding (not vertical tower)
        const horizontalWall = this.platforms.create(2700, 500, 'ground');
        horizontalWall.setScale(0.2, 4).refreshBody(); // Medium height wall
        
        this.platforms.create(2800, 600, 'ground'); // Landing after wall slide
        
        // ===== SECTION 5: ABILITY TEST (X: 2800-3200) =====
        // Area to test ground pound and gliding abilities
        this.platforms.create(3000, 700, 'ground'); // Ground level
        this.platforms.create(3200, 600, 'ground'); // Platform for jumping up
        
        // Brittle blocks for ground pound testing
        const brittleBlock1 = this.platforms.create(3400, 500, 'ground');
        brittleBlock1.setTint(0x8B4513); // Brown tint to indicate it's breakable
        brittleBlock1.setData('brittle', true); // Mark as breakable
        
        const brittleBlock2 = this.platforms.create(3600, 400, 'ground');
        brittleBlock2.setTint(0x8B4513); // Brown tint to indicate it's breakable
        brittleBlock2.setData('brittle', true); // Mark as breakable
        
        this.platforms.create(3800, 300, 'ground'); // Landing platform after breaking blocks
        
        // ===== SECTION 6: DASH TESTING AREA (X: 3800-4200) =====
        // Platforms with gaps designed for dash testing
        this.platforms.create(4000, 600, 'ground'); // Approach platform
        this.platforms.create(4200, 550, 'ground'); // Gap that requires dash to cross
        this.platforms.create(4400, 500, 'ground'); // Landing platform
        this.platforms.create(4600, 450, 'ground'); // Another gap for diagonal dash testing
        this.platforms.create(4800, 500, 'ground'); // Final landing platform
        
        // ===== SECTION 7: TANGLEVINE PUZZLE AREA (X: 4800-5200) =====
        // Bridge gaps and lever puzzles for Tanglevine testing
        this.platforms.create(5000, 600, 'ground'); // Approach platform
        
        // Large gap that requires Tanglevine bridge
        // Gap is 300px wide - Tanglevine range is 240px, so player needs to bridge
        this.platforms.create(5300, 600, 'ground'); // Far side platform
        
        // Lever node for Tanglevine interaction (visual marker)
        const leverNode = this.add.rectangle(5150, 550, 20, 20, 0x00ff00);
        leverNode.setStrokeStyle(2, 0xffffff);
        
        // ===== SECTION 8: ABILITY SYNERGY CHALLENGE (X: 5200-5600) =====
        // Multi-ability puzzle requiring combination of skills
        this.platforms.create(5400, 700, 'ground'); // Starting platform
        
        // Add synergy instruction
        this.add.text(5400, 650, 'SYNERGY CHALLENGE:', { 
            fontSize: '18px', 
            color: '#ff00ff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.add.text(5400, 670, '1. Ground Pound (Ctrl) to break wall', { 
            fontSize: '14px', 
            color: '#ff8800',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.add.text(5400, 685, '2. Dash (E) + Glide (Q) to reach high platform', { 
            fontSize: '14px', 
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 1
        });
        
        // Brittle block wall that requires ground pound to break through
        const synergyBrittle1 = this.platforms.create(5600, 600, 'ground');
        synergyBrittle1.setTint(0x8B4513);
        synergyBrittle1.setData('brittle', true);
        
        const synergyBrittle2 = this.platforms.create(5600, 500, 'ground');
        synergyBrittle2.setTint(0x8B4513);
        synergyBrittle2.setData('brittle', true);
        
        // Add "BREAK ME" text on brittle blocks
        this.add.text(5600, 580, 'BREAK ME!', { 
            fontSize: '16px', 
            color: '#ff8800',
            stroke: '#000000',
            strokeThickness: 2
        });
        
        // High platform requiring dash + glide combination
        this.platforms.create(5800, 400, 'ground'); // Target platform
        
        // Add "REACH ME!" text on target platform
        this.add.text(5800, 380, 'REACH ME!', { 
            fontSize: '16px', 
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        
        // ===== SECTION 9: WIND TUNNEL GLIDING (X: 5600-6000) =====
        // Extended gliding challenge with wind tunnel effect
        this.platforms.create(6000, 650, 'ground'); // Wind tunnel entrance
        
        // Long gap with wind tunnel markers and instructions
        for (let i = 0; i < 5; i++) {
            const windMarker = this.add.rectangle(6200 + (i * 100), 500, 10, 200, 0x00ffff);
            windMarker.setAlpha(0.4);
            
            // Add wind arrow indicators
            const windArrow = this.add.text(6200 + (i * 100), 450, '→', { 
                fontSize: '24px', 
                color: '#00ffff',
                stroke: '#000000',
                strokeThickness: 2
            });
        }
        
        // Add wind tunnel instruction
        this.add.text(6200, 400, 'WIND TUNNEL: Use Glideleaf (Q) to cross!', { 
            fontSize: '16px', 
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        
        this.platforms.create(6700, 650, 'ground'); // Wind tunnel exit
        
        // ===== SECTION 10: DASH MASTERY COURSE (X: 6000-6400) =====
        // Complex dash challenges with multiple directions
        this.platforms.create(6200, 600, 'ground'); // Dash course start
        
        // Add dash course instruction
        this.add.text(6200, 550, 'DASH MASTERY:', { 
            fontSize: '18px', 
            color: '#0088ff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.add.text(6200, 570, 'Hold direction + E while airborne', { 
            fontSize: '14px', 
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 1
        });
        
        // Diagonal dash challenges
        this.platforms.create(6400, 500, 'ground'); // Up-right dash target
        this.add.text(6400, 480, '↑→', { 
            fontSize: '20px', 
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        
        this.platforms.create(6600, 700, 'ground'); // Down-right dash target
        this.add.text(6600, 680, '↓→', { 
            fontSize: '20px', 
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        
        this.platforms.create(6800, 600, 'ground'); // Final landing
        
        // ===== SECTION 11: ENDURANCE & RESOURCE TEST (X: 6400-6800) =====
        // Long horizontal section testing moisture management
        this.platforms.create(7000, 550, 'ground');
        this.platforms.create(7200, 600, 'ground');
        this.platforms.create(7400, 550, 'ground');
        this.platforms.create(7600, 600, 'ground');
        
        // ===== OPTIONAL HIGH ROUTE (X: 1400-2800) =====
        // Alternative higher path that rewards skilled jumping
        this.platforms.create(1500, 400, 'ground'); // Jump up from main path
        this.platforms.create(1700, 350, 'ground'); // High route platform
        this.platforms.create(1900, 300, 'ground'); // Even higher
        this.platforms.create(2100, 350, 'ground'); // Continue high route
        this.platforms.create(2300, 400, 'ground'); // High route continues
        this.platforms.create(2500, 350, 'ground'); // Final high platform
        this.platforms.create(2700, 400, 'ground'); // Drop back to main path
        
        // ===== ADD COLLECTIBLES THROUGHOUT LEVEL =====
        // Seed Shards (economy currency)
        this.createSeedShard(800, 550, 'SS1');
        this.createSeedShard(1600, 450, 'SS2');
        this.createSeedShard(3400, 400, 'SS3');
        this.createSeedShard(4200, 450, 'SS4');
        this.createSeedShard(5150, 500, 'SS5'); // Near Tanglevine puzzle
        this.createSeedShard(5800, 300, 'SS6'); // High platform reward
        this.createSeedShard(6400, 400, 'SS7'); // Dash course reward
        
        // Species collectibles (Herbarium items)
        this.createSpecies(1200, 550, 'Dandelion', 'Common backyard flower');
        this.createSpecies(2800, 350, 'Ivy', 'Climbing vine species');
        this.createSpecies(3800, 200, 'Sunflower', 'Tall garden flower');
        this.createSpecies(5300, 500, 'Moss', 'Ground cover species');
        this.createSpecies(6700, 550, 'Fern', 'Shade-loving plant');
        
        // ===== CLEAR SECTION LABELS =====
        this.add.text(200, 600, 'START', { fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 });
        this.add.text(1400, 500, 'VARIABLE JUMP', { fontSize: '24px', color: '#ffff00', stroke: '#000000', strokeThickness: 2 });
        this.add.text(2200, 500, 'COYOTE TIME', { fontSize: '24px', color: '#00ff00', stroke: '#000000', strokeThickness: 2 });
        this.add.text(2600, 400, 'WALL SLIDE', { fontSize: '24px', color: '#ff8800', stroke: '#000000', strokeThickness: 2 });
        this.add.text(3200, 300, 'ABILITY TEST', { fontSize: '24px', color: '#ff00ff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(4200, 500, 'DASH TEST', { fontSize: '24px', color: '#00ffff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(5000, 500, 'TANGLEVINE', { fontSize: '24px', color: '#00ff00', stroke: '#000000', strokeThickness: 2 });
        this.add.text(5400, 600, 'SYNERGY', { fontSize: '24px', color: '#ff00ff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(6000, 550, 'WIND TUNNEL', { fontSize: '24px', color: '#00ffff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(6200, 500, 'DASH MASTERY', { fontSize: '24px', color: '#0088ff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(7000, 500, 'ENDURANCE', { fontSize: '24px', color: '#ff8800', stroke: '#000000', strokeThickness: 2 });
        this.add.text(1700, 250, 'HIGH ROUTE', { fontSize: '20px', color: '#ff00ff', stroke: '#000000', strokeThickness: 2 });
        
        // Add ability instructions
        this.add.text(200, 200, 'CONTROLS: Q=Glide, E=Dash, Ctrl=Ground Pound, F=Tanglevine', { fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(200, 220, 'Look for brown blocks to break with ground pound!', { fontSize: '14px', color: '#ffff00', stroke: '#000000', strokeThickness: 1 });
        this.add.text(200, 240, 'Dash: Hold direction + E while airborne (1 per air time, costs 5% moisture)', { fontSize: '14px', color: '#00ffff', stroke: '#000000', strokeThickness: 1 });
        this.add.text(200, 260, 'Tanglevine: F key creates bridges and pulls levers (costs 10% moisture)', { fontSize: '14px', color: '#00ff00', stroke: '#000000', strokeThickness: 1 });
        this.add.text(200, 280, 'Collect Seed Shards (blue) and Species (green) for progression!', { fontSize: '14px', color: '#ffff00', stroke: '#000000', strokeThickness: 1 });
        this.add.text(200, 300, 'Touch the floating platforms with SHARD/SPECIES labels to collect them!', { fontSize: '14px', color: '#ffff00', stroke: '#000000', strokeThickness: 1 });
        this.add.text(200, 320, 'Look for blue SHARD and green SPECIES labels floating above platforms!', { fontSize: '14px', color: '#ffff00', stroke: '#000000', strokeThickness: 1 });
        
        // Make sure all platforms are static
        this.platforms.children.entries.forEach((platform: any) => {
            platform.body.immovable = true;
        });

        // Create player (pot) sprite  
        this.player = this.physics.add.sprite(200, 650, 'pot'); // Spawn on main starting platform
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false); // Disable for test level - allow free movement

        // Player physics
        this.physics.add.collider(this.player, this.platforms, this.handlePlatformCollision, undefined, this);
        
        // Collectible collision detection
        // Set up collision detection for collectibles - we'll handle this manually in update()
        // this.physics.add.overlap(this.player, this.collectibles, this.handleCollectibleCollision, undefined, this);

        // Camera follows player with bounds
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setFollowOffset(0, 100); // Offset so player isn't exactly centered
        this.cameras.main.setDeadzone(50, 50); // Small deadzone for smoother camera movement

        // Create cursor keys for input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Initialize ability keys
        this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.ctrlKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
        this.fKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F); // Initialize Tanglevine key

        // Camera follows player
        this.camera.startFollow(this.player);
        this.camera.setLerp(0.1, 0.1); // Smooth camera following

        // Create mobile touch controls
        this.createMobileControls();
        
        // Create HUD elements
        this.createHUD();
        
        // Create debug text
        this.debugText = this.add.text(50, 120, '', { 
            fontSize: '16px', 
            color: '#ffffff', 
            stroke: '#000000', 
            strokeThickness: 2 
        }).setScrollFactor(0);
        
        // Create collectible counter text
        this.collectibleText = this.add.text(50, 200, '', { 
            fontSize: '14px', 
            color: '#ffff00', 
            stroke: '#000000', 
            strokeThickness: 2 
        }).setScrollFactor(0);
    }

    update ()
    {
        // Get mobile input state
        const mobileInput = this.registry.get('mobileInput') || { leftPressed: false, rightPressed: false };

        // Combined movement controls (keyboard + mobile) - will be handled after wall slide detection

        // Jump input detection for buffering (detect press, not hold)
        const jumpInputPressed = this.cursors.up.isDown || this.spaceKey.isDown || mobileInput.jumpPressed;
        const jumpInputJustPressed = (this.cursors.up.isDown && !this.jumpPressed) || 
                                    (this.spaceKey.isDown && !this.jumpPressed) || 
                                    mobileInput.jumpPressed;
        
        // Update jump pressed state for next frame
        this.jumpPressed = jumpInputPressed;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        
        // Ground detection - check if touching down AND velocity is downward or small
        const isOnGround = body.touching.down && body.velocity.y >= -10;
        
        // Wall detection for wall sliding
        const isTouchingLeftWall = body.touching.left;
        const isTouchingRightWall = body.touching.right;
        const leftInput = this.cursors.left.isDown || mobileInput.leftPressed;
        const rightInput = this.cursors.right.isDown || mobileInput.rightPressed;
        
        // Determine if we should wall slide
        const shouldWallSlide = !isOnGround && body.velocity.y > 0; // Falling and not on ground
        
        if (shouldWallSlide) {
            if (isTouchingLeftWall && leftInput) {
                this.isWallSliding = true;
                this.wallSideDetected = 'left';
            } else if (isTouchingRightWall && rightInput) {
                this.isWallSliding = true;
                this.wallSideDetected = 'right';
            } else {
                this.isWallSliding = false;
                this.wallSideDetected = null;
            }
        } else {
            this.isWallSliding = false;
            this.wallSideDetected = null;
        }
        
        // Coyote time logic - track time since leaving ground
        if (isOnGround) {
            this.canJump = true;
            this.coyoteTimer = 0; // Reset coyote timer when on ground
            this.dashCount = 0; // Reset dash count when on ground
            this.wasOnGround = true;
        } else if (this.wasOnGround && !isOnGround) {
            // Just left the ground - start coyote timer
            this.coyoteTimer = this.game.loop.time;
            this.wasOnGround = false;
        }
        
        // Check if we're within coyote time window
        const timeSinceLeftGround = this.game.loop.time - this.coyoteTimer;
        const inCoyoteTime = this.coyoteTimer > 0 && timeSinceLeftGround <= this.COYOTE_TIME_MS;
        
        // Jump buffering logic - store jump input while airborne
        if (jumpInputJustPressed) {
            this.jumpBufferTimer = this.game.loop.time; // Record when jump was pressed
        }
        
        // Check if we have a buffered jump within time limit
        const timeSinceJumpPressed = this.game.loop.time - this.jumpBufferTimer;
        const hasBufferedJump = this.jumpBufferTimer > 0 && timeSinceJumpPressed <= this.JUMP_BUFFER_MS;
        
        // Combined jump logic - handle buffered jumps on landing or immediate jumps
        if (jumpInputPressed) {
            if ((isOnGround || inCoyoteTime) && this.jumpTimer === 0 && this.canJump) {
                // Start new jump (either on ground or within coyote time)
                this.jumpTimer = 1;
                this.player.setVelocityY(this.INITIAL_JUMP_VELOCITY);
                this.canJump = false; // Prevent multiple jumps until landing
                this.coyoteTimer = 0; // Consume coyote time
                this.jumpBufferTimer = 0; // Consume buffered jump
            } else if (this.jumpTimer > 0 && this.jumpTimer < this.MAX_JUMP_FRAMES) {
                // Continue adding upward force - but only if we're still moving upward
                this.jumpTimer++;
                const body = this.player.body as Phaser.Physics.Arcade.Body;
                if (body.velocity.y < 0) { // Only apply while moving upward
                    const additionalForce = -(this.JUMP_VELOCITY_BOOST); // Small upward force
                    body.velocity.y += additionalForce; // Add to existing velocity instead of replacing
                }
            }
        } else {
            // Jump button released - stop variable jump
            this.jumpTimer = 0;
        }
        
        // Execute buffered jump when landing (without input held)
        if (!jumpInputPressed && hasBufferedJump && isOnGround && this.canJump && this.jumpTimer === 0) {
            // Execute the buffered jump
            this.jumpTimer = 1;
            this.player.setVelocityY(this.INITIAL_JUMP_VELOCITY);
            this.canJump = false; // Prevent multiple jumps until landing
            this.jumpBufferTimer = 0; // Consume buffered jump
        }
        
        // Apply wall slide physics
        if (this.isWallSliding) {
            // Limit fall speed when wall sliding
            if (body.velocity.y > this.WALL_SLIDE_SPEED) {
                body.velocity.y = this.WALL_SLIDE_SPEED;
            }
            // Don't apply horizontal movement when wall sliding
        }
        
        // Regular movement (only when not wall sliding and not dashing)
        if (!this.isWallSliding && !this.isDashing) {
            if (leftInput) {
                this.player.setVelocityX(-160);
            } else if (rightInput) {
                this.player.setVelocityX(160);
            } else {
                this.player.setVelocityX(0);
            }
        } else if (this.isDashing) {
            // During dash, prevent any movement system interference
            // The dash velocity is already set and should not be modified
        }
        
        // Update ability systems
        this.updateAbilities();
        
        // Update resource systems
        this.updateResources();
        this.checkImpactDamage();
        this.updateHUD();
        
        // Update debug text
        const debugBody = this.player.body as Phaser.Physics.Arcade.Body;
        const debugOnGround = debugBody.touching.down && debugBody.velocity.y >= -10;
        const dashReady = !debugOnGround && this.dashCooldown <= 0 && this.moisture >= this.DASH_MOISTURE_COST;
        this.debugText.setText([
            `Dash Debug:`,
            `Airborne: ${!debugOnGround}`,
            `Cooldown: ${this.dashCooldown.toFixed(0)}ms`,
            `Moisture: ${this.moisture.toFixed(0)}%`,
            `Dash Count: ${this.dashCount}/1`,
            `Dash Ready: ${dashReady}`,
            `E Key: ${this.eKey.isDown}`,
            `Dashing: ${this.isDashing}`,
            `Velocity: (${debugBody.velocity.x.toFixed(0)}, ${debugBody.velocity.y.toFixed(0)})`
        ]);
        
        // Manual collision detection for collectibles (since we're using regular groups now)
        this.collectibles.getChildren().forEach((collectible: any) => {
            if (collectible.active && this.player.active) {
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    collectible.x, collectible.y
                );
                if (distance < 30) { // Collision radius
                    this.handleCollectibleCollision(this.player, collectible);
                }
            }
        });
        
        // Respawn if player falls off the world
        if (this.player.y > 1000) {
            this.player.setPosition(200, 650); // Reset to main starting platform
            this.player.setVelocity(0, 0); // Stop all movement
            console.log("Fell off the world! Respawning...");
        }
    }

    updateAbilities()
    {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const isOnGround = body.touching.down && body.velocity.y >= -10;
        
        // Get mobile input state for abilities
        const mobileInput = this.registry.get('mobileInput') || { 
            leftPressed: false, 
            rightPressed: false, 
            jumpPressed: false,
            ability1Pressed: false,
            ability2Pressed: false,
            groundPoundPressed: false,
            tanglevinePressed: false
        };
        
        // Update cooldowns
        if (this.groundPoundCooldown > 0) {
            this.groundPoundCooldown -= this.game.loop.delta;
        }
        if (this.dashCooldown > 0) {
            this.dashCooldown -= this.game.loop.delta;
        }
        if (this.dashInvulnerabilityTimer > 0) {
            this.dashInvulnerabilityTimer -= this.game.loop.delta;
        }
        if (this.tanglevineCooldown > 0) {
            this.tanglevineCooldown -= this.game.loop.delta;
        }
        
        // Thornspike (Ground Pound) - Ctrl key or mobile button
        const groundPoundInput = this.ctrlKey.isDown || mobileInput.groundPoundPressed;
        if (groundPoundInput && !isOnGround && !this.isGroundPounding && this.groundPoundCooldown <= 0) {
            // Start ground pound
            this.isGroundPounding = true;
            this.player.setVelocityY(this.GROUND_POUND_VELOCITY);
            this.groundPoundCooldown = this.GROUND_POUND_COOLDOWN_MS;
            console.log("Ground pound activated!");
        }
        
        // End ground pound when hitting ground
        if (this.isGroundPounding && isOnGround) {
            this.isGroundPounding = false;
            // Could add screen shake or particle effects here
            console.log("Ground pound landed!");
        }
        
        // Glideleaf (Gliding) - Q key or mobile button
        const glideInput = this.qKey.isDown || mobileInput.ability1Pressed;
        if (glideInput && !isOnGround && !this.isGroundPounding && !this.isWallSliding) {
            // Start gliding
            if (!this.isGliding) {
                this.isGliding = true;
                console.log("Gliding started!");
            }
            
            // Apply gliding effect - reduce fall speed
            if (body.velocity.y > 0) { // Only when falling
                body.velocity.y *= 0.85; // Reduce fall speed by 15% each frame
            }
            
            // Drain moisture while gliding
            if (this.moisture > 0) {
                this.moisture -= this.GLIDE_MOISTURE_DRAIN * (this.game.loop.delta / 1000);
                if (this.moisture < 0) this.moisture = 0;
            }
        } else {
            // Stop gliding
            if (this.isGliding) {
                this.isGliding = false;
                console.log("Gliding stopped!");
            }
        }
        
        // Bloom Dash - E key or mobile button (8-way burst movement)
        const dashInput = this.eKey.isDown || mobileInput.ability2Pressed;
        const maxDashes = 1; // Maximum dashes per air time
        const canDash = !isOnGround && !this.isDashing && this.dashCooldown <= 0 && 
                       this.moisture >= this.DASH_MOISTURE_COST && this.dashCount < maxDashes;
        
        if (dashInput && canDash) {
            // COMPLETELY REWRITTEN DASH SYSTEM
            let dashX = 0;
            let dashY = 0;
            
            // Get clean input state (separate from movement system)
            const leftPressed = this.cursors.left.isDown || mobileInput.leftPressed;
            const rightPressed = this.cursors.right.isDown || mobileInput.rightPressed;
            const upPressed = this.cursors.up.isDown;
            const downPressed = this.cursors.down.isDown;
            
            // DIAGONAL INPUT SYSTEM: Allow true 8-way movement
            if (upPressed) dashY = -1;
            if (downPressed) dashY = 1;
            if (leftPressed) dashX = -1;
            if (rightPressed) dashX = 1;
            
            // Only normalize if we have BOTH X and Y inputs (diagonal movement)
            if (dashX !== 0 && dashY !== 0) {
                // Diagonal movement - normalize to unit vector (0.707, 0.707)
                const magnitude = Math.sqrt(dashX * dashX + dashY * dashY);
                dashX = dashX / magnitude;
                dashY = dashY / magnitude;
            }
            // Single direction inputs (up, down, left, right) keep their original values (1 or -1)
            else if (dashX === 0 && dashY === 0) {
                // No direction pressed - dash in facing direction
                dashX = this.player.flipX ? -1 : 1;
                dashY = 0;
            }
            
            // Start dash state
            this.isDashing = true;
            this.dashDirection = { x: dashX, y: dashY };
            this.dashCount++;
            this.dashCooldown = this.DASH_COOLDOWN_MS;
            this.dashInvulnerabilityTimer = this.DASH_INVULNERABILITY_MS;
            
            // Apply INSTANT velocity with direction-based adjustments
            let dashVelocity = 800; // Base velocity
            
            // Adjust velocity based on direction to balance perceived power
            if (dashY < 0) {
                // Upward dash - reduce velocity since it feels too powerful
                dashVelocity = 500; // Weaker upward dash
            } else if (dashY > 0) {
                // Downward dash - keep base velocity
                dashVelocity = 800; // Standard downward dash
            } else {
                // Horizontal dash - keep base velocity
                dashVelocity = 800; // Standard horizontal dash
            }
            
            this.player.setVelocity(dashX * dashVelocity, dashY * dashVelocity);
            
            // Visual feedback
            this.cameras.main.shake(100, 0.01);
            this.player.setTint(0x00ffff);
            
            // Consume moisture
            this.moisture -= this.DASH_MOISTURE_COST;
            if (this.moisture < 0) this.moisture = 0;
            
            // End dash after fixed duration
            this.time.delayedCall(this.DASH_DURATION_MS, () => {
                if (this.isDashing) {
                    this.isDashing = false;
                    this.player.clearTint();
                    console.log("Bloom Dash ended!");
                }
            });
            
            console.log(`Bloom Dash activated! Direction: (${dashX}, ${dashY}), Velocity: ${dashVelocity}px/s`);
        }
        
        // Clear dash tint if dash ended but tint wasn't cleared
        if (!this.isDashing && this.player.tint !== 0xffffff) {
            this.player.clearTint();
        }
        
        // Tanglevine (Utility/Puzzle Solving) - F key or mobile button
        const tanglevineInput = this.fKey.isDown || mobileInput.tanglevinePressed;
        const canTanglevine = !this.isTanglevining && this.tanglevineCooldown <= 0 && this.moisture >= 10; // 10% moisture cost
        
        if (tanglevineInput && canTanglevine) {
            // Start Tanglevine ability
            this.isTanglevining = true;
            this.tanglevineCooldown = this.TANGLEVINE_COOLDOWN_MS;
            
            // Consume moisture
            this.moisture -= 10;
            if (this.moisture < 0) this.moisture = 0;
            
            // Visual feedback
            this.cameras.main.shake(200, 0.02);
            this.player.setTint(0x00ff00); // Green tint for vine
            
            // Create vine projectile with directional input (like dash)
            const vineStartX = this.player.x;
            const vineStartY = this.player.y;
            
            // Get directional input for Tanglevine
            const leftPressed = this.cursors.left.isDown || mobileInput.leftPressed;
            const rightPressed = this.cursors.right.isDown || mobileInput.rightPressed;
            const upPressed = this.cursors.up.isDown;
            const downPressed = this.cursors.down.isDown;
            
            let vineX = 0;
            let vineY = 0;
            
            // Determine vine direction
            if (upPressed) vineY = -1;
            if (downPressed) vineY = 1;
            if (leftPressed) vineX = -1;
            if (rightPressed) vineX = 1;
            
            // If no direction pressed, use facing direction
            if (vineX === 0 && vineY === 0) {
                vineX = this.player.flipX ? -1 : 1;
                vineY = 0;
            }
            
            // Normalize for diagonal movement
            if (vineX !== 0 && vineY !== 0) {
                const magnitude = Math.sqrt(vineX * vineX + vineY * vineY);
                vineX = vineX / magnitude;
                vineY = vineY / magnitude;
            }
            
            const vineEndX = vineStartX + (vineX * this.TANGLEVINE_RANGE);
            const vineEndY = vineStartY + (vineY * this.TANGLEVINE_RANGE);
            
            // Draw vine line
            const vineGraphics = this.add.graphics();
            vineGraphics.lineStyle(4, 0x00ff00, 1);
            vineGraphics.lineBetween(vineStartX, vineStartY, vineEndX, vineEndY);
            
            // Check for targets in range (lever nodes, bridge points, etc.)
            // For now, just create a temporary bridge platform
            const bridgePlatform = this.platforms.create(vineEndX - 32, vineEndY - 16, 'platform') as Phaser.Physics.Arcade.Sprite;
            bridgePlatform.setScale(0.5, 0.25);
            bridgePlatform.setTint(0x00ff00);
            
            // Remove vine and bridge after duration
            this.time.delayedCall(1000, () => {
                vineGraphics.destroy();
                this.player.clearTint();
                this.isTanglevining = false;
                console.log("Tanglevine vine retracted!");
            });
            
            // Remove bridge after bridge duration
            this.time.delayedCall(this.TANGLEVINE_BRIDGE_DURATION, () => {
                bridgePlatform.destroy();
                console.log("Tanglevine bridge decayed!");
            });
            
            console.log(`Tanglevine activated! Direction: (${vineX}, ${vineY}), Range: ${this.TANGLEVINE_RANGE}px`);
            console.log(`Input state: left=${leftPressed}, right=${rightPressed}, up=${upPressed}, down=${downPressed}`);
            console.log(`Player facing: ${this.player.flipX ? 'left' : 'right'}`);
        }
    }

    createMobileControls ()
    {
        // Left arrow button
        this.leftButton = this.add.text(80, 680, '◀', {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
        .setInteractive()
        .setScrollFactor(0); // Fixed to camera

        // Right arrow button  
        this.rightButton = this.add.text(180, 680, '▶', {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
        .setInteractive()
        .setScrollFactor(0);

        // Jump button
        this.jumpButton = this.add.text(880, 680, '▲', {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
        .setInteractive()
        .setScrollFactor(0);

        // Ability 1 button (Glideleaf - Q key equivalent)
        this.ability1Button = this.add.text(720, 680, 'Q', {
            fontSize: '32px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
        .setInteractive()
        .setScrollFactor(0);

        // Ability 2 button (E key equivalent)
        this.ability2Button = this.add.text(800, 680, 'E', {
            fontSize: '32px',
            color: '#0088ff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
        .setInteractive()
        .setScrollFactor(0);

        // Ground Pound button (Ctrl key equivalent)
        this.groundPoundButton = this.add.text(960, 680, '⬇', {
            fontSize: '32px',
            color: '#ff8800',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
        .setInteractive()
        .setScrollFactor(0);

        // Tanglevine button (F key equivalent) - repositioned to fit on screen
        this.tanglevineButton = this.add.text(720, 620, 'F', {
            fontSize: '32px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
        .setInteractive()
        .setScrollFactor(0);

        // Initialize mobile input state
        const mobileInput = { 
            leftPressed: false, 
            rightPressed: false, 
            jumpPressed: false,
            ability1Pressed: false,
            ability2Pressed: false,
            groundPoundPressed: false,
            tanglevinePressed: false
        };
        this.registry.set('mobileInput', mobileInput);

        // Left button events
        this.leftButton.on('pointerdown', () => {
            mobileInput.leftPressed = true;
            this.registry.set('mobileInput', mobileInput);
        });
        this.leftButton.on('pointerup', () => {
            mobileInput.leftPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
        this.leftButton.on('pointerout', () => {
            mobileInput.leftPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });

        // Right button events
        this.rightButton.on('pointerdown', () => {
            mobileInput.rightPressed = true;
            this.registry.set('mobileInput', mobileInput);
        });
        this.rightButton.on('pointerup', () => {
            mobileInput.rightPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
        this.rightButton.on('pointerout', () => {
            mobileInput.rightPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });

        // Jump button events - hold for variable jump
        this.jumpButton.on('pointerdown', () => {
            mobileInput.jumpPressed = true;
            this.registry.set('mobileInput', mobileInput);
        });
        this.jumpButton.on('pointerup', () => {
            mobileInput.jumpPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
        this.jumpButton.on('pointerout', () => {
            mobileInput.jumpPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });

        // Ability 1 button events (Glideleaf)
        this.ability1Button.on('pointerdown', () => {
            mobileInput.ability1Pressed = true;
            this.registry.set('mobileInput', mobileInput);
        });
        this.ability1Button.on('pointerup', () => {
            mobileInput.ability1Pressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
        this.ability1Button.on('pointerout', () => {
            mobileInput.ability1Pressed = false;
            this.registry.set('mobileInput', mobileInput);
        });

        // Ability 2 button events (E key)
        this.ability2Button.on('pointerdown', () => {
            mobileInput.ability2Pressed = true;
            this.registry.set('mobileInput', mobileInput);
        });
        this.ability2Button.on('pointerup', () => {
            mobileInput.ability2Pressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
        this.ability2Button.on('pointerout', () => {
            mobileInput.ability2Pressed = false;
            this.registry.set('mobileInput', mobileInput);
        });

        // Ground Pound button events
        this.groundPoundButton.on('pointerdown', () => {
            mobileInput.groundPoundPressed = true;
            this.registry.set('mobileInput', mobileInput);
        });
        this.groundPoundButton.on('pointerup', () => {
            mobileInput.groundPoundPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
        this.groundPoundButton.on('pointerout', () => {
            mobileInput.groundPoundPressed = false;
            this.registry.set('mobileInput', mobileInput);
        });

        // Tanglevine button events
        this.tanglevineButton.on('pointerdown', () => {
            mobileInput.tanglevinePressed = true;
            this.registry.set('mobileInput', mobileInput);
        });
        this.tanglevineButton.on('pointerup', () => {
            mobileInput.tanglevinePressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
        this.tanglevineButton.on('pointerout', () => {
            mobileInput.tanglevinePressed = false;
            this.registry.set('mobileInput', mobileInput);
        });
    }

    handlePlatformCollision(player: any, platform: any)
    {
        // Check if this is a ground pound hitting a brittle block
        if (this.isGroundPounding && platform.getData && platform.getData('brittle')) {
            // Destroy the brittle block
            platform.destroy();
            console.log("Brittle block destroyed!");
            
            // End ground pound state immediately when hitting a brittle block
            this.isGroundPounding = false;
            
            // Add visual feedback (screen shake)
            this.cameras.main.shake(200, 0.01);
            
            // Could add particle effects here
        }
    }

    createHUD ()
    {
        // Create HUD group that stays fixed to camera
        this.hudGroup = this.add.group();
        
        // Moisture bar background (diegetic ring around pot - as per PRD)
        this.moistureBar = this.add.graphics();
        this.moistureBar.setScrollFactor(0); // Fixed to camera
        this.hudGroup.add(this.moistureBar);
        
        // Durability pips display
        this.durabilityPips = this.add.graphics();
        this.durabilityPips.setScrollFactor(0); // Fixed to camera
        this.hudGroup.add(this.durabilityPips);
        
        // Initialize HUD display
        this.updateHUD();
    }
    
    updateResources ()
    {
        // Moisture drain over time
        const currentTime = this.game.loop.time;
        if (currentTime - this.lastMoistureDrain >= this.MOISTURE_DRAIN_INTERVAL) {
            this.moisture = Math.max(0, this.moisture - this.MOISTURE_DRAIN_RATE);
            this.lastMoistureDrain = currentTime;
            
            // Check for dry out condition
            if (this.moisture <= 0) {
                this.handleDryOut();
            }
        }
    }
    
    updateHUD ()
    {
        // Clear previous drawings
        this.moistureBar.clear();
        this.durabilityPips.clear();
        
        // Draw moisture ring around pot (diegetic design as per PRD)  
        const potScreenX = this.player.x - this.cameras.main.scrollX;
        const potScreenY = this.player.y - this.cameras.main.scrollY;
        const ringRadius = 30;
        const moisturePercent = this.moisture / 100;
        
        // Background ring (empty)
        this.moistureBar.lineStyle(4, 0x333333, 0.5);
        this.moistureBar.strokeCircle(potScreenX, potScreenY, ringRadius);
        
        // Moisture ring (filled portion)
        if (this.moisture > 0) {
            const color = this.moisture > 30 ? 0x00ff00 : this.moisture > 10 ? 0xffff00 : 0xff0000;
            this.moistureBar.lineStyle(4, color, 0.8);
            this.moistureBar.beginPath();
            this.moistureBar.arc(potScreenX, potScreenY, ringRadius, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * moisturePercent));
            this.moistureBar.strokePath();
        }
        
        // Draw durability pips (crack pips as per PRD)
        const pipSize = 8;
        const pipSpacing = 12;
        const startX = 50;
        const startY = 50;
        
        for (let i = 0; i < 4; i++) {
            const filled = i < this.durability;
            const color = filled ? 0x8B4513 : 0x333333; // Brown for filled, gray for empty
            this.durabilityPips.fillStyle(color, filled ? 1.0 : 0.3);
            this.durabilityPips.fillCircle(startX + (i * pipSpacing), startY, pipSize);
        }
        
        // Draw ability status indicators
        const abilityX = 50;
        const abilityY = 80;
        
        // Ground pound cooldown indicator
        if (this.groundPoundCooldown > 0) {
            this.durabilityPips.fillStyle(0xff0000, 0.8);
            this.durabilityPips.fillCircle(abilityX, abilityY, 6);
        } else {
            this.durabilityPips.fillStyle(0x00ff00, 0.8);
            this.durabilityPips.fillCircle(abilityX, abilityY, 6);
        }
        
        // Gliding indicator
        if (this.isGliding) {
            this.durabilityPips.fillStyle(0x00ffff, 0.8);
            this.durabilityPips.fillCircle(abilityX + 20, abilityY, 6);
        }
        
        // Dash cooldown indicator
        if (this.dashCooldown > 0) {
            this.durabilityPips.fillStyle(0xff0000, 0.8);
            this.durabilityPips.fillCircle(abilityX + 40, abilityY, 6);
        } else if (this.moisture >= this.DASH_MOISTURE_COST && this.dashCount < 1) {
            this.durabilityPips.fillStyle(0x00ff00, 0.8);
            this.durabilityPips.fillCircle(abilityX + 40, abilityY, 6);
        } else {
            this.durabilityPips.fillStyle(0x666666, 0.8);
            this.durabilityPips.fillCircle(abilityX + 40, abilityY, 6);
        }
        
        // Dash active indicator
        if (this.isDashing) {
            this.durabilityPips.fillStyle(0xff00ff, 0.8);
            this.durabilityPips.fillCircle(abilityX + 40, abilityY, 8);
        }
        
        // Tanglevine cooldown indicator
        if (this.tanglevineCooldown > 0) {
            this.durabilityPips.fillStyle(0xff0000, 0.8);
            this.durabilityPips.fillCircle(abilityX + 60, abilityY, 6);
        } else if (this.moisture >= 10) {
            this.durabilityPips.fillStyle(0x00ff00, 0.8);
            this.durabilityPips.fillCircle(abilityX + 60, abilityY, 6);
        } else {
            this.durabilityPips.fillStyle(0x666666, 0.8);
            this.durabilityPips.fillCircle(abilityX + 60, abilityY, 6);
        }
        
        // Tanglevine active indicator
        if (this.isTanglevining) {
            this.durabilityPips.fillStyle(0x00ff00, 0.8);
            this.durabilityPips.fillCircle(abilityX + 60, abilityY, 8);
        }
        
        // Progress display (using rectangles for visual indicators)
        const progressX = 50;
        const progressY = 150;
        
        // Seed Shards counter background
        this.durabilityPips.fillStyle(0x0088ff, 0.8);
        this.durabilityPips.fillRect(progressX, progressY, 120, 20);
        
        // Species counter background
        this.durabilityPips.fillStyle(0x00ff00, 0.8);
        this.durabilityPips.fillRect(progressX, progressY + 25, 120, 20);
        
        // Update collectible text
        if (this.collectibleText) {
            this.collectibleText.setText(`Seed Shards: ${this.seedShards}/7 | Species: ${this.speciesCollected.length}/5`);
        }
    }
    
    checkImpactDamage ()
    {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const currentTime = this.game.loop.time;
        
        // Try both touching and blocked for ground detection
        const isGrounded = body.touching.down || body.blocked.down;
        
        // Track when we leave the ground
        if (!isGrounded && this.wasGrounded) {
            this.timeLeftGround = currentTime;
        }
        
        // Detect landing moment - transition from airborne to grounded
        if (isGrounded && !this.wasGrounded && currentTime - this.lastLandingTime > 300) {
            const timeInAir = currentTime - this.timeLeftGround;
            const landingSpeed = Math.abs(body.velocity.y);
            
            // CRITICAL FIX: Only count as landing if we were falling DOWN (positive velocity.y)
            // Negative velocity means jumping UP, not landing
            const wasActuallyFalling = body.velocity.y >= 0;
            
            if (wasActuallyFalling) {
                console.log(`LANDING! Speed: ${landingSpeed.toFixed(1)}px/s, airtime: ${timeInAir}ms (velocity.y: ${body.velocity.y.toFixed(1)})`);
                
                this.lastLandingTime = currentTime; // Record this landing
                
                // Only check for damage if we were airborne for at least 300ms and significant speed
                if (timeInAir > 300 && 
                    landingSpeed > 150 && // Lowered for testing - will adjust based on new platforms
                    currentTime - this.lastImpactTime > this.IMPACT_COOLDOWN) {
                    this.lastImpactTime = currentTime;
                    this.takeDurabilityDamage();
                }
            } else {
                // Debug: This was a jump start, not a landing
                console.log(`JUMP START detected (ignored): Speed: ${landingSpeed.toFixed(1)}px/s, velocity.y: ${body.velocity.y.toFixed(1)}`);
            }
        }
        
        // Update previous ground state for next frame
        this.wasGrounded = isGrounded;
    }
    
    takeDurabilityDamage ()
    {
        // Check for invulnerability (dash invulnerability)
        if (this.dashInvulnerabilityTimer > 0) {
            console.log("Damage blocked by dash invulnerability!");
            return;
        }
        
        if (this.durability > 0) {
            this.durability--;
            console.log(`Pot cracked! Durability: ${this.durability}/4`);
            
            // Visual feedback - screen shake or particle effect could go here
            this.cameras.main.shake(100, 0.02);
            
            // Check for shatter
            if (this.durability <= 0) {
                this.handleShatter();
            }
        }
    }
    
    handleShatter ()
    {
        // Respawn with 50% moisture and full durability (as per PRD failure mechanics)
        this.moisture = 50;
        this.durability = 4;
        this.player.setPosition(200, 650); // Reset to main starting platform
        console.log("Pot shattered! Respawning with 50% moisture and full durability.");
    }
    
    handleDryOut ()
    {
        // Respawn with 50% moisture (as per PRD failure mechanics)
        this.moisture = 50;
        this.player.setPosition(200, 650); // Reset to main starting platform
        console.log("Pot dried out! Respawning with 50% moisture.");
    }
    
    // ===== COLLECTIBLE CREATION METHODS =====
    
    createSeedShard(x: number, y: number, id: string)
    {
        // Create as a static physics object instead of dynamic
        const shard = this.physics.add.staticImage(x, y, 'ground') as Phaser.Physics.Arcade.Image;
        shard.setScale(0.5, 0.5); // Larger scale for visibility
        shard.setTint(0x0088ff); // Blue tint for Seed Shards
        shard.setData('type', 'seedShard');
        shard.setData('id', id);
        
        // Add to collectibles group for collision detection
        this.collectibles.add(shard);
        
        console.log(`Created Seed Shard ${id} at (${x}, ${y})`);
        
        // Add text label to make it more obvious
        const label = this.add.text(x, y - 25, 'SHARD', { 
            fontSize: '12px', 
            color: '#0088ff',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Add a simple pulsing effect to the label only
        this.tweens.add({
            targets: label,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add a glow effect around the collectible
        const glow = this.add.graphics();
        glow.lineStyle(3, 0x0088ff, 0.6);
        glow.strokeCircle(x, y, 25);
        glow.setDepth(-1); // Behind the collectible
    }
    
    createSpecies(x: number, y: number, name: string, description: string)
    {
        // Create as a static physics object instead of dynamic
        const species = this.physics.add.staticImage(x, y, 'ground') as Phaser.Physics.Arcade.Image;
        species.setScale(0.6, 0.6); // Larger scale for visibility
        species.setTint(0x00ff00); // Green tint for Species
        species.setData('type', 'species');
        species.setData('name', name);
        species.setData('description', description);
        
        // Add to collectibles group for collision detection
        this.collectibles.add(species);
        
        console.log(`Created Species ${name} at (${x}, ${y})`);
        
        // Add text label to make it more obvious
        const label = this.add.text(x, y - 30, 'SPECIES', { 
            fontSize: '12px', 
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Add a simple pulsing effect to the label only
        this.tweens.add({
            targets: label,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add a glow effect around the collectible
        const glow = this.add.graphics();
        glow.lineStyle(3, 0x00ff00, 0.6);
        glow.strokeCircle(x, y, 30);
        glow.setDepth(-1); // Behind the collectible
    }
    
    // ===== COLLECTIBLE COLLISION HANDLING =====
    
    handleCollectibleCollision(player: any, collectible: any)
    {
        console.log("Collectible collision detected!");
        const type = collectible.getData('type');
        console.log(`Collectible type: ${type}`);
        
        if (type === 'seedShard') {
            const id = collectible.getData('id');
            this.seedShards++;
            console.log(`Collected Seed Shard ${id}! Total: ${this.seedShards}`);
            
            // Visual feedback
            this.cameras.main.shake(100, 0.01);
            
            // Add collection effect
            const collectEffect = this.add.text(collectible.x, collectible.y - 20, '+1 SHARD', { 
                fontSize: '16px', 
                color: '#0088ff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            // Animate the collection text
            this.tweens.add({
                targets: collectEffect,
                y: collectible.y - 50,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => collectEffect.destroy()
            });
            
            // Destroy the collectible and all its associated visual elements
            collectible.destroy();
            
        } else if (type === 'species') {
            const name = collectible.getData('name');
            const description = collectible.getData('description');
            
            if (!this.speciesCollected.includes(name)) {
                this.speciesCollected.push(name);
                console.log(`Discovered new species: ${name} - ${description}`);
                console.log(`Species collected: ${this.speciesCollected.length}/5`);
                
                // Visual feedback
                this.cameras.main.shake(150, 0.02);
                
                // Add collection effect
                const collectEffect = this.add.text(collectible.x, collectible.y - 20, `+1 ${name}`, { 
                    fontSize: '16px', 
                    color: '#00ff00',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5);
                
                // Animate the collection text
                this.tweens.add({
                    targets: collectEffect,
                    y: collectible.y - 50,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => collectEffect.destroy()
                });
                
                // Destroy the collectible and all its associated visual elements
                collectible.destroy();
            }
        }
    }
}
