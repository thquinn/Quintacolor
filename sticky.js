var StateEnum = {
  RUNNING: 1,
  GAME_OVER: 2,
};
var NEIGHBORS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

var STROKE_COLORS = ['#FF0000', '#20B0FF', '#F0D000', '#00D010', '#8040FF'];
var COLORS = ['#FF7979', '#90D4FF', '#FFEA5E', '#6CFF77', '#BC9BFF' ]
var BOARD_WIDTH = 15;
var BOARD_HEIGHT = 12;
var PIECE_SIZE = 60;
var STROKE_WIDTH = 10;
var INITIAL_FALL_VELOCITY = .05;
var GRAVITY = .003;
var SPAWN_RATE = 45;
var CONNECTION_RATE = .0025;
var CONNECTION_APPEARANCE_RATE = .075;

var canvas = document.getElementById('canvas');
canvas.width = BOARD_WIDTH * PIECE_SIZE;
canvas.height = BOARD_HEIGHT * PIECE_SIZE;
var ctx = canvas.getContext('2d');
ctx.lineWidth = STROKE_WIDTH;
ctx.textAlign="center";

var state = StateEnum.RUNNING;
var board = new Array(BOARD_WIDTH);
for (var i = 0; i < BOARD_WIDTH; i++) {
	board[i] = new Array(BOARD_HEIGHT);
}
var spawnTimer = 0;
var selected = [];

class Piece {
	constructor() {
		// TODO: color and column balancing
		this.color = Math.randInt(0, COLORS.length);
		do {
			this.x = Math.randInt(0, BOARD_WIDTH);
		} while (board[this.x][0] != null)
		this.y = 0;
		while (this.y < BOARD_HEIGHT - 1 && board[this.x][this.y + 1] == null) {
			this.y++;
		}
		board[this.x][this.y] = this;
		this.dy = INITIAL_FALL_VELOCITY;
		this.fallDistance = this.y + 1;
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

	update() {
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
		ctx.fillRect(this.x * PIECE_SIZE, trueY * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE);
		// Horizontal fill.
		ctx.fillStyle = COLORS[this.color];
		ctx.fillRect(this.x * PIECE_SIZE + STROKE_WIDTH * (1 - this.connectionAppearance[0]), trueY * PIECE_SIZE + STROKE_WIDTH, PIECE_SIZE - (2 - this.connectionAppearance[0] - this.connectionAppearance[1]) * STROKE_WIDTH, PIECE_SIZE - 2 * STROKE_WIDTH);
		// Vertical fill.
		ctx.fillStyle = COLORS[this.color];
		ctx.fillRect(this.x * PIECE_SIZE + STROKE_WIDTH, trueY * PIECE_SIZE + STROKE_WIDTH * (1 - this.connectionAppearance[2]), PIECE_SIZE - 2 * STROKE_WIDTH, PIECE_SIZE - (2 - this.connectionAppearance[2] - this.connectionAppearance[3])  * STROKE_WIDTH);
		// Selection overlay.
		for (let s of selected) {
			if (board[s[0]][s[1]].root == this.root) {
				ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
				ctx.fillRect(this.x * PIECE_SIZE, (this.y - this.fallDistance) * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE);
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
	ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Game over check.
	if (state == StateEnum.RUNNING) {
		var spawnBlocked = true;
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

	// Update everything.
	if (state == StateEnum.RUNNING) {
		// Spawn pieces.
		// TODO: Gradual speedup.
		// TODO: Speedup button.
		if (spawnTimer == 0) {
			if (!spawnBlocked) {
				new Piece();
				spawnTimer = SPAWN_RATE;
			}
		} else {
			spawnTimer--;
		}
		// Update pieces.	
		for (var x = 0; x < BOARD_WIDTH; x++) {
			for (var y = BOARD_HEIGHT - 1; y >= 0; y--) {
				if (board[x][y] == null) {
					continue;
				}
				board[x][y].update();
			}
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
	if (state == StateEnum.GAME_OVER) {
		ctx.fillStyle = "#000000";
		ctx.font = "100px Arial";
		ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 3);
		ctx.font = "48px Arial";
		ctx.fillText("refresh the window to play again", canvas.width / 2, canvas.height / 2);
	}
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
document.addEventListener('mouseup', function(e) {
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
			toDestroy.add(board[selected[i][0]][selected[i][1]]);
		}
		for (let item of toDestroy) {
			item.destroy();
		}
		fallCheck(); // TODO: Add this to the main loop to prevent race conditions.
	}

	selected = [];
	mouseDown = false;
});
function selectCheck(e) {
	if (selected.length == COLORS.length) {
		return;
	}
	var mouse = mousePos(canvas, e);
	var x = Math.floor(mouse.x / PIECE_SIZE);
	var y = Math.floor(mouse.y / PIECE_SIZE);
	if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT)
		return;
	if (board[x][y] == null || board[x][y].fallDistance > 0) {
		return;
	}
	var coor = [x, y];
	if (selected.length > 0) {
		var last = selected[selected.length - 1];
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