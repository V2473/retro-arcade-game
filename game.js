/**
 * Retro Arcade Adventure Game
 * A Phaser.js game with retro-style graphics and gameplay
 * Refactored for better organization and maintainability
 */

// Game constants
const GAME_CONSTANTS = {
  WIDTH: 800,
  HEIGHT: 600,
  PLAYER_SPEED: 5,
  ENEMY_SPEED: 4,
  ENEMY_COUNT: 5,
  COLLECTIBLE_COUNT: 10,
  PLAYER_SIZE: 32,
  ENEMY_SIZE: 48,
  COLLECTIBLE_SIZE: 32,
  SCORE_PER_COLLECTIBLE: 10,
  DAMAGE_PER_ENEMY: 10,
  MAX_HEALTH: 100,
  BOUNDS_PADDING: 16,
  ENEMY_TYPES: ['random', 'chaser', 'patrol']
};

const config = {
  type: Phaser.AUTO,
  width: GAME_CONSTANTS.WIDTH,
  height: GAME_CONSTANTS.HEIGHT,
  parent: 'game-container',
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Game state management
const gameState = {
  player: null,
  cursors: null,
  enemies: null,
  collectibles: null,
  score: 0,
  scoreText: null,
  health: GAME_CONSTANTS.MAX_HEALTH,
  healthText: null,
  round: 1,
  roundText: null,
  enemySpeed: GAME_CONSTANTS.ENEMY_SPEED,
  enemyTypes: GAME_CONSTANTS.ENEMY_TYPES,
  introComplete: false,
  introElements: [],
  introMusicInterval: null,
  gameOver: false,
  audioContext: null,
  isAudioInitialized: false,
  isAudioUnlocked: false
};

/**
 * Audio System
 * Handles retro-style sound generation using Web Audio API
 */
const AudioSystem = {
  init() {
    try {
      if (!gameState.audioContext) {
        console.log('🎵 AUDIO: Creating new AudioContext');
        gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gameState.isAudioInitialized = true;
        console.log(`🎵 AUDIO: AudioContext created with state: ${gameState.audioContext.state}`);
      }

      if (gameState.audioContext.state === 'suspended') {
        console.log('🔊 AUDIO: Resuming suspended AudioContext');
        gameState.audioContext.resume().then(() => {
          console.log(`✅ AUDIO: AudioContext resumed, new state: ${gameState.audioContext.state}`);
        });
      } else {
        console.log(`✅ AUDIO: AudioContext already active, state: ${gameState.audioContext.state}`);
      }
    } catch (error) {
      console.warn('❌ AUDIO: Initialization failed:', error);
      gameState.isAudioInitialized = false;
    }
  },

  unlock() {
    console.log('🔓 AUDIO: Attempting to unlock audio context');
    if (gameState.isAudioUnlocked) {
      console.log('✅ AUDIO: Already unlocked, skipping');
      return;
    }

    if (!gameState.isAudioInitialized) {
      this.init();
    }

    if (gameState.audioContext && gameState.audioContext.state === 'suspended') {
      // Create and immediately stop a silent sound to unlock audio
      const silentBuffer = gameState.audioContext.createBuffer(1, 1, 22050);
      const source = gameState.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(gameState.audioContext.destination);
      source.start();
      console.log('🔓 AUDIO: Silent unlock sound played');

      // Resume context
      gameState.audioContext.resume().then(() => {
        console.log(`✅ AUDIO: AudioContext unlocked and active, state: ${gameState.audioContext.state}`);
        gameState.isAudioUnlocked = true;
      }).catch(error => {
        console.warn('❌ AUDIO: Failed to unlock audio context:', error);
      });
    } else {
      console.log(`✅ AUDIO: AudioContext already unlocked, state: ${gameState.audioContext.state}`);
      gameState.isAudioUnlocked = true;
    }
  },

  createBeep(frequency, duration, type = 'square', volume = 0.1) {
    console.log(`🎵 AUDIO: Creating beep - Freq: ${frequency}Hz, Duration: ${duration}s, Type: ${type}, Volume: ${volume}`);

    if (!gameState.isAudioUnlocked) {
      console.log('🔒 AUDIO: Audio not unlocked yet, skipping beep to prevent autoplay issues');
      return; // Skip audio if not unlocked to prevent loud bursts
    }

    if (!gameState.isAudioInitialized) {
      console.log('🔊 AUDIO: Initializing audio context...');
      this.init();
    }

    if (!gameState.isAudioInitialized) {
      console.warn('❌ AUDIO: Initialization failed, skipping beep');
      return; // Skip audio if initialization failed
    }

    try {
      const currentTime = gameState.audioContext.currentTime;
      console.log(`⏰ AUDIO: Current audio context time: ${currentTime.toFixed(3)}s`);

      const oscillator = gameState.audioContext.createOscillator();
      const gainNode = gameState.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(gameState.audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, currentTime);

      // DEBUG: Check current gain levels
      const activeNodes = gameState.audioContext.destination.numberOfInputs || 0;
      console.log(`🔗 AUDIO: Active audio nodes: ${activeNodes}, Target volume: ${volume}`);

      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration);

      console.log(`✅ AUDIO: Beep scheduled - Start: ${currentTime.toFixed(3)}s, End: ${(currentTime + duration).toFixed(3)}s`);
    } catch (error) {
      console.warn('❌ AUDIO: Playback failed:', error);
    }
  },

  playCollectSound() {
    this.createBeep(800, 0.1, 'square', 0.15);
    setTimeout(() => this.createBeep(1000, 0.1, 'square', 0.1), 50);
  },

  playDamageSound() {
    this.createBeep(400, 0.2, 'sawtooth', 0.2);
    setTimeout(() => this.createBeep(200, 0.3, 'sawtooth', 0.15), 100);
  },

  playStartSound() {
    const melody = [523, 659, 784, 1047]; // C5, E5, G5, C6
    melody.forEach((freq, index) => {
      setTimeout(() => this.createBeep(freq, 0.15, 'square', 0.2), index * 150);
    });
  },

  playGameOverSound() {
    const melody = [523, 440, 349, 294]; // C5, A4, F4, D4
    melody.forEach((freq, index) => {
      setTimeout(() => this.createBeep(freq, 0.2, 'sawtooth', 0.25), index * 200);
    });
  },

  playNewRoundSound() {
    this.createBeep(300, 0.2, 'square', 0.2);
    setTimeout(() => this.createBeep(400, 0.2, 'square', 0.15), 150);
    setTimeout(() => this.createBeep(500, 0.3, 'square', 0.1), 300);
  },

  startIntroMusic() {
    console.log('🎵 AUDIO: Starting intro background music');

    if (!gameState.isAudioUnlocked) {
      console.log('🔒 AUDIO: Audio not unlocked yet, delaying intro music start');
      // Retry in 100ms until unlocked
      setTimeout(() => this.startIntroMusic(), 100);
      return;
    }

    // Simple 8-bit style background melody
    const melody = [
      { freq: 261, duration: 0.3, type: 'square' }, // C4
      { freq: 329, duration: 0.3, type: 'square' }, // E4
      { freq: 392, duration: 0.3, type: 'square' }, // G4
      { freq: 523, duration: 0.4, type: 'square' }, // C5
      { freq: 392, duration: 0.2, type: 'square' }, // G4
      { freq: 329, duration: 0.2, type: 'square' }, // E4
      { freq: 261, duration: 0.5, type: 'square' }, // C4
      { freq: 329, duration: 0.3, type: 'square' }, // E4
      { freq: 392, duration: 0.3, type: 'square' }, // G4
      { freq: 523, duration: 0.4, type: 'square' }, // C5
      { freq: 659, duration: 0.3, type: 'square' }, // E5
      { freq: 784, duration: 0.6, type: 'square' }  // G5
    ];

    gameState.introMusicInterval = setInterval(() => {
      if (!gameState.introComplete && gameState.isAudioInitialized && gameState.isAudioUnlocked) {
        melody.forEach((note, index) => {
          setTimeout(() => {
            if (!gameState.introComplete) {
              this.createBeep(note.freq, note.duration, note.type, 0.15);
            }
          }, index * 200);
        });
      }
    }, 3000); // Repeat every 3 seconds

    console.log('✅ AUDIO: Intro music started with interval ID:', gameState.introMusicInterval);
  },

  stopIntroMusic() {
    console.log('🎵 AUDIO: Stopping intro background music');
    if (gameState.introMusicInterval) {
      clearInterval(gameState.introMusicInterval);
      gameState.introMusicInterval = null;
      console.log('✅ AUDIO: Intro music stopped');
    }
  }
};

