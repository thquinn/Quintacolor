// TODO: Music
// TODO: Final polish!
// 		Improve the vanishes for the new 3D look. A buncha triangles?
//		Better on-screen buttons. Click the level indicator to level up. Use HTML5 hit regions?
//		Better sound effects.
//			Redo the mixing for multiple plays.
//			Current sting specific to combos, align playback rate to chromatic scale ascending.
//			A new effect for large piece destruction.
//		Do another pass on colors.
//		Redo the background incorporating the board perspective?
// TODO: Drawing optimizations
//		Try to rid of the second board canvas which seems necessary because the saturation blend mode is changing the alpha channel.
// TODO: Move logic from mouse events to the main thread
// TODO: Fix connections still breaking while falling side by side.
// TODO: Show an example path if X seconds pass without the player getting points?
// TODO: Fix mouse coordinates on scaled canvas in Firefox.
// TODO: Fix bad mouse events vs page interaction on mobile.
// TODO: Combine SFX into a single wav, use Howler's "audio sprites"
// TODO: Add sound credits, maybe just in source file?
// TODO: Cram util.js up here, load the font here, and wait until it's loaded to show anything.
// TODO: Google Analytics on the page.

// KNOWN BUG: Text alignment is messed up in Firefox. Could maybe be fixed by using different baselines.

// sfx:
//		land: https://freesound.org/people/SuGu14/packs/5082
//		break: https://freesound.org/people/sandyrb/sounds/148072/
//		noise sweep: https://freesound.org/people/stair/sounds/387552/
//		bass sweep: https://freesound.org/people/gellski/sounds/288879/

const StateEnum = {
	TITLE: -2,
	SETUP: -1,
	RUNNING: 0,
	PAUSED: 1,
	GAME_OVER: 2,
};
const KeyBindings = {
	INCREASE_LEVEL: 90,
	MUTE: 77,
	PAUSE: 80,
	QUAKE: 32,
}

// Gameplay constants.
const COLORS = ['#FF7979', '#90D4FF', '#FFEA5E', '#6CFF77', '#BC9BFF'];
const BOARD_WIDTH = 15;
const BOARD_HEIGHT = 12;
const SETUP_ROWS = 6;
const SETUP_NO_CONNECTIONS = true;
const COLUMN_SELECTION_WEIGHT_EXPONENT = 4;
const COLOR_SELECTION_WEIGHT_MIN = 10;
const COLOR_SELECTION_WEIGHT_EXPONENT = 2;
const GRAVITY = .005;
const INITIAL_FALL_VELOCITY = .1;
const LEVEL_RATE = 40 * 60; // 40 seconds
const SPAWN_RATE_INITIAL = .75; // pieces spawned per second
const SPAWN_RATE_INCREMENT = .1;
const SPAWN_RATE_INCREMENT_EXPONENT = .925;
const MULTIPLIER_INCREMENT = .05;
const MULTIPLIER_FORCE_INCREMENT = .12;
const LEVEL_UP_FORCE_COOLDOWN = 1.5 * 60; // 1.5 seconds
const CONNECTION_RATE = .015;
const BOUNTY_POLYOMINOS = false;
const QUAKE_METER = true;
const QUAKE_METER_SIZE_INITIAL = 75;
const QUAKE_METER_SIZE_INCREMENT = 25;
const QUAKE_SPAWN_DELAY = 3 * 60; // 3 seconds
const COMBO_DELAY = 3 * 60; // 3 seconds
const COMBO_POINTS = 200;
// Board appearance constants.
const PIECE_SIZE = 60;
const FRONT_COLORS = ['#FF0000', '#20B0FF', '#F0D000', '#00D010', '#8040FF'];
const SIDE_COLORS = ['#E50000', '#1EA0E5', '#D6BA00', '#00B80F', '#7339E5'];
const BOTTOM_COLORS = ['#CC0000', '#1B8ECC', '#BDA400', '#009E0D', '#6633CC'];
const BASE_COLOR = '#707090';
const BASE_SIDE_COLOR = '#5B5B75';
const BASE_BOTTOM_COLOR = '#48485C';
const STROKE_WIDTH = PIECE_SIZE / 6;
const BOARD_PADDING = PIECE_SIZE;
const CONNECTION_APPEARANCE_RATE = .2;
const SETUP_SPAWN_RATE = 1; // frames per piece
const POST_SETUP_PAUSE = 45;
const SELECTION_OPACITY = .4;
const SELECTION_END_RADIUS = PIECE_SIZE / 6;
const SELECTION_INVALID_COLOR = '#FFD0D0';
const BOARD_GAME_OVER_DESATURATION = .95;
const UI_WIDTH = PIECE_SIZE * 8;
const BOARD_3D = true;
const PERSPECTIVE_MAX_WIDTH = .4;
const PERSPECTIVE_MIN_HEIGHT = 0;
const PERSPECTIVE_MAX_HEIGHT = .33;
// Canvas setup.
const canvas = document.getElementById('canvas');
canvas.width = BOARD_WIDTH * PIECE_SIZE + 2 * BOARD_PADDING + UI_WIDTH;
canvas.height = BOARD_HEIGHT * PIECE_SIZE + BOARD_PADDING;
const boardCanvas = document.createElement('canvas');
boardCanvas.width = BOARD_WIDTH * PIECE_SIZE;
boardCanvas.height = BOARD_HEIGHT * PIECE_SIZE;
const boardDesaturationCanvas = document.createElement('canvas');
boardDesaturationCanvas.width = boardCanvas.width;
boardDesaturationCanvas.height = boardCanvas.height;
// UI constants.
const UI_TITLE_LOGO_SIZE = canvas.width * 2 / 3;
const UI_TITLE_FADE_RATE = .025;
const UI_SCORE_DIGITS = 10;
const UI_SCORE_FONT_SIZE = UI_WIDTH / UI_SCORE_DIGITS * 1.75;
const UI_SCORE_POPUP_DRAIN_PERCENT = .04;
const UI_SCORE_POPUP_DRAIN_MIN = 11;
const UI_BONUS_TIMER = 3 * 60; // 3 seconds
const UI_BONUS_FLASH_FRAMES = 3;
const UI_LEVEL_CIRCLE_RADIUS = PIECE_SIZE * .66;
const UI_POLYOMINO_AREA_SIZE = PIECE_SIZE * 2.5;
const UI_POLYOMINO_BLOCK_FILL = .8;
const UI_GAME_OVER_FADE_TIME = 60;
const UI_QUAKE_METER_WIDTH_PERCENT = .9;
const UI_QUAKE_METER_WIDTH = PIECE_SIZE * BOARD_WIDTH * .91;
const UI_QUAKE_METER_HEIGHT = PIECE_SIZE * .5;
const UI_QUAKE_METER_DEPTH = PIECE_SIZE;
const UI_QUAKE_METER_X = BOARD_PADDING + PIECE_SIZE * BOARD_WIDTH / 2 - UI_QUAKE_METER_WIDTH / 2;
const UI_QUAKE_METER_Y = canvas.height * .9425;
const UI_QUAKE_METER_EMPTY_COLOR = '#8383A8';
const UI_QUAKE_METER_FULL_COLOR = '#FAFAFF';
const UI_QUAKE_METER_ATTRACT_Y = UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT / 2;
// Text constants.
const TEXT_INSTRUCTIONS = ["There are five colors of blocks.",
						   "Draw a line through one block of each color.",
						   "The line can't be more than five blocks long.",
						   "Survive as long as you can!",
						   "",
						   "Click to begin."];
const TEXT_KEYS = ["Space: quake",
				   "Z: increase level",
				   "P: pause",
				   "M: toggle mute"];
const TEXT_CREDITS = ["Quintacolor v 0.9.5",
			     "a game by Tom Quinn (thquinn.github.io)",
			     "fonts Gilgongo and Source Sans Pro by Apostrophic Labs and Paul D. Hunt, respectively",
			     "thanks to Arthee, Chet, Jay, Jonny, Maggie, San, and Tanoy",
			     "best played in Chrome"];
