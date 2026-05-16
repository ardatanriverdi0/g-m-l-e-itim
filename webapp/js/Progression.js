export class Progression {
    constructor() {
        this.username = "Player";
        this.data = {
            level: 1,
            xp: 0,
            coins: 0,
            highScore: 0,
            upgrades: {
                speed: 1,
                accel: 1
            }
        };
    }

    login(username) {
        this.username = username;
        this.load();
    }

    load() {
        const saved = localStorage.getItem('jetskipro_' + this.username);
        if (saved) {
            this.data = JSON.parse(saved);
        }
    }

    save() {
        localStorage.setItem('jetskipro_' + this.username, JSON.stringify(this.data));
    }

    addCoins(amount) {
        this.data.coins += amount;
        this.save();
    }

    addXP(amount) {
        this.data.xp += amount;
        const nextXP = this.getNextLevelXP();
        if (this.data.xp >= nextXP) {
            this.data.xp -= nextXP;
            this.data.level++;
            // Level up reward
            this.data.coins += 500;
        }
        this.save();
    }

    getNextLevelXP() {
        return this.data.level * 1000;
    }

    upgradeSpeed() {
        const cost = this.getSpeedCost();
        if (this.data.coins >= cost && this.data.upgrades.speed < 10) {
            this.data.coins -= cost;
            this.data.upgrades.speed++;
            this.save();
            return true;
        }
        return false;
    }

    upgradeAccel() {
        const cost = this.getAccelCost();
        if (this.data.coins >= cost && this.data.upgrades.accel < 10) {
            this.data.coins -= cost;
            this.data.upgrades.accel++;
            this.save();
            return true;
        }
        return false;
    }

    getSpeedCost() { return this.data.upgrades.speed * 100; }
    getAccelCost() { return this.data.upgrades.accel * 100; }
}
