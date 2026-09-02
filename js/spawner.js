import { CONFIG } from './config.js';
import { SceneryManager } from './scenery.js';
import { EntityMeshManager, POWERUP_COLORS } from './entities.js';

const POWERUP_SET = new Set(['heart', 'shield', 'magnet']);
const Y_MAP = { coin: 0.5, sObs: 0.5, tObs: 1.5, traffic: 0.6, ramp: 0.01, laser: 1.5 };
const HITBOX_MAP = {
    sObs: { hitboxW: 1.1, hitboxH: 0.5, hitboxD: 0.5 },
    tObs: { hitboxW: 1.1, hitboxH: 1.5, hitboxD: 0.5 },
    traffic: { hitboxW: 0.9, hitboxH: 0.6, hitboxD: 1.25 },
    ramp: { triggerTimer: 0, collider: 'sphere', radius: 1.2, rampSpringScaleY: 0.2, rampTopY: 0.05 },
    laser: { timer: 0, hitboxW: 5.0, hitboxH: 0.5, hitboxD: 0.4, laserBeamY: 0 }
};

class GameEntity {
    constructor(key, isPowerup, idx) {
        this.position = {
            x: 0, y: 0, z: 0,
            set(x, y, z) { this.x = x; this.y = y; this.z = z; }
        };
        this.visible = true;
        this.userData = {
            type: key,
            isPowerup,
            i: idx,
            isDamaging: (key !== 'coin' && key !== 'ramp' && !isPowerup),
            ...(HITBOX_MAP[key] ? { ...HITBOX_MAP[key] } : {})
        };
        if (key === 'laser') {
            this.userData.laserSpeed = 0.8 + Math.random();
            this.userData.laserTop = Math.random() > 0.5;
        }
    }
}

export class Spawner {
    constructor(scene, player, gm) {
        this.scene = scene;
        this.player = player;
        this.gm = gm;
        this.scene.name = 'spawner';

        this.entities = new Array(300);
        this.entityCount = 0;
        this.pools = {};
        this.idx = { coin: 0, heart: 0, shield: 0, magnet: 0, sObs: 0, tObs: 0, traffic: 0, ramp: 0, laser: 0 };
        this.activePatterns = ['COIN_LINE', 'WALL_GAP', 'TRIPLE_SHORT_WALL', 'ZIG_ZAG_COINS', 'TRIPLE_WALL', 'V_SHAPE', 'RAMP_JUMP'];
        this.difficultyIdx = 0;
        this.laneArr = [-1, 0, 1];
        this.powerupTypes = ['heart', 'shield', 'magnet'];

        this.meshes = new EntityMeshManager(scene);
        this.scenery = new SceneryManager(scene, gm);

        this.prewarmPools();
        this.nextPatternZ = -150;
        this.nextPowerupDistance = 0;
    }

    prewarmPools() {
        for (const [key, def] of Object.entries(CONFIG.ENTITY_DEFS)) {
            const pool = this.pools[key] = [];
            const isPowerup = POWERUP_SET.has(key);
            for (let i = 0; i < def.size; i++) {
                const ent = new GameEntity(key, isPowerup, this.idx[key]++);
                ent.visible = false;
                pool.push(ent);
            }
        }
    }

    _getFromPool(key) {
        const pool = this.pools[key];
        if (pool?.length > 0) {
            const ent = pool.pop();
            ent.visible = true;
            return ent;
        }
        return null;
    }

    _addToEntities(ent, x, y, z) {
        ent.position.set(x, y, z);
        this.entities[this.entityCount++] = ent;
        return ent;
    }

    get glowTexture() { return this.meshes.glowTexture; }

    scrollCells(speed, biomeName) {
        this.scenery.scrollCells(speed, biomeName);
    }

    getLanes() {
        const a = this.laneArr;
        let j = Math.floor(Math.random() * 3);
        [a[2], a[j]] = [a[j], a[2]];
        j = Math.floor(Math.random() * 2);
        [a[1], a[j]] = [a[j], a[1]];
        return a;
    }

