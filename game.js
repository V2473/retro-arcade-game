const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

function preload() {
  // Load sprites
  this.load.svg('player', 'assets/player.svg');
  this.load.svg('enemy-random', 'assets/enemy-random.svg');
  this.load.svg('enemy-chaser', 'assets/enemy-chaser.svg');
  this.load.svg('enemy-patrol', 'assets/enemy-patrol.svg');
  this.load.svg('collectible', 'assets/collectible.svg');
}

let player;
let cursors;
let enemies;
let collectibles;
let score = 0;
let scoreText;
let health = 100;
let healthText;
let round = 1;
let roundText;
let enemySpeed = 4;
let enemyTypes = ['random', 'chaser', 'patrol'];
let introComplete = false;

function create() {
  // Create player sprite
  player = this.add.sprite(400, 300, 'player');

  // Keyboard controls
  cursors = this.input.keyboard.createCursorKeys();

  // Create all game elements first (hidden)
  enemies = this.add.group();
  for (let i = 0; i < 5; i++) {
    let enemyType = 'random';
    let enemySprite = 'enemy-random';

    let enemy = this.add.sprite(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), enemySprite);
    enemy.type = enemyType;
    enemy.moveCounter = 0;
    enemy.moveDirection = Phaser.Math.Between(0, 3);
    enemies.add(enemy);
    enemy.setVisible(false);
  }

  collectibles = this.add.group();
  for (let i = 0; i < 10; i++) {
    let collectible = this.add.sprite(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), 'collectible');
    collectibles.add(collectible);
    collectible.setVisible(false);
  }

  scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '18px', fill: '#fff' });
  scoreText.setVisible(false);

  healthText = this.add.text(600, 16, 'Health: 100', { fontSize: '18px', fill: '#fff' });
  healthText.setVisible(false);

  roundText = this.add.text(300, 16, 'Round: 1', { fontSize: '18px', fill: '#fff' });
  roundText.setVisible(false);

  // Show title screen immediately
  console.log('Showing title screen...');

  // Title screen
  this.add.text(400, 100, 'Retro Arcade Game', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

  // Start button
  const startButton = this.add.text(400, 400, 'Start', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
  startButton.setInteractive();
  startButton.on('pointerdown', () => {
    // Hide title screen
    this.children.list.forEach(child => {
      if (child !== player && !enemies.contains(child) && !collectibles.contains(child) && child !== scoreText && child !== healthText && child !== roundText) {
        child.setVisible(false);
      }
    });

    // Show intro animation
    console.log('Creating intro...');
    let introText1 = this.add.text(400, 200, 'RETRO ARCADE', { fontSize: '24px', fill: '#ffff00' }).setOrigin(0.5);
    let introText2 = this.add.text(400, 250, 'PRESENTS', { fontSize: '18px', fill: '#00ffff' }).setOrigin(0.5);
    let introText3 = this.add.text(400, 350, 'RETRO ARCADE GAME', { fontSize: '28px', fill: '#ff00ff' }).setOrigin(0.5);

    // Add glow effects
    introText1.setShadow(0, 0, '#ffff00', 10);
    introText2.setShadow(0, 0, '#00ffff', 10);
    introText3.setShadow(0, 0, '#ff00ff', 10);

    // Animation sequence
    introText1.setScale(0);
    introText2.setScale(0);
    introText3.setScale(0);

    this.tweens.add({
      targets: introText1,
      scale: 1,
      duration: 1000,
      ease: 'Bounce'
    });

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: introText2,
        scale: 1,
        duration: 800,
        ease: 'Bounce'
      });
    });

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: introText3,
        scale: 1,
        duration: 1200,
        ease: 'Bounce'
      });
    });

    // Start game after intro (4 seconds total)
    this.time.delayedCall(4000, () => {
      introText1.destroy();
      introText2.destroy();
      introText3.destroy();
      console.log('Intro complete, starting game...');

      // Start the actual game
      player.setVisible(true);
      enemies.setVisible(true);
      collectibles.setVisible(true);
      scoreText.setVisible(true);
      healthText.setVisible(true);
      roundText.setVisible(true);
    });
  });

  // Create collectibles
  collectibles = this.add.group();
  for (let i = 0; i < 10; i++) {
    let collectible = this.add.sprite(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), 'collectible');
    collectibles.add(collectible);
  }
  collectibles.setVisible(false);

  // Score text
  scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '18px', fill: '#fff' });
  scoreText.setVisible(false);

  // Health text
  healthText = this.add.text(600, 16, 'Health: 100', { fontSize: '18px', fill: '#fff' });
  healthText.setVisible(false);

  // Round text
  roundText = this.add.text(300, 16, 'Round: 1', { fontSize: '18px', fill: '#fff' });
  roundText.setVisible(false);

  // Initially hide player, enemies, and collectibles
  player.setVisible(false);
  enemies.setVisible(false);
  collectibles.setVisible(false);
}