// Background appearance.
const BACKGROUND_COLOR = "#C3DCF0";
const BACKGROUND_TILT = Math.PI * .05;
const BACKGROUND_SQUIGGLE_COLOR = "rgba(0, 0, 255, .02)";
const BACKGROUND_SQUIGGLE_SIZE = PIECE_SIZE * 5;
// Effects appearance.
const EFFECTS_VANISH_INIT_VELOCITY = PIECE_SIZE / 1000;
const EFFECTS_VANISH_INIT_VELOCITY_VARIANCE = EFFECTS_VANISH_INIT_VELOCITY / 5;
const EFFECTS_VANISH_HORIZONTAL_VELOCITY_RANGE = PIECE_SIZE / 1500;
const EFFECTS_VANISH_ROTATIONAL_VELOCITY_RANGE = Math.PI * .000015;
const EFFECTS_VANISH_FADE_SPEED = .02;
const EFFECTS_SPARKLE_COUNT = 4;
const EFFECTS_SPARKLE_RADIUS = PIECE_SIZE / 16;
const EFFECTS_SPARKLE_INIT_VELOCITY = PIECE_SIZE / 60;
const EFFECTS_SPARKLE_INIT_VELOCITY_VARIANCE = PIECE_SIZE / 60;
const EFFECTS_SPARKLE_LIFT = PIECE_SIZE / 800;
const EFFECTS_SPARKLE_HORIZONTAL_VELOCITY_RANGE = PIECE_SIZE / 35;
const EFFECTS_SPARKLE_HORIZONTAL_DRAG = .99;
const EFFECTS_SPARKLE_FADE_SPEED = .01;
const EFFECTS_SPARKLE_ATTRACTION_FADE_RADIUS = PIECE_SIZE * 4;
const EFFECTS_QUAKE_STRENGTH = PIECE_SIZE / 10;
const EFFECTS_QUAKE_FADE_SPEED = .01;
const EFFECTS_QUAKE_LIGHT_FADE_SPEED = .01;
// Sound constants.
const SFX_STING_MAX_VOL_PIECES = 12;
const SFX_STING_RATE_FACTOR = .05;
const SFX_SCORE_REPETITION = 3;
// 2D HTML5 context setup.
const ctx = canvas.getContext('2d');
ctx.lineCap = "square";
const boardCtx = boardCanvas.getContext('2d');
const boardDesaturationCtx = boardDesaturationCanvas.getContext('2d');
// Asset setup.
const ASSET_IMAGE_LOGO = document.createElement("img");
ASSET_IMAGE_LOGO.src = "quintacolor_assets/logo.png";
const ASSET_SFX_LAND = new Howl({
  src: ['quintacolor_assets/land.wav']
});
const ASSET_SFX_BREAK = new Howl({
  src: ['quintacolor_assets/break.wav']
});
const ASSET_SFX_STING = new Howl({
  src: ['quintacolor_assets/sting.wav']
});
const ASSET_SFX_SCORE = new Howl({
  src: ['quintacolor_assets/score.wav']
});
const ASSET_SFX_QUAKE = new Howl({
  src: ['quintacolor_assets/quake.wav']
});

// Initialize all game variables.
let clock, state, titleFade, board, keysPressed, keysDown, levelTimer, levelUpForceCooldown, spawnTimer, selected, level, score, scoreAppearance, scorePopup, combo, comboDelay, bonusText, bonusTimer, multiplier, spawnBlocked, gameOverClock, moused, mouseDown, polyomino, polyominoBounty, polyominosScored, showPolyominoTooltip, quakeMeter, quakeMeterAppearance, quakeSpawnDelay, quakeScreenShake, quakeLightEffect, sfxMap;
function start() {
	clock = 0;
	state = StateEnum.TITLE;
	titleFade = 1.0;
	board = new Array(BOARD_WIDTH);
	for (let i = 0; i < BOARD_WIDTH; i++) {
		board[i] = new Array(BOARD_HEIGHT);
	}
	keysPressed = new Set();
	keysDown = new Set();
	levelTimer = LEVEL_RATE;
	levelUpForceCooldown = 0;
	spawnTimer = 0;
	selected = [];
	level = 1;
	score = 0;
	scoreAppearance = 0;
	scorePopup = 0;
	combo = 0;
	comboDelay = 0;
	bonusText = '';
	bonusTimer = 0;
	multiplier = 1;
	spawnBlocked = false;
	gameOverClock = 0;
	moused = [];
	mouseDown = false;
	polyomino = null;
	nextPolyomino();
	showPolyominoTooltip = false;
	quakeMeterSize = QUAKE_METER_SIZE_INITIAL;
	quakeMeter = 0;
	quakeMeterAppearance = 0;
	quakeSpawnDelay = 0;
	quakeScreenShake = 0;
	quakeLightEffect = 0;
	sfxMap = new Map();
}

class Piece {
	constructor(col, forceNoConnections = false) {
		if (spawnBlocked) {
			return;
		}
		// Select column.
		if (col == null) {
			let xWeights = new Array(BOARD_WIDTH).fill(0);
			for (let x = 0; x < BOARD_WIDTH; x++) {
				for (; xWeights[x] < BOARD_HEIGHT; xWeights[x]++) {
					if (board[x][xWeights[x]] != null) {
						break;
					}
				}
				xWeights[x] = Math.pow(xWeights[x], COLUMN_SELECTION_WEIGHT_EXPONENT);
			}
			this.x = Math.pickFromWeightArray(xWeights);
		} else {
			this.x = col;
		}
		this.y = 0;
		while (this.y < BOARD_HEIGHT - 1 && board[this.x][this.y + 1] == null) {
			this.y++;
		}
		// Select color.
		let colorWeights = new Array(COLORS.length).fill(COLOR_SELECTION_WEIGHT_MIN);
		for (let x = 0; x < BOARD_WIDTH; x++) {
			for (let y = 0; y < BOARD_WIDTH; y++) {
				if (board[x][y] != null) {
					colorWeights[board[x][y].color]++;
				}
			}
		}
		for (let i = 0; i < colorWeights.length; i++) {
			colorWeights[i] = 1 / Math.pow(colorWeights[i], COLOR_SELECTION_WEIGHT_EXPONENT);
		}
		this.color = Math.pickFromWeightArray(colorWeights);
		if (COLORS.length >= 4 && forceNoConnections) {
			let neighborColors = new Set();
			if (this.x > 0 && board[this.x - 1][this.y] != null) {
				neighborColors.add(board[this.x - 1][this.y].color);
			}
			if (this.x < BOARD_WIDTH - 1 && board[this.x + 1][this.y] != null) {
				neighborColors.add(board[this.x + 1][this.y].color);
			}
			if (this.y < BOARD_HEIGHT - 1 && board[this.x][this.y + 1] != null) {
				neighborColors.add(board[this.x][this.y + 1].color);
			}
			while (neighborColors.has(this.color)) {
				this.color = Math.pickFromWeightArray(colorWeights);
			}
		}
		// Initialize.
		board[this.x][this.y] = this;
		this.dy = INITIAL_FALL_VELOCITY;
		this.fallDistance = this.y + 1 + BOARD_PADDING / PIECE_SIZE;
		this.connection = [0, 0, 0, 0];
		this.connectionAppearance = [0, 0, 0, 0];
		this.root = this;
		this.children = new Set([this]);
	}

