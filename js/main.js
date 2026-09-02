import { CONFIG } from './config.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { ShopManager } from './shop.js';
import { Player } from './player.js';
import { Spawner } from './spawner.js';
import { ParticleManager } from './particles.js';

class GameManager {
    constructor() {
        this.state = { score: 0, distance: 0, coins: 0 };
        this.ui = new UIManager();
        this.ui.updateStats(0, 0, 0, true);

        this.audio = new AudioManager();
        this.shopManager = new ShopManager(this.audio);
        this.toastEl = document.getElementById('zone-toast');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
        this.camera.position.set(0, 4, 7);
        this.camera.lookAt(0, 0, -10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = false;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.initEnvironment();

        this.player = new Player(this.scene, this.ui, this);
        this.spawner = new Spawner(this.scene, this.player, this);
        this.particles = new ParticleManager(this.scene, this.spawner.glowTexture);

        this.isRunning = false;
        this.shopManager.btnStart.addEventListener('click', () => this.startGame());

        this.animate = this.animate.bind(this);

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('resize', () => this.onWindowResize());
        this.gameSpeed = 0;
        this.distance = 0;
        this.lastTime = 0;

        this._keyMap = {
            ArrowLeft: 'moveLeft', KeyA: 'moveLeft',
            ArrowRight: 'moveRight', KeyD: 'moveRight',
            ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
            ArrowDown: 'fastFall', KeyS: 'fastFall'
        };

        this.baseZones = CONFIG.ZONES.map(z => ({
            name: z.name,
            bg: new THREE.Color(z.bg),
            ground: new THREE.Color(z.ground),
            path: new THREE.Color(z.path),
            rock: new THREE.Color(z.rock)
        }));

        this.currentZoneIdx = 0;
        this.prevZoneIdx = 0;
        this.zoneInterval = 500;
        this.isTransitioningZone = false;
        this.transitionProgress = 0;
        this.toastTimer = 0;
        this.activeZone = this.baseZones[0];
        this.currentLaneColor = this.activeZone.path.getHex();
    }

    spawnParticles(x, y, z, c, n = 8, v = 1, t = 'pop') {
        this.particles?.spawn(x, y, z, c, n, v, t);
    }

    initEnvironment() {
        this.scene.add(new THREE.HemisphereLight(0xffeedd, 0x8899aa, 0.6));
        const sunPos = new THREE.Vector3(-15, 30, -20);
        const mainLight = new THREE.DirectionalLight(0xfff4e0, 1);
        const fillLight = new THREE.DirectionalLight(0xaabbcc, 0.3);
        mainLight.position.copy(sunPos);
        fillLight.position.set(10, 10, 5);
        this.scene.add(mainLight, fillLight);

        const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffcc }));
        sunMesh.position.copy(sunPos);
        this.scene.add(sunMesh);

        this.groundMat = new THREE.MeshLambertMaterial({ color: 0x55aa55 });
        const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, CONFIG.WORLD.DEPTH), this.groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = -0.05;

        this.pathMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
        const pathMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.5, CONFIG.WORLD.DEPTH), this.pathMat);
        pathMesh.rotation.x = -Math.PI / 2;
        this.scene.add(groundMesh, pathMesh);

        const laneGeo = new THREE.BoxGeometry(0.1, 0.02, CONFIG.WORLD.DEPTH);
        const laneMat = new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.4 });
        for (const x of [-1.25, 1.25]) {
            const lane = new THREE.Mesh(laneGeo, laneMat);
            lane.position.set(x, 0.02, 0);
            this.scene.add(lane);
        }
    }

    handleKeyDown(event) {
        if (this.audio.ctx?.state === 'suspended') this.audio.ctx.resume();
        if (!this.isRunning) return;
        if (this.player.isDead) {
            if (event.code === 'KeyR') window.location.reload();
            return;
        }
        const action = this._keyMap[event.code];
        if (action) this.player[action]();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    init() {
        this.lastTime = performance.now();
        this.animate(this.lastTime);
    }

    applyUpgrades() {
        const upgrades = this.shopManager.upgrades;
        this.player.lives = 3 + upgrades.extra_lives.level;
        this.ui.initHearts(this.player.lives);
        this.ui.updateLives(this.player.lives);
        this.speedScaleFactor = 0.05 - (upgrades.slow_start.level * 0.008);
        this.coinBonusChance = CONFIG.EFFECTS.COIN_MULTIPLIER_CHANCE * upgrades.coin_multiplier.level;
    }

    startGame() {
        if (this.isRunning) return;
        this.shopManager.mainMenuUI.style.display = 'none';
        this.shopManager.gameUI.style.display = 'flex';
        this.audio.init(this.shopManager.isSoundEnabled);
        this.applyUpgrades();
        this.isRunning = true;
    }

    animate(t) {
        requestAnimationFrame(this.animate);

        let dt_ms = (t && this.lastTime) ? t - this.lastTime : 16.6667;
        if (dt_ms <= 0 || dt_ms > 1000) dt_ms = 16.6667;
        this.lastTime = t;
        const dt = Math.min(dt_ms / 16.6667, 3.0);

        if (!this.isRunning) {
            this.spawner.scrollCells(0.2 * dt, null);
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.player.isDead) {
            if (!this.hasPaidOut) {
                this.shopManager.addCoins(this.state.coins);
                this.shopManager.checkRunStats(this.state.score, this.state.distance, this.state.coins);
                this.hasPaidOut = true;
                this.ui.updateStats(this.state.score, this.state.distance, this.state.coins, true);
                this.renderer.render(this.scene, this.camera);
            }
            return;
        }
        this.updatePhysics(t, dt);
        this.renderer.render(this.scene, this.camera);
    }

    updatePhysics(t, dt) {
        const state = this.state;
        const playerPos = this.player.mesh.position;
        const speedScale = Math.min(CONFIG.GAMEPLAY.MAX_SPEED, Math.sqrt(Math.log10(this.distance + 1)) * 2.5 * this.speedScaleFactor);

        this.gameSpeed = (CONFIG.GAMEPLAY.BASE_SPEED + speedScale) * (this.shopManager.startSpeedMult || 1);
        this.distance += this.gameSpeed * dt;
        state.distance = this.distance;
        state.score = Math.floor(this.distance) + (state.coins * 10);

        const zid = Math.floor(this.distance / this.zoneInterval);
        if (zid > this.currentZoneIdx) {
            this.prevZoneIdx = this.currentZoneIdx % this.baseZones.length;
            this.currentZoneIdx = zid;
            const nextIdx = zid % this.baseZones.length;
            this.activeZone = this.baseZones[nextIdx];
            this.currentLaneColor = this.activeZone.path.getHex();

            this.isTransitioningZone = true;
            this.transitionProgress = 0;
            this.toastEl.textContent = `ZONE ${nextIdx + 1}: ${this.baseZones[nextIdx].name}`;
            this.toastEl.style.opacity = 1;
            this.toastTimer = 180;
            this.audio.playZoneChange();
        }

        if (this.isTransitioningZone) {
            this.transitionProgress = Math.min(1.0, this.transitionProgress + 0.05 * dt);
            const p = this.transitionProgress;
            const from = this.baseZones[this.prevZoneIdx];
            const to = this.baseZones[this.currentZoneIdx % this.baseZones.length];

            if (this.scene.background) this.scene.background.lerpColors(from.bg, to.bg, p);
            if (this.groundMat.color) this.groundMat.color.lerpColors(from.ground, to.ground, p);
            if (this.pathMat.color) this.pathMat.color.lerpColors(from.path, to.path, p);

            if (p >= 1.0) this.isTransitioningZone = false;
        }

        if (this.toastTimer > 0) {
            this.toastTimer = Math.max(0, this.toastTimer - dt);
            if (this.toastTimer === 0) this.toastEl.style.opacity = 0;
        }

        this.ui.updateStats(state.score, state.distance, state.coins);

        const cameraLerp = 1 - Math.pow(1 - 0.1, dt);
        this.camera.position.x += (playerPos.x * 0.5 - this.camera.position.x) * cameraLerp;

        this.player.update(this.gameSpeed, t, dt);
        this.spawner.update(t, dt);
        this.particles.update(this.gameSpeed, dt);
    }
}

window.onload = () => new GameManager().init();

