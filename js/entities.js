import { CONFIG } from './config.js';
import { ShadowManager } from './visuals.js';

export const POWERUP_COLORS = { heart: 0xff00ff, shield: 0x00f3ff, magnet: 0x00ff00 };
const RECYCLED_POS = { x: 0, y: -100, z: 0 };

export class EntityMeshManager {
    constructor(scene) {
        this.scene = scene;
        this.shadows = new ShadowManager();
        this.dummy = new THREE.Object3D();
        this._v = new THREE.Vector3();
        this._s = new THREE.Vector3();

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

        this.scene.add(...this.allInstancedMeshes);
    }

    updateMatrix(mesh, idx, p, s = 1, r) {
        this.dummy.position.copy(p);
        this.dummy.rotation.set(r ? r.x : 0, r ? r.y : 0, r ? r.z : 0);
        if (s.x !== undefined) this.dummy.scale.copy(s);
        else this.dummy.scale.setScalar(s);

        this.dummy.updateMatrix();
        mesh.setMatrixAt(idx, this.dummy.matrix);
    }

    sync(entities, entityCount) {
        for (let i = 0; i < entityCount; i++) {
            const e = entities[i], ud = e.userData, p = e.position, type = ud.type;

            if (type === 'coin' || ud.isPowerup) {
                const mesh = type === 'coin' ? this.coinInstMesh : this.powerInstMeshes[type];
                const glow = type === 'coin' ? this.coinGlowMesh : this.powerGlowMeshes[type];
                this.updateMatrix(mesh, ud.i, p);
                this.updateMatrix(glow, ud.i, p, type === 'coin' ? 1.2 : 2.5);
            } else if (type === 'sObs' || type === 'tObs') {
                this.updateMatrix(type === 'sObs' ? this.sObsInst : this.tObsInst, ud.i, p);
                this._v.set(p.x, CONFIG.EFFECTS.SHADOW_Y, p.z);
                this.updateMatrix(this.barrierShadowInst, ud.i, this._v);
            } else if (type === 'traffic') {
                this.updateMatrix(this.trafficInst, ud.i, p);
                this._v.set(p.x, CONFIG.EFFECTS.SHADOW_Y, p.z);
                this.updateMatrix(this.barrierShadowInst, ud.i + 100, this._v, 1.5);
            } else if (type === 'ramp') {
                this._v.set(p.x, p.y - 0.05, p.z);
                this.updateMatrix(this.rampInst.base, ud.i, this._v);
                this._v.set(p.x, p.y + ud.tY * 0.4, p.z);
                this._s.set(1, ud.sY, 1);
                this.updateMatrix(this.rampInst.spring, ud.i, this._v, this._s);
                this._v.set(p.x, p.y + ud.tY, p.z);
                this.updateMatrix(this.rampInst.top, ud.i, this._v);
            } else if (type === 'laser') {
                this._v.set(p.x - 3.75, p.y, p.z);
                this.updateMatrix(this.laserInst.pole, ud.i * 2, this._v);
                this._v.set(p.x + 3.75, p.y, p.z);
                this.updateMatrix(this.laserInst.pole, ud.i * 2 + 1, this._v);
                this._v.set(p.x, p.y + ud.bY, p.z);
                this.updateMatrix(this.laserInst.beam, ud.i, this._v);
            }
        }

        for (let i = 0; i < this.allInstancedMeshes.length; i++) {
            this.allInstancedMeshes[i].instanceMatrix.needsUpdate = true;
        }
    }

    hide(entity) {
        const ud = entity.userData;
        if (ud.type === 'coin' || ud.isPowerup) {
            this.updateMatrix(ud.type === 'coin' ? this.coinInstMesh : this.powerInstMeshes[ud.type], ud.i, RECYCLED_POS);
            this.updateMatrix(ud.type === 'coin' ? this.coinGlowMesh : this.powerGlowMeshes[ud.type], ud.i, RECYCLED_POS);
        } else if (ud.type === 'sObs' || ud.type === 'tObs') {
            this.updateMatrix(ud.type === 'sObs' ? this.sObsInst : this.tObsInst, ud.i, RECYCLED_POS);
            this.updateMatrix(this.barrierShadowInst, ud.i, RECYCLED_POS);
        } else if (ud.type === 'traffic') {
            this.updateMatrix(this.trafficInst, ud.i, RECYCLED_POS);
            this.updateMatrix(this.barrierShadowInst, ud.i + 100, RECYCLED_POS);
        } else if (ud.type === 'ramp') {
            this.updateMatrix(this.rampInst.base, ud.i, RECYCLED_POS);
            this.updateMatrix(this.rampInst.spring, ud.i, RECYCLED_POS);
            this.updateMatrix(this.rampInst.top, ud.i, RECYCLED_POS);
        } else if (ud.type === 'laser') {
            this.updateMatrix(this.laserInst.pole, ud.i * 2, RECYCLED_POS);
            this.updateMatrix(this.laserInst.pole, ud.i * 2 + 1, RECYCLED_POS);
            this.updateMatrix(this.laserInst.beam, ud.i, RECYCLED_POS);
        }
    }
}