    spawnEntity(entityKey, laneIndex, zPos, isFloating) {
        let entity = this._getFromPool(entityKey);
        const isPowerup = POWERUP_SET.has(entityKey);

        if (!entity) {
            entity = new GameEntity(entityKey, isPowerup, this.idx[entityKey]++);
        }

        let y = entityKey === 'coin' && isFloating ? 2.5 : (Y_MAP[entityKey] ?? (isPowerup ? 1.0 : 0.5));
        if (entityKey === 'ramp') {
            Object.assign(entity.userData, { triggerTimer: 0, rampTopY: 0.05, rampSpringScaleY: 0.2 });
        }
        if (entityKey === 'laser') {
            entity.userData.timer = 0;
            entity.userData.laserSpeed = 0.8 + Math.random();
            entity.userData.laserTop = Math.random() > 0.5;
            entity.userData.laserBeamY = entity.userData.laserTop ? 1.2 : -0.5;
        }

        const x = entityKey === 'laser' ? 0 : laneIndex * CONFIG.WORLD.LANE_WIDTH;
        return this._addToEntities(entity, x, y, zPos);
    }

    spawnNextPattern() {
        const currentDistance = this.gm.distance;
        const patternKey = this.activePatterns[Math.floor(Math.random() * this.activePatterns.length)];

        while (this.difficultyIdx < CONFIG.DIFFICULTY_THRESHOLDS.length && currentDistance > CONFIG.DIFFICULTY_THRESHOLDS[this.difficultyIdx].dist) {
            this.activePatterns.push(...CONFIG.DIFFICULTY_THRESHOLDS[this.difficultyIdx].patterns);
            this.difficultyIdx++;
        }

        const [spacing, ...elements] = CONFIG.PATTERNS[patternKey];
        const lanes = this.getLanes();
        const speedMultiplier = this.gm.gameSpeed / CONFIG.GAMEPLAY.BASE_SPEED;
        const baseSide = Math.random() > 0.5 ? -1 : 1;
        const laneMapping = { L0: lanes[0], L1: lanes[1], L2: lanes[2], BS: baseSide, SS: -baseSide };

        for (let i = 0; i < elements.length; i++) {
            const [type, l, z, high, randZ] = elements[i];
            const lane = laneMapping[l] ?? l;
            const rawZ = randZ ? (Math.random() * randZ - 1) : (z || 0);
            this.spawnEntity(type, lane, this.nextPatternZ + rawZ * speedMultiplier, Boolean(high));
        }

        const safetyBuffer = 10 + (Math.random() * 5);
        this.nextPatternZ -= (spacing * speedMultiplier + safetyBuffer + (Math.random() * Math.max(5, 30 - currentDistance / 320)));
    }

    update(timestamp, dt) {
        this.meshes.entityUniforms.uTime.value = timestamp * 0.001;

        const lookaheadDistance = this.gm.distance + 230;
        const lookaheadZoneIdx = Math.floor(lookaheadDistance / this.gm.zoneInterval) % this.gm.baseZones.length;
        const target = this.gm.baseZones[lookaheadZoneIdx].name;

        const gameSpeed = this.gm.gameSpeed;
        this.scrollCells(gameSpeed * dt, target);

        const pPos = this.gm.player.mesh.position;
        const playerX = pPos.x, playerY = pPos.y, playerZ = pPos.z;

        for (let i = this.entityCount - 1; i >= 0; i--) {
            const entity = this.entities[i];
            const pos = entity.position;
            const type = entity.userData.type;

            pos.z += (type === 'traffic' ? gameSpeed * CONFIG.GAMEPLAY.TRAFFIC_SPEED_MULT : gameSpeed) * dt;

            if (pos.z > 15) {
                this.recycleEntity(entity);
                this.entities[i] = this.entities[--this.entityCount];
                continue;
            }

            if (pos.z > -150) {
                this.updateEntityLogic(entity, dt);
                if (this.checkEntityCollisions(entity, playerX, playerY, playerZ)) {
                    this.handleEntityHit(entity, i);
                }
            }
        }

        this.nextPatternZ += this.gm.gameSpeed * dt;
        while (this.nextPatternZ > -CONFIG.WORLD.DEPTH) this.spawnNextPattern();

        if (this.gm.distance >= this.nextPowerupDistance) {
            const pType = this.powerupTypes[Math.floor(Math.random() * this.powerupTypes.length)];
            this.spawnEntity(pType, this.getLanes()[0], this.nextPatternZ - 5);
            this.nextPatternZ -= 15 * (this.gm.gameSpeed / CONFIG.GAMEPLAY.BASE_SPEED);
            this.nextPowerupDistance += CONFIG.GAMEPLAY.POWERUP_SPAWN_INTERVAL;
        }

        this.syncInstances();
    }

    syncInstances() {
        this.meshes.sync(this.entities, this.entityCount);
    }

