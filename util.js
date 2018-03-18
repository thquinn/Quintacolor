let NEIGHBORS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

Math.precisionRound = function (number, precision) {
  let factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

Math.lerp = function (value1, value2, amount) {
  return value1 + (value2 - value1) * amount;
};

// from http://www.gizma.com/easing/
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d/2;
  if (t < 1) return c/2*t*t + b;
  t--;
  return -c/2 * (t*(t-2) - 1) + b;
};

Math.randFloat = function (min, max) {
	return Math.random() * (max - min) + min;
};
Math.randInt = function (min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};

Math.pickFromWeightArray = function (arr) {
  let total = arr.reduce((a, b) => a + b, 0);
  let selector = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    if (selector <= arr[i]) {
      return i;
    }
    selector -= arr[i];
  }
  return -1;
};

Array.equal = function (a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
Array.containsArray = function (a, b) {
  for (let i = 0; i < a.length; ++i) {
      if (Array.equal(a[i], b)) return i;
  }
  return -1;
}
Array.prototype.max = function() {
  return Math.max.apply(null, this);
};
Array.prototype.min = function() {
  return Math.min.apply(null, this);
};

function mousePos(el, e) {
  let xPosition = 0;
  let yPosition = 0;
  let xScale = el.width / el.clientWidth;
  let yScale = el.width / el.clientWidth;
 
  while (el) {
    if (el.tagName == "BODY") {
      // deal with browser quirks with body/window/document and page scroll
      let xScrollPos = el.scrollLeft || document.documentElement.scrollLeft;
      let yScrollPos = el.scrollTop || document.documentElement.scrollTop;
 
      xPosition += (el.offsetLeft - xScrollPos + el.clientLeft);
      yPosition += (el.offsetTop - yScrollPos + el.clientTop);
    } else {
      xPosition += (el.offsetLeft - el.scrollLeft + el.clientLeft);
      yPosition += (el.offsetTop - el.scrollTop + el.clientTop);
    }
 
    el = el.offsetParent;
  }
  return {
    x: (e.clientX - xPosition) * xScale,
    y: (e.clientY - yPosition) * yScale,
  };
}
function touchPos(el, e) {
  let xScale = el.width / el.clientWidth;
  let yScale = el.width / el.clientWidth;
  let rect = el.getBoundingClientRect();
  return {
    x: (e.touches[0].clientX - rect.left) * xScale,
    y: (e.touches[0].clientY - rect.top) * yScale,
  };
}

function findRandomMatch(board, n) {
  while (true) {
    let x = Math.randInt(0, board.length);
    let y = Math.randInt(0, board[0].length);
    if (board[x][y] == null || board[x][y].fallDistance > 0) {
      continue;
    }
    let match = [[x, y]];
    let colors = new Set([board[x][y].color]);
    while (match.length < n) {
      let success = false;
      for (let i = 0; i < NEIGHBORS.length; i++) {
        let last = match[match.length - 1];
        let nx = last[0] + NEIGHBORS[i][0];
        let ny = last[1] + NEIGHBORS[i][1];
        if (nx < 0 || nx >= board.length || ny < 0 || ny > board[0].length || board[nx][ny] == null || colors.has(board[nx][ny].color)) {
          continue;
        }
        success = true;
        match.push([nx, ny]);
        colors.add(board[nx][ny].color);
        break;
      }
      if (!success) {
        break;
      }
    }
    if (match.length == n) {
      return match;
    }
  }
}

class Polyomino {
  constructor(coors) {
    this.coors = coors;
    let minX = Number.MAX_SAFE_INTEGER, minY = Number.MAX_SAFE_INTEGER;
    this.maxX = Number.MIN_SAFE_INTEGER;
    this.maxY = Number.MIN_SAFE_INTEGER;
    for (let coor of coors) {
      if (coor[0] < minX) {
        minX = coor[0];
      }
      if (coor[0] > this.maxX) {
        this.maxX = coor[0];
      }
      if (coor[1] < minY) {
        minY = coor[1];
      }
      if (coor[1] > this.maxY) {
        this.maxY = coor[1];
      }
    }
    this.maxX -= minX;
    this.maxY -= minY;
    let arr = new Array(this.maxX);
    for (let i = 0; i <= this.maxX; i++) {
      arr[i] = new Array(this.maxY + 1).fill('.');
    }
    for (let coor of coors) {
      coor[0] -= minX;
      coor[1] -= minY;
      arr[coor[0]][coor[1]] = 'X';
    }
    // Create all 8 rotated/reflected string representations of the array.
    this.representations = new Set();
    this.representations.add(arr.map(e => e.join('')).join(','));
    this.representations.add(arr.map(e => e.join('')).reverse().join(','));
    for (let a of arr) {
      a.reverse();
    }
    this.representations.add(arr.map(e => e.join('')).join(','));
    this.representations.add(arr.map(e => e.join('')).reverse().join(','));
    let arrRot = arr[0].map((_, c) => arr.map(r => r[c]));
    this.representations.add(arrRot.map(e => e.join('')).join(','));
    this.representations.add(arrRot.map(e => e.join('')).reverse().join(','));
    for (let a of arrRot) {
      a.reverse();
    }
    this.representations.add(arrRot.map(e => e.join('')).join(','));
    this.representations.add(arrRot.map(e => e.join('')).reverse().join(','));
  }

  isThis(piece) {
    if (piece.children.size != this.coors.length) {
      return false;
    }
    let minX = Number.MAX_SAFE_INTEGER, minY = Number.MAX_SAFE_INTEGER;
    let maxX = Number.MIN_SAFE_INTEGER, maxY = Number.MIN_SAFE_INTEGER;
    for (let child of piece.children) {
      if (child.x < minX) {
        minX = child.x;
      }
      if (child.x > maxX) {
        maxX = child.x;
      }
      if (child.y < minY) {
        minY = child.y;
      }
      if (child.y > maxY) {
        maxY = child.y;
      }
    }
    maxX -= minX;
    maxY -= minY;
    let arr = new Array(maxX);
    for (let i = 0; i <= maxX; i++) {
      arr[i] = new Array(maxY + 1).fill('.');
    }
    for (let child of piece.children) {
      arr[child.x - minX][child.y - minY] = 'X';
    }
    return this.representations.has(arr.map(e => e.join('')).join(','));
  }

  static random(n) {
    let coors = new Map();
    let frontier = new Map();
    frontier.set([0, 0].toString(), [0, 0]);
    while (coors.size < n) {
      let nextKey = Array.from(frontier.keys())[Math.randInt(0, frontier.size)];
      let nextVal = frontier.get(nextKey);
      coors.set(nextKey, nextVal);
      frontier.delete(nextKey);
      for (let neighbor of NEIGHBORS) {
        let nextFrontier = [nextVal[0] + neighbor[0], nextVal[1] + neighbor[1]];
        if (!coors.has(nextFrontier.toString())) {
          frontier.set(nextFrontier.toString(), nextFrontier);
        }
      }
    }
    return new Polyomino(Array.from(coors.values()));
  }
}