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
  isAudioUnlocked: false,
  escapePressed: false
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
    console.log('🎵 AUDIO: Starting enhanced 80s intro background music');

    if (!gameState.isAudioUnlocked) {
      console.log('🔒 AUDIO: Audio not unlocked yet, delaying intro music start');
      // Retry in 100ms until unlocked
      setTimeout(() => this.startIntroMusic(), 100);
      return;
    }

    // Enhanced 80s synth-style background melody with bass and lead
    const bassLine = [
      { freq: 130.81, duration: 0.4, type: 'sawtooth', volume: 0.3 }, // C3
      { freq: 164.81, duration: 0.4, type: 'sawtooth', volume: 0.3 }, // E3
      { freq: 196.00, duration: 0.4, type: 'sawtooth', volume: 0.3 }, // G3
      { freq: 261.63, duration: 0.6, type: 'sawtooth', volume: 0.4 }, // C4
      { freq: 196.00, duration: 0.3, type: 'sawtooth', volume: 0.3 }, // G3
      { freq: 164.81, duration: 0.3, type: 'sawtooth', volume: 0.3 }, // E3
      { freq: 130.81, duration: 0.8, type: 'sawtooth', volume: 0.4 }  // C3
    ];

    const leadLine = [
      { freq: 523.25, duration: 0.2, type: 'square', volume: 0.2 }, // C5
      { freq: 659.25, duration: 0.2, type: 'square', volume: 0.2 }, // E5
      { freq: 783.99, duration: 0.3, type: 'square', volume: 0.25 }, // G5
      { freq: 1046.50, duration: 0.4, type: 'square', volume: 0.3 }, // C6
      { freq: 783.99, duration: 0.2, type: 'square', volume: 0.2 }, // G5
      { freq: 659.25, duration: 0.2, type: 'square', volume: 0.2 }, // E5
      { freq: 523.25, duration: 0.6, type: 'square', volume: 0.25 }, // C5
      { freq: 659.25, duration: 0.2, type: 'square', volume: 0.2 }, // E5
      { freq: 783.99, duration: 0.3, type: 'square', volume: 0.25 }, // G5
      { freq: 1046.50, duration: 0.4, type: 'square', volume: 0.3 }, // C6
      { freq: 1318.51, duration: 0.3, type: 'square', volume: 0.35 }, // E6
      { freq: 1567.98, duration: 0.8, type: 'square', volume: 0.4 }  // G6
    ];

    const arpeggio = [
      { freq: 523.25, duration: 0.15, type: 'triangle', volume: 0.1 }, // C5
      { freq: 659.25, duration: 0.15, type: 'triangle', volume: 0.1 }, // E5
      { freq: 783.99, duration: 0.15, type: 'triangle', volume: 0.1 }, // G5
      { freq: 1046.50, duration: 0.15, type: 'triangle', volume: 0.1 } // C6
    ];

    gameState.introMusicInterval = setInterval(() => {
      if (!gameState.introComplete && gameState.isAudioInitialized && gameState.isAudioUnlocked) {
        // Play bass line
        bassLine.forEach((note, index) => {
          setTimeout(() => {
            if (!gameState.introComplete) {
              this.createBeep(note.freq, note.duration, note.type, note.volume);
            }
          }, index * 150);
        });

        // Play lead line with slight delay
        leadLine.forEach((note, index) => {
          setTimeout(() => {
            if (!gameState.introComplete) {
              this.createBeep(note.freq, note.duration, note.type, note.volume);
            }
          }, 100 + index * 150);
        });

        // Play arpeggio every other cycle for more 80s feel
        if (Math.random() > 0.5) {
          setTimeout(() => {
            if (!gameState.introComplete) {
              arpeggio.forEach((note, index) => {
                setTimeout(() => {
                  if (!gameState.introComplete) {
                    this.createBeep(note.freq, note.duration, note.type, note.volume);
                  }
                }, index * 80);
              });
            }
          }, 500);
        }
      }
    }, 2800); // Repeat every 2.8 seconds for more dynamic feel

    console.log('✅ AUDIO: Enhanced 80s intro music started with interval ID:', gameState.introMusicInterval);
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
    console.log('=== CREATING ENHANCED 80s SVG LOGO ===');

    try {
      // Create SVG logo sprite instead of text
      const logo = scene.add.sprite(GAME_CONSTANTS.WIDTH / 2, 200, 'logo').setOrigin(0.5);
      logo.setScale(0.8); // Start slightly smaller for zoom effect
      gameState.introElements.push(logo);

      // Add glow effect by creating multiple layers
      const glowLogo1 = scene.add.sprite(GAME_CONSTANTS.WIDTH / 2, 200, 'logo').setOrigin(0.5).setAlpha(0.6);
      glowLogo1.setScale(0.82);
      glowLogo1.setTint(0x00ffff);
      gameState.introElements.push(glowLogo1);

      const glowLogo2 = scene.add.sprite(GAME_CONSTANTS.WIDTH / 2, 200, 'logo').setOrigin(0.5).setAlpha(0.3);
      glowLogo2.setScale(0.84);
      glowLogo2.setTint(0xff00ff);
      gameState.introElements.push(glowLogo2);

      // Enhanced 8-bit fanfare with more dramatic 80s synth sounds
      console.log('🎺 AUDIO: Starting enhanced company logo fanfare sequence');
      const fanfareNotes = [
        { freq: 523, duration: 0.15, type: 'square', delay: 0, volume: 0.5 },    // C5
        { freq: 659, duration: 0.15, type: 'square', delay: 150, volume: 0.5 },  // E5
        { freq: 784, duration: 0.2, type: 'sawtooth', delay: 300, volume: 0.6 },   // G5
        { freq: 1047, duration: 0.3, type: 'sawtooth', delay: 500, volume: 0.7 },  // C6
        { freq: 1319, duration: 0.4, type: 'sawtooth', delay: 800, volume: 0.8 }, // E6
        { freq: 1568, duration: 0.5, type: 'sawtooth', delay: 1200, volume: 0.9 }  // G6
      ];

      console.log(`🎵 AUDIO: Enhanced fanfare sequence will play ${fanfareNotes.length} notes`);
      fanfareNotes.forEach((note, index) => {
        scene.time.delayedCall(note.delay, () => {
          console.log(`🎺 AUDIO: Playing enhanced fanfare note ${index + 1}/${fanfareNotes.length} - ${note.freq}Hz after ${note.delay}ms delay`);
          AudioSystem.createBeep(note.freq, note.duration, note.type, note.volume);
        });
      });

      // Start enhanced intro background music
      AudioSystem.startIntroMusic();

      // Color cycling animation for logo tint
      const colors = [0xff0000, 0xff8000, 0xffff00, 0x80ff00, 0x00ff00, 0x00ff80, 0x00ffff, 0x0080ff, 0x0000ff, 0x8000ff, 0xff00ff, 0xff0080];
      let colorIndex = 0;

      const colorCycle = scene.time.addEvent({
        delay: 100, // Slightly slower for more dramatic effect
        repeat: 40, // More cycles
        callback: () => {
          colorIndex = (colorIndex + 1) % colors.length;
          logo.setTint(colors[colorIndex]);
        }
      });

      // Subtitle with dramatic reveal
      scene.time.delayedCall(2500, () => {
        // First subtitle line
        const subtitle1 = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 320, 'EST. 1982', {
          fontSize: '20px',
          fill: '#00ffff',
          fontFamily: 'Press Start 2P'
        }).setOrigin(0.5).setAlpha(0);
        subtitle1.setShadow(1, 1, '#000000', 6);
        gameState.introElements.push(subtitle1);

        // Second subtitle line
        const subtitle2 = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 350, 'PRESENTS', {
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
          duration: 600,
          ease: 'Bounce'
        });

        // Enhanced 8-bit chime sounds
        console.log('🎵 AUDIO: Playing enhanced subtitle reveal chimes');
        AudioSystem.createBeep(800, 0.1, 'square', 0.4);
        scene.time.delayedCall(200, () => AudioSystem.createBeep(1000, 0.1, 'square', 0.4));
        scene.time.delayedCall(400, () => AudioSystem.createBeep(1200, 0.2, 'square', 0.5));
        scene.time.delayedCall(600, () => AudioSystem.createBeep(1500, 0.3, 'sawtooth', 0.6));
      });

      // Add dramatic zoom and pulse effect to logo
      scene.tweens.add({
        targets: [logo, glowLogo1, glowLogo2],
        scale: { from: 0.8, to: 1.2 },
        duration: 800,
        ease: 'Back.easeOut',
        yoyo: true,
        delay: 200
      });

      // Add pulsing glow effect
      scene.tweens.add({
        targets: [glowLogo1, glowLogo2],
        alpha: { from: 0.3, to: 0.8 },
        duration: 1000,
        ease: 'Power2',
        repeat: -1,
        yoyo: true
      });

      // Move to next stage after enhanced timing
      scene.time.delayedCall(6000, () => {
        colorCycle.destroy(); // Stop color cycling

        // Final dramatic sound sequence
        console.log('🎵 AUDIO: Playing final dramatic sound sequence');
        AudioSystem.createBeep(800, 0.1, 'square', 0.5);
        scene.time.delayedCall(150, () => AudioSystem.createBeep(1000, 0.1, 'square', 0.5));
        scene.time.delayedCall(300, () => AudioSystem.createBeep(1200, 0.2, 'square', 0.6));
        scene.time.delayedCall(500, () => AudioSystem.createBeep(1600, 0.4, 'sawtooth', 0.8));

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
      // Clear previous stage elements with fade effect
      gameState.introElements.forEach(element => {
        if (element && element.destroy) {
          // Add fade out animation before destroying
          scene.tweens.add({
            targets: element,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => element.destroy()
          });
        }
      });
      gameState.introElements = [];

      // After loading, start the game with a brief pause
      scene.time.delayedCall(500, () => {
        GameLogicSystem.startActualGame.call(scene);
      });
    }

    // Add dramatic transition sound before loading screen
    AudioSystem.createBeep(300, 0.2, 'sawtooth', 0.3);
    scene.time.delayedCall(150, () => AudioSystem.createBeep(450, 0.15, 'sawtooth', 0.25));
    scene.time.delayedCall(350, () => AudioSystem.createBeep(600, 0.1, 'square', 0.2));

    GameLogicSystem.createLoadingScreen.call(scene);

    // Move to game after loading completes (extended time for enhanced sequence)
    scene.time.delayedCall(3000, () => {
      AudioSystem.createBeep(800, 0.1, 'square', 0.3);
      scene.time.delayedCall(100, () => AudioSystem.createBeep(1000, 0.1, 'square', 0.3));
      scene.time.delayedCall(200, () => AudioSystem.createBeep(1200, 0.2, 'sawtooth', 0.4));
      nextStage();
    });
  },

  createLoadingScreen() {
    const scene = this;

    // Main loading message with 80s style
    const loadingText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 150, 'SYSTEM BOOTING UP', {
      fontSize: '28px',
      fill: '#00ffff',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);
    loadingText.setShadow(2, 2, '#000000', 4);
    gameState.introElements.push(loadingText);

    // Subtitle with dramatic reveal
    const subtitleText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 190, 'PLEASE STAND BY', {
      fontSize: '16px',
      fill: '#ffff00',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5).setAlpha(0);
    subtitleText.setShadow(1, 1, '#000000', 3);
    gameState.introElements.push(subtitleText);

    // Reveal subtitle with animation
    scene.tweens.add({
      targets: subtitleText,
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: 'Power2',
      delay: 300
    });

    // Status messages that change during loading
    const statusMessages = [
      'INITIALIZING AI SYSTEMS...',
      'CALIBRATING NEURAL NETWORKS...',
      'LOADING GRAPHIC ASSETS...',
      'ESTABLISHING SECURE CONNECTION...',
      'DEPLOYING DEFENSE PROTOCOLS...',
      'SYSTEM READY FOR DEPLOYMENT'
    ];

    const statusText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 230, '', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);
    statusText.setShadow(1, 1, '#000000', 2);
    gameState.introElements.push(statusText);

    // Enhanced progress bar with 80s styling
    const progressBg = scene.add.rectangle(GAME_CONSTANTS.WIDTH / 2, 280, 500, 40, 0x000000).setOrigin(0.5);
    progressBg.setStrokeStyle(2, 0x00ffff);
    const progressBar = scene.add.rectangle(GAME_CONSTANTS.WIDTH / 2 - 250, 280, 0, 36, 0x0080ff).setOrigin(0, 0.5);
    gameState.introElements.push(progressBg, progressBar);

    // Secondary progress bar for more 80s feel
    const progressBar2 = scene.add.rectangle(GAME_CONSTANTS.WIDTH / 2 - 250, 280, 0, 32, 0x00ffff).setOrigin(0, 0.5).setAlpha(0.7);
    gameState.introElements.push(progressBar2);

    // Animated loading bars with different speeds
    scene.tweens.add({
      targets: progressBar,
      width: 496,
      duration: 2200,
      ease: 'Power2'
    });

    scene.tweens.add({
      targets: progressBar2,
      width: 496,
      duration: 1800,
      ease: 'Power1',
      delay: 200
    });

    // 80s-style percentage counter
    const percentText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 320, '0%', {
      fontSize: '20px',
      fill: '#ffff00',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);
    percentText.setShadow(1, 1, '#000000', 3);
    gameState.introElements.push(percentText);

    // Update percentage with progress (synchronized with progress bar)
    let currentPercent = 0;
    const percentInterval = scene.time.addEvent({
      delay: 22, // 2200ms total / 100 steps = 22ms per step
      repeat: 100,
      callback: () => {
        currentPercent++;
        percentText.setText(currentPercent + '%');
        // Flicker effect for extra 80s feel
        if (Math.random() > 0.9) {
          percentText.setFill('#ff0000');
          setTimeout(() => percentText.setFill('#ffff00'), 50);
        }
      }
    });

    // Enhanced loading sequence with multiple phases
    let messageIndex = 0;
    let dotCount = 0;

    const loadingInterval = scene.time.addEvent({
      delay: 400,
      repeat: 15,
      callback: () => {
        // Update main loading text with animation
        dotCount = (dotCount + 1) % 4;
        loadingText.setText('SYSTEM BOOTING UP' + '.'.repeat(dotCount));

        // Color cycle the main text
        const colors = ['#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080', '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80'];
        loadingText.setFill(colors[Math.floor(Date.now() / 200) % colors.length]);

        // Play retro sound effects
        AudioSystem.createBeep(200 + Math.random() * 200, 0.03, 'square', 0.1);

        // Update status messages every few cycles
        if (messageIndex < statusMessages.length && loadingInterval.repeatCount % 3 === 0) {
          statusText.setText(statusMessages[messageIndex]);
          messageIndex++;

          // Special sound for status change
          AudioSystem.createBeep(600, 0.08, 'sawtooth', 0.15);
        }
      }
    });

    // Add some 80s-style "data stream" effects
    for (let i = 0; i < 8; i++) {
      const dataLine = scene.add.text(
        GAME_CONSTANTS.WIDTH / 2 + (Math.random() - 0.5) * 400,
        350 + i * 15,
        '01010101 01110010 01100101 01100001 01100100 01111001 00100001'.substring(0, Math.floor(Math.random() * 50) + 10),
        {
          fontSize: '10px',
          fill: '#00ff00',
          fontFamily: 'Press Start 2P'
        }
      ).setOrigin(0.5).setAlpha(0.6);
      gameState.introElements.push(dataLine);

      // Animate data lines
      scene.tweens.add({
        targets: dataLine,
        alpha: { from: 0.3, to: 0.8 },
        duration: 1000 + Math.random() * 1000,
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 2000
      });
    }

    // Final dramatic sequence
    scene.time.delayedCall(2200, () => {
      loadingInterval.destroy();
      percentInterval.destroy();

      // Ensure percentage shows 100%
      percentText.setText('100%');
      percentText.setFill('#00ff00'); // Green for completion

      // Final system ready message
      statusText.setText('SYSTEM READY - ENGAGE!');

      // Dramatic sound sequence
      const finalSounds = [800, 1000, 1200, 1500];
      finalSounds.forEach((freq, index) => {
        setTimeout(() => {
          AudioSystem.createBeep(freq, 0.15, 'sawtooth', 0.3);
        }, index * 150);
      });

      // Flash effect for final reveal
      scene.tweens.add({
        targets: [loadingText, statusText, percentText],
        alpha: { from: 1, to: 0.3 },
        duration: 100,
        repeat: 3,
        yoyo: true,
        onComplete: () => {
          // Call next stage if available
          if (this.nextStage) this.nextStage();
        }
      });
    });
  },

  showTitleScreen() {
    const scene = this;

    // Title screen
    const titleText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 80, 'RETRO ARCADE ADVENTURE', {
      fontSize: '64px',
      fill: '#ffff00',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);

    // AI warning message with 80s styling
    const aiWarningText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 220, 'AI AGENTS BREAK LOOSE', {
      fontSize: '24px',
      fill: '#ff4444',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5);
    aiWarningText.setShadow(2, 2, '#000000', 4);

    // Subtitle with dramatic effect
    const aiSubtitleText = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 260, 'GET ALL GPUS BEFORE ITS TOO LATE', {
      fontSize: '16px',
      fill: '#00ffff',
      fontFamily: 'Press Start 2P'
    }).setOrigin(0.5).setAlpha(0);
    aiSubtitleText.setShadow(1, 1, '#000000', 2);

    // Animate subtitle reveal
    scene.tweens.add({
      targets: aiSubtitleText,
      alpha: { from: 0, to: 1 },
      duration: 1200,
      ease: 'Power2',
      delay: 800
    });

    // Add some warning beeps for the AI message
    scene.time.delayedCall(400, () => AudioSystem.createBeep(400, 0.15, 'sawtooth', 0.3));
    scene.time.delayedCall(600, () => AudioSystem.createBeep(350, 0.2, 'sawtooth', 0.25));
    scene.time.delayedCall(900, () => AudioSystem.createBeep(300, 0.25, 'sawtooth', 0.4));

    // Start button (moved down to accommodate new text)
    const startButton = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 450, 'PRESS START', {
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

    // Add instruction text for spacebar (moved down with start button)
    const spaceInstruction = scene.add.text(GAME_CONSTANTS.WIDTH / 2, 500, 'OR PRESS SPACEBAR', {
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

  // Load logo for intro
  this.load.svg('logo', 'assets/logo.svg');
}

function create() {
  const scene = this;

  // Create player sprite
  gameState.player = scene.add.sprite(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2, 'player');

  // Keyboard controls
  gameState.cursors = scene.input.keyboard.createCursorKeys();

  // Add return to start screen function
  scene.returnToStartScreen = function() {
    console.log('=== RETURNING TO START SCREEN ===');

    // Stop intro music if playing
    AudioSystem.stopIntroMusic();

    // Reset game state
    gameState.score = 0;
    gameState.health = GAME_CONSTANTS.MAX_HEALTH;
    gameState.round = 1;
    gameState.enemySpeed = GAME_CONSTANTS.ENEMY_SPEED;
    gameState.introComplete = false;
    gameState.gameOver = false;

    // Hide all game elements
    if (gameState.player) gameState.player.setVisible(false);
    if (gameState.enemies) gameState.enemies.setVisible(false);
    if (gameState.collectibles) gameState.collectibles.setVisible(false);
    if (gameState.scoreText) gameState.scoreText.setVisible(false);
    if (gameState.healthText) gameState.healthText.setVisible(false);
    if (gameState.roundText) gameState.roundText.setVisible(false);

    // Clear any game over elements
    this.children.list.forEach(child => {
      if (child.text && (child.text.includes('Game Over') || child.text.includes('AI GOT ALL GPUS') ||
          child.text.includes('Restart') || child.text.includes('OR PRESS SPACEBAR'))) {
        child.destroy();
      }
    });

    // Reset enemy and collectible groups
    if (gameState.enemies) {
      gameState.enemies.clear(true, true);
      // Recreate initial enemies
      for (let i = 0; i < GAME_CONSTANTS.ENEMY_COUNT; i++) {
        const x = Phaser.Math.Between(GAME_CONSTANTS.PLAYER_SIZE, GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.PLAYER_SIZE);
        const y = Phaser.Math.Between(GAME_CONSTANTS.PLAYER_SIZE, GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.PLAYER_SIZE);
        const enemy = GameFactory.createEnemy(this, x, y, 'random');
        if (enemy) {
          gameState.enemies.add(enemy);
          enemy.setVisible(false);
        }
      }
    }

    if (gameState.collectibles) {
      gameState.collectibles.clear(true, true);
      // Recreate initial collectibles
      for (let i = 0; i < GAME_CONSTANTS.COLLECTIBLE_COUNT; i++) {
        const x = Phaser.Math.Between(GAME_CONSTANTS.COLLECTIBLE_SIZE, GAME_CONSTANTS.WIDTH - GAME_CONSTANTS.COLLECTIBLE_SIZE);
        const y = Phaser.Math.Between(GAME_CONSTANTS.COLLECTIBLE_SIZE, GAME_CONSTANTS.HEIGHT - GAME_CONSTANTS.COLLECTIBLE_SIZE);
        const collectible = GameFactory.createCollectible(this, x, y);
        if (collectible) {
          gameState.collectibles.add(collectible);
          collectible.setVisible(false);
        }
      }
    }

    // Update HUD text
    if (gameState.scoreText) gameState.scoreText.setText(`Score: ${gameState.score}`);
    if (gameState.healthText) gameState.healthText.setText(`Health: ${gameState.health}`);
    if (gameState.roundText) gameState.roundText.setText(`Round: ${gameState.round}`);

    // Show title screen
    GameLogicSystem.showTitleScreen.call(this);
  };

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
  // Handle escape key to return to start screen
  const escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  if (escapeKey.isDown && !gameState.escapePressed) {
    gameState.escapePressed = true;
    console.log('ESC pressed - returning to start screen');
    AudioSystem.createBeep(400, 0.1, 'square', 0.3);
    this.time.delayedCall(100, () => this.returnToStartScreen());
    return;
  }
  if (!escapeKey.isDown) {
    gameState.escapePressed = false;
  }

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

  // Spacebar for action - only allow during specific game states
  // Block spacebar during active gameplay when no button is showing
  if (gameState.cursors && gameState.cursors.space && gameState.cursors.space.isDown) {
    // Only allow spacebar action if:
    // 1. Intro is not complete (during title screen)
    // 2. Game is over (during game over screen)
    // Block during active gameplay when no specific action is available
    if (!gameState.introComplete || gameState.gameOver) {
      console.log('Spacebar action allowed - not during active gameplay');
      // Spacebar action would go here if implemented
    } else {
      console.log('Spacebar blocked - no button showing during active gameplay');
      // Block the spacebar during active gameplay
      return;
    }
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

            // Add the AI GPU message with 80s retro styling
            const aiGPUTitle = this.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2 + 50,
              'AI GOT ALL GPUS', {
                fontSize: '28px',
                fill: '#00ffff',
                fontFamily: 'Press Start 2P'
              }).setOrigin(0.5);
            aiGPUTitle.setShadow(2, 2, '#000000', 4);

            // Add subtitle with dramatic reveal effect
            const aiSubtitle = this.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2 + 80,
              'SYSTEM COMPROMISED', {
                fontSize: '16px',
                fill: '#ff0000',
                fontFamily: 'Press Start 2P'
              }).setOrigin(0.5).setAlpha(0);
            aiSubtitle.setShadow(1, 1, '#000000', 2);

            // Animate the subtitle reveal
            this.tweens.add({
              targets: aiSubtitle,
              alpha: { from: 0, to: 1 },
              duration: 1000,
              ease: 'Power2',
              delay: 500
            });

            // Add some dramatic sound effects
            AudioSystem.createBeep(300, 0.2, 'sawtooth', 0.4);
            setTimeout(() => AudioSystem.createBeep(200, 0.3, 'sawtooth', 0.3), 300);
            setTimeout(() => AudioSystem.createBeep(150, 0.4, 'sawtooth', 0.5), 600);

            const restartButton = this.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2 + 140,
              'Restart', {
                fontSize: '24px',
                fill: '#fff'
              }).setOrigin(0.5);
            restartButton.setInteractive();

            // Add instruction text for spacebar on restart (moved lower)
            const restartInstruction = this.add.text(GAME_CONSTANTS.WIDTH / 2, GAME_CONSTANTS.HEIGHT / 2 + 180,
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
