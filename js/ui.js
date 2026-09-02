export class UIManager {
    constructor() {
        this.pc = document.getElementById('powerup-container');
        this.healthContainer = document.getElementById('health-right');
        this.hearts = [];

        this.pUI = {
            shield: { container: document.getElementById('shield-status'), bar: document.getElementById('shield-bar') },
            magnet: { container: document.getElementById('magnet-status'), bar: document.getElementById('magnet-bar') }
        };
        this.gameOverEl = document.getElementById('game-over');
        this.elScore = document.getElementById('score');
        this.elDist = document.getElementById('distance');
        this.elCoins = document.getElementById('coins');

        this._lastLives = -1;
        this._lastPowerupState = { shield: -1, magnet: -1 };
        this._lastUpdate = 0;
    }

    initHearts(count) {
        const heartHTML = '<div class="heart-icon-container"><svg class="heart-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>';
        this.healthContainer.innerHTML = heartHTML.repeat(count);
        this.hearts = Array.from(this.healthContainer.children);
    }

    updateStats(score, distance, coins, force) {
        if (!force && Date.now() - this._lastUpdate < 100) return;
        this._lastUpdate = Date.now();
        this.elScore.textContent = score;
        this.elDist.textContent = `${distance | 0}m`;
        this.elCoins.textContent = coins;
    }

    updateLives(lives) {
        if (this._lastLives === lives) return;
        this._lastLives = lives;
        this.hearts.forEach((heart, i) => {
            const active = i < lives;
            heart.style.opacity = active ? '1' : '0.15';
            heart.style.filter = active ? 'drop-shadow(0 0 8px #ff3366)' : 'none';
        });
    }

    updatePowerup(type, active, pct) {
        const ui = this.pUI[type];
        if (ui) {
            const roundedPct = pct | 0;
            const stateKey = active ? roundedPct : -1;
            if (this._lastPowerupState[type] !== stateKey) {
                this._lastPowerupState[type] = stateKey;
                ui.container.style.display = active ? 'block' : 'none';
                if (active) ui.bar.style.width = `${roundedPct}%`;
            }
        }
        const anyActive = this.pUI.shield.container.style.display === 'block' || this.pUI.magnet.container.style.display === 'block';
        this.pc.style.display = anyActive ? 'flex' : 'none';
    }

    showGameOver() {
        this.gameOverEl.style.display = 'block';
    }
}