    updateEntityLogic(entity, dt) {
        const ud = entity.userData;
        const pos = entity.position;

        if (ud.type === 'ramp' && ud.triggerTimer > 0) {
            ud.triggerTimer = Math.max(0, ud.triggerTimer - dt);
            if (ud.triggerTimer > 26) {
                ud.rampTopY = Math.min(ud.rampTopY + 0.5 * dt, 1.0);
                ud.rampSpringScaleY = Math.min(ud.rampSpringScaleY + 1.2 * dt, 2.0);
            } else {
                const lerpFactor = 1 - Math.pow(1 - 0.15, dt);
                ud.rampTopY += (0.05 - ud.rampTopY) * lerpFactor;
                ud.rampSpringScaleY += (0.2 - ud.rampSpringScaleY) * lerpFactor;
            }
        } else if (ud.type === 'laser') {
            ud.timer += ud.laserSpeed * (this.gm.gameSpeed / CONFIG.GAMEPLAY.BASE_SPEED) * dt;
            if (ud.timer > CONFIG.EFFECTS.LASER_MAX_TIMER) {
                ud.timer = 0;
                ud.laserTop = !ud.laserTop;
            }
            const lerpFactor = 1 - Math.pow(1 - 0.3, dt);
            ud.laserBeamY += ((ud.laserTop ? 1.2 : -0.5) - ud.laserBeamY) * lerpFactor;
        }

        if (ud.type === 'coin' && this.player.powers.magnet > 0) {
            const playerPos = this.player.mesh.position;
            if (pos.z > playerPos.z - CONFIG.POWERUPS.MAGNET_PULL_RANGE - 10 && pos.z < playerPos.z + 2) {
                const lerpFactor = 1 - Math.pow(1 - CONFIG.POWERUPS.MAGNET_PULL_STRENGTH, dt);
                pos.x += (playerPos.x - pos.x) * lerpFactor;
                pos.y += (playerPos.y - pos.y) * lerpFactor;
                pos.z += (playerPos.z - pos.z) * lerpFactor;
                ud.isTrackedByMagnet = true;
            } else {
                ud.isTrackedByMagnet = false;
            }
        }
    }

    checkEntityCollisions(entity, playerX, playerY, playerZ) {
        const pos = entity.position;
        const ud = entity.userData;
        if (this.player.flashTimer > 0 && ud.isDamaging) return false;

        const dz = Math.abs(playerZ - pos.z);

        if (ud.hitboxW !== undefined) {
            if (dz >= ud.hitboxD) return false;
            const targetY = ud.laserBeamY !== undefined ? pos.y + ud.laserBeamY : pos.y;
            if (Math.abs(playerY - targetY) >= ud.hitboxH + 0.25) return false;
            return ud.type === 'laser' || Math.abs(playerX - pos.x) < ud.hitboxW;
        }

        const radius = ud.radius || (ud.isTrackedByMagnet ? 1.8 : 1.2);
        const dx = playerX - pos.x, dy = playerY - pos.y;
        return (dx * dx + dy * dy + dz * dz) < radius * radius;
    }

    handleEntityHit(entity, entityIndex) {
        const ud = entity.userData;
        const { x, y, z } = entity.position;

        if (ud.type === 'coin') {
            this.gm.state.coins += (Math.random() < this.gm.coinBonusChance ? 2 : 1);
            this.gm.spawnParticles(x, y, z, 0xffd700, 8, 0.5);
            this.gm.audio.playCoin();
        } else if (ud.isPowerup) {
            this.player.activatePowerup(ud.type);
            this.gm.spawnParticles(x, y, z, POWERUP_COLORS[ud.type], 20, 2);
            this.gm.audio.playPowerup();
        } else if (ud.type === 'ramp') {
            if (this.player.mesh.position.y < 1.5 && ud.triggerTimer === 0) {
                this.player.isJumping = true;
                this.player.jumpVelocity = CONFIG.GAMEPLAY.JUMP_FORCE * CONFIG.GAMEPLAY.RAMP_BOOST_MULTIPLIER;
                ud.triggerTimer = CONFIG.EFFECTS.RAMP_TRIGGER_DURATION;
                this.gm.audio.playSpring();
            }
            return;
        } else if (ud.isDamaging) {
            this.player.takeDamage();
            const { x: px, y: py, z: pz } = this.player.mesh.position;
            this.gm.spawnParticles(px, py, pz, 0xff0000, 20, 2.5);
            this.gm.audio.playHit();
        }

        this.recycleEntity(entity);
        this.entities[entityIndex] = this.entities[--this.entityCount];
    }

    recycleEntity(entity) {
        entity.visible = false;
        const key = entity.userData.poolKey || entity.userData.type;
        (this.pools[key] ??= []).push(entity);
    }
}

