import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.Physics.Arcade.Sprite;
    platforms: Phaser.Physics.Arcade.StaticGroup;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    spaceKey: Phaser.Input.Keyboard.Key;
    
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
    
    // Mobile controls
    leftButton: Phaser.GameObjects.Text;
    rightButton: Phaser.GameObjects.Text;
    jumpButton: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x87CEEB); // Sky blue

        // Set larger world bounds for test level
        this.physics.world.setBounds(0, 0, 2048, 1024);
        this.cameras.main.setBounds(0, 0, 2048, 1024);

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();

        // Create extended ground platform (bottom safety net)
        const ground = this.platforms.create(1024, 950, 'ground'); // Lower and centered
        ground.setScale(8, 1).refreshBody(); // Much wider to catch falls
        
        // Add invisible boundary walls to prevent going too far off-screen
        const leftWall = this.platforms.create(-50, 500, 'ground');
        leftWall.setScale(0.1, 20).refreshBody().setVisible(false); // Invisible left boundary
        
        const rightWall = this.platforms.create(2098, 500, 'ground'); 
        rightWall.setScale(0.1, 20).refreshBody().setVisible(false); // Invisible right boundary

        // ===== CLEAN PLAYABLE TEST LEVEL =====
        
        // ===== MAIN PROGRESSION PATH =====
        
        // Starting area
        this.platforms.create(200, 700, 'ground'); // Main spawn platform
        this.platforms.create(400, 700, 'ground'); // Starting walkway
        
        // ===== SECTION 1: BASIC MOVEMENT (X: 400-700) =====
        this.platforms.create(500, 600, 'ground'); // Simple jump down
        this.platforms.create(650, 550, 'ground'); // Cross gap
        
        // ===== SECTION 2: VARIABLE JUMP TEST (X: 700-1000) =====
        this.platforms.create(750, 600, 'ground'); // Entry
        this.platforms.create(850, 550, 'ground'); // Small jump (tap)
        this.platforms.create(950, 450, 'ground'); // Big jump (hold)
        
        // ===== SECTION 3: COYOTE TIME TEST (X: 1000-1300) =====
        this.platforms.create(1050, 500, 'ground'); // Approach
        // 200px gap for coyote time
        this.platforms.create(1250, 500, 'ground'); // Landing (needs coyote time)
        
        // ===== SECTION 4: WALL SLIDE TEST (X: 1300-1600) =====
        this.platforms.create(1350, 600, 'ground'); // Approach
        
        // Single tall wall for sliding
        const mainWall = this.platforms.create(1450, 400, 'ground');
        mainWall.setScale(0.2, 6).refreshBody(); // Tall narrow wall
        
        this.platforms.create(1550, 300, 'ground'); // Landing after wall slide
        
        // ===== SECTION 5: DAMAGE TEST TOWER (X: 1600-1800) =====
        this.platforms.create(1650, 700, 'ground'); // Ground entry
        this.platforms.create(1650, 500, 'ground'); // Medium height (safe)
        this.platforms.create(1650, 250, 'ground'); // High fall (damage)
        this.platforms.create(1650, 50, 'ground');  // Very high (major damage)
        
        // ===== SECTION 6: ENDURANCE RUN (X: 1800-2000) =====
        // Simple platforms for moisture testing
        this.platforms.create(1850, 500, 'ground');
        this.platforms.create(1950, 450, 'ground');
        
        // ===== ADVANCED OPTIONAL AREAS =====
        
        // High-skill combo area (upper level)
        this.platforms.create(800, 300, 'ground');  // Jump up here from section 2
        this.platforms.create(1000, 250, 'ground'); // Requires perfect variable jump
        this.platforms.create(1200, 200, 'ground'); // Even higher challenge
        
        // ===== CLEAR SECTION LABELS =====
        this.add.text(200, 600, 'START', { fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 });
        this.add.text(850, 400, 'VARIABLE JUMP', { fontSize: '24px', color: '#ffff00', stroke: '#000000', strokeThickness: 2 });
        this.add.text(1150, 450, 'COYOTE TIME', { fontSize: '24px', color: '#00ff00', stroke: '#000000', strokeThickness: 2 });
        this.add.text(1400, 200, 'WALL SLIDE', { fontSize: '24px', color: '#ff8800', stroke: '#000000', strokeThickness: 2 });
        this.add.text(1650, 150, 'DAMAGE TEST', { fontSize: '24px', color: '#ff0000', stroke: '#000000', strokeThickness: 2 });
        this.add.text(1900, 400, 'MOISTURE RUN', { fontSize: '24px', color: '#0088ff', stroke: '#000000', strokeThickness: 2 });
        
        // Make sure all platforms are static
        this.platforms.children.entries.forEach((platform: any) => {
            platform.body.immovable = true;
        });

        // Create player (pot) sprite  
        this.player = this.physics.add.sprite(200, 650, 'pot'); // Spawn on main starting platform
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false); // Disable for test level - allow free movement

        // Player physics
        this.physics.add.collider(this.player, this.platforms);

        // Camera follows player with bounds
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setFollowOffset(0, 100); // Offset so player isn't exactly centered
        this.cameras.main.setDeadzone(50, 50); // Small deadzone for smoother camera movement

        // Create cursor keys for input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Camera follows player
        this.camera.startFollow(this.player);
        this.camera.setLerp(0.1, 0.1); // Smooth camera following

        // Create mobile touch controls
        this.createMobileControls();
        
        // Create HUD elements
        this.createHUD();
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
        
        // Regular movement (only when not wall sliding)
        if (!this.isWallSliding) {
            if (leftInput) {
                this.player.setVelocityX(-160);
            } else if (rightInput) {
                this.player.setVelocityX(160);
            } else {
                this.player.setVelocityX(0);
            }
        }
        
        // Update resource systems
        this.updateResources();
        this.checkImpactDamage();
        this.updateHUD();
        
        // Respawn if player falls off the world
        if (this.player.y > 1000) {
            this.player.setPosition(200, 650); // Reset to main starting platform
            this.player.setVelocity(0, 0); // Stop all movement
            console.log("Fell off the world! Respawning...");
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

        // Initialize mobile input state
        const mobileInput = { leftPressed: false, rightPressed: false, jumpPressed: false };
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