/**
 * Intro System
 * Handles game introduction sequences and UI
 */
const IntroSystem = {
  createCompanyLogo(scene) {
    console.log('=== CREATING ENHANCED 80s COMPANY LOGO ===');

    try {
      // Enhanced 80s-style company logo with dramatic effects

      // Create multiple text layers for depth effect
      const colors = ['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080'];
      let colorIndex = 0;

      // Main company text with color cycling
      const companyText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 200, 'RETRO GAMING CORP', {
        fontSize: '32px',
        fill: colors[0],
        fontFamily: 'Press Start 2P'
      }).setOrigin(0.5);

      companyText.setShadow(2, 2, '#000000', 8);
      gameState.introElements.push(companyText);

      // Glow effect layers
      const glowText1 = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 200, 'RETRO GAMING CORP', {
        fontSize: '32px',
        fill: colors[0],
        fontFamily: 'Press Start 2P'
      }).setOrigin(0.5).setAlpha(0.6);
      glowText1.setShadow(0, 0, colors[0], 20);
      gameState.introElements.push(glowText1);

      const glowText2 = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 200, 'RETRO GAMING CORP', {
        fontSize: '32px',
        fill: colors[0],
        fontFamily: 'Press Start 2P'
      }).setOrigin(0.5).setAlpha(0.3);
      glowText2.setShadow(0, 0, colors[0], 40);
      gameState.introElements.push(glowText2);

      // Dramatic 8-bit fanfare sound sequence
      console.log('🎺 AUDIO: Starting company logo fanfare sequence');
      const fanfareNotes = [
        { freq: 523, duration: 0.15, type: 'square', delay: 0 },    // C5
        { freq: 659, duration: 0.15, type: 'square', delay: 150 },  // E5
        { freq: 784, duration: 0.2, type: 'square', delay: 300 },   // G5
        { freq: 1047, duration: 0.3, type: 'square', delay: 500 },  // C6
        { freq: 1319, duration: 0.4, type: 'sawtooth', delay: 800 }, // E6
        { freq: 1568, duration: 0.5, type: 'sawtooth', delay: 1200 }  // G6
      ];

      console.log(`🎵 AUDIO: Fanfare sequence will play ${fanfareNotes.length} notes with volume 0.4`);
      fanfareNotes.forEach((note, index) => {
        scene.time.delayedCall(note.delay, () => {
          console.log(`🎺 AUDIO: Playing fanfare note ${index + 1}/${fanfareNotes.length} - ${note.freq}Hz after ${note.delay}ms delay`);
          AudioSystem.createBeep(note.freq, note.duration, note.type, 0.4);
        });
      });

      // Start intro background music
      AudioSystem.startIntroMusic();

      // Color cycling animation - faster for more 80s energy
      const colorCycle = scene.time.addEvent({
        delay: 80, // Faster cycling for 80s energy
        repeat: 35, // More cycles
        callback: () => {
          colorIndex = (colorIndex + 1) % colors.length;
          const currentColor = colors[colorIndex];

          companyText.setFill(currentColor);
          glowText1.setFill(currentColor);
          glowText2.setFill(currentColor);
          glowText1.setShadow(0, 0, currentColor, 20);
          glowText2.setShadow(0, 0, currentColor, 40);
        }
      });

      // Subtitle with dramatic reveal - multiple lines for more 80s feel
      scene.time.delayedCall(2000, () => {
        // First subtitle line
        const subtitle1 = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 280, 'EST. 1982', {
          fontSize: '20px',
          fill: '#00ffff',
          fontFamily: 'Press Start 2P'
        }).setOrigin(0.5).setAlpha(0);
        subtitle1.setShadow(1, 1, '#000000', 6);
        gameState.introElements.push(subtitle1);

        // Second subtitle line
        const subtitle2 = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 320, 'PRESENTS', {
          fontSize: '16px',
          fill: '#ffff00',
          fontFamily: 'Press Start 2P'
        }).setOrigin(0.5).setAlpha(0);
        subtitle2.setShadow(1, 1, '#000000', 4);
        gameState.introElements.push(subtitle2);

        // Dramatic reveal animation for subtitles
        scene.tweens.add({
          targets: [subtitle1, subtitle2],
          alpha: { from: 0, to: 1 },
          duration: 500,
          ease: 'Bounce'
        });

        // 8-bit chime sound
        console.log('🎵 AUDIO: Playing subtitle reveal chimes');
        AudioSystem.createBeep(800, 0.1, 'square', 0.3);
        scene.time.delayedCall(200, () => AudioSystem.createBeep(1000, 0.1, 'square', 0.3));
        scene.time.delayedCall(400, () => AudioSystem.createBeep(1200, 0.2, 'square', 0.4));
      });

      // Add dramatic zoom effect to main logo
      scene.tweens.add({
        targets: [companyText, glowText1, glowText2],
        scale: { from: 0.8, to: 1.1 },
        duration: 600,
        ease: 'Back.easeOut',
        yoyo: true,
        delay: 100
      });

      // Move to next stage after enhanced timing
      scene.time.delayedCall(5000, () => {
        colorCycle.destroy(); // Stop color cycling

        // Final dramatic sound
        console.log('🎵 AUDIO: Playing final dramatic sounds with volumes 0.4, 0.4, 0.5');
        AudioSystem.createBeep(800, 0.1, 'square', 0.4);
        scene.time.delayedCall(150, () => AudioSystem.createBeep(1000, 0.1, 'square', 0.4));
        scene.time.delayedCall(300, () => AudioSystem.createBeep(1200, 0.2, 'square', 0.5));

        if (typeof this.nextStage === 'function') {
          this.nextStage();
        }
      });
    } catch (error) {
      console.error('Error in createCompanyLogo:', error);
    }
  }
};