	update(setup) {
		if (this.fallDistance > 0) {
			this.dy += GRAVITY;
			let distanceToLowerNeighbor = Number.MAX_SAFE_INTEGER;
			if (this.y < BOARD_HEIGHT - 1 && board[this.x][this.y + 1] != null && board[this.x][this.y + 1].fallDistance > 0) {
				let neighborTop = (board[this.x][this.y + 1].y - board[this.x][this.y + 1].fallDistance);
				distanceToLowerNeighbor = neighborTop - (this.y - this.fallDistance + 1);
			}
			let fall = Math.min(this.dy, this.fallDistance, distanceToLowerNeighbor);
			this.fallDistance -= fall;
			if (this.fallDistance == 0) {
				let vol = this.dy * .75;
				this.dy = 0;
				playSFX(ASSET_SFX_LAND, state == StateEnum.SETUP ? .066 : vol);
			}
		} else {
			this.dy = 0;
		}
		if (setup) {
			return;
		}

		// Update connections and connection appearances.
		for (let i = 0; i < this.connection.length; i++) {
			if (this.connection[i] < 1) {
				let nx = this.x + NEIGHBORS[i][0];
				let ny = this.y + NEIGHBORS[i][1];
				if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT || board[nx][ny] == null || board[nx][ny].color != this.color) {
					this.connection[i] = 0;
				} else if (this.fallDistance > 0 || board[nx][ny].fallDistance > 0) {
					let iReverse = (i / 2) * 2 + ((i + 1) % 2);
					this.connection[i] = Math.min(this.connection[i], board[nx][ny].connection[iReverse]);
				} else {
					this.connection[i] = Math.min(this.connection[i] + CONNECTION_RATE, 1);
					if (this.connection[i] == 1) {
						// Connect!
						let neighbor = board[nx][ny];
						if (!neighbor.root.children.has(this)) {
							for (let child of neighbor.root.children) {
								this.root.children.add(child);
							}
							for (let child of this.root.children) {
								child.root = this.root;
							}
						}
					}
				}
			}
			if (this.connection[i] == 1 || Math.abs(this.connection[i] - this.connectionAppearance[i]) < .001) {
				this.connectionAppearance[i] = this.connection[i];
			} else {
				this.connectionAppearance[i] = this.connectionAppearance[i] * (1 - CONNECTION_APPEARANCE_RATE) + this.connection[i] * CONNECTION_APPEARANCE_RATE;
			}
		}
	}
	draw() {
		let trueY = this.y - this.fallDistance;
		if (BOARD_3D) {
			let thisPerspective = perspective(this.x, trueY);
			let abovePerspective = perspective(this.x, trueY - 1);
			let outer = 0;
			if (this.x < (BOARD_WIDTH - 1) / 2) {
				outer = -1;
			} else if (this.x > (BOARD_WIDTH - 1) / 2) {
				outer = 1;
			}
			let outerPerspective = perspective(this.x + outer, trueY);
			let sideOffset = thisPerspective[0] > 0 ? 1 : 0;
			// Draw bottom face.
			let bottomObscured = (this.y == BOARD_HEIGHT && this.fallDistance == 0) ||
								 (this.y < BOARD_HEIGHT - 1 && board[this.x][this.y + 1] != null && board[this.x][this.y + 1].fallDistance == this.fallDistance);
			if (!bottomObscured && thisPerspective[1] != 0) {
				let rightXPerspective, leftXPerspective;
				if (outer == 0) {
					rightXPerspective = perspective(this.x + 1, trueY)[0];
					leftXPerspective = perspective(this.x - 1, trueY)[0];
				} else {
					rightXPerspective = outer < 0 ? thisPerspective[0] : outerPerspective[0];
					leftXPerspective = outer < 0 ? outerPerspective[0] : thisPerspective[0];
				}
				boardCtx.fillStyle = BOTTOM_COLORS[this.color];
				boardCtx.beginPath();
				boardCtx.moveTo(this.x * PIECE_SIZE, (trueY + 1) * PIECE_SIZE);
				boardCtx.lineTo((this.x + 1) * PIECE_SIZE, (trueY + 1) * PIECE_SIZE);
				boardCtx.lineTo((this.x + 1 + rightXPerspective) * PIECE_SIZE, (trueY + 1 + thisPerspective[1]) * PIECE_SIZE);
				boardCtx.lineTo((this.x + leftXPerspective) * PIECE_SIZE, (trueY + 1 + thisPerspective[1]) * PIECE_SIZE);
				boardCtx.closePath();
				boardCtx.fill();
			}
			// Draw side face.
			let sideObscured = board[this.x - outer][this.y] != null && board[this.x - outer][this.y].fallDistance == 0 && this.fallDistance == 0;
			if (!sideObscured && thisPerspective[0] != 0) {
				let extra = PIECE_SIZE * .0066;
				boardCtx.fillStyle = SIDE_COLORS[this.color];
				boardCtx.beginPath();
				boardCtx.moveTo((this.x + sideOffset) * PIECE_SIZE, trueY * PIECE_SIZE - extra);
				boardCtx.lineTo((this.x + sideOffset + thisPerspective[0]) * PIECE_SIZE, (trueY + abovePerspective[1]) * PIECE_SIZE - extra);
				boardCtx.lineTo((this.x + sideOffset + thisPerspective[0]) * PIECE_SIZE, (trueY + 1 + thisPerspective[1]) * PIECE_SIZE + extra);
				boardCtx.lineTo((this.x + sideOffset) * PIECE_SIZE, (trueY + 1) * PIECE_SIZE + extra);
				boardCtx.closePath();
				boardCtx.fill();
			}
		}
		// Draw front face.
		boardCtx.fillStyle = FRONT_COLORS[this.color];
		boardCtx.fillRect(this.x * PIECE_SIZE, trueY * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE);
		// Determine which fills are necessary.
		let horizFill = this.connection[0] > 0 || this.connection[1] > 0;
		let vertFill = this.connection[2] > 0 || this.connection[3] > 0;
		if (!horizFill && !vertFill) {
			horizFill = true;
		}
		// Horizontal fill.
		if (horizFill) {
			boardCtx.fillStyle = COLORS[this.color];
			boardCtx.fillRect(this.x * PIECE_SIZE + STROKE_WIDTH * (1 - this.connectionAppearance[0]), trueY * PIECE_SIZE + STROKE_WIDTH, PIECE_SIZE - (2 - this.connectionAppearance[0] - this.connectionAppearance[1]) * STROKE_WIDTH, PIECE_SIZE - 2 * STROKE_WIDTH);
		}
		// Vertical fill.
		if (vertFill) {
			boardCtx.fillStyle = COLORS[this.color];
			boardCtx.fillRect(this.x * PIECE_SIZE + STROKE_WIDTH, trueY * PIECE_SIZE + STROKE_WIDTH * (1 - this.connectionAppearance[2]), PIECE_SIZE - 2 * STROKE_WIDTH, PIECE_SIZE - (2 - this.connectionAppearance[2] - this.connectionAppearance[3])  * STROKE_WIDTH);
		}
		// Selection overlay.
		for (let s of selected) {
			if (board[s[0]][s[1]].root == this.root) {
				boardCtx.fillStyle = "rgba(255, 255, 255, " + SELECTION_OPACITY + ")";
				boardCtx.fillRect(this.x * PIECE_SIZE, (this.y - this.fallDistance) * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE);
				break;
			}
		}
	}
	destroy() {
		if (BOUNTY_POLYOMINOS && polyomino.isThis(this.root)) {
			nextPolyomino();
		}
		let quakeMeterFill = 0;
		if (QUAKE_METER && quakeMeter < quakeMeterSize && this.root.children.size > 1) {
			quakeMeterFill = this.root.children.size - 1;
			quakeMeter = Math.min(quakeMeter + quakeMeterFill, quakeMeterSize);
		}
		for (let child of this.root.children) {
			board[child.x][child.y] = null;
			var sparkles = !QUAKE_METER || this.root.children.size > 1;
			effects.vanish(child.x, child.y, sparkles, quakeMeterFill / this.root.children.size);
		}
	}
}

