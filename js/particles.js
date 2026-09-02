export class ParticleManager {
    constructor(scene, texture) {
        this.scene = scene;
        this.geo = new THREE.PlaneGeometry(1, 1);
        this._color = new THREE.Color();

        const createMat = (map, opacity, blending) => new THREE.MeshBasicMaterial({
            map, transparent: true, opacity, depthWrite: false, blending
        });

        // Dust texture
        const dSize = 32;
        const dustData = new Uint8Array(dSize * dSize * 4);
        const dCenter = dSize / 2;
        for (let y = 0; y < dSize; y++) {
            for (let x = 0; x < dSize; x++) {
                const dist = Math.hypot(x - dCenter, y - dCenter) / dCenter;
                const alpha = Math.max(0, Math.pow(1 - Math.min(1, dist), 1.8)) * 255;
                const i = (y * dSize + x) * 4;
                dustData[i] = dustData[i + 1] = dustData[i + 2] = 255;
                dustData[i + 3] = alpha;
            }
        }
        this.dustTex = new THREE.DataTexture(dustData, dSize, dSize, THREE.RGBAFormat);
        this.dustTex.needsUpdate = true;

        // Bubble texture
        const bubbleData = new Uint8Array(dSize * dSize * 4);
        for (let y = 0; y < dSize; y++) {
            for (let x = 0; x < dSize; x++) {
                const dist = Math.hypot(x - dCenter, y - dCenter) / dCenter;
                let alpha = (dist <= 0.95 && dist >= 0.70) ? Math.sin((dist - 0.70) / 0.25 * Math.PI) * 220 : 0;
                const specDist = Math.hypot(x - 11, y - 11) / 3.5;
                if (specDist <= 1.0) alpha = Math.max(alpha, (1.0 - specDist) * 255);
                const i = (y * dSize + x) * 4;
                bubbleData[i] = bubbleData[i + 1] = bubbleData[i + 2] = 255;
                bubbleData[i + 3] = alpha;
            }
        }
        this.bubbleTex = new THREE.DataTexture(bubbleData, dSize, dSize, THREE.RGBAFormat);
        this.bubbleTex.needsUpdate = true;

        this.popMesh = new THREE.InstancedMesh(this.geo, createMat(texture, 0.7, THREE.AdditiveBlending), 300);
        this.bubbleMesh = new THREE.InstancedMesh(this.geo, createMat(this.bubbleTex, 0.85, THREE.AdditiveBlending), 200);
        this.dustMesh = new THREE.InstancedMesh(this.geo, createMat(this.dustTex, 0.7, THREE.NormalBlending), 300);

        this.popMesh.frustumCulled = this.bubbleMesh.frustumCulled = this.dustMesh.frustumCulled = false;
        this.scene.add(this.popMesh, this.bubbleMesh, this.dustMesh);

        const white = new THREE.Color(1, 1, 1);
        for (let i = 0; i < 300; i++) {
            this.popMesh.setColorAt(i, white);
            this.dustMesh.setColorAt(i, white);
            if (i < 200) this.bubbleMesh.setColorAt(i, white);
        }

        this.writeIdx = { pop: 0, bubble: 0, dust: 0 };
        this.offsets = { pop: 0, bubble: 300, dust: 500 };
        this.caps = { pop: 300, bubble: 200, dust: 300 };
        this.meshMap = { pop: this.popMesh, bubble: this.bubbleMesh, dust: this.dustMesh };

        this.activeIndices = [];
        this.particles = Array.from({ length: 800 }, () => ({
            active: false, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
            scale: 1, type: 'pop', meshIdx: 0, phase: 0, rot: 0, rotSpeed: 0, maxScale: 1
        }));
    }

    spawn(x, y, z, color, count = 1, speedMult = 1, type = 'pop') {
        const mesh = this.meshMap[type];
        if (!mesh) return;

        if (color && color.isColor) this._color.copy(color);
        else if (typeof color === 'number') this._color.setHex(color);
        else this._color.set(color);

        const cap = this.caps[type];
        const offset = this.offsets[type];

        for (let i = 0; i < count; i++) {
            const mIdx = this.writeIdx[type];
            this.writeIdx[type] = (mIdx + 1) % cap;
            const dataIdx = offset + mIdx;

            mesh.setColorAt(mIdx, this._color);

            const p = this.particles[dataIdx];
            if (!p.active) {
                p.active = true;
                this.activeIndices.push(dataIdx);
            }

            p.life = 1.0;
            p.type = type;
            p.meshIdx = mIdx;

            if (type === 'dust') {
                p.x = x + (Math.random() - 0.5) * 0.3;
                p.y = y;
                p.z = z + (Math.random() - 0.5) * 0.2;
                p.vx = (Math.random() - 0.5) * 0.03 * speedMult;
                p.vy = 0.015 + Math.random() * 0.025;
                p.vz = 0.04 + Math.random() * 0.04;
                p.rot = Math.random() * Math.PI * 2;
                p.rotSpeed = (Math.random() - 0.5) * 0.05;
                p.maxScale = 1.2 + Math.random() * 0.8;
            } else if (type === 'bubble') {
                p.x = x; p.y = y; p.z = z;
                p.vx = (Math.random() - 0.5) * 0.02;
                p.vy = 0.04 + Math.random() * 0.06;
                p.vz = 0.15 + Math.random() * 0.1;
                p.scale = 0.2 + Math.random() * 0.25;
                p.phase = Math.random() * Math.PI * 2;
            } else {
                p.x = x; p.y = y; p.z = z;
                const angle = Math.random() * Math.PI * 2;
                const speed = (0.03 + Math.random() * 0.06) * speedMult;
                p.vx = Math.cos(angle) * speed;
                p.vy = (Math.random() - 0.5) * speed;
                p.vz = Math.sin(angle) * speed;
                p.scale = 0.4 + Math.random() * 0.4;
            }
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    update(gameSpeed, dt) {
        let dirtyPop = false, dirtyBubble = false, dirtyDust = false;

        for (let i = this.activeIndices.length - 1; i >= 0; i--) {
            const dataIdx = this.activeIndices[i];
            const p = this.particles[dataIdx];

            p.life -= (p.type === 'pop' ? 0.04 : 0.025) * dt;

            const arr = this.meshMap[p.type].instanceMatrix.array;
            const o = p.meshIdx * 16;

            if (p.life <= 0) {
                p.active = false;
                arr[o] = 0; arr[o + 5] = 0; arr[o + 10] = 0;

                if (p.type === 'pop') dirtyPop = true;
                else if (p.type === 'bubble') dirtyBubble = true;
                else dirtyDust = true;

                this.activeIndices[i] = this.activeIndices[this.activeIndices.length - 1];
                this.activeIndices.pop();
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += (p.vz + gameSpeed * 0.3) * dt;

                if (p.type === 'dust') {
                    p.rot += p.rotSpeed * dt;
                    const swell = 1.0 - Math.pow(p.life - 0.5, 2) * 4;
                    const scale = Math.max(0.01, swell * p.maxScale * p.life);
                    const c = Math.cos(p.rot) * scale;
                    const s = Math.sin(p.rot) * scale;

                    arr[o] = c;      arr[o + 1] = s;   arr[o + 2] = 0;   arr[o + 3] = 0;
                    arr[o + 4] = -s; arr[o + 5] = c;   arr[o + 6] = 0;   arr[o + 7] = 0;
                    arr[o + 8] = 0;  arr[o + 9] = 0;   arr[o + 10] = scale; arr[o + 11] = 0;
                    arr[o + 12] = p.x; arr[o + 13] = p.y; arr[o + 14] = p.z; arr[o + 15] = 1;
                    dirtyDust = true;
                } else if (p.type === 'bubble') {
                    const scale = p.life * p.scale;
                    const ox = Math.sin(p.life * 10 + p.phase) * 0.1;

                    arr[o] = scale;  arr[o + 1] = 0;   arr[o + 2] = 0;   arr[o + 3] = 0;
                    arr[o + 4] = 0;  arr[o + 5] = scale; arr[o + 6] = 0; arr[o + 7] = 0;
                    arr[o + 8] = 0;  arr[o + 9] = 0;   arr[o + 10] = scale; arr[o + 11] = 0;
                    arr[o + 12] = p.x + ox; arr[o + 13] = p.y; arr[o + 14] = p.z; arr[o + 15] = 1;
                    dirtyBubble = true;
                } else {
                    const scale = p.life * p.scale;

                    arr[o] = scale;  arr[o + 1] = 0;   arr[o + 2] = 0;   arr[o + 3] = 0;
                    arr[o + 4] = 0;  arr[o + 5] = scale; arr[o + 6] = 0; arr[o + 7] = 0;
                    arr[o + 8] = 0;  arr[o + 9] = 0;   arr[o + 10] = scale; arr[o + 11] = 0;
                    arr[o + 12] = p.x; arr[o + 13] = p.y; arr[o + 14] = p.z; arr[o + 15] = 1;
                    dirtyPop = true;
                }
            }
        }

        if (dirtyPop) this.popMesh.instanceMatrix.needsUpdate = true;
        if (dirtyBubble) this.bubbleMesh.instanceMatrix.needsUpdate = true;
        if (dirtyDust) this.dustMesh.instanceMatrix.needsUpdate = true;
    }
}


