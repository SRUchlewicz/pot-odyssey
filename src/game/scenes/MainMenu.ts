import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x87CEEB); // Sky blue

        // Game title
        this.title = this.add.text(512, 250, 'POT ODYSSEY', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#4A4A4A',
            stroke: '#FFFFFF', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        // Subtitle
        const subtitle = this.add.text(512, 320, 'Quest for the Perfect Plant', {
            fontFamily: 'Arial', fontSize: 24, color: '#2F4F2F',
            align: 'center'
        }).setOrigin(0.5);

        // Pot sprite as logo
        const pot = this.add.image(512, 400, 'pot');
        pot.setScale(3); // Make it bigger for the menu

        // Start instruction
        const startText = this.add.text(512, 500, 'Click anywhere to start your journey', {
            fontFamily: 'Arial', fontSize: 18, color: '#556B2F',
            align: 'center'
        }).setOrigin(0.5);

        // Add some bounce animation to the pot
        this.tweens.add({
            targets: pot,
            scaleX: 3.2,
            scaleY: 3.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.input.once('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}
