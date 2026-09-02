import { CONFIG } from './config.js';

const SHADOW_TYPES = {
    TREE: { x: 0, rx: 60, ry: 60, opacity: 0.5, w: 4.5, h: 4.5 },
    ROCK: { x: 128, rx: 60, ry: 60, opacity: 0.4, w: 5.5, h: 5.5 },
    DUNE: { x: 256, rx: 60, ry: 60, opacity: 0.35, w: 18.0, h: 26.0 },
    BLOB: { x: 384, rx: 60, ry: 60, opacity: 0.4, w: 3.0, h: 3.0 }
};

export class ShadowManager {
    constructor() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 512, 128);

        const entries = Object.entries(SHADOW_TYPES);
        const count = entries.length;

        entries.forEach(([_, t]) => {
            const grad = ctx.createRadialGradient(t.x + 64, 64, 0, t.x + 64, 64, 64);
            grad.addColorStop(0, `rgba(0,0,0,${t.opacity})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(t.x + 64, 64, t.rx, t.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        this.texture = new THREE.CanvasTexture(canvas);
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture, transparent: true, depthWrite: false, opacity: 0.5, blending: THREE.MultiplyBlending
        });

        this.geos = {};
        entries.forEach(([k, t], i) => {
            this.geos[k.toLowerCase()] = this._createGeo(i / count, (i + 1) / count, t.w, t.h);
        });
    }

    _createGeo(uStart, uEnd, w, h) {
        const geo = new THREE.PlaneGeometry(w, h);
        geo.rotateX(-Math.PI / 2);
        const uvs = geo.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            uvs[i] = uvs[i] === 0 ? uStart : uEnd;
        }
        return geo;
    }
}

export const POWERUP_COLORS = { heart: 0xff00ff, shield: 0x00f3ff, magnet: 0x00ff00 };

export class EntityMeshManager {
    constructor(scene) {
        this.scene = scene;
        this.shadows = new ShadowManager();

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        this.glowTexture = new THREE.CanvasTexture(canvas);
        this.glowGeo = new THREE.PlaneGeometry(1, 1);
        this.entityUniforms = { uTime: { value: 0 } };

        const createGlowMat = (color) => {
            const mat = new THREE.MeshBasicMaterial({
                map: this.glowTexture, color, blending: THREE.AdditiveBlending,
                transparent: true, opacity: 0.4, depthWrite: false
            });
            mat.onBeforeCompile = (shader) => {
                shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
                    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
                    vec2 sc = vec2(length(vec3(instanceMatrix[0].xyz)), length(vec3(instanceMatrix[1].xyz)));
                    mv.xy += position.xy * sc;
                    gl_Position = projectionMatrix * mv;
                `);
            };
            return mat;
        };

        const attachRotationShader = (mat) => {
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = this.entityUniforms.uTime;
                shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader.replace('#include <begin_vertex>', `
                    #include <begin_vertex>
                    float a = uTime * 3.;
                    mat3 r = mat3(cos(a),0,sin(a),0,1,0,-sin(a),0,cos(a));
                    transformed = r * transformed;
                `);
            };
        };

        this.coinMat = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xffaa00 });
        attachRotationShader(this.coinMat);

        this.coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12);
        this.coinGeo.rotateX(Math.PI / 2);

        this.barrierMat = new THREE.MeshLambertMaterial({ color: 0xff3333, emissive: 0x440000, transparent: true, opacity: 0.85 });
        this.trapBaseMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        this.trapWoodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
        this.laserPoleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        this.laserBeamMat = new THREE.MeshLambertMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 10.0 });
        this.trafficMat = new THREE.MeshLambertMaterial({ color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 3.0 });

        this.coinInstMesh = new THREE.InstancedMesh(this.coinGeo, this.coinMat, 300);
        this.sObsInst = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1, 0.5), this.barrierMat, 50);
        this.tObsInst = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 3, 0.5), this.barrierMat, 50);
        this.trafficInst = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1.2, 2.5), this.trafficMat, 20);
        this.rampInst = {
            base: new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.15, 2.4), this.trapBaseMat, 15),
            spring: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 10), new THREE.MeshLambertMaterial({ color: 0x888888 }), 15),
            top: new THREE.InstancedMesh(new THREE.BoxGeometry(2, 0.2, 2), this.trapWoodMat, 15)
        };
        this.laserInst = {
            pole: new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 3, 0.4), this.laserPoleMat, 30),
            beam: new THREE.InstancedMesh(new THREE.BoxGeometry(7.5, 0.2, 0.2), this.laserBeamMat, 15)
        };

        this.powerInstMeshes = {};
        const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };

        const createPowerupShape = (type) => {
            const s = new THREE.Shape();
            if (type === 'heart') {
                s.moveTo(0, 0.2);
                s.bezierCurveTo(0.1, 0.5, 0.5, 0.5, 0.5, 0.2);
                s.bezierCurveTo(0.5, -0.1, 0.2, -0.3, 0, -0.4);
                s.bezierCurveTo(-0.2, -0.3, -0.5, -0.1, -0.5, 0.2);
                s.bezierCurveTo(-0.5, 0.5, -0.1, 0.5, 0, 0.2);
            } else if (type === 'shield') {
                s.moveTo(0, 0.4);
                s.lineTo(0.35, 0.3);
                s.lineTo(0.35, 0);
                s.bezierCurveTo(0.35, -0.3, 0, -0.5, 0, -0.5);
                s.bezierCurveTo(0, -0.5, -0.35, -0.3, -0.35, 0);
                s.lineTo(-0.35, 0.3);
                s.lineTo(0, 0.4);
            } else if (type === 'magnet') {
                s.moveTo(-0.35, 0.35);
                s.lineTo(-0.15, 0.35);
                s.lineTo(-0.15, 0);
                s.bezierCurveTo(-0.15, -0.2, 0.15, -0.2, 0.15, 0);
                s.lineTo(0.15, 0.35);
                s.lineTo(0.35, 0.35);
                s.lineTo(0.35, 0);
                s.bezierCurveTo(0.35, -0.4, -0.35, -0.4, -0.35, 0);
                s.lineTo(-0.35, 0.35);
            }
            return s;
        };

        [
            ['heart', 0xff00ff],
            ['shield', 0x00f3ff],
            ['magnet', 0x00ff00]
        ].forEach(([type, color]) => {
            const geo = new THREE.ExtrudeGeometry(createPowerupShape(type), extrudeSettings);
            geo.center();
            const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 10.0 });
            attachRotationShader(mat);
            this.powerInstMeshes[type] = new THREE.InstancedMesh(geo, mat, 50);
        });

        this.coinGlowMesh = new THREE.InstancedMesh(this.glowGeo, createGlowMat(0xffd700), 300);
        this.powerGlowMeshes = {
            heart: new THREE.InstancedMesh(this.glowGeo, createGlowMat(0xff00ff), 50),
            shield: new THREE.InstancedMesh(this.glowGeo, createGlowMat(0x00f3ff), 50),
            magnet: new THREE.InstancedMesh(this.glowGeo, createGlowMat(0x00ff00), 50)
        };

        const largeSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -100), 250);
        [this.coinInstMesh, this.coinGlowMesh, ...Object.values(this.powerGlowMeshes), ...Object.values(this.powerInstMeshes)]
            .forEach(mesh => mesh.geometry.boundingSphere = largeSphere);

        this.barrierShadowInst = new THREE.InstancedMesh(this.shadows.geos.blob, this.shadows.material, 150);

        this.allInstancedMeshes = [
            this.coinInstMesh, this.coinGlowMesh, this.sObsInst, this.tObsInst, this.trafficInst,
            this.rampInst.base, this.rampInst.spring, this.rampInst.top,
            this.laserInst.pole, this.laserInst.beam, this.barrierShadowInst,
            ...Object.values(this.powerInstMeshes), ...Object.values(this.powerGlowMeshes)
        ];

        this.counts = { coin: 0, sObs: 0, tObs: 0, traffic: 0, ramp: 0, laser: 0, heart: 0, shield: 0, magnet: 0, barrierShadow: 0 };
        this._prevCounts = {};
        this.scene.add(...this.allInstancedMeshes);
    }

    setTransform(mesh, idx, x, y, z, sx = 1, sy = sx, sz = sx) {
        const arr = mesh.instanceMatrix.array;
        const o = idx * 16;
        arr[o] = sx;      arr[o + 1] = 0;   arr[o + 2] = 0;   arr[o + 3] = 0;
        arr[o + 4] = 0;   arr[o + 5] = sy;  arr[o + 6] = 0;   arr[o + 7] = 0;
        arr[o + 8] = 0;   arr[o + 9] = 0;   arr[o + 10] = sz; arr[o + 11] = 0;
        arr[o + 12] = x;  arr[o + 13] = y;  arr[o + 14] = z;  arr[o + 15] = 1;
    }

    sync(entities, entityCount) {
        const counts = this.counts;
        for (const k in counts) counts[k] = 0;

        for (let i = 0; i < entityCount; i++) {
            const e = entities[i], ud = e.userData, p = e.position, type = ud.type;

            if (type === 'coin') {
                const idx = counts.coin++;
                this.setTransform(this.coinInstMesh, idx, p.x, p.y, p.z);
                this.setTransform(this.coinGlowMesh, idx, p.x, p.y, p.z, 1.2);
            } else if (ud.isPowerup) {
                const idx = counts[type]++;
                this.setTransform(this.powerInstMeshes[type], idx, p.x, p.y, p.z);
                this.setTransform(this.powerGlowMeshes[type], idx, p.x, p.y, p.z, 2.5);
            } else if (type === 'sObs') {
                const idx = counts.sObs++;
                this.setTransform(this.sObsInst, idx, p.x, p.y, p.z);
                this.setTransform(this.barrierShadowInst, counts.barrierShadow++, p.x, CONFIG.EFFECTS.SHADOW_Y, p.z);
            } else if (type === 'tObs') {
                const idx = counts.tObs++;
                this.setTransform(this.tObsInst, idx, p.x, p.y, p.z);
                this.setTransform(this.barrierShadowInst, counts.barrierShadow++, p.x, CONFIG.EFFECTS.SHADOW_Y, p.z);
            } else if (type === 'traffic') {
                const idx = counts.traffic++;
                this.setTransform(this.trafficInst, idx, p.x, p.y, p.z);
                this.setTransform(this.barrierShadowInst, counts.barrierShadow++, p.x, CONFIG.EFFECTS.SHADOW_Y, p.z, 1.5);
            } else if (type === 'ramp') {
                const idx = counts.ramp++;
                this.setTransform(this.rampInst.base, idx, p.x, p.y - 0.05, p.z);
                this.setTransform(this.rampInst.spring, idx, p.x, p.y + ud.rampTopY * 0.4, p.z, 1, ud.rampSpringScaleY, 1);
                this.setTransform(this.rampInst.top, idx, p.x, p.y + ud.rampTopY, p.z);
            } else if (type === 'laser') {
                const idx = counts.laser++;
                this.setTransform(this.laserInst.pole, idx * 2, p.x - 3.75, p.y, p.z);
                this.setTransform(this.laserInst.pole, idx * 2 + 1, p.x + 3.75, p.y, p.z);
                this.setTransform(this.laserInst.beam, idx, p.x, p.y + ud.laserBeamY, p.z);
            }
        }

        const targets = [
            [this.coinInstMesh, counts.coin, 'coin'],
            [this.coinGlowMesh, counts.coin, 'coinGlow'],
            [this.sObsInst, counts.sObs, 'sObs'],
            [this.tObsInst, counts.tObs, 'tObs'],
            [this.trafficInst, counts.traffic, 'traffic'],
            [this.barrierShadowInst, counts.barrierShadow, 'shadow'],
            [this.rampInst.base, counts.ramp, 'rampBase'],
            [this.rampInst.spring, counts.ramp, 'rampSpring'],
            [this.rampInst.top, counts.ramp, 'rampTop'],
            [this.laserInst.pole, counts.laser * 2, 'laserPole'],
            [this.laserInst.beam, counts.laser, 'laserBeam'],
            ...['heart', 'shield', 'magnet'].flatMap(t => [
                [this.powerInstMeshes[t], counts[t], t],
                [this.powerGlowMeshes[t], counts[t], t + 'Glow']
            ])
        ];

        for (let i = 0; i < targets.length; i++) {
            const [mesh, count, key] = targets[i];
            mesh.count = count;
            if (count > 0 || (this._prevCounts[key] || 0) > 0) mesh.instanceMatrix.needsUpdate = true;
            this._prevCounts[key] = count;
        }
    }
}
