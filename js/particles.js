export class DustSystem {
    constructor(scene) {
        this.scene = scene;
        this.geo = new THREE.PlaneGeometry(1, 1);
        this.dummy = new THREE.Object3D();
        this._color = new THREE.Color();

        const size = 32;
        const data = new Uint8Array(size * size * 4);
        const center = size / 2;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dist = Math.hypot(x - center, y - center) / center;
                const alpha = Math.max(0, Math.pow(1 - Math.min(1, dist), 1.8)) * 255;
                const i = (y * size + x) * 4;
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = alpha;
            }
        }
        this.tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        this.tex.needsUpdate = true;

        this.mat = new THREE.MeshBasicMaterial({
            map: this.tex,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        this.capacity = 300;
        this.mesh = new THREE.InstancedMesh(this.geo, this.mat, this.capacity);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);

        const white = new THREE.Color(1, 1, 1);
        for (let i = 0; i < this.capacity; i++) {
            this.mesh.setColorAt(i, white);
        }

        this.writeIdx = 0;
        this.activeIndices = [];
        this.particles = Array.from({ length: this.capacity }, () => ({
            active: false,
            life: 0,
            x: 0, y: 0, z: 0,
            vx: 0, vy: 0, vz: 0,
            rot: 0, rotSpeed: 0,
            maxScale: 1
        }));
    }

    spawn(x, y, z, colorHex, count = 1, speedMult = 1) {
        this._color.setHex(colorHex);

        for (let i = 0; i < count; i++) {
            const idx = this.writeIdx;
            this.writeIdx = (this.writeIdx + 1) % this.capacity;

            this.mesh.setColorAt(idx, this._color);

            const p = this.particles[idx];
            if (!p.active) {
                p.active = true;
                this.activeIndices.push(idx);
            }

            p.life = 1.0;
            p.x = x + (Math.random() - 0.5) * 0.3;
            p.y = y;
            p.z = z + (Math.random() - 0.5) * 0.2;
            p.vx = (Math.random() - 0.5) * 0.03 * speedMult;
            p.vy = 0.015 + Math.random() * 0.025;
            p.vz = 0.04 + Math.random() * 0.04;
            p.rot = Math.random() * Math.PI * 2;
            p.rotSpeed = (Math.random() - 0.5) * 0.05;
            p.maxScale = 1.2 + Math.random() * 0.8;
        }
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }

    update(gameSpeed, dt) {
        let updated = false;

        for (let i = this.activeIndices.length - 1; i >= 0; i--) {
            const idx = this.activeIndices[i];
            const p = this.particles[idx];

            p.life -= 0.025 * dt;

            if (p.life <= 0) {
                p.active = false;
                this.dummy.scale.set(0, 0, 0);
                this.dummy.updateMatrix();
                this.mesh.setMatrixAt(idx, this.dummy.matrix);
                updated = true;

                this.activeIndices[i] = this.activeIndices[this.activeIndices.length - 1];
                this.activeIndices.pop();
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += (p.vz + gameSpeed * 0.3) * dt;
                p.rot += p.rotSpeed * dt;

                const swell = (1.0 - Math.pow(p.life - 0.5, 2) * 4);
                const scale = Math.max(0.01, swell * p.maxScale * p.life);

                this.dummy.position.set(p.x, p.y, p.z);
                this.dummy.rotation.set(0, 0, p.rot);
                this.dummy.scale.set(scale, scale, scale);
                this.dummy.updateMatrix();

                this.mesh.setMatrixAt(idx, this.dummy.matrix);
                updated = true;
            }
        }

        if (updated) this.mesh.instanceMatrix.needsUpdate = true;
    }
}

