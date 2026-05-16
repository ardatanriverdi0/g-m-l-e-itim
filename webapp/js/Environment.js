export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.setupSky();
        this.setupWater();

        this.coinGeo = new THREE.TorusGeometry(0.5, 0.15, 8, 20);
        this.coinMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xaa8800, roughness: 0.2, metalness: 1 });

        this.rampGeo = new THREE.BoxGeometry(4, 1, 6);
        this.rampMat = new THREE.MeshStandardMaterial({ color: 0x2288ff, roughness: 0.8 });

        this.rockGeo = new THREE.DodecahedronGeometry(2);
        this.rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    }

    setupSky() {
        this.sun = new THREE.Vector3();
        this.sky = new THREE.Sky();
        this.sky.scale.setScalar(10000);
        this.scene.add(this.sky);

        const skyUniforms = this.sky.material.uniforms;
        skyUniforms['turbidity'].value = 10;
        skyUniforms['rayleigh'].value = 2;
        skyUniforms['mieCoefficient'].value = 0.005;
        skyUniforms['mieDirectionalG'].value = 0.8;

        const parameters = { elevation: 2, azimuth: 180 };
        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);
        this.sun.setFromSphericalCoords(1, phi, theta);
        this.sky.material.uniforms['sunPosition'].value.copy(this.sun);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.copy(this.sun);
        this.scene.add(dirLight);
    }

    setupWater() {
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
        this.water = new THREE.Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function (texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );
        this.water.rotation.x = -Math.PI / 2;
        this.water.material.uniforms['sunDirection'].value.copy(this.sun).normalize();
        this.scene.add(this.water);
    }

    spawnCoin() {
        const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
        coin.position.set((Math.random() - 0.5) * 12, 1, -100);
        coin.userData = { type: 'coin' };
        this.scene.add(coin);
        this.objects.push(coin);
    }

    spawnRamp() {
        const ramp = new THREE.Mesh(this.rampGeo, this.rampMat);
        ramp.rotation.x = Math.PI / 8; // Slanted
        ramp.position.set((Math.random() - 0.5) * 10, -0.5, -150);
        ramp.userData = { type: 'ramp' };
        this.scene.add(ramp);
        this.objects.push(ramp);
    }

    spawnRock() {
        const rock = new THREE.Mesh(this.rockGeo, this.rockMat);
        rock.position.set((Math.random() - 0.5) * 15, 0, -120);
        rock.userData = { type: 'obstacle' };
        this.scene.add(rock);
        this.objects.push(rock);
    }

    reset() {
        for(let obj of this.objects) {
            this.scene.remove(obj);
        }
        this.objects = [];
    }

    update(speed, isPlaying) {
        this.water.material.uniforms['time'].value += 1.0 / 60.0;
        
        if(!isPlaying) return;

        // Random spawner
        if(Math.random() < 0.02) this.spawnCoin();
        if(Math.random() < 0.002) this.spawnRamp();
        if(Math.random() < 0.005) this.spawnRock();

        // Move objects
        for (let i = this.objects.length - 1; i >= 0; i--) {
            let obj = this.objects[i];
            obj.position.z += speed;

            if(obj.userData.type === 'coin') {
                obj.rotation.y += 0.05;
            }

            // Cleanup behind camera
            if (obj.position.z > 10) {
                this.scene.remove(obj);
                this.objects.splice(i, 1);
            }
        }
    }
}