class Background {
	constructor() {
		this.squiggles = [];
		for (let i = 0; i < 15; i++) {
			this.squiggles.push(new Squiggle());
		}
	}
	update() {
		for (let squiggle of this.squiggles) {
			squiggle.update();
		}
	}
	draw() {
		ctx.fillStyle = BACKGROUND_COLOR;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(BACKGROUND_TILT);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
		ctx.fillStyle = BACKGROUND_SQUIGGLE_COLOR;
		for (let squiggle of this.squiggles) {
			squiggle.draw();
		}
		ctx.restore();
		if (quakeLightEffect > 0) {
			var alpha = quakeLightEffect * .25;
			ctx.fillStyle = "rgba(0, 0, 0, " + alpha + ")";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
	}
}
class Squiggle {
	constructor() {
		this.coor = [Math.random() * canvas.width, Math.random() * canvas.height];
		this.horiz = Math.random() < .5;
		this.newTarget();
		this.frames = 0;
	}
	newTarget() {
		this.target = this.coor.slice();
		let delta;
		if (this.horiz) {
			this.target[0] = canvas.width * -.5 + 1.5 * Math.random() * canvas.width;
			delta = this.target[0] - this.coor[0];
		} else {
			this.target[1] = canvas.height * -.5 + 1.5 * Math.random() * canvas.height;
			delta = this.target[1] - this.coor[1];
		}
		this.waitFrames = Math.randInt(10, 25);
		this.moveFrames = Math.round(Math.randFloat(.33, .5) * Math.abs(delta));
	}
	update() {
		this.frames++;
		if (this.frames == this.waitFrames + this.moveFrames) {
			this.coor = this.target;
			this.horiz = !this.horiz;
			this.newTarget();
			this.frames = 0;
		}
	}
	draw() {
		let interpVal = this.frames < this.waitFrames ? 0 : (this.frames - this.waitFrames) / (this.moveFrames);
		let leftRight, topBottom;
		if (this.coor[0] != this.target[0]) {
			leftRight = this.getDrawCoors(this.coor[0], this.target[0], interpVal);
			topBottom = [this.coor[1], this.coor[1] + BACKGROUND_SQUIGGLE_SIZE];
		} else {
			leftRight = [this.coor[0], this.coor[0] + BACKGROUND_SQUIGGLE_SIZE];
			topBottom = this.getDrawCoors(this.coor[1], this.target[1], interpVal);
		}
		ctx.fillRect(leftRight[0], topBottom[0], leftRight[1] - leftRight[0], topBottom[1] - topBottom[0]);
	}
	getDrawCoors(val, target, interpVal) {
		let coors = [interpVal <= .5 ? val : Math.easeInOutQuad(interpVal - .5, val, (target - val), .5),
					 interpVal <= .5 ? Math.easeInOutQuad(interpVal, val, (target - val), .5) : target];
		coors.sort(function(a, b){return a - b});
		coors[1] += BACKGROUND_SQUIGGLE_SIZE;
		return coors;
	}
}
let background = new Background();

class Effects {
	constructor() {
		this.vanishes = [];
		this.sparkles = [];
	}
	vanish(x, y, sparkles, quakeMeterFill) {
		this.vanishes.push(new Vanish(x, y));
		if (sparkles) {
			for (let i = 0; i < EFFECTS_SPARKLE_COUNT; i++) {
				let sx = BOARD_PADDING + x * PIECE_SIZE + Math.random() * PIECE_SIZE;
				let sy = y * PIECE_SIZE + Math.random() * PIECE_SIZE;
				this.sparkles.push(new Sparkle(sx, sy, quakeMeterFill / EFFECTS_SPARKLE_COUNT));
			}
		}
	}
	update() {
		for (let i = this.vanishes.length - 1; i >= 0; i--) {
			this.vanishes[i].update();
			if (this.vanishes[i].alpha == 0) {
				this.vanishes.splice(i, 1);
			}
		}
		for (let i = this.sparkles.length - 1; i >= 0; i--) {
			this.sparkles[i].update();
			if (this.sparkles[i].alpha == 0) {
				quakeMeterAppearance = Math.min(quakeMeterSize, quakeMeterAppearance + this.sparkles[i].quakeMeterFill);
				this.sparkles.splice(i, 1);
			}
		}
	}
	draw() {
		for (let vanish of this.vanishes) {
			vanish.draw();
		}
		for (let sparkle of this.sparkles) {
			sparkle.draw();
		}
	}
}
class Vanish {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.dx = Math.randFloat(-EFFECTS_VANISH_HORIZONTAL_VELOCITY_RANGE, EFFECTS_VANISH_HORIZONTAL_VELOCITY_RANGE);
		this.dy = -EFFECTS_VANISH_INIT_VELOCITY + Math.randFloat(-EFFECTS_VANISH_INIT_VELOCITY_VARIANCE, EFFECTS_VANISH_INIT_VELOCITY_VARIANCE);
		this.theta = 0;
		this.dTheta = Math.randFloat(-EFFECTS_VANISH_ROTATIONAL_VELOCITY_RANGE, EFFECTS_VANISH_ROTATIONAL_VELOCITY_RANGE);
		this.alpha = 1 + EFFECTS_VANISH_FADE_SPEED;
	}
	update() {
		this.dy += GRAVITY * PIECE_SIZE / 50;
		this.x += this.dx;
		this.y += this.dy;
		this.theta += this.dTheta;
		this.alpha = Math.max(0, this.alpha - EFFECTS_VANISH_FADE_SPEED);
	}
	draw() {
		let px = BOARD_PADDING + this.x * PIECE_SIZE;
		let py = this.y * PIECE_SIZE;
		ctx.save();
		ctx.translate(px + PIECE_SIZE / 2, py + PIECE_SIZE / 2);
		ctx.rotate(this.theta * 1000);
		ctx.translate(-px - PIECE_SIZE / 2, -py - PIECE_SIZE / 2);
		ctx.fillStyle = "rgba(255, 255, 255, " + this.alpha + ")";
		ctx.fillRect(px, py, PIECE_SIZE, PIECE_SIZE);
		ctx.restore();
	}
}
class Sparkle {
	constructor(x, y, quakeMeterFill) {
		this.x = x;
		this.y = y;
		this.quakeMeterFill = quakeMeterFill;
		this.dx = Math.randFloat(-EFFECTS_SPARKLE_HORIZONTAL_VELOCITY_RANGE, EFFECTS_SPARKLE_HORIZONTAL_VELOCITY_RANGE);
		this.dy = -EFFECTS_SPARKLE_INIT_VELOCITY;
		this.dy += Math.randFloat(-EFFECTS_SPARKLE_INIT_VELOCITY_VARIANCE, EFFECTS_SPARKLE_INIT_VELOCITY_VARIANCE)
		this.alpha = 1 + EFFECTS_SPARKLE_FADE_SPEED;
	}
	update() {
		this.x += this.dx;
		this.y += this.dy;
		this.dx *= EFFECTS_SPARKLE_HORIZONTAL_DRAG;
		this.alpha = Math.max(0, this.alpha - EFFECTS_SPARKLE_FADE_SPEED);
		if (QUAKE_METER && this.quakeMeterFill > 0) {
			let attractX = UI_QUAKE_METER_X + (quakeMeterAppearance / quakeMeterSize) * UI_QUAKE_METER_WIDTH;
			let attract = Math.pow(1 - this.alpha, 4);
			this.x = attractX * attract + this.x * (1 - attract);
			this.y = UI_QUAKE_METER_ATTRACT_Y * attract * 2 + this.y * (1 - attract * 2);
			let hypot = Math.hypot(this.x - attractX, this.y - UI_QUAKE_METER_ATTRACT_Y);
			let closeAlpha = hypot < EFFECTS_SPARKLE_ATTRACTION_FADE_RADIUS ? (hypot / EFFECTS_SPARKLE_ATTRACTION_FADE_RADIUS) : 1;
			this.alpha = Math.min(this.alpha, closeAlpha);
		} else {
			this.dy -= EFFECTS_SPARKLE_LIFT;
		}
	}
	draw() {
		ctx.beginPath();
		ctx.arc(this.x, this.y, EFFECTS_SPARKLE_RADIUS, 0, 2 * Math.PI, false);
		ctx.fillStyle = "rgba(255, 255, 255, " + this.alpha + ")";
		ctx.fill();
	}
}
let effects = new Effects();

