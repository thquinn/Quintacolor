var StateEnum = {
	SETUP: -1,
	RUNNING: 0,
	GAME_OVER: 1,
};
var KeyBindings = {
	INCREASE_LEVEL: 32,
};
var NEIGHBORS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Board appearance constants.
var STROKE_COLORS = ['#FF0000', '#20B0FF', '#F0D000', '#00D010', '#8040FF'];
var COLORS = ['#FF7979', '#90D4FF', '#FFEA5E', '#6CFF77', '#BC9BFF' ]
var BASE_COLOR = '#606080';
var SELECTION_OPACITY = .5;
var BOARD_WIDTH = 15;
var BOARD_HEIGHT = 12;
var PIECE_SIZE = 60;
var STROKE_WIDTH = 10;
var BOARD_PADDING = PIECE_SIZE;
var CONNECTION_APPEARANCE_RATE = .1;
var SETUP_SPAWN_RATE = 1; // frames per piece
var POST_SETUP_PAUSE = 60;
// UI appearance constants.
var UI_WIDTH = PIECE_SIZE * 8;
var UI_SCORE_DIGITS = 10;
var UI_SCORE_FONT_SIZE = UI_WIDTH / UI_SCORE_DIGITS * 1.75;
var UI_LEVEL_CIRCLE_RADIUS = PIECE_SIZE * .66;
// Gameplay constants.
var SETUP_ROWS = 4;
var COLUMN_SELECTION_WEIGHT_EXPONENT = 3;
var COLOR_SELECTION_WEIGHT_MIN = 10;
var COLOR_SELECTION_WEIGHT_EXPONENT = 1.5;
var INITIAL_FALL_VELOCITY = .025;
var GRAVITY = .006;
var LEVEL_RATE = 40 * 60; // 40 seconds
var SPAWN_RATE_INITIAL = .75; // pieces spawned per second
var SPAWN_RATE_INCREMENT = .15;
var MULTIPLIER_INCREMENT = .05;
var MULTIPLIER_FORCE_INCREMENT = .08;
var LEVEL_UP_FORCE_COOLDOWN = 1 * 60; // 1 second
var CONNECTION_RATE = .0075;

var canvas = document.getElementById('canvas');
canvas.width = BOARD_WIDTH * PIECE_SIZE + 2 * BOARD_PADDING + UI_WIDTH;
canvas.height = BOARD_HEIGHT * PIECE_SIZE + 2 * BOARD_PADDING;
var ctx = canvas.getContext('2d');

var clock = 0;
var state = StateEnum.SETUP;
var board = new Array(BOARD_WIDTH);
for (var i = 0; i < BOARD_WIDTH; i++) {
	board[i] = new Array(BOARD_HEIGHT);
}
var keysPressed = new Set();
var keysDown = new Set();
var levelTimer = LEVEL_RATE;
var levelUpForceCooldown = 0;
var spawnTimer = 0;
var selected = [];
var level = 1;
var score = 0;
var multiplier = 1;
var spawnBlocked = false;

