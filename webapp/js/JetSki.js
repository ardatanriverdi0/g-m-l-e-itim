export class JetSki {
    constructor(scene, progression) {
        this.scene = scene;
        this.progression = progression;
        
        // Physics & State
        this.velocity = { x: 0, y: 0, z: 0 };
        this.gravity = 0.02;
        this.isAirborne = false;
        
        this.baseSpeed = 0.5;
        this.currentSpeed = 0.5;
        this.maxSpeed = 1.0 + (this.progression.data.upgrades.speed * 0.1);
        this.acceleration = 0.01 * this.progression.data.upgrades.accel;
        
        this.hp = 100;
        this.fuel = 100;

        // Stunt tracking
        this.completedTricks = [];
        this.totalRotationX = 0;
        this.totalRotationZ = 0;
        this.totalRotationY = 0;
        this.airTime = 0;

        // Visuals
        this.group = new THREE.Group();
        this.buildModel();
        this.scene.add(this.group);

        // Water Wake particles
        this.wakeParticles = [];
        this.particleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        this.particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    }

    buildModel() {
        const bodyMat = new THREE.MeshPhysicalMaterial({ 
            color: 0xe62719, metalness: 0.4, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1
        });
        const bottomMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 });
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: 1.0, roughness: 0.1 });
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x000000, metalness: 0.9, roughness: 0.0, transmission: 0.9, transparent: true
        });

        const hullGeo = new THREE.SphereGeometry(1, 32, 32);
        const hull = new THREE.Mesh(hullGeo, bodyMat);
        hull.scale.set(0.7, 0.4, 2.0); 
        hull.position.set(0, 0.6, 0);
        this.group.add(hull);

        const hullBottomGeo = new THREE.ConeGeometry(1, 4.0, 4);
        const hullBottom = new THREE.Mesh(hullBottomGeo, bottomMat);
        hullBottom.rotation.x = Math.PI / 2;
        hullBottom.rotation.y = Math.PI / 4;
        hullBottom.scale.set(0.65, 1, 0.4);
        hullBottom.position.set(0, 0.35, 0);
        this.group.add(hullBottom);

        const seatBaseGeo = new THREE.BoxGeometry(0.6, 0.4, 1.6);
        const seatBase = new THREE.Mesh(seatBaseGeo, bodyMat);
        seatBase.position.set(0, 0.8, 0.5);
        this.group.add(seatBase);

        const seatCushionGeo = new THREE.BoxGeometry(0.65, 0.2, 1.4);
        const seatCushion = new THREE.Mesh(seatCushionGeo, seatMat);
        seatCushion.position.set(0, 1.05, 0.6);
        this.group.add(seatCushion);

        const glassGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI, 0, Math.PI/2);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.scale.set(0.7, 0.5, 0.7);
        glass.rotation.x = -Math.PI / 3.5;
        glass.position.set(0, 1.15, -1.1);
        this.group.add(glass);

        // Position slightly above water initially
        this.group.position.y = 0;
    }

    reset() {
        this.hp = 100;
        this.fuel = 100;
        this.group.position.set(0,0,0);
        this.group.rotation.set(0,0,0);
        this.velocity = {x:0, y:0, z:0};
        this.isAirborne = false;
        this.totalRotationX = 0;
        this.totalRotationZ = 0;
        this.totalRotationY = 0;
        this.airTime = 0;
        this.maxSpeed = 1.0 + (this.progression.data.upgrades.speed * 0.1);
        this.acceleration = 0.01 * this.progression.data.upgrades.accel;
    }

    createWake() {
        if (this.isAirborne) return; // No wake in air
        const particle = new THREE.Mesh(this.particleGeo, this.particleMat);
        particle.position.set(
            this.group.position.x + (Math.random() - 0.5) * 1.2,
            0.1, 
            this.group.position.z + 1.5 + Math.random()
        );
        particle.userData = {
            vx: (Math.random() - 0.5) * 0.05,
            vy: Math.random() * 0.05,
            vz: Math.random() * 0.05 + (this.currentSpeed * 0.5),
            life: 1.0
        };
        this.scene.add(particle);
        this.wakeParticles.push(particle);
    }

    jump(force) {
        if (!this.isAirborne) {
            this.velocity.y = force;
            this.isAirborne = true;
        }
    }

    update(inputManager, isPlaying) {
        if (!isPlaying) return;

        // FUEL consumption
        this.fuel -= 0.01;
        if(this.fuel <= 0) this.fuel = 0; // Handled in Game.js for game over

        // Movement based on inputs
        let targetX = -inputManager.roll * 15;
        if(targetX > 6) targetX = 6;
        if(targetX < -6) targetX = -6;
        
        this.group.position.x += (targetX - this.group.position.x) * 0.1;

        // Speed mapping based on pitch
        // Lean back (positive pitch) -> Boost, lean forward -> brake
        let speedTarget = this.baseSpeed + (inputManager.pitch * 1.0);
        if(speedTarget < 0.2) speedTarget = 0.2;
        if(speedTarget > this.maxSpeed) speedTarget = this.maxSpeed;

        this.currentSpeed += (speedTarget - this.currentSpeed) * this.acceleration;

        // Rotation smoothing
        this.group.rotation.z += (inputManager.roll - this.group.rotation.z) * 0.1;
        
        // Physics
        if (this.isAirborne) {
            this.airTime += 1.0 / 60.0;
            this.group.position.y += this.velocity.y;
            this.velocity.y -= this.gravity;

            // Flip / Roll / Spin using Angular Velocity
            if (Math.abs(inputManager.pitchVelocity) > 0.05) {
                let rotX = inputManager.pitchVelocity * -0.5;
                this.group.rotation.x += rotX;
                this.totalRotationX += rotX;
            }
            if (Math.abs(inputManager.rollVelocity) > 0.05) {
                let rotZ = inputManager.rollVelocity * 0.5;
                this.group.rotation.z += rotZ;
                this.totalRotationZ += rotZ;
            }
            // Yaw is in degrees per frame roughly, so scale it to radians
            if (Math.abs(inputManager.yawVelocity) > 2.0) {
                let rotY = inputManager.yawVelocity * -0.05;
                this.group.rotation.y += rotY;
                this.totalRotationY += rotY;
            }

            if (this.group.position.y <= 0) {
                this.group.position.y = 0;
                this.isAirborne = false;
                this.velocity.y = 0;
                
                // Check Landing Angle & G-Force
                let currentRotX = Math.abs(this.group.rotation.x % (Math.PI * 2));
                let currentRotZ = Math.abs(this.group.rotation.z % (Math.PI * 2));
                
                // Hard Crash condition: High G-Force or bad angle
                if (inputManager.gforce > 3.0 || 
                    (currentRotX > 0.8 && currentRotX < (Math.PI * 2 - 0.8)) ||
                    (currentRotZ > 0.8 && currentRotZ < (Math.PI * 2 - 0.8))) {
                    this.completedTricks.push({ type: 'CRASH', points: 0 });
                } else {
                    // Perfect Landing Checks
                    let trickFound = false;
                    
                    let flips = Math.floor(Math.abs(this.totalRotationX) / (Math.PI * 1.2)); 
                    if (flips >= 1) {
                        // Check sign to distinguish Front/Back
                        let type = this.totalRotationX > 0 ? "FRONT FLIP" : "BACK FLIP";
                        this.completedTricks.push({ type: type, points: 500 * flips });
                        trickFound = true;
                    }

                    let rolls = Math.floor(Math.abs(this.totalRotationZ) / (Math.PI * 1.2));
                    if (rolls >= 1) {
                        this.completedTricks.push({ type: 'BARREL ROLL', points: 750 * rolls });
                        trickFound = true;
                    }

                    let spins = Math.floor(Math.abs(this.totalRotationY) / (Math.PI * 1.5));
                    if (spins >= 1) {
                        this.completedTricks.push({ type: '360 SPIN', points: 1000 * spins });
                        trickFound = true;
                    }

                    // Airtime bonus
                    if (this.airTime > 0.5) {
                        this.completedTricks.push({ type: 'AIRTIME', points: Math.floor(this.airTime * 100) });
                        trickFound = true;
                    }

                    if(trickFound) {
                        // Extra perfect landing if gforce is low and angle is very clean
                        if(inputManager.gforce < 1.8 && currentRotX < 0.2 && currentRotZ < 0.2) {
                            this.completedTricks.push({ type: 'PERFECT LANDING!', points: 1000 });
                        }
                    }
                }

                // Snap rotation back to normal naturally via lerp in the water block below, 
                // but reset raw trick counters
                this.group.rotation.x = 0;
                this.group.rotation.z = 0;
                // keep Y rotation so the jet ski doesn't snap visually around
                this.totalRotationX = 0;
                this.totalRotationZ = 0;
                this.totalRotationY = 0;
                this.airTime = 0;
            }
        } else {
            // Auto-Stabilization when in water
            this.group.position.y = (Math.sin(Date.now() * 0.005) * 0.15);
            this.group.rotation.x += (inputManager.pitch * 0.5 - this.group.rotation.x) * 0.1;
            // Naturally restore Roll back to 0 when in water
            this.group.rotation.z += (0 - this.group.rotation.z) * 0.05;
        }

        // Particles
        if (Math.random() > 0.3) this.createWake();
        for (let i = this.wakeParticles.length - 1; i >= 0; i--) {
            let p = this.wakeParticles[i];
            p.position.x += p.userData.vx;
            p.position.y += p.userData.vy;
            p.position.z += p.userData.vz;
            p.userData.life -= 0.02;
            p.scale.setScalar(p.userData.life);
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.wakeParticles.splice(i, 1);
            }
        }
    }
}