function update() {
  // Player movement controls
  if (cursors.left.isDown) {
    player.x -= 5;
  } else if (cursors.right.isDown) {
    player.x += 5;
  }

  if (cursors.up.isDown) {
    player.y -= 5;
  } else if (cursors.down.isDown) {
    player.y += 5;
  }

  // Keep player within bounds
  player.x = Phaser.Math.Clamp(player.x, 16, 784);
  player.y = Phaser.Math.Clamp(player.y, 16, 584);

  // Spacebar for action (placeholder)
  if (cursors.space.isDown) {
    console.log('Action!');
  }

  // Enemy movement based on type
  enemies.getChildren().forEach(enemy => {
    let speed = enemy.type === 'chaser' ? enemySpeed * 0.3 : enemySpeed;

    if (enemy.type === 'random') {
      // Random movement
      enemy.x += Phaser.Math.Between(-speed, speed);
      enemy.y += Phaser.Math.Between(-speed, speed);
    } else if (enemy.type === 'chaser' && player.visible) {
      // Chase player
      let angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
      enemy.x += Math.cos(angle) * speed * 0.8;
      enemy.y += Math.sin(angle) * speed * 0.8;
    } else if (enemy.type === 'patrol') {
      // Patrol movement (change direction every 60 frames)
      enemy.moveCounter++;
      if (enemy.moveCounter > 60) {
        enemy.moveDirection = Phaser.Math.Between(0, 3);
        enemy.moveCounter = 0;
      }

      // Move in current direction
      switch (enemy.moveDirection) {
        case 0: enemy.y -= speed * 0.7; break; // up
        case 1: enemy.y += speed * 0.7; break; // down
        case 2: enemy.x -= speed * 0.7; break; // left
        case 3: enemy.x += speed * 0.7; break; // right
      }
    }

    // Keep within bounds
    enemy.x = Phaser.Math.Clamp(enemy.x, 16, 784);
    enemy.y = Phaser.Math.Clamp(enemy.y, 16, 584);
  });

  // Collision detection with collectibles
  collectibles.getChildren().forEach(collectible => {
    let distance = Phaser.Math.Distance.Between(player.x, player.y, collectible.x, collectible.y);
    if (distance < 32) {
      collectible.setVisible(false);
      collectibles.remove(collectible);
      score += 10;
      scoreText.setText('Score: ' + score);

      // Check if all collectibles are collected
      if (collectibles.getLength() === 0) {
        // Start new round
        round++;
        roundText.setText('Round: ' + round);
        enemySpeed += 1; // Increase enemy speed each round

        // Respawn collectibles
        for (let i = 0; i < 10; i++) {
          let collectible = this.add.sprite(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), 'collectible');
          collectibles.add(collectible);
        }

        // Add new enemies with different types from round 2
        if (round >= 2) {
          let enemyType = Phaser.Math.RND.pick(['chaser', 'patrol', 'random']);
          let enemySprite;

          // Assign sprites based on type
          if (enemyType === 'random') {
            enemySprite = 'enemy-random';
          } else if (enemyType === 'chaser') {
            enemySprite = 'enemy-chaser';
          } else if (enemyType === 'patrol') {
            enemySprite = 'enemy-patrol';
          }

          let newEnemy = this.add.sprite(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), enemySprite);
          newEnemy.type = enemyType;
          newEnemy.moveCounter = 0;
          newEnemy.moveDirection = Phaser.Math.Between(0, 3);
          enemies.add(newEnemy);
        }
      }
    }
  });

  // Collision detection with enemies
  enemies.getChildren().forEach(enemy => {
    let distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
    if (distance < 48) {
      health -= 10;
      healthText.setText('Health: ' + health);
      if (health <= 0) {
        // Game over
        player.setVisible(false);
        enemies.setVisible(false);
        collectibles.setVisible(false);
        this.add.text(400, 300, 'Game Over', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        let restartButton = this.add.text(400, 400, 'Restart', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        restartButton.setInteractive();
        restartButton.on('pointerdown', () => {
          // Reset game
          location.reload(); // Simple restart
        });
      }
    }
  });
}