function loop() {
	window.requestAnimationFrame(loop);
	background.update();
	background.draw();

	// Setup.
	if (state == StateEnum.SETUP) {
		if (clock % SETUP_SPAWN_RATE == 0) {
			let pieceNum = clock / SETUP_SPAWN_RATE;
			if (pieceNum < SETUP_ROWS * BOARD_WIDTH) {
				let x = pieceNum % BOARD_WIDTH;
				new Piece(x, SETUP_NO_CONNECTIONS);
			}
		}
		if (clock == SETUP_ROWS * BOARD_WIDTH * SETUP_SPAWN_RATE + POST_SETUP_PAUSE) {
			state = StateEnum.RUNNING;
		}
	}

	// Pause check.
	if (keysPressed.has(KeyBindings.PAUSE) && (state == StateEnum.RUNNING || state == StateEnum.PAUSED)) {
		state = state == StateEnum.RUNNING ? StateEnum.PAUSED : StateEnum.RUNNING;
	}
	if (state == StateEnum.PAUSED) {
		ctx.textAlign= 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold " + (UI_SCORE_FONT_SIZE * 2) + "px Source Sans Pro";
		ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
		keysPressed.clear();
		return;
	}

	// Mute check.
	if (keysPressed.has(KeyBindings.MUTE)) {
		localStorage.mute = localStorage.mute == 'true' ? 'false' : 'true';
	}

	// Game over check.
	if (state == StateEnum.RUNNING) {
		spawnBlocked = true;
		let gameOver = true;
		for (let x = 0; x < BOARD_WIDTH; x++) {
			if (board[x][0] == null) {
				spawnBlocked = false;
			}
			if (board[x][0] == null || board[x][0].fallDistance > 0) {
				gameOver = false;
			}
		}
		if (gameOver) {
			selected = [];
			state = StateEnum.GAME_OVER;
			if (localStorage.highScore == null || localStorage.highScore < score) {
				localStorage.highScore = score;
			}
		}
	}

	// Quake?
	if (quakeMeter < quakeMeterAppearance) {
		quakeMeterAppearance = quakeMeter * .25 + quakeMeterAppearance * .75;
	}
	if (state == StateEnum.RUNNING && QUAKE_METER && keysPressed.has(KeyBindings.QUAKE) && quakeMeter >= quakeMeterSize) {
		quake();
		quakeMeter = 0;
		quakeMeterSize += QUAKE_METER_SIZE_INCREMENT;
	}
	// Update pieces.	
	if (state == StateEnum.SETUP || state == StateEnum.RUNNING) {
		for (let x = 0; x < BOARD_WIDTH; x++) {
			for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
				if (board[x][y] == null) {
					continue;
				}
				board[x][y].update(state == StateEnum.SETUP);
			}
		}
	}
	// Update everything else.
	bonusTimer = Math.max(0, bonusTimer - 1);
	comboDelay = Math.max(0, comboDelay - 1);
	if (comboDelay == 0) {
		combo = 0;
		if (scorePopup > 0) {
			let drainAmount = Math.max(Math.round(scorePopup * UI_SCORE_POPUP_DRAIN_PERCENT), UI_SCORE_POPUP_DRAIN_MIN);
			drainAmount = Math.min(scorePopup, drainAmount);
			scorePopup -= drainAmount;
			scoreAppearance += drainAmount;
			if (clock % SFX_SCORE_REPETITION == 0) {
				playSFX(ASSET_SFX_SCORE, .05);
			}
		}
	}
	if (state == StateEnum.RUNNING) {
		// Level up.
		if (levelUpForceCooldown > 0) {
			levelUpForceCooldown--;
		}
		levelTimer--;
		if (levelTimer == 0) {
			level++;
			multiplier += MULTIPLIER_INCREMENT;
			levelTimer = LEVEL_RATE;
		} else if (keysPressed.has(KeyBindings.INCREASE_LEVEL) && levelUpForceCooldown == 0) {
			level++;
			let add = Math.precisionRound(Math.lerp(MULTIPLIER_INCREMENT, MULTIPLIER_FORCE_INCREMENT, levelTimer / LEVEL_RATE), 2);
			multiplier = Math.precisionRound(multiplier + add, 2);
			levelUpForceCooldown = LEVEL_UP_FORCE_COOLDOWN;
			levelTimer = LEVEL_RATE;
		}
		// Spawn pieces.
		if (spawnTimer <= 0) {
			if (!spawnBlocked) {
				new Piece();
				let rate = SPAWN_RATE_INITIAL + Math.pow((level - 1) * SPAWN_RATE_INCREMENT, SPAWN_RATE_INCREMENT_EXPONENT);
				spawnTimer += 60 / rate;
			}
		} else if (quakeSpawnDelay > 0) {
			quakeSpawnDelay--;
		} else {
			spawnTimer--;
		}
	}
	
	// Draw pieces.
	boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
	for (let x = 0; x < BOARD_WIDTH; x++) {
		let pingpongX = x % 2 == 0 ? x / 2 : BOARD_WIDTH - (x + 1) / 2;
		for (let y = 0; y < BOARD_HEIGHT; y++) {
			if (board[pingpongX][y] == null) {
				continue;
			}
			board[pingpongX][y].draw();
		}
	}
	// Draw board.
	if (state == StateEnum.GAME_OVER) {
		// Create board mask.
		boardDesaturationCtx.clearRect(0, 0, boardDesaturationCanvas.width, boardDesaturationCanvas.height);
		boardDesaturationCtx.drawImage(boardCanvas, 0, 0);
		// Desaturate.
		let alpha = Math.min(gameOverClock / UI_GAME_OVER_FADE_TIME, 1) * BOARD_GAME_OVER_DESATURATION;
		boardCtx.fillStyle = "rgba(0, 0, 0, " + alpha + ")";
		boardCtx.globalCompositeOperation = 'saturation';
		boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
		// Apply board mask.
		boardCtx.globalCompositeOperation = 'destination-in';
		boardCtx.drawImage(boardDesaturationCanvas, 0, 0);
		boardCtx.globalCompositeOperation = 'source-over';
	}
	let screenShakeX = Math.randFloat(-1, 1) * EFFECTS_QUAKE_STRENGTH * quakeScreenShake;
	let screenShakeY = Math.randFloat(-1, 1) * EFFECTS_QUAKE_STRENGTH * quakeScreenShake;
	quakeScreenShake = Math.max(0, quakeScreenShake - EFFECTS_QUAKE_FADE_SPEED);
	ctx.drawImage(boardCanvas, BOARD_PADDING + screenShakeX, screenShakeY);
	// Draw base.
	let baseY = BOARD_HEIGHT * PIECE_SIZE;
	ctx.fillStyle = BASE_COLOR;
	ctx.fillRect(BOARD_PADDING + screenShakeX, baseY + screenShakeY, BOARD_WIDTH * PIECE_SIZE, canvas.height - baseY + EFFECTS_QUAKE_STRENGTH);
	// Draw selection path.
	if (selected.length > 1) {
		let pathColor = "#FFFFFF";
		let selectedColors = new Set();
		for (let i = 0; i < selected.length; i++) {
			let color = board[selected[i][0]][selected[i][1]].color;
			if (selectedColors.has(color)) {
				pathColor = SELECTION_INVALID_COLOR;
				break;
			}
			selectedColors.add(color);
		}
		ctx.strokeStyle = pathColor;
		ctx.lineWidth = STROKE_WIDTH;
		ctx.beginPath();
		let x, y;
		for (let i = 0; i < selected.length; i++) {
			x = BOARD_PADDING + (selected[i][0] + .5) * PIECE_SIZE;
			y = (selected[i][1] + .5) * PIECE_SIZE;
			i == 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		}
		ctx.stroke();
		if (selected.length == COLORS.length) {
			ctx.fillStyle = pathColor;
			ctx.beginPath();
			ctx.arc(x, y, SELECTION_END_RADIUS, 0, 2 * Math.PI, false);
			ctx.fill();
		}
	}
	// Draw UI.
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = "#FFFFFF";
	ctx.font = "bold " + UI_SCORE_FONT_SIZE + "px Source Sans Pro";
	ctx.fillText(scoreAppearance, canvas.width - BOARD_PADDING, canvas.height / 2);
	let leadingZeroes = Math.max(0, UI_SCORE_DIGITS - scoreAppearance.toString().length);
	let scoreWidth = ctx.measureText(scoreAppearance).width;
	ctx.font = "200 " + UI_SCORE_FONT_SIZE + "px Source Sans Pro";
	ctx.fillText('0'.repeat(leadingZeroes), canvas.width - BOARD_PADDING - scoreWidth, canvas.height / 2);
	if (scorePopup > 0) {
		ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 2) + "px Source Sans Pro";
		ctx.fillText("+" + scorePopup, canvas.width - BOARD_PADDING, canvas.height * .5625);
	}
	if (bonusTimer > 0) {
		ctx.fillStyle = (clock % (UI_BONUS_FLASH_FRAMES * 2)) < UI_BONUS_FLASH_FRAMES ? "#FFFFFF": "#E9E9F9";
		ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 3) + "px Source Sans Pro";
		ctx.fillText(bonusText, canvas.width - BOARD_PADDING, canvas.height * .6);	
	}
	let levelPercent = levelTimer / LEVEL_RATE;
	let levelX = canvas.width - BOARD_PADDING - UI_LEVEL_CIRCLE_RADIUS, levelY = canvas.height * .4125;
	ctx.beginPath();
	ctx.arc(levelX, levelY, UI_LEVEL_CIRCLE_RADIUS, Math.PI * 1.5, Math.PI * (1.5 - 2 * levelPercent), true);
	ctx.lineTo(levelX, levelY);
	ctx.fillStyle = "rgba(255, 255, 255, .5)";
	ctx.fill();
	ctx.textAlign = 'center';
	ctx.fillStyle = "#9090F0";
	ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 5) + "px Source Sans Pro";
	ctx.fillText("Level", levelX, levelY - UI_LEVEL_CIRCLE_RADIUS * .4);
	ctx.fillText("Multiplier", levelX - UI_LEVEL_CIRCLE_RADIUS * 3, levelY - UI_LEVEL_CIRCLE_RADIUS * .4);
	ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 2) + "px Source Sans Pro";
	ctx.fillText(level, levelX, levelY + UI_LEVEL_CIRCLE_RADIUS * .175);
	ctx.fillText(Math.round(multiplier * 100) + '%', levelX - UI_LEVEL_CIRCLE_RADIUS * 3, levelY + UI_LEVEL_CIRCLE_RADIUS * .175);
	if (BOUNTY_POLYOMINOS) {
		drawPolyominoUI();
	}
	if (QUAKE_METER) {
		ctx.fillStyle = UI_QUAKE_METER_EMPTY_COLOR;
		ctx.fillRect(screenShakeX + UI_QUAKE_METER_X, screenShakeY + UI_QUAKE_METER_Y, UI_QUAKE_METER_WIDTH, UI_QUAKE_METER_HEIGHT);
		let p = perspective(BOARD_WIDTH * (1 - UI_QUAKE_METER_WIDTH_PERCENT) / 2, (UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT) / PIECE_SIZE);
		p[1] = Math.abs(p[1]);
		ctx.fillStyle = BASE_SIDE_COLOR;
		ctx.beginPath();
		ctx.moveTo(screenShakeX + UI_QUAKE_METER_X, screenShakeY + UI_QUAKE_METER_Y);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X - UI_QUAKE_METER_DEPTH * p[0], screenShakeY + UI_QUAKE_METER_Y);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X - UI_QUAKE_METER_DEPTH * p[0], screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT + UI_QUAKE_METER_DEPTH * p[1]);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X, screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(screenShakeX + UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH, screenShakeY + UI_QUAKE_METER_Y);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH + UI_QUAKE_METER_DEPTH * p[0], screenShakeY + UI_QUAKE_METER_Y);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH + UI_QUAKE_METER_DEPTH * p[0], screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT + UI_QUAKE_METER_DEPTH * p[1]);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH, screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = BASE_BOTTOM_COLOR;
		ctx.beginPath();
		ctx.moveTo(screenShakeX + UI_QUAKE_METER_X, screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X - UI_QUAKE_METER_DEPTH * p[0], screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT + UI_QUAKE_METER_DEPTH * p[1]);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH + UI_QUAKE_METER_DEPTH * p[0], screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT + UI_QUAKE_METER_DEPTH * p[1]);
		ctx.lineTo(screenShakeX + UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH, screenShakeY + UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT);
		ctx.closePath();
		ctx.fill();
		let fillPercent = quakeMeterAppearance / quakeMeterSize;
		if (fillPercent > 0) {
			ctx.fillStyle = UI_QUAKE_METER_FULL_COLOR;
			ctx.fillRect(screenShakeX + UI_QUAKE_METER_X, screenShakeY + UI_QUAKE_METER_Y, UI_QUAKE_METER_WIDTH * fillPercent, UI_QUAKE_METER_HEIGHT);
			let glow = PIECE_SIZE * (quakeMeter == quakeMeterSize ? Math.sin(clock / 25) * .05 + .1 : .04);
			ctx.filter = 'blur(' + glow + 'px)';
			ctx.fillRect(screenShakeX + UI_QUAKE_METER_X, screenShakeY + UI_QUAKE_METER_Y, UI_QUAKE_METER_WIDTH * (quakeMeterAppearance / quakeMeterSize), UI_QUAKE_METER_HEIGHT);
			ctx.filter = 'none';
		}
		if (quakeMeter == quakeMeterSize) {
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = '#DFDFFF';
			ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 4) + "px Source Sans Pro";
			ctx.fillText('click here or press SPACE to settle the board', UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH / 2, UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT / 2);
		}
	}
	if (state == StateEnum.GAME_OVER) {
		ctx.textAlign= 'right';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = "rgba(155, 90, 110, " + (gameOverClock / UI_GAME_OVER_FADE_TIME) + ")";
		ctx.font = "bold " + UI_SCORE_FONT_SIZE + "px Source Sans Pro";
		ctx.fillText("GAME OVER", canvas.width - BOARD_PADDING, canvas.height - BOARD_PADDING);
		let gameOverWidth = ctx.measureText("GAME OVER").width;
		ctx.textBaseline = 'top';
		ctx.font = (UI_SCORE_FONT_SIZE / 5) + "px Source Sans Pro";
		ctx.fillText("click anywhere to restart", canvas.width - BOARD_PADDING, canvas.height - BOARD_PADDING);
		ctx.textAlign= 'left';
		ctx.fillText("your high score: " + parseInt(localStorage.highScore).toLocaleString(), canvas.width - BOARD_PADDING - gameOverWidth, canvas.height - BOARD_PADDING);
	}
	// Draw quake light effect.
	if (quakeLightEffect > 0) {
		// Fullscreen flash.
		let fullscreenAlpha = Math.max(0, (quakeLightEffect - .75) * 4);
		if (fullscreenAlpha > 0) {
			ctx.fillStyle = "rgba(255, 255, 255, " + fullscreenAlpha + ")";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		// Gradient.
		var gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
		var gradientAlpha = quakeLightEffect * (clock % 2 == 0 ? 1.25 : 1);
		gradient.addColorStop(0, 'rgba(255,255,255, ' + gradientAlpha + ')');
		gradient.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = gradient;
		ctx.fillRect(screenShakeX + UI_QUAKE_METER_X, screenShakeY, UI_QUAKE_METER_WIDTH, UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT);
		// Diminish.
		quakeLightEffect = Math.max(0, quakeLightEffect - EFFECTS_QUAKE_LIGHT_FADE_SPEED);
	}
	// Draw effects.
	effects.update();
	effects.draw();

	// Draw title screen.
	if (titleFade > 0) {
		ctx.fillStyle = "rgba(40, 40, 40, " + titleFade + ")";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		if (state != StateEnum.TITLE) {
			titleFade = Math.max(0, titleFade - UI_TITLE_FADE_RATE);	
		}
		let logoX = canvas.width / 2 - UI_TITLE_LOGO_SIZE / 2;
		ctx.globalAlpha = titleFade;
		ctx.drawImage(ASSET_IMAGE_LOGO, logoX, canvas.height / 5, UI_TITLE_LOGO_SIZE, UI_TITLE_LOGO_SIZE * ASSET_IMAGE_LOGO.height / ASSET_IMAGE_LOGO.width);
		ctx.globalAlpha = 1;
		ctx.textAlign= 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = "rgba(255, 255, 255, " + titleFade + ")";
		ctx.font = "200 " + (UI_SCORE_FONT_SIZE / 3) + "px Source Sans Pro";
		for (let i = 0; i < TEXT_INSTRUCTIONS.length; i++) {
			ctx.fillText(TEXT_INSTRUCTIONS[i], canvas.width / 2, canvas.height / 2 + UI_SCORE_FONT_SIZE * .5 * i);
		}
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = "rgba(128, 128, 128, " + titleFade + ")";
		ctx.font = (UI_SCORE_FONT_SIZE / 6) + "px Source Sans Pro";
		ctx.textAlign ='left';
		for (let i = 0; i < TEXT_KEYS.length; i++) {
			let y = canvas.height - BOARD_PADDING / 2 - (UI_SCORE_FONT_SIZE / 6) * (TEXT_KEYS.length - i - 1);
			ctx.fillText(TEXT_KEYS[i], BOARD_PADDING / 2, y);
		}
		ctx.textAlign ='right';
		for (let i = 0; i < TEXT_CREDITS.length; i++) {
			let y = canvas.height - BOARD_PADDING / 2 - (UI_SCORE_FONT_SIZE / 6) * (TEXT_CREDITS.length - i - 1);
			ctx.fillText(TEXT_CREDITS[i], canvas.width - BOARD_PADDING / 2, y);
		}
	}

	if (state != StateEnum.TITLE && state != StateEnum.PAUSED) {
		clock++;
	}
	if (state == StateEnum.GAME_OVER) {
		gameOverClock++;
	}

	// Play audio.
	for (let key of sfxMap.keys()) {
		key.volume(sfxMap.get(key));
		key.play();
	}

	// Update key states.
	keysPressed.clear();
	sfxMap.clear();
}