class Piece {
	constructor(col) {
		if (spawnBlocked) {
			return;
		}
		// Select column.
		if (col == null) {
			var xWeights = new Array(BOARD_WIDTH).fill(0);
			for (var x = 0; x < BOARD_WIDTH; x++) {
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
		while (this.y < BOARD_HEIGHT - 1 && board[this.x][this.y + 1] == null) { // TODO: fix this ugly thing
			this.y++;
		}
		// Select color.
		var colorWeights = new Array(COLORS.length).fill(COLOR_SELECTION_WEIGHT_MIN);
		for (var x = 0; x < BOARD_WIDTH; x++) {
			for (var y = 0; y < BOARD_WIDTH; y++) {
				if (board[x][y] != null) {
					colorWeights[board[x][y].color]++;
				}
			}
		}
		for (var i = 0; i < colorWeights.length; i++) {
			colorWeights[i] = 1 / Math.pow(colorWeights[i], COLOR_SELECTION_WEIGHT_EXPONENT);
		}
		this.color = Math.pickFromWeightArray(colorWeights);
		// Initialize.
		board[this.x][this.y] = this;
		this.dy = INITIAL_FALL_VELOCITY;
		this.fallDistance = this.y + 1 + BOARD_PADDING / PIECE_SIZE;
		this.connection = [0, 0, 0, 0];
		this.connectionAppearance = [0, 0, 0, 0];
		this.root = this;
		this.children = new Set([this]);
	}

	breakPartialConnections() {
		for (var i = 0; i < this.connection.length; i++) {
			if (this.connection[i] != 1) {
				this.connection[i] = 0;
			}
		}
	}

	update(setup) {
		if (this.fallDistance > 0) {
			this.dy += GRAVITY;
			var distanceToLowerNeighbor = Number.MAX_SAFE_INTEGER;
			if (this.y < BOARD_HEIGHT - 1 && board[this.x][this.y + 1] != null && board[this.x][this.y + 1].fallDistance > 0) {
				var neighborTop = (board[this.x][this.y + 1].y - board[this.x][this.y + 1].fallDistance);
				distanceToLowerNeighbor = neighborTop - (this.y - this.fallDistance + 1);
			}
			var fall = Math.min(this.dy, this.fallDistance, distanceToLowerNeighbor);
			if (fall == 0) {
				this.dy = 0;
			}
			this.fallDistance -= fall;
		} else {
			this.dy = 0;
		}
		if (setup) {
			return;
		}

		// Update connections and connection appearances.
		for (var i = 0; i < this.connection.length; i++) {
			if (this.connection[i] < 1) {
				var nx = this.x + NEIGHBORS[i][0];
				var ny = this.y + NEIGHBORS[i][1];
				if (this.fallDistance > 0 || nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT || board[nx][ny] == null || board[nx][ny].fallDistance > 0 || board[nx][ny].color != this.color) {
					// TODO: don't break vertical partial connections because of falling.
					// TODO: don't break horizontal connections if one piece is falling alongside another the whole time.
					this.connection[i] = 0;
				} else {
					this.connection[i] = Math.min(this.connection[i] + CONNECTION_RATE, 1);
					if (this.connection[i] == 1) {
						// Connect!
						var neighbor = board[nx][ny];
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
		var trueY = this.y - this.fallDistance;
		// Stroke.
		ctx.fillStyle = STROKE_COLORS[this.color];
		ctx.fillRect(BOARD_PADDING + this.x * PIECE_SIZE, trueY * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE);
		// Horizontal fill.
		ctx.fillStyle = COLORS[this.color];
		ctx.fillRect(BOARD_PADDING + this.x * PIECE_SIZE + STROKE_WIDTH * (1 - this.connectionAppearance[0]), trueY * PIECE_SIZE + STROKE_WIDTH, PIECE_SIZE - (2 - this.connectionAppearance[0] - this.connectionAppearance[1]) * STROKE_WIDTH, PIECE_SIZE - 2 * STROKE_WIDTH);
		// Vertical fill.
		ctx.fillStyle = COLORS[this.color];
		ctx.fillRect(BOARD_PADDING + this.x * PIECE_SIZE + STROKE_WIDTH, trueY * PIECE_SIZE + STROKE_WIDTH * (1 - this.connectionAppearance[2]), PIECE_SIZE - 2 * STROKE_WIDTH, PIECE_SIZE - (2 - this.connectionAppearance[2] - this.connectionAppearance[3])  * STROKE_WIDTH);
		// Selection overlay.
		for (let s of selected) {
			if (board[s[0]][s[1]].root == this.root) {
				ctx.fillStyle = "rgba(255, 255, 255, " + SELECTION_OPACITY + ")";
				ctx.fillRect(BOARD_PADDING + this.x * PIECE_SIZE, (this.y - this.fallDistance) * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE);
				break;
			}
		}
	}
	destroy() {
		for (let child of this.root.children) {
			board[child.x][child.y] = null;
		}
	}
}

function loop() {
	window.requestAnimationFrame(loop);
	ctx.fillStyle = "#D0E8FF";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Setup.
	if (state == StateEnum.SETUP) {
		if (clock % SETUP_SPAWN_RATE == 0) {
			var pieceNum = clock / SETUP_SPAWN_RATE;
			if (pieceNum < SETUP_ROWS * BOARD_WIDTH) {
				var x = pieceNum % BOARD_WIDTH;
				new Piece(x);
			}
		}
		if (clock == SETUP_ROWS * BOARD_WIDTH * SETUP_SPAWN_RATE + POST_SETUP_PAUSE) {
			state = StateEnum.RUNNING;
		}
	}

	clock++;
	// Game over check.
	if (state == StateEnum.RUNNING) {
		spawnBlocked = true;
		var gameOver = true;
		for (var x = 0; x < BOARD_WIDTH; x++) {
			if (board[x][0] == null) {
				spawnBlocked = false;
			}
			if (board[x][0] == null || board[x][0].fallDistance > 0) {
				gameOver = false;
			}
		}
		if (gameOver) {
			state = StateEnum.GAME_OVER;
		}
	}

	// Update pieces.	
	if (state == StateEnum.SETUP || state == StateEnum.RUNNING) {
		for (var x = 0; x < BOARD_WIDTH; x++) {
			for (var y = BOARD_HEIGHT - 1; y >= 0; y--) {
				if (board[x][y] == null) {
					continue;
				}
				board[x][y].update(state == StateEnum.SETUP);
			}
		}
	}
	// Update everything else.
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
			var add = Math.precisionRound(Math.lerp(MULTIPLIER_INCREMENT, MULTIPLIER_FORCE_INCREMENT, levelTimer / LEVEL_RATE), 2);
			multiplier = Math.precisionRound(multiplier + add, 2);
			levelUpForceCooldown = LEVEL_UP_FORCE_COOLDOWN;
			levelTimer = LEVEL_RATE;
		}
		// Spawn pieces.
		if (spawnTimer <= 0) {
			if (!spawnBlocked) {
				new Piece();
				var rate = SPAWN_RATE_INITIAL + (level - 1) * SPAWN_RATE_INCREMENT;
				spawnTimer += 60 / rate;
			}
		} else {
			spawnTimer--;
		}
	}
	
	// Draw pieces.
	for (var x = 0; x < BOARD_WIDTH; x++) {
		for (var y = BOARD_HEIGHT - 1; y >= 0; y--) {
			if (board[x][y] == null) {
				continue;
			}
			board[x][y].draw();
		}
	}
	// Draw base.
	var baseY = BOARD_HEIGHT * PIECE_SIZE;
	ctx.fillStyle = BASE_COLOR;
	ctx.fillRect(BOARD_PADDING, baseY, BOARD_WIDTH * PIECE_SIZE, canvas.height - baseY);
	// Draw UI.
	ctx.textAlign= 'right';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = "#FFFFFF";
	ctx.font = "bold " + UI_SCORE_FONT_SIZE + "px Source Sans Pro";
	ctx.fillText(score, canvas.width - BOARD_PADDING, canvas.height / 2);
	var leadingZeroes = UI_SCORE_DIGITS - score.toString().length;
	var scoreWidth = ctx.measureText(score).width;
	ctx.font = "200 " + UI_SCORE_FONT_SIZE + "px Source Sans Pro";
	ctx.fillText('0'.repeat(leadingZeroes), canvas.width - BOARD_PADDING - scoreWidth, canvas.height / 2);
	ctx.fillStyle = "#9090F0";
	ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 3) + "px Source Sans Pro";
	ctx.fillText('Multiplier: ' + Math.round(multiplier * 100) + '%', canvas.width - BOARD_PADDING, canvas.height * .5625);
	var levelPercent = levelTimer / LEVEL_RATE;
	var levelX = canvas.width - BOARD_PADDING - UI_LEVEL_CIRCLE_RADIUS, levelY = canvas.height * .4125;
	ctx.beginPath();
	ctx.arc(levelX, levelY, UI_LEVEL_CIRCLE_RADIUS, Math.PI * 1.5, Math.PI * (1.5 - 2 * levelPercent), true);
	ctx.lineTo(levelX, levelY);
	ctx.fillStyle = "rgba(255, 255, 255, .5)";
	ctx.fill();
	ctx.textAlign= 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = "#9090F0";
	ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 2) + "px Source Sans Pro";
	ctx.fillText(level, levelX, levelY + UI_LEVEL_CIRCLE_RADIUS * .175);
	ctx.font = "bold " + (UI_SCORE_FONT_SIZE / 5) + "px Source Sans Pro";
	ctx.fillText("Level", levelX, levelY - UI_LEVEL_CIRCLE_RADIUS * .4);
	// Draw game over?
	if (state == StateEnum.GAME_OVER) {
		ctx.textAlign= 'center';
		ctx.fillStyle = "#000000";
		ctx.font = "bold 100px Source Sans Pro";
		ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 3);
		ctx.font = "48px Source Sans Pro";
		ctx.fillText("refresh the window to play again", canvas.width / 2, canvas.height / 2);
	}

	// Update key states.
	keysPressed.clear();
}

var moused = [];
var mouseDown = false;
canvas.addEventListener('mousedown', function(e) {
	if (state != StateEnum.RUNNING) {
		return;
	}
	mouseDown = true;
	selectCheck(e);
});
canvas.addEventListener('mousemove', function(e) {
	if (state != StateEnum.RUNNING) {
		return;
	}
	if (mouseDown) {
		selectCheck(e);
	}
});
window.addEventListener('mouseup', function(e) {
	if (state != StateEnum.RUNNING) {
		return;
	}
	var colorCheck = new Set(new Array(COLORS.length).keys());
	for (var i = 0; i < selected.length; i++) {
		colorCheck.delete(board[selected[i][0]][selected[i][1]].color)
	}
	if (colorCheck.size == 0) {
		var toDestroy = new Set();
		for (var i = 0; i < selected.length; i++) {
			toDestroy.add(board[selected[i][0]][selected[i][1]].root);
		}
		for (let item of toDestroy) {
			score = Math.round(score + item.children.size * 100 * multiplier);
			item.destroy();
		}
		fallCheck(); // TODO: Add this to the main loop to prevent race conditions.
	}

	selected = [];
	mouseDown = false;
});
window.addEventListener('keydown', function(e) {
	keysPressed.add(e.keyCode);
	keysDown.add(e.keyCode);
});
window.addEventListener('keyup', function(e) {
	keysDown.delete(e.keyCode);
});

function selectCheck(e) {
	if (selected.length == COLORS.length) {
		return;
	}
	var mouse = mousePos(canvas, e);
	var x = Math.floor((mouse.x - BOARD_PADDING) / PIECE_SIZE);
	var y = Math.floor(mouse.y / PIECE_SIZE);
	if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT)
		return;
	if (board[x][y] == null || board[x][y].fallDistance > 0) {
		return;
	}
	var coor = [x, y];
	// TODO: Allow crossing over multiple pieces in a single frame.
	if (selected.length > 0) {
		var last = selected[selected.length - 1];
		if (board[last[0]][last[1]].root == board[x][y].root) {
			return;
		}
		var d = Math.abs(last[0] - x) + Math.abs(last[1] - y);
		if (d != 1) {
			return;
		}
	}
	if (Array.containsArray(selected, coor)) {
		return;
	}
	selected.push([x, y]);
}
function fallCheck() {
	// Find to-ground fall distances of shapes.
	var fallDistances = new Map();
	for (var x = 0; x < BOARD_WIDTH; x++) {
		for (var y = BOARD_HEIGHT - 1; y >= 0; y--) {
			if (board[x][y] == null) {
				continue;
			}
			var fallDistance = BOARD_HEIGHT - 1 - y;
			if (!fallDistances.has(board[x][y].root) || fallDistances.get(board[x][y].root) > fallDistance) {
				fallDistances.set(board[x][y].root, fallDistance);
			}
		}
	}
	// Update fall distances until none of them change.
	var changed = true;
	while (changed) {
		changed = false;
		for (const root of fallDistances.keys()) {
			for (const child of root.children) {
				// For each piece in this shape, look down until we hit a piece from another shape, update our fall distance if necessary.
				for (var y = child.y + 1; y < BOARD_HEIGHT; y++) {
					if (board[child.x][y] == null) {
						continue;
					}
					if (board[child.x][y].root == root) {
						break;
					}
					var newDistance = fallDistances.get(board[child.x][y].root) + Math.abs(y - child.y - 1);
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
	for (var x = 0; x < BOARD_WIDTH; x++) {
		for (var y = BOARD_HEIGHT - 1; y >= 0; y--) {
			if (board[x][y] == null) {
				continue;
			}
			var fallDistance = fallDistances.get(board[x][y].root);
			if (fallDistance > 0) {
				board[x][y].y += fallDistance;
				board[x][y].fallDistance += fallDistance;
				board[x][y + fallDistance] = board[x][y];
				board[x][y] = null;
			}
		}
	}
}

loop();