export class ParticleManager {
    constructor(scene, texture) {
        this.scene = scene;
        this.geo = new THREE.PlaneGeometry(1, 1);
        this.dummy = new THREE.Object3D();
        this.dustSystem = new DustSystem(scene);

        const createMat = (map, opacity, blending) => new THREE.MeshBasicMaterial({
            map, transparent: true, opacity, depthWrite: false, blending
        });

        this.popMesh = new THREE.InstancedMesh(this.geo, createMat(texture, 0.7, THREE.AdditiveBlending), 300);

        const size = 32;
        const bubbleData = new Uint8Array(size * size * 4);
        const center = size / 2;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dist = Math.hypot(x - center, y - center) / center;
                let alpha = 0;
                if (dist <= 0.95 && dist >= 0.70) {
                    alpha = Math.sin((dist - 0.70) / 0.25 * Math.PI) * 220;
                }
                const specDist = Math.hypot(x - 11, y - 11) / 3.5;
                if (specDist <= 1.0) {
                    alpha = Math.max(alpha, (1.0 - specDist) * 255);
                }
                const i = (y * size + x) * 4;
                bubbleData[i] = 255;
                bubbleData[i + 1] = 255;
                bubbleData[i + 2] = 255;
                bubbleData[i + 3] = alpha;
            }
        }
        this.bubbleTex = new THREE.DataTexture(bubbleData, size, size, THREE.RGBAFormat);
        this.bubbleTex.needsUpdate = true;
        this.bubbleMesh = new THREE.InstancedMesh(this.geo, createMat(this.bubbleTex, 0.85, THREE.AdditiveBlending), 200);

        this.popMesh.frustumCulled = this.bubbleMesh.frustumCulled = false;
        this.scene.add(this.popMesh, this.bubbleMesh);

        const white = new THREE.Color(1, 1, 1);
        for (let i = 0; i < 300; i++) {
            this.popMesh.setColorAt(i, white);
            if (i < 200) this.bubbleMesh.setColorAt(i, white);
        }

        this.popIdx = this.bubbleIdx = 0;
        this.activeIndices = [];
        this.particleData = Array.from({ length: 500 }, () => ({
            active: false, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, scale: 1, type: 0, meshIdx: 0, phase: 0
        }));
        this._colorObj = new THREE.Color();
        this.meshMap = { pop: this.popMesh, bubble: this.bubbleMesh };
    }

    spawn(x, y, z, color, count = 1, velocityMult = 1, type = 'pop') {
        if (type === 'dust') {
            this.dustSystem.spawn(x, y, z, color, count, velocityMult);
            return;
        }

        const c = this._colorObj.set(color);
        const mesh = this.meshMap[type];
        if (!mesh) return;

        for (let i = 0; i < count; i++) {
            let idx, dataIdx;
            if (type === 'bubble') {
                idx = this.bubbleIdx; dataIdx = 300 + idx;
                this.bubbleIdx = (this.bubbleIdx + 1) % 200;
            } else {
                idx = this.popIdx; dataIdx = idx;
                this.popIdx = (this.popIdx + 1) % 300;
            }

            mesh.setColorAt(idx, c);

            const p = this.particleData[dataIdx];
            if (!p.active) {
                p.active = true;
                this.activeIndices.push(dataIdx);
            }
            p.life = 1.0;
            p.x = x; p.y = y; p.z = z;
            p.type = type;
            p.meshIdx = idx;
            p.phase = Math.random() * Math.PI * 2;

            if (type === 'bubble') {
                p.vx = (Math.random() - 0.5) * 0.02;
                p.vy = 0.04 + Math.random() * 0.06;
                p.vz = 0.15 + Math.random() * 0.1;
                p.scale = 0.2 + Math.random() * 0.25;
            } else {
                const angle = Math.random() * Math.PI * 2;
                const speed = (0.03 + Math.random() * 0.06) * velocityMult;
                p.vx = Math.cos(angle) * speed;
                p.vy = (Math.random() - 0.5) * speed;
                p.vz = Math.sin(angle) * speed;
                p.scale = 0.4 + Math.random() * 0.4;
            }
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    update(gameSpeed, deltaTimeScale) {
        this.dustSystem.update(gameSpeed, deltaTimeScale);

        let popUpdated = false, bubbleUpdated = false;

        for (let i = this.activeIndices.length - 1; i >= 0; i--) {
            const dataIdx = this.activeIndices[i];
            const p = this.particleData[dataIdx];

            p.life -= (p.type === 'pop' ? 0.04 : 0.025) * deltaTimeScale;

            if (p.life <= 0) {
                p.active = false;
                this.dummy.scale.set(0, 0, 0);
                this.dummy.updateMatrix();
                this.meshMap[p.type].setMatrixAt(p.meshIdx, this.dummy.matrix);

                if (p.type === 'pop') popUpdated = true;
                else bubbleUpdated = true;

                this.activeIndices[i] = this.activeIndices[this.activeIndices.length - 1];
                this.activeIndices.pop();
            } else {
                p.x += p.vx * deltaTimeScale;
                p.y += p.vy * deltaTimeScale;
                p.z += (p.vz + (gameSpeed * 0.3)) * deltaTimeScale;

                const ox = p.type === 'bubble' ? Math.sin(p.life * 10 + p.phase) * 0.1 : 0;
                this.dummy.position.set(p.x + ox, p.y, p.z);

                const scale = p.life * p.scale;
                this.dummy.scale.set(scale, scale, scale);
                this.dummy.rotation.set(0, 0, 0);

                this.dummy.updateMatrix();
                this.meshMap[p.type].setMatrixAt(p.meshIdx, this.dummy.matrix);

                if (p.type === 'pop') popUpdated = true;
                else bubbleUpdated = true;
            }
        }

        if (popUpdated) this.popMesh.instanceMatrix.needsUpdate = true;
        if (bubbleUpdated) this.bubbleMesh.instanceMatrix.needsUpdate = true;
    }
}