/**
 * Game Factory Functions
 * Creates game entities with consistent initialization
 */
const GameFactory = {
  createEnemy(scene, x, y, type) {
    try {
      let spriteKey;
      switch (type) {
        case 'chaser': spriteKey = 'enemy-chaser'; break;
        case 'patrol': spriteKey = 'enemy-patrol'; break;
        default: spriteKey = 'enemy-random'; break;
      }

      const enemy = scene.add.sprite(x, y, spriteKey);
      enemy.type = type;
      enemy.moveCounter = 0;
      enemy.moveDirection = Phaser.Math.Between(0, 3);
      return enemy;
    } catch (error) {
      console.error('Error creating enemy:', error);
      return null;
    }
  },

  createCollectible(scene, x, y) {
    try {
      return scene.add.sprite(x, y, 'collectible');
    } catch (error) {
      console.error('Error creating collectible:', error);
      return null;
    }
  },

  createHUDText(scene) {
    try {
      gameState.scoreText = scene.add.text(GAME_CONSTANTS.BOUNDS_PADDING, GAME_CONSTANTS.BOUNDS_PADDING,
        `Score: ${gameState.score}`, {
          fontSize: '18px',
          fill: '#fff'
        }).setVisible(false);

      gameState.healthText = scene.add.text(600, GAME_CONSTANTS.BOUNDS_PADDING,
        `Health: ${gameState.health}`, {
          fontSize: '18px',
          fill: '#fff'
        }).setVisible(false);

      gameState.roundText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.BOUNDS_PADDING,
        `Round: ${gameState.round}`, {
          fontSize: '18px',
          fill: '#fff'
        }).setOrigin(0.5).setVisible(false);
    } catch (error) {
      console.error('Error creating HUD text:', error);
    }
  }
};