canvas.addEventListener('mousedown', function(e) {
	let pos = mousePos(canvas, e);
	mouseDownHelper(pos.x, pos.y, e.which == 3);
});
canvas.addEventListener('touchstart', function(e) {
	if (e.touches.length == 1) {
		e.preventDefault();
	}
	let pos = touchPos(canvas, e);
	mouseDownHelper(pos.x, pos.y, false);
});
function mouseDownHelper(x, y, rightClick) {
	if (state == StateEnum.TITLE) {
		state = StateEnum.SETUP;
		return;
	}
	if (state == StateEnum.GAME_OVER && gameOverClock >= UI_GAME_OVER_FADE_TIME) {
		start();
		return;
	}
	if (state != StateEnum.RUNNING) {
		return;
	}
	if (rightClick) {
		selected = [];
		return;
	}
	if (x >= UI_QUAKE_METER_X && x <= UI_QUAKE_METER_X + UI_QUAKE_METER_WIDTH && y >= UI_QUAKE_METER_Y && y <= UI_QUAKE_METER_Y + UI_QUAKE_METER_HEIGHT) {
		keysPressed.add(KeyBindings.QUAKE);
		return;
	}
	mouseDown = true;
	selectCheck(x, y);
}
canvas.addEventListener('mousemove', function(e) {
	let pos = mousePos(canvas, e);
	mouseMoveHelper(pos.x, pos.y);
});
canvas.addEventListener('touchmove', function(e) {
	if (e.touches.length == 1) {
		e.preventDefault();
	}
	let pos = touchPos(canvas, e);
	mouseMoveHelper(pos.x, pos.y);
});
function mouseMoveHelper(x, y) {
	showPolyominoTooltip = BOUNTY_POLYOMINOS && x > canvas.width - BOARD_PADDING - UI_POLYOMINO_AREA_SIZE && y < BOARD_PADDING + UI_POLYOMINO_AREA_SIZE;
	if (state != StateEnum.RUNNING) {
		return;
	}
	if (mouseDown) {
		selectCheck(x, y);
	}
}
window.addEventListener('mouseup', function(e) {
	mouseUpHelper();
});
window.addEventListener('touchend', function(e) {
	if (e.touches.length == 1) {
		e.preventDefault();
	}
	mouseUpHelper();
});
function mouseUpHelper() {
	if (state != StateEnum.RUNNING) {
		return;
	}
	let colorCheck = new Set();
	for (let i = 0; i < selected.length; i++) {
		colorCheck.add(board[selected[i][0]][selected[i][1]].color);
	}
	if (colorCheck.size == COLORS.length) {
		let toDestroy = new Set();
		let piecesDestroyed = 0;
		for (let i = 0; i < selected.length; i++) {
			toDestroy.add(board[selected[i][0]][selected[i][1]].root);
			piecesDestroyed += board[selected[i][0]][selected[i][1]].root.children.size;
		}
		scorePoints(Math.round(piecesDestroyed * 100 * multiplier));
		// Play sound effects.
		playSFX(ASSET_SFX_BREAK, .2);
		let stingStrength = (piecesDestroyed - COLORS.length) / SFX_STING_MAX_VOL_PIECES;
		if (piecesDestroyed > SFX_STING_MAX_VOL_PIECES) {
			ASSET_SFX_STING.rate(1 + .1 * (piecesDestroyed - SFX_STING_MAX_VOL_PIECES));
		} else {
			ASSET_SFX_STING.rate(1);
		}
		playSFX(ASSET_SFX_STING, Math.min(1, stingStrength));
		for (let item of toDestroy) {
			item.destroy();
		}
		fallCheck();
	}

	selected = [];
	mouseDown = false;
}
window.addEventListener('keydown', function(e) {
	keysPressed.add(e.keyCode);
	keysDown.add(e.keyCode);
});
window.addEventListener('keyup', function(e) {
	keysDown.delete(e.keyCode);
});
canvas.addEventListener('contextmenu', function(e) {
	e.preventDefault();
});

