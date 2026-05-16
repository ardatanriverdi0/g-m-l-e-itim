export class Missile {
    constructor(scene, startPos, target) {
        this.scene = scene;
        this.target = target;
        
        this.group = new THREE.Group();
        this.buildModel();
        this.group.position.copy(startPos);
        this.scene.add(this.group);

        this.velocity = new THREE.Vector3(0, 0, -1.5); // Move forward fast
        this.alive = true;
        this.life = 100;
    }

    buildModel() {
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xaa0000 });

        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.rotation.x = Math.PI / 2;
        this.group.add(body);

        const tipGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.rotation.x = -Math.PI / 2;
        tip.position.z = -0.7;
        this.group.add(tip);
    }

    update() {
        if (!this.alive) return;

        if (this.target) {
            // Homing logic (simple)
            const dir = new THREE.Vector3().subVectors(this.target.position, this.group.position).normalize();
            this.velocity.lerp(dir.multiplyScalar(1.5), 0.1);
        }

        this.group.position.add(this.velocity);
        this.group.lookAt(this.group.position.clone().add(this.velocity));

        this.life--;
        if (this.life <= 0) this.alive = false;
    }

    destroy() {
        this.scene.remove(this.group);
    }
}
