import { CONFIG } from './config.js';

const POWERUP_KEYS = ['shield', 'magnet'];

export class Player {
    constructor(scene, ui, gm) {
        this.scene = scene;
        this.ui = ui;
        this.gm = gm;

        const checkerData = new Uint8Array([
            0, 243, 255, 255, 17, 17, 17, 255,
            17, 17, 17, 255, 0, 243, 255, 255
        ]);
        const tex = new THREE.DataTexture(checkerData, 2, 2, THREE.RGBAFormat);
        tex.magFilter = THREE.NearestFilter;
        tex.needsUpdate = true;

        this.mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x005577, roughness: 1, metalness: 0 });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), this.mat);
        this.mesh.position.y = 0.5;

        const size = 32;
        const shadowData = new Uint8Array(size * size * 4);
        const half = size / 2;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dist = Math.hypot(x - half, y - half) / half;
                const i = (y * size + x) * 4;
                shadowData[i + 3] = Math.max(0, 1 - dist) * 128;
            }
        }
        const shadowTex = new THREE.DataTexture(shadowData, size, size, THREE.RGBAFormat);
        shadowTex.needsUpdate = true;

        this.shadow = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 2.5),
            new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.6, depthWrite: false })
        );
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.05;
        this.scene.add(this.mesh, this.shadow);

        this.currentLane = 0;
        this.targetX = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.currentGravity = CONFIG.GAMEPLAY.GRAVITY;
        this.lives = 3;
        this.powers = { shield: 0, magnet: 0 };
        this.isDead = false;
        this.flashTimer = 0;
    }

    setLane(lane) {
        this.currentLane = lane;
        this.targetX = lane * CONFIG.WORLD.LANE_WIDTH;
    }

    moveLeft() {
        if (this.currentLane > -1) this.setLane(this.currentLane - 1);
    }

    moveRight() {
        if (this.currentLane < 1) this.setLane(this.currentLane + 1);
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpVelocity = CONFIG.GAMEPLAY.JUMP_FORCE;
            this.currentGravity = CONFIG.GAMEPLAY.GRAVITY;
            this.gm.audio.playJump();
        } else {
            this.fastFall();
        }
    }

    fastFall() {
        if (this.isJumping && this.jumpVelocity < CONFIG.GAMEPLAY.JUMP_FORCE * 0.5) {
            this.currentGravity = CONFIG.GAMEPLAY.FAST_FALL_GRAVITY;
        }
    }

    takeDamage() {
        if (this.powers.shield > 0) {
            this.powers.shield = 0;
            this.flash(0xffffff);
            return;
        }
        this.ui.updateLives(--this.lives);
        this.flash(0xff0000);
        if (this.lives <= 0) {
            this.isDead = true;
            this.ui.showGameOver();
        }
    }

    heal() {
        const maxLives = 3 + this.gm.shopManager.upgrades.extra_lives.level;
        if (this.lives < maxLives) {
            this.lives++;
            this.ui.updateLives(this.lives);
            this.flash(0xff3366);
        }
    }

    activatePowerup(t) {
        if (t === 'heart') { this.heal(); return; }
        const bonus = this.gm.shopManager.upgrades[t + '_duration'].level * CONFIG.POWERUPS.LEVEL_BONUS;
        this.powers[t] = CONFIG.POWERUPS.BASE_DURATION + bonus;
    }

    tickPowerup(t, dt) {
        if (this.powers[t] <= 0) return;
        const totalDuration = CONFIG.POWERUPS.BASE_DURATION + (this.gm.shopManager.upgrades[t + '_duration'].level * CONFIG.POWERUPS.LEVEL_BONUS);
        const prev = this.powers[t];
        this.powers[t] = Math.max(0, this.powers[t] - dt);
        this.ui.updatePowerup(t, this.powers[t] > 0, (this.powers[t] / totalDuration) * 100);
        if (prev > 0 && this.powers[t] === 0) this.gm.audio.playPowerupEnd();
    }

    flash(color) {
        this.mat.emissive.setHex(color);
        this.flashTimer = CONFIG.EFFECTS.FLASH_DURATION;
    }

    update(gameSpeed, time, gameManager, dt) {
        const laneSwapLerp = 1 - Math.pow(1 - CONFIG.GAMEPLAY.LANE_SWAP_SPEED, dt);
        this.mesh.position.x += (this.targetX - this.mesh.position.x) * laneSwapLerp;
        this.shadow.position.x = this.mesh.position.x;

        const jumpScale = 1.0 - (Math.max(0, this.mesh.position.y - 0.5) / 10);
        this.shadow.scale.set(jumpScale, jumpScale, 1);
        this.shadow.material.opacity = 0.6 * jumpScale;

        const activeZone = this.gm.baseZones[this.gm.currentZoneIdx % this.gm.baseZones.length];
        const laneColor = activeZone.path.getHex();

        if (this.isJumping) {
            this.mesh.position.y += this.jumpVelocity * dt;
            this.jumpVelocity += this.currentGravity * dt;
            if (this.mesh.position.y <= 0.5) {
                this.mesh.position.y = 0.5;
                this.isJumping = false;
                this.gm.spawnParticles(this.mesh.position.x, 0.1, this.mesh.position.z, laneColor, 8, 1, 'dust');
            }
        } else if (Math.random() > 0.4) {
            if (activeZone.name === 'ABYSSAL OCEAN') {
                this.gm.spawnParticles(this.mesh.position.x + (Math.random() - 0.5) * 0.6, 0.2, this.mesh.position.z, 0x00f3ff, 2, 1, 'bubble');
            } else {
                this.gm.spawnParticles(this.mesh.position.x + (Math.random() - 0.5) * 0.4, 0.1, this.mesh.position.z + 0.3, laneColor, 1, 1, 'dust');
            }
        }

        this.mesh.rotation.x -= gameSpeed * 0.65 * dt;
        POWERUP_KEYS.forEach(k => this.tickPowerup(k, dt));

        let emissiveColor = 0x005577, emissiveIntensity = 1.0;
        if (this.flashTimer > 0) {
            this.flashTimer = Math.max(0, this.flashTimer - dt);
            emissiveColor = 0xffffff;
            emissiveIntensity = 10.0;
        } else if (this.powers.shield > 0) {
            emissiveColor = (time % 400 < 200) ? 0x00f3ff : 0x005577;
            emissiveIntensity = 10.0;
        } else if (this.powers.magnet > 0) {
            emissiveColor = (time % 400 < 200) ? 0x00ff00 : 0x00aa00;
            emissiveIntensity = 10.0;
        }

        if (this._lastC !== emissiveColor || this._lastI !== emissiveIntensity) {
            this.mat.emissive.setHex(emissiveColor);
            this.mat.emissiveIntensity = emissiveIntensity;
            this._lastC = emissiveColor;
            this._lastI = emissiveIntensity;
        }
    }
}

