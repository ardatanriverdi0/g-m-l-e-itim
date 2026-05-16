import { InputManager } from './InputManager.js';
import { Progression } from './Progression.js';
import { UIManager } from './UIManager.js';
import { Game } from './Game.js';

// Initialize core systems
const progression = new Progression();
const inputManager = new InputManager();

// We need to pass a callback to Game so it can tell UI to update
const gameUIController = {
    updateHUD: null,
    showTrick: null
};

// Initialize Game
const game = new Game(progression, inputManager, gameUIController);

// Initialize UI
const uiManager = new UIManager(game, progression, inputManager);

// Bind callbacks
gameUIController.updateHUD = (stats) => uiManager.updateHUD(stats);
gameUIController.showTrick = (text) => uiManager.showTrickText(text);

// Show initial screen (Login)
uiManager.showScreen('login');
