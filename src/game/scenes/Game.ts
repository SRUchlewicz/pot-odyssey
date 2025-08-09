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

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();

        // Create ground platform (at bottom of screen)
        const ground = this.platforms.create(512, 750, 'ground');
        ground.setScale(3, 1).refreshBody(); // Make ground wider

        // Create some platforms
        this.platforms.create(400, 568, 'ground');
        this.platforms.create(750, 400, 'ground');
        this.platforms.create(50, 250, 'ground');
        
        // Make sure all platforms are static
        this.platforms.children.entries.forEach((platform: any) => {
            platform.body.immovable = true;
        });

        // Create player (pot) sprite
        this.player = this.physics.add.sprite(100, 450, 'pot');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        // Player physics
        this.physics.add.collider(this.player, this.platforms);

        // Create cursor keys for input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Camera follows player
        this.camera.startFollow(this.player);
        this.camera.setLerp(0.1, 0.1); // Smooth camera following

        // Create mobile touch controls
        this.createMobileControls();
    }

    update ()
    {
        // Get mobile input state
        const mobileInput = this.registry.get('mobileInput') || { leftPressed: false, rightPressed: false };

        // Combined movement controls (keyboard + mobile)
        const leftInput = this.cursors.left.isDown || mobileInput.leftPressed;
        const rightInput = this.cursors.right.isDown || mobileInput.rightPressed;

        if (leftInput) {
            this.player.setVelocityX(-160);
        } else if (rightInput) {
            this.player.setVelocityX(160);
        } else {
            this.player.setVelocityX(0);
        }

        // Jump state management
        const jumpInput = this.cursors.up.isDown || this.spaceKey.isDown;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        
        // Ground detection - check if touching down AND velocity is downward or small
        const isOnGround = body.touching.down && body.velocity.y >= -10;
        
        // Reset jump ability when on ground
        if (isOnGround) {
            this.canJump = true;
        }
        
        // Handle jump input (only on first press, not held)
        if (jumpInput && !this.jumpPressed) {
            this.jumpPressed = true;
            if (this.canJump && isOnGround) {
                this.player.setVelocityY(-600);
                this.canJump = false; // Prevent multiple jumps
            }
        } else if (!jumpInput) {
            this.jumpPressed = false; // Reset when key is released
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
        const mobileInput = { leftPressed: false, rightPressed: false };
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

        // Jump button events - single tap only
        this.jumpButton.on('pointerdown', () => {
            const body = this.player.body as Phaser.Physics.Arcade.Body;
            const isOnGround = body.touching.down && body.velocity.y >= -10;
            
            if (this.canJump && isOnGround) {
                this.player.setVelocityY(-600);
                this.canJump = false; // Prevent multiple jumps
            }
        });
    }
}
