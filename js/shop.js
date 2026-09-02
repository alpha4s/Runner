import { CONFIG } from './config.js';

const SPEED_TIERS = [
    { mult: 1.0, unlock: 0, id: 'btn-speed-1' },
    { mult: 1.5, unlock: 4500, id: 'btn-speed-15' },
    { mult: 2.0, unlock: 9000, id: 'btn-speed-2' }
];

export class ShopManager {
    constructor(audio) {
        this.audio = audio;
        this.mainMenuUI = document.getElementById('main-menu');
        this.shopUI = document.getElementById('shop-ui');
        this.gameUI = document.getElementById('ui-layer');
        this.shopItemsContainer = document.getElementById('shop-items-container');
        this.menuCoinDisplay = document.getElementById('menu-coin-display');
        this.shopCoinDisplay = document.getElementById('shop-coin-display');
        this.btnStart = document.getElementById('btn-start');
        this.btnShop = document.getElementById('btn-shop');
        this.btnShopBack = document.getElementById('btn-shop-back');
        this.btnReset = document.getElementById('btn-reset');
        this.speedBtns = SPEED_TIERS.map(s => ({ ...s, el: document.getElementById(s.id) }));
        this.btnSound = document.getElementById('btn-sound');
        this.menuHighScore = document.getElementById('menu-high-score');
        this.menuMaxDist = document.getElementById('menu-max-dist');
        this.menuMaxCoins = document.getElementById('menu-max-coins');

        this.startSpeedMult = 1.0;
        this.isSoundEnabled = true;
        this.vaultCoins = parseInt(localStorage.getItem('neon_runner_coins')) || 0;
        this.lifetimeStats = { topScore: 0, topDist: 0, topCoins: 0 };
        this.upgrades = {
            magnet_duration: { level: 0, max: 5 },
            shield_duration: { level: 0, max: 5 },
            extra_lives: { level: 0, max: 2 },
            coin_multiplier: { level: 0, max: 5 },
            slow_start: { level: 0, max: 3 }
        };

        this.bindEvents();
        this.load();
        this.render();
    }

    bindEvents() {
        this.btnShop.addEventListener('click', () => {
            this.mainMenuUI.style.display = 'none';
            this.shopUI.style.display = 'flex';
            this.render();
        });

        this.btnShopBack.addEventListener('click', () => {
            this.shopUI.style.display = 'none';
            this.mainMenuUI.style.display = 'flex';
            this.render();
        });

        this.btnReset.addEventListener('click', () => {
            if (confirm("Are you sure you want to permanently delete all progress, coins, stats, and upgrades?")) {
                ['coins', 'upgrades', 'stats', 'speed'].forEach(k => localStorage.removeItem('neon_runner_' + k));
                window.location.reload();
            }
        });

        this.speedBtns.forEach(({ el, mult, unlock }) => {
            el.addEventListener('click', () => {
                if (this.lifetimeStats.topDist >= unlock) {
                    this.startSpeedMult = mult;
                    localStorage.setItem('neon_runner_speed', String(mult));
                    this.render();
                } else {
                    alert(`Reach ${unlock}m Max Distance to unlock ${mult}x Speed!`);
                }
            });
        });

        this.btnSound.addEventListener('click', () => {
            this.isSoundEnabled = !this.isSoundEnabled;
            localStorage.setItem('neon_runner_sound', this.isSoundEnabled);
            this.render();
            this.audio?.init(this.isSoundEnabled);
        });

        this.shopItemsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.shop-buy-btn');
            if (btn) this.purchase(btn.dataset.itemKey);
        });
    }

    load() {
        const getItem = (k) => localStorage.getItem('neon_runner_' + k);
        this.vaultCoins = parseInt(getItem('coins') || 0);
        this.upgrades = JSON.parse(getItem('upgrades') || JSON.stringify(this.upgrades));
        this.lifetimeStats = JSON.parse(getItem('stats') || JSON.stringify(this.lifetimeStats));
        this.startSpeedMult = parseFloat(getItem('speed') || 1.0);
        this.isSoundEnabled = getItem('sound') !== 'false';
    }

    save() {
        const setItem = (k, v) => localStorage.setItem('neon_runner_' + k, v);
        setItem('coins', this.vaultCoins);
        setItem('upgrades', JSON.stringify(this.upgrades));
        setItem('stats', JSON.stringify(this.lifetimeStats));
        this.render();
    }

    addCoins(amount) {
        this.vaultCoins += amount;
        this.save();
    }

    render() {
        const vc = this.vaultCoins.toLocaleString();
        this.menuCoinDisplay.textContent = vc;
        this.shopCoinDisplay.textContent = vc;
        this.menuHighScore.textContent = this.lifetimeStats.topScore.toLocaleString();
        this.menuMaxDist.textContent = `${this.lifetimeStats.topDist | 0}m`;
        this.menuMaxCoins.textContent = this.lifetimeStats.topCoins.toLocaleString();

        this.speedBtns.forEach(({ el, mult, unlock }) => {
            const isUnlocked = this.lifetimeStats.topDist >= unlock;
            el.textContent = isUnlocked ? `${mult.toFixed(1)}X` : `🔒 ${mult.toFixed(1)}X`;
            el.style.background = !isUnlocked ? '#0008' : (this.startSpeedMult === mult ? '#4caf50cc' : '#fff1');
            el.style.color = isUnlocked ? '#fff' : '#777';
        });

        this.btnSound.textContent = `SOUND: ${this.isSoundEnabled ? 'ON' : 'OFF'}`;
        this.btnSound.style.background = this.isSoundEnabled ? "#4caf50cc" : "#fff1";

        this.shopItemsContainer.innerHTML = Object.entries(CONFIG.UPGRADES).map(([key, config]) => {
            const state = this.upgrades[key];
            const cost = Math.floor(config.baseCost * Math.pow(config.scale, state.level));
            const isMaxed = state.level >= state.max;
            const canAfford = this.vaultCoins >= cost;
            const isDisabled = isMaxed || !canAfford;

            return `
                <div class="shop-item">
                    <div class="shop-item-info">
                        <div class="shop-item-title">${config.name}</div>
                        <div class="shop-item-desc">${config.desc}</div>
                        <div class="level-pips">${"◼".repeat(state.level)}${"◻".repeat(state.max - state.level)}</div>
                    </div>
                    <button class="shop-buy-btn" data-item-key="${key}" ${isDisabled ? "disabled" : ""}>
                        ${isMaxed ? "MAX" : `${cost} 💰`}
                    </button>
                </div>`;
        }).join('');
    }

    checkRunStats(score, dist, coins) {
        const stats = this.lifetimeStats;
        const isNewRecord = score > stats.topScore || dist > stats.topDist || coins > stats.topCoins;

        stats.topScore = Math.max(stats.topScore, score);
        stats.topDist = Math.max(stats.topDist, dist);
        stats.topCoins = Math.max(stats.topCoins, coins);

        if (isNewRecord) this.save();
    }

    purchase(key) {
        const state = this.upgrades[key];
        const config = CONFIG.UPGRADES[key];
        const cost = Math.floor(config.baseCost * Math.pow(config.scale, state.level));

        if (this.vaultCoins >= cost && state.level < state.max) {
            this.vaultCoins -= cost;
            state.level++;
            this.save();
        }
    }
}