function selectCheck(x, y) {
	x = Math.floor((x - BOARD_PADDING) / PIECE_SIZE);
	y = Math.floor(y / PIECE_SIZE);
	if (selected.length == 0) {
		selectCheckHelper(x, y);
		return;
	}
	let coor = selected[selected.length - 1].slice();
	let dx = x - coor[0];
	dx /= Math.abs(dx);
	while (coor[0] != x && coor[0] + dx >= 0 && coor[0] + dx < BOARD_WIDTH && board[coor[0] + dx][coor[1]] != null && board[coor[0] + dx][coor[1]].fallDistance == 0) {
		coor[0] += dx;
		selectCheckHelper(coor[0], coor[1]);
	}
	let dy = y - coor[1];
	dy /= Math.abs(dy);
	while (coor[1] != y && coor[1] + dy >= 0 && coor[1] + dy < BOARD_HEIGHT && board[coor[0]][coor[1] + dy] != null && board[coor[0]][coor[1] + dy].fallDistance == 0) {
		coor[1] += dy;
		selectCheckHelper(coor[0], coor[1]);
	}
	// Repeat earlier while to cover scenarios where the path must go vertically then horizontally.
	while (coor[0] != x && coor[0] + dx >= 0 && coor[0] + dx < BOARD_WIDTH && board[coor[0] + dx][coor[1]] != null && board[coor[0] + dx][coor[1]].fallDistance == 0) {
		coor[0] += dx;
		selectCheckHelper(coor[0], coor[1]);
	}
}
function selectCheckHelper(x, y) {
	if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT)
		return;
	if (board[x][y] == null || board[x][y].fallDistance > 0) {
		return;
	}
	let coor = [x, y];
	let i = Array.containsArray(selected, coor);
	if (i != -1) {
		selected.splice(i + 1);
		return;
	}
	if (selected.length == COLORS.length) {
		return;
	}
	if (selected.length > 0) {
		let last = selected[selected.length - 1];
		let d = Math.abs(last[0] - x) + Math.abs(last[1] - y);
		if (d != 1) {
			return;
		}
	}
	selected.push([x, y]);
}