/**
 * Game Logic System
 * Handles core game mechanics and sequences
 */
const GameLogicSystem = {
  runCompanyLogoSequence() {
    console.log('=== COMPANY LOGO SEQUENCE STARTED ===');
    const scene = this;

    function nextStage() {
      console.log('=== MOVING TO TITLE SCREEN ===');
      // Clear previous stage elements
      gameState.introElements.forEach(element => {
        if (element && element.destroy) element.destroy();
      });
      gameState.introElements = [];
      // After company logo, show title screen
      GameLogicSystem.showTitleScreen.call(scene);
    }

    IntroSystem.createCompanyLogo(scene);

    // Move to title screen after 3 seconds
    scene.time.delayedCall(3000, () => {
      AudioSystem.createBeep(1200, 0.15, 'square', 0.3);
      nextStage();
    });
  },

  runLoadingScreen() {
    const scene = this;
    gameState.introElements = [];

    function nextStage() {
      // Clear previous stage elements
      gameState.introElements.forEach(element => {
        if (element && element.destroy) element.destroy();
      });
      gameState.introElements = [];
      // After loading, start the game
      GameLogicSystem.startActualGame.call(scene);
    }

    GameLogicSystem.createLoadingScreen.call(scene);

    // Move to game after loading completes
    scene.time.delayedCall(2500, () => {
      AudioSystem.createBeep(800, 0.1, 'square', 0.2);
      nextStage();
    });
  },

  createLoadingScreen() {
    const scene = this;
    const loadingText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 200, 'LOADING...', {
      fontSize: '24px',
      fill: '#00ff00',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);
    gameState.introElements.push(loadingText);

    // Progress bar (bigger)
    const progressBg = scene.add.rectangle(GAME_CONSTANTS.WIDTH / 2, 280, 400, 30, 0x333333).setOrigin(0.5);
    const progressBar = scene.add.rectangle(GAME_CONSTANTS.WIDTH / 2 - 200, 280, 0, 26, 0x00ff00).setOrigin(0, 0.5);
    gameState.introElements.push(progressBg, progressBar);

    // Animated loading bar
    scene.tweens.add({
      targets: progressBar,
      width: 396,
      duration: 2000,
      ease: 'Power2'
    });

    // Loading dots animation
    let dots = 0;
    const loadingInterval = scene.time.addEvent({
      delay: 500,
      repeat: 5,
      callback: () => {
        dots = (dots + 1) % 4;
        loadingText.setText('LOADING' + '.'.repeat(dots));
        AudioSystem.createBeep(400, 0.05, 'square', 0.1);
      }
    });

    scene.time.delayedCall(2500, () => {
      loadingInterval.destroy();
      AudioSystem.createBeep(800, 0.1, 'square', 0.2);
      // Call next stage if available
      if (this.nextStage) this.nextStage();
    });
  },

  showTitleScreen() {
    const scene = this;

    // Title screen
    const titleText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 100, 'RETRO ARCADE ADVENTURE', {
      fontSize: '24px',
      fill: '#ffff00',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);

    // Start button
    const startButton = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 400, 'PRESS START', {
      fontSize: '18px',
      fill: '#00ffff',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);
    startButton.setInteractive();

    // Add blinking effect to start button
    scene.tweens.add({
      targets: startButton,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      repeat: -1,
      yoyo: true
    });

    // Add instruction text for spacebar
    const spaceInstruction = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 450, 'OR PRESS SPACEBAR', {
      fontSize: '12px',
      fill: '#ffff00',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);

    // Function to handle start game
    const startGame = () => {
      console.log('👆 AUDIO: First user interaction detected - unlocking audio');

      // Unlock audio context on first interaction
      AudioSystem.unlock();

      // Hide title screen elements
      scene.children.list.forEach(child => {
        if (child !== gameState.player &&
            !gameState.enemies.contains(child) &&
            !gameState.collectibles.contains(child) &&
            child !== gameState.scoreText &&
            child !== gameState.healthText &&
            child !== gameState.roundText) {
          child.setVisible(false);
        }
      });

      // Start loading screen directly (skip company logo)
      console.log('Starting loading screen...');
      GameLogicSystem.runLoadingScreen.call(scene);
    };

    startButton.on('pointerdown', startGame);

    // Add spacebar support for start button
    const spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', startGame);
  },

  startActualGame() {
    console.log('Intro complete, starting game...');

    // Stop intro music
    AudioSystem.stopIntroMusic();

    // Start the actual game
    if (gameState.player) gameState.player.setVisible(true);
    if (gameState.enemies) gameState.enemies.setVisible(true);
    if (gameState.collectibles) gameState.collectibles.setVisible(true);
    if (gameState.scoreText) gameState.scoreText.setVisible(true);
    if (gameState.healthText) gameState.healthText.setVisible(true);
    if (gameState.roundText) gameState.roundText.setVisible(true);

    // Play final start sound
    AudioSystem.playStartSound();

    // Mark intro as complete
    gameState.introComplete = true;
  },

  run80sIntroSequence() {
    const scene = this;
    let stage = 0;
    gameState.introElements = [];

    function nextStage() {
      // Clear previous stage elements
      gameState.introElements.forEach(element => {
        if (element && element.destroy) element.destroy();
      });
      gameState.introElements = [];

      stage++;
      createStage(stage);
    }

    function createStage(stageNumber) {
      switch(stageNumber) {
        case 1: // Company Logo Reveal
          IntroSystem.createCompanyLogo(scene);
          break;
        case 2: // Loading Screen
          GameLogicSystem.createLoadingScreen.call(scene);
          break;
        case 3: // Start Game
          GameLogicSystem.startActualGame.call(scene);
          break;
      }
    }

    // Set up next stage function
    GameLogicSystem.nextStage = nextStage;

    // Start the intro sequence
    createStage(1);
  }
};

