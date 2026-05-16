import { JetSki } from './JetSki.js';
import { Environment } from './Environment.js';
import { Missile } from './entities/Missile.js';

export class Game {
    constructor(progression, inputManager, uiManagerCallback) {
        this.progression = progression;
        this.inputManager = inputManager;
        this.updateUICallback = uiManagerCallback;
        
        this.isPlaying = false;
        this.isPaused = false;
        
        // Game Stats
        this.score = 0;
        this.coinsCollected = 0;
        this.combo = 1;
        this.comboTimer = 0;

        // Ability Cooldowns
        this.cooldowns = { TURBO: 0, BACKFLIP: 0, MISSILE: 0, SHIELD: 0 };

        // Three.js Setup
        this.scene = new THREE.Scene();

        // Bind Gesture Listener
        this.inputManager.onGesture = (type) => this.handleGesture(type);
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
        this.camera.position.set(0, 3, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        document.getElementById('game-canvas').appendChild(this.renderer.domElement);

        // Modules
        this.environment = new Environment(this.scene);
        this.jetSki = new JetSki(this.scene, this.progression);

        // Events
        window.addEventListener('resize', () => this.onResize());
        
        // Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    start() {
        this.jetSki.reset();
        this.environment.reset();
        this.score = 0;
        this.coinsCollected = 0;
        this.combo = 1;
        this.isPlaying = true;
        this.isPaused = false;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    quit() {
        this.isPlaying = false;
        this.isPaused = false;
        this.environment.reset();
    }

    checkCollisions() {
        for (let i = this.environment.objects.length - 1; i >= 0; i--) {
            let obj = this.environment.objects[i];
            
            // Distance Check
            let dist = obj.position.distanceTo(this.jetSki.group.position);
            
            if (obj.userData.type === 'coin' && dist < 2.0) {
                this.coinsCollected++;
                this.score += (10 * this.combo);
                this.comboTimer = 100; // Reset combo timer
                this.combo = Math.min(this.combo + 1, 5); // Max 5x combo
                this.scene.remove(obj);
                this.environment.objects.splice(i, 1);
            } 
            else if (obj.userData.type === 'ramp' && dist < 3.0) {
                // Hit Ramp
                if(!this.jetSki.isAirborne) {
                    this.jetSki.jump(0.6); // Force of jump
                    this.updateUICallback.showTrick("AIRBORNE!");
                    this.score += 50;
                }
            }
            else if (obj.userData.type === 'obstacle' && dist < 2.0) {
                // Hit Rock
                if(!this.jetSki.isAirborne) {
                    this.jetSki.hp -= 25;
                    this.jetSki.currentSpeed *= 0.5; // slow down
                    this.combo = 1;
                    this.scene.remove(obj);
                    this.environment.objects.splice(i, 1);
                    this.updateUICallback.showTrick("CRASH!");
                    
                    // Camera Shake
                    this.camera.position.x += (Math.random() - 0.5) * 2;
                }
            }
        }
    }

    handleGesture(type) {
        if (!this.isPlaying || this.isPaused) return;
        if (this.cooldowns[type] > 0) return;

        switch (type) {
            case 'TURBO':
                if (this.jetSki.activateTurbo()) {
                    this.cooldowns.TURBO = 600; // 10s
                    if(this.updateUICallback) this.updateUICallback.showTrick("TURBO BOOST!");
                }
                break;
            case 'BACKFLIP':
                if (this.jetSki.triggerAutoFlip()) {
                    this.cooldowns.BACKFLIP = 300; // 5s
                    if(this.updateUICallback) this.updateUICallback.showTrick("AUTO BACKFLIP!");
                }
                break;
            case 'MISSILE':
                this.launchMissiles();
                this.cooldowns.MISSILE = 600; // 10s
                if(this.updateUICallback) this.updateUICallback.showTrick("MISSILES LAUNCHED!");
                break;
        }
    }

    launchMissiles() {
        const leftPos = this.jetSki.group.position.clone().add(new THREE.Vector3(-0.5, 0.5, -1));
        const rightPos = this.jetSki.group.position.clone().add(new THREE.Vector3(0.5, 0.5, -1));
        
        // Find target
        let target = null;
        let minDist = 50;
        for(let obj of this.environment.objects) {
            if(obj.userData.type === 'obstacle' && obj.position.z < this.jetSki.group.position.z) {
                let d = obj.position.distanceTo(this.jetSki.group.position);
                if(d < minDist) { minDist = d; target = obj; }
            }
        }

        this.jetSki.missiles.push(new Missile(this.scene, leftPos, target));
        this.jetSki.missiles.push(new Missile(this.scene, rightPos, target));
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.inputManager.update(); 

        if (this.isPlaying && !this.isPaused) {
            // Cooldowns
            for(let k in this.cooldowns) { if(this.cooldowns[k] > 0) this.cooldowns[k]--; }

            // Update Missiles
            for (let i = this.jetSki.missiles.length - 1; i >= 0; i--) {
                let m = this.jetSki.missiles[i];
                m.update();

                // Check collision with obstacles
                for (let j = this.environment.objects.length - 1; j >= 0; j--) {
                    let obj = this.environment.objects[j];
                    if (obj.userData.type === 'obstacle' && m.group.position.distanceTo(obj.position) < 2.0) {
                        this.scene.remove(obj);
                        this.environment.objects.splice(j, 1);
                        m.alive = false;
                        this.score += 200;
                        if(this.updateUICallback) this.updateUICallback.showTrick("BOOM!");
                        break;
                    }
                }

                if (!m.alive) {
                    m.destroy();
                    this.jetSki.missiles.splice(i, 1);
                }
            }

            // Combo Decay
            if(this.combo > 1) {
                this.comboTimer--;
                if(this.comboTimer <= 0) this.combo = 1;
            }

            // Score increments passively
            this.score += (this.jetSki.currentSpeed * 0.1);

            // Check Game Over
            if(this.jetSki.hp <= 0 || this.jetSki.fuel <= 0) {
                // Trigger quit via UI
                document.getElementById('btnQuit').click();
                alert("Game Over! Out of HP or Fuel.");
            }

            this.jetSki.update(this.inputManager, this.isPlaying);
            this.environment.update(this.jetSki.currentSpeed, this.isPlaying);
            
            this.checkCollisions();

            // Process Tricks
            while(this.jetSki.completedTricks.length > 0) {
                let trick = this.jetSki.completedTricks.shift();
                
                if (trick.type === 'CRASH') {
                    this.jetSki.hp -= 20;
                    this.jetSki.currentSpeed *= 0.3;
                    this.combo = 1;
                    if(this.updateUICallback) this.updateUICallback.showTrick("HARD CRASH!");
                    this.camera.position.x += (Math.random() - 0.5) * 4; // bigger shake
                } else {
                    let earned = trick.points * this.combo;
                    this.score += earned;
                    if(this.updateUICallback) this.updateUICallback.showTrick(`${trick.type} +${earned}`);
                }
            }

            // Camera follow (slight dynamic follow)
            this.camera.position.x += (this.jetSki.group.position.x - this.camera.position.x) * 0.1;
            // Camera zoom back slightly on speed
            let targetZ = 10 + (this.jetSki.currentSpeed * 2);
            this.camera.position.z += (targetZ - this.camera.position.z) * 0.05;

            // Send stats to UI
            if (this.updateUICallback) {
                this.updateUICallback.updateHUD({
                    score: Math.floor(this.score),
                    coins: this.coinsCollected,
                    speed: this.jetSki.currentSpeed,
                    hp: this.jetSki.hp,
                    fuel: this.jetSki.fuel,
                    combo: this.combo,
                    cooldowns: this.cooldowns,
                    telemetry: {
                        pitch: this.inputManager.pitch,
                        roll: this.inputManager.roll,
                        yaw: this.inputManager.yaw || 0,
                        gforce: this.inputManager.gforce || 1.0,
                        airTime: this.jetSki.airTime
                    }
                });
            }
        } else {
            // Environment still moves slightly if not playing (for main menu bg)
            this.environment.update(0.1, true);
        }

        // Return camera to center if shake happened
        this.camera.position.x += (0 - this.camera.position.x) * 0.05;

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