function fallCheck() {
	// Find to-ground fall distances of shapes.
	let fallDistances = new Map();
	for (let x = 0; x < BOARD_WIDTH; x++) {
		for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
			if (board[x][y] == null) {
				continue;
			}
			let fallDistance = BOARD_HEIGHT - 1 - y;
			if (!fallDistances.has(board[x][y].root) || fallDistances.get(board[x][y].root) > fallDistance) {
				fallDistances.set(board[x][y].root, fallDistance);
			}
		}
	}
	// Update fall distances until none of them change.
	let changed = true;
	while (changed) {
		changed = false;
		for (const root of fallDistances.keys()) {
			for (const child of root.children) {
				// For each piece in this shape, look down until we hit a piece from another shape, update our fall distance if necessary.
				for (let y = child.y + 1; y < BOARD_HEIGHT; y++) {
					if (board[child.x][y] == null) {
						continue;
					}
					if (board[child.x][y].root == root) {
						break;
					}
					let newDistance = fallDistances.get(board[child.x][y].root) + Math.abs(y - child.y - 1);
					if (newDistance < fallDistances.get(root)) {
						fallDistances.set(root, newDistance);
						changed = true;
					}
					break;
				}
			}
		}
	}
	// Move pieces and add fall distances as calculated.
	for (let x = 0; x < BOARD_WIDTH; x++) {
		for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
			if (board[x][y] == null) {
				continue;
			}
			let fallDistance = fallDistances.get(board[x][y].root);
			if (fallDistance > 0) {
				board[x][y].y += fallDistance;
				board[x][y].fallDistance += fallDistance;
				board[x][y + fallDistance] = board[x][y];
				board[x][y] = null;
			}
		}
	}
}

function scorePoints(points, match = true) {
	if (match) {
		combo++;
		if (combo >= 2) {
			let comboPoints = Math.round(200 * (combo - 1) * multiplier);
			points += comboPoints;
			bonusText = combo + " QUICK MATCHES! +" + comboPoints;
			bonusTimer = UI_BONUS_TIMER;
		}
	}
	score += points;
	if (scorePopup > 0 && comboDelay == 0) {
		scoreAppearance += scorePopup;
		scorePopup = points;
	} else {
		scorePopup += points;
	}
	comboDelay = COMBO_DELAY;
}

function perspective(x, y) {
	let width;
	if (BOARD_WIDTH % 2 == 0) {
		let center = BOARD_WIDTH / 2 - .5;
		let dist = Math.abs(x - center) - .5;
		if (x > center) {
			dist *= -1;
		}
		width = dist / (center - .5) * PERSPECTIVE_MAX_WIDTH;
	} else {
		let halfWidth = Math.floor(BOARD_WIDTH / 2);
		width = (halfWidth - x) / halfWidth * PERSPECTIVE_MAX_WIDTH;
	}
	let heightFactor = (BOARD_HEIGHT - y - 1) / BOARD_HEIGHT;
	let height = Math.lerp(PERSPECTIVE_MIN_HEIGHT, PERSPECTIVE_MAX_HEIGHT, heightFactor);
	return [width, height];
}

function playSFX(sfx, volume) {
	if (localStorage.mute == 'true') {
		return;
	}
	if (!sfxMap.has(sfx)) {
		sfxMap.set(sfx, volume);
	} else {
		sfxMap.set(sfx, Math.max(sfxMap.get(sfx), volume));
	}
}

// n-to-bounty:
//	3		4		5		6		7		8		...
//	1000	3000	6000	10000	15000	21000	...
// +500 for each previous bounty
//
// score-to-n:
//	0		>0		>20K	>60K	>120K	>200K	...
//	3		4		5		6		7		8		...
function nextPolyomino() {
	if (!BOUNTY_POLYOMINOS) {
		return;
	}
	if (polyomino == null) {
		polyomino = Polyomino.random(3);
		polyominoBounty = 1000;
		polyominosScored = 0;
		return;
	}
	scorePoints(polyominoBounty * multiplier);
	polyominosScored++;
	let n = Math.floor((Math.sqrt(score - 1 + 2500) + 350) / 100); // thanks wolfram alpha
	let oldPolyomino = polyomino;
	while (polyomino.representations.has(oldPolyomino.representations.values().next().value)) {
		polyomino = Polyomino.random(n);
	}
	polyominoBounty = 500 * (n - 2) * (n - 1) + 500 * polyominosScored; // thanks wolfram alpha
}
function drawPolyominoUI() {
	// Draw polyomino.
	let polyPieceSize = UI_POLYOMINO_AREA_SIZE / (Math.max(polyomino.maxX, polyomino.maxY) + 1);
	let xOffset = polyomino.maxX < polyomino.maxY ? polyomino.maxY - polyomino.maxX : 0;
	ctx.fillStyle = "rgba(255, 255, 255, 1)";
	for (let i = 0; i < polyomino.coors.length; i++) {
		let coor = polyomino.coors[i];
		ctx.fillRect(canvas.width - BOARD_PADDING - UI_POLYOMINO_AREA_SIZE + (coor[0] + xOffset) * polyPieceSize + polyPieceSize * (1 - UI_POLYOMINO_BLOCK_FILL),
					 BOARD_PADDING + coor[1] * polyPieceSize,
					 polyPieceSize * UI_POLYOMINO_BLOCK_FILL,
					 polyPieceSize * UI_POLYOMINO_BLOCK_FILL);
	}
	// Draw polyomino bounty.
	ctx.fillStyle = "#9090F0";
	ctx.textAlign= 'center';
	ctx.textBaseline = 'middle';
	ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 3) + "px Source Sans Pro";
	ctx.fillText('+' + polyominoBounty, canvas.width - BOARD_PADDING - (polyomino.maxX + 1) / 2 * polyPieceSize + polyPieceSize * (1 - UI_POLYOMINO_BLOCK_FILL) / 2,
										BOARD_PADDING + (polyomino.maxY + 1) / 2 * polyPieceSize - polyPieceSize * (1 - UI_POLYOMINO_BLOCK_FILL) / 2);
	// Draw polyomino tooltip.
	if (showPolyominoTooltip) {
		ctx.fillStyle = "#9090F0";
		ctx.textAlign= 'right';
		ctx.textBaseline = 'top';
		ctx.font = (UI_SCORE_FONT_SIZE / 5) + "px Source Sans Pro";
		let tooltipY = BOARD_PADDING + polyPieceSize * (polyomino.maxY + 1);
		ctx.fillText('clear a piece with this shape (can', canvas.width - BOARD_PADDING, tooltipY);
		ctx.fillText('be rotated or reflected) to gain this', canvas.width - BOARD_PADDING, tooltipY + (UI_SCORE_FONT_SIZE / 5));
		ctx.fillText('many points, times your multiplier', canvas.width - BOARD_PADDING, tooltipY + (UI_SCORE_FONT_SIZE / 5) * 2);
	}
}

function quake() {
	for (let x = 0; x < BOARD_WIDTH; x++) {
		for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
			if (board[x][y] == null) {
				continue;
			}
			board[x][y].connection.fill(0);
			board[x][y].root = board[x][y];
			board[x][y].children = new Set([board[x][y]]);
		}
	}
	fallCheck();
	quakeSpawnDelay = QUAKE_SPAWN_DELAY;
	quakeScreenShake = 1;
	quakeLightEffect = 1;
	ASSET_SFX_QUAKE.rate(2);
	ASSET_SFX_QUAKE.volume(.25);
	ASSET_SFX_QUAKE.play();
}

start();
loop();