// Legacy function wrappers for backward compatibility
function run80sIntroSequence() {
  GameLogicSystem.run80sIntroSequence.call(this);
}

function runCompanyLogoSequence() {
  GameLogicSystem.runCompanyLogoSequence.call(this);
}

function preload() {
  // Load sprites
  this.load.svg('player', 'assets/player.svg');
  this.load.svg('enemy-random', 'assets/enemy-random.svg');
  this.load.svg('enemy-chaser', 'assets/enemy-chaser.svg');
  this.load.svg('enemy-patrol', 'assets/enemy-patrol.svg');
  this.load.svg('collectible', 'assets/collectible.svg');
}

function create() {
  const scene = this;

  // Create player sprite
  gameState.player = scene.add.sprite(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2, 'player');

  // Keyboard controls
  gameState.cursors = scene.input.keyboard.createCursorKeys();

  // Create enemies group and populate
  gameState.enemies = scene.add.group();
  for (let i = 0; i < GAME_CONSTANTS.ENEMY_COUNT; i++) {
    const x = Phaser.Math.Between(GAME_CONSTANTS.PLAYER_SIZE, GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.PLAYER_SIZE);
    const y = Phaser.Math.Between(GAME_CONSTANTS.PLAYER_SIZE, GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.PLAYER_SIZE);
    const enemy = GameFactory.createEnemy(scene, x, y, 'random');
    if (enemy) {
      gameState.enemies.add(enemy);
      enemy.setVisible(false);
    }
  }

  // Create collectibles group and populate
  gameState.collectibles = scene.add.group();
  for (let i = 0; i < GAME_CONSTANTS.COLLECTIBLE_COUNT; i++) {
    const x = Phaser.Math.Between(GAME_CONSTANTS.COLLECTIBLE_SIZE, GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.COLLECTIBLE_SIZE);
    const y = Phaser.Math.Between(GAME_CONSTANTS.COLLECTIBLE_SIZE, GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.COLLECTIBLE_SIZE);
    const collectible = GameFactory.createCollectible(scene, x, y);
    if (collectible) {
      gameState.collectibles.add(collectible);
      collectible.setVisible(false);
    }
  }

  // Create HUD elements
  GameFactory.createHUDText(scene);

  // Start with title screen (keeping start button and loading screen)
  console.log('=== CREATE() FUNCTION CALLED ===');
  console.log('Starting title screen...');
  GameLogicSystem.showTitleScreen.call(scene);

  // Initially hide all game elements
  if (gameState.player) gameState.player.setVisible(false);
  if (gameState.enemies) gameState.enemies.setVisible(false);
  if (gameState.collectibles) gameState.collectibles.setVisible(false);
}

