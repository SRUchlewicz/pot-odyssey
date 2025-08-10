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
    
    // Ability system state
    isGliding: boolean = false;
    isGroundPounding: boolean = false;
    isDashing: boolean = false;
    dashDirection: { x: number, y: number } = { x: 0, y: 0 };
    dashCount: number = 0; // Track number of dashes since last ground contact
    groundPoundCooldown: number = 0;
    dashCooldown: number = 0;
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
    
    // Mobile controls
    leftButton: Phaser.GameObjects.Text;
    rightButton: Phaser.GameObjects.Text;
    jumpButton: Phaser.GameObjects.Text;
    ability1Button: Phaser.GameObjects.Text; // Q key equivalent
    ability2Button: Phaser.GameObjects.Text; // E key equivalent
    groundPoundButton: Phaser.GameObjects.Text; // Ctrl key equivalent

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x87CEEB); // Sky blue

        // Set larger world bounds for horizontal test level
        this.physics.world.setBounds(0, 0, 5500, 1024);
        this.cameras.main.setBounds(0, 0, 5500, 1024);

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();

        // Create extended ground platform (bottom safety net)
        const ground = this.platforms.create(1024, 950, 'ground'); // Lower and centered
        ground.setScale(8, 1).refreshBody(); // Much wider to catch falls
        
        // Add invisible boundary walls to prevent going too far off-screen
        const leftWall = this.platforms.create(-50, 500, 'ground');
        leftWall.setScale(0.1, 20).refreshBody().setVisible(false); // Invisible left boundary
        
        const rightWall = this.platforms.create(5548, 500, 'ground'); 
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
        
        // ===== SECTION 7: ENDURANCE RUN (X: 4800-5200) =====
        // Horizontal endurance with moisture testing
        this.platforms.create(5000, 450, 'ground');
        this.platforms.create(5200, 500, 'ground');
        this.platforms.create(5400, 450, 'ground');
        
        // ===== OPTIONAL HIGH ROUTE (X: 1400-2800) =====
        // Alternative higher path that rewards skilled jumping
        this.platforms.create(1500, 400, 'ground'); // Jump up from main path
        this.platforms.create(1700, 350, 'ground'); // High route platform
        this.platforms.create(1900, 300, 'ground'); // Even higher
        this.platforms.create(2100, 350, 'ground'); // Continue high route
        this.platforms.create(2300, 400, 'ground'); // High route continues
        this.platforms.create(2500, 350, 'ground'); // Final high platform
        this.platforms.create(2700, 400, 'ground'); // Drop back to main path
        
        // ===== CLEAR SECTION LABELS =====
        this.add.text(200, 600, 'START', { fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 });
        this.add.text(1400, 500, 'VARIABLE JUMP', { fontSize: '24px', color: '#ffff00', stroke: '#000000', strokeThickness: 2 });
        this.add.text(2200, 500, 'COYOTE TIME', { fontSize: '24px', color: '#00ff00', stroke: '#000000', strokeThickness: 2 });
        this.add.text(2600, 400, 'WALL SLIDE', { fontSize: '24px', color: '#ff8800', stroke: '#000000', strokeThickness: 2 });
        this.add.text(3200, 300, 'ABILITY TEST', { fontSize: '24px', color: '#ff00ff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(4200, 500, 'DASH TEST', { fontSize: '24px', color: '#00ffff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(5200, 400, 'ENDURANCE', { fontSize: '24px', color: '#0088ff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(1700, 250, 'HIGH ROUTE', { fontSize: '20px', color: '#ff00ff', stroke: '#000000', strokeThickness: 2 });
        
        // Add ability instructions
        this.add.text(200, 200, 'CONTROLS: Q=Glide, E=Dash, Ctrl=Ground Pound', { fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 });
        this.add.text(200, 220, 'Look for brown blocks to break with ground pound!', { fontSize: '14px', color: '#ffff00', stroke: '#000000', strokeThickness: 1 });
        this.add.text(200, 240, 'Dash: Hold direction + E while airborne (1 per air time, costs 5% moisture)', { fontSize: '14px', color: '#00ffff', stroke: '#000000', strokeThickness: 1 });
        
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
            groundPoundPressed: false
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

        // Initialize mobile input state
        const mobileInput = { 
            leftPressed: false, 
            rightPressed: false, 
            jumpPressed: false,
            ability1Pressed: false,
            ability2Pressed: false,
            groundPoundPressed: false
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
}
