export class UIManager {
    constructor(game, progression, inputManager) {
        this.game = game;
        this.progression = progression;
        this.inputManager = inputManager;

        // Screens
        this.screens = {
            login: document.getElementById('login-screen'),
            mainMenu: document.getElementById('main-menu'),
            garage: document.getElementById('garage-screen'),
            hud: document.getElementById('hud-screen'),
            pause: document.getElementById('pause-screen')
        };

        // Inputs & Buttons
        this.usernameInput = document.getElementById('usernameInput');
        
        document.getElementById('loginBtn').addEventListener('click', () => this.onLogin());
        document.getElementById('btnConnectIMU').addEventListener('click', () => this.onConnectIMU());
        document.getElementById('btnStartGame').addEventListener('click', () => this.onStartGame());
        document.getElementById('btnGarage').addEventListener('click', () => this.showScreen('garage'));
        document.getElementById('btnBackToMenu').addEventListener('click', () => this.showScreen('mainMenu'));
        document.getElementById('btnPause').addEventListener('click', () => this.onPause());
        document.getElementById('btnResume').addEventListener('click', () => this.onResume());
        document.getElementById('btnQuit').addEventListener('click', () => this.onQuit());

        // Upgrades
        document.getElementById('upgSpeed').addEventListener('click', () => {
            if(this.progression.upgradeSpeed()) this.updateGarage();
        });
        document.getElementById('upgAccel').addEventListener('click', () => {
            if(this.progression.upgradeAccel()) this.updateGarage();
        });
    }

    showScreen(screenName) {
        for(let key in this.screens) {
            this.screens[key].classList.remove('active');
        }
        if(this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
        if(screenName === 'mainMenu') this.updateMainMenu();
        if(screenName === 'garage') this.updateGarage();
    }

    onLogin() {
        const name = this.usernameInput.value.trim();
        if(name) {
            this.progression.login(name);
            this.showScreen('mainMenu');
        } else {
            alert('Please enter a name!');
        }
    }

    onConnectIMU() {
        const statusEl = document.getElementById('imuStatus');
        statusEl.innerText = "Connecting...";
        this.inputManager.connectIMU((msg) => {
            statusEl.innerText = msg;
            if(this.inputManager.isConnected) {
                statusEl.style.color = '#00ff00';
            }
        });
    }

    onStartGame() {
        this.showScreen('hud');
        this.game.start();
    }

    onPause() {
        this.game.pause();
        this.showScreen('pause');
        document.getElementById('pauseScore').innerText = this.game.score;
    }

    onResume() {
        this.showScreen('hud');
        this.game.resume();
    }

    onQuit() {
        this.game.quit();
        // Give XP/Coins based on run
        this.progression.addCoins(this.game.coinsCollected);
        this.progression.addXP(this.game.score);
        this.showScreen('mainMenu');
    }

    updateMainMenu() {
        document.getElementById('playerNameDisplay').innerText = this.progression.username;
        document.getElementById('playerLevel').innerText = this.progression.data.level;
        document.getElementById('playerXP').innerText = this.progression.data.xp;
        document.getElementById('playerNextXP').innerText = this.progression.getNextLevelXP();
        document.getElementById('playerCoins').innerText = this.progression.data.coins;
    }

    updateGarage() {
        document.getElementById('garageCoins').innerText = this.progression.data.coins;
        document.getElementById('lvlSpeed').innerText = this.progression.data.upgrades.speed;
        document.getElementById('lvlAccel').innerText = this.progression.data.upgrades.accel;
        document.getElementById('upgSpeed').innerText = `Upgrade (${this.progression.getSpeedCost()}c)`;
        document.getElementById('upgAccel').innerText = `Upgrade (${this.progression.getAccelCost()}c)`;
    }

    updateHUD(stats) {
        document.getElementById('hudScore').innerText = stats.score;
        document.getElementById('hudCoins').innerText = stats.coins;
        document.getElementById('speedValue').innerText = Math.floor(stats.speed * 100); 
        
        document.getElementById('hpBar').style.width = stats.hp + "%";
        document.getElementById('fuelBar').style.width = stats.fuel + "%";

        if(stats.combo > 1) {
            document.getElementById('hudCombo').style.display = 'block';
            document.getElementById('comboMultiplier').innerText = stats.combo;
        } else {
            document.getElementById('hudCombo').style.display = 'none';
        }

        // Telemetry
        if(stats.telemetry) {
            document.getElementById('telPitch').innerText = (stats.telemetry.pitch * 45).toFixed(1);
            document.getElementById('telRoll').innerText = (stats.telemetry.roll * 45).toFixed(1);
            document.getElementById('telYaw').innerText = (stats.telemetry.yaw || 0).toFixed(1);
            document.getElementById('telGForce').innerText = (stats.telemetry.gforce || 1.0).toFixed(2);
            document.getElementById('telAirtime').innerText = (stats.telemetry.airTime || 0).toFixed(1);
        }
    }

    showTrickText(text) {
        const el = document.getElementById('trickDisplay');
        el.innerText = text;
        el.style.opacity = 1;
        setTimeout(() => el.style.opacity = 0, 1500);
    }
}