function update() {
  // Stop game if game over
  if (gameState.gameOver) {
    return;
  }

  // Player movement controls
  if (gameState.cursors && gameState.cursors.left && gameState.cursors.left.isDown) {
    if (gameState.player) gameState.player.x -= GAME_CONSTANTS.PLAYER_SPEED;
  }
  if (gameState.cursors && gameState.cursors.right && gameState.cursors.right.isDown) {
    if (gameState.player) gameState.player.x += GAME_CONSTANTS.PLAYER_SPEED;
  }
  if (gameState.cursors && gameState.cursors.up && gameState.cursors.up.isDown) {
    if (gameState.player) gameState.player.y -= GAME_CONSTANTS.PLAYER_SPEED;
  }
  if (gameState.cursors && gameState.cursors.down && gameState.cursors.down.isDown) {
    if (gameState.player) gameState.player.y += GAME_CONSTANTS.PLAYER_SPEED;
  }

  // Keep player within bounds
  if (gameState.player) {
    gameState.player.x = Phaser.Math.Clamp(gameState.player.x,
      GAME_CONSTANTS.PLAYER_SIZE,
      GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.PLAYER_SIZE);
    gameState.player.y = Phaser.Math.Clamp(gameState.player.y,
      GAME_CONSTANTS.PLAYER_SIZE,
      GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.PLAYER_SIZE);
  }

  // Spacebar for action (placeholder)
  if (gameState.cursors && gameState.cursors.space && gameState.cursors.space.isDown) {
    console.log('Action!');
  }

  // Enemy movement based on type
  if (gameState.enemies) {
    gameState.enemies.getChildren().forEach(enemy => {
      const speed = enemy.type === 'chaser' ? gameState.enemySpeed * 0.3 : gameState.enemySpeed;

      if (enemy.type === 'random') {
        // Random movement
        enemy.x += Phaser.Math.Between(-speed, speed);
        enemy.y += Phaser.Math.Between(-speed, speed);
      } else if (enemy.type === 'chaser' && gameState.player && gameState.player.visible) {
        // Chase player
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, gameState.player.x, gameState.player.y);
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
      enemy.x = Phaser.Math.Clamp(enemy.x, GAME_CONSTANTS.PLAYER_SIZE, GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.PLAYER_SIZE);
      enemy.y = Phaser.Math.Clamp(enemy.y, GAME_CONSTANTS.PLAYER_SIZE, GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.PLAYER_SIZE);
    });
  }

  // Collision detection with collectibles (only during active gameplay)
  if (gameState.collectibles && gameState.player && gameState.introComplete && !gameState.gameOver) {
    gameState.collectibles.getChildren().forEach(collectible => {
      // Only check collision if both entities are visible
      if (collectible.visible && gameState.player.visible) {
        const distance = Phaser.Math.Distance.Between(gameState.player.x, gameState.player.y, collectible.x, collectible.y);
        if (distance < GAME_CONSTANTS.COLLECTIBLE_SIZE) {
        collectible.setVisible(false);
        gameState.collectibles.remove(collectible);
        gameState.score += GAME_CONSTANTS.SCORE_PER_COLLECTIBLE;
        if (gameState.scoreText) {
          gameState.scoreText.setText(`Score: ${gameState.score}`);
        }

        // Play collect sound
        AudioSystem.playCollectSound();

        // Check if all collectibles are collected
        if (gameState.collectibles.getLength() === 0) {
          // Start new round
          gameState.round++;
          if (gameState.roundText) {
            gameState.roundText.setText(`Round: ${gameState.round}`);
          }
          gameState.enemySpeed += 1; // Increase enemy speed each round

          // Play new round sound
          AudioSystem.playNewRoundSound();

          // Respawn collectibles
          for (let i = 0; i < GAME_CONSTANTS.COLLECTIBLE_COUNT; i++) {
            const x = Phaser.Math.Between(GAME_CONSTANTS.COLLECTIBLE_SIZE, GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.COLLECTIBLE_SIZE);
            const y = Phaser.Math.Between(GAME_CONSTANTS.COLLECTIBLE_SIZE, GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.COLLECTIBLE_SIZE);
            const newCollectible = GameFactory.createCollectible(this, x, y);
            if (newCollectible) {
              gameState.collectibles.add(newCollectible);
            }
          }

          // Add new enemies with different types from round 2
          if (gameState.round >= 2) {
            const enemyType = Phaser.Math.RND.pick(gameState.enemyTypes);
            const x = Phaser.Math.Between(GAME_CONSTANTS.ENEMY_SIZE, GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.ENEMY_SIZE);
            const y = Phaser.Math.Between(GAME_CONSTANTS.ENEMY_SIZE, GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.ENEMY_SIZE);

            const newEnemy = GameFactory.createEnemy(this, x, y, enemyType);
            if (newEnemy) {
              gameState.enemies.add(newEnemy);
            }
          }
        }
      }
      }
    });
  }

  // Collision detection with enemies (only during active gameplay)
  if (gameState.enemies && gameState.player && gameState.introComplete && !gameState.gameOver) {
    gameState.enemies.getChildren().forEach(enemy => {
      // Only check collision if both entities are visible
      if (enemy.visible && gameState.player.visible) {
        const distance = Phaser.Math.Distance.Between(gameState.player.x, gameState.player.y, enemy.x, enemy.y);
        if (distance < GAME_CONSTANTS.ENEMY_SIZE) {
          gameState.health -= GAME_CONSTANTS.DAMAGE_PER_ENEMY;
          if (gameState.healthText) {
            gameState.healthText.setText(`Health: ${gameState.health}`);
          }

          // Play damage sound
          AudioSystem.playDamageSound();

          if (gameState.health <= 0) {
            // Game over - stop the game
            gameState.gameOver = true;
            if (gameState.player) gameState.player.setVisible(false);
            if (gameState.enemies) gameState.enemies.setVisible(false);
            if (gameState.collectibles) gameState.collectibles.setVisible(false);

            const gameOverText = this.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2,
              'Game Over', {
                fontSize: '32px',
                fill: '#fff'
              }).setOrigin(0.5);

            const restartButton = this.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2 + 100,
              'Restart', {
                fontSize: '24px',
                fill: '#fff'
              }).setOrigin(0.5);
            restartButton.setInteractive();

            // Add instruction text for spacebar on restart
            const restartInstruction = this.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2 + 140,
              'OR PRESS SPACEBAR', {
                fontSize: '12px',
                fill: '#ffff00',
                fontFamily: 'Press Start 2P'
              }).setOrigin(0.5);

            // Function to handle restart
            const restartGame = () => {
              // Reset game
              location.reload(); // Simple restart
            };

            restartButton.on('pointerdown', restartGame);

            // Add spacebar support for restart button
            const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            spaceKey.on('down', restartGame);

            // Play game over sound
            AudioSystem.playGameOverSound();
          }
        }
      }
    });
  }
}
