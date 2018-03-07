var NEIGHBORS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

Math.precisionRound = function (number, precision) {
  var factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

Math.lerp = function (value1, value2, amount) {
  amount = amount < 0 ? 0 : amount;
  amount = amount > 1 ? 1 : amount;
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
  var total = arr.reduce((a, b) => a + b, 0);
  var selector = Math.random() * total;
  for (var i = 0; i < arr.length; i++) {
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

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
Array.containsArray = function (a, b) {
  for (var i = 0; i < a.length; ++i) {
      if (Array.equal(a[i], b)) return true;
  }
  return false;
}

function mousePos(el, e) {
  var xPosition = 0;
  var yPosition = 0;
 
  while (el) {
    if (el.tagName == "BODY") {
      // deal with browser quirks with body/window/document and page scroll
      var xScrollPos = el.scrollLeft || document.documentElement.scrollLeft;
      var yScrollPos = el.scrollTop || document.documentElement.scrollTop;
 
      xPosition += (el.offsetLeft - xScrollPos + el.clientLeft);
      yPosition += (el.offsetTop - yScrollPos + el.clientTop);
    } else {
      xPosition += (el.offsetLeft - el.scrollLeft + el.clientLeft);
      yPosition += (el.offsetTop - el.scrollTop + el.clientTop);
    }
 
    el = el.offsetParent;
  }
  return {
    x: e.clientX - xPosition,
    y: e.clientY - yPosition,
  };
}
function touchPos(el, e) {
  var rect = el.getBoundingClientRect();
  return {
    x: e.touches[0].clientX - rect.left,
    y: e.touches[0].clientY - rect.top
  };
}

class Polyomino {
  constructor(coors) {
    this.coors = coors;
  }
}

function randomPolyomino(n) {
  var coors = new Map();
  var frontier = new Map();
  frontier.set([0, 0].toString(), [0, 0]);
  while (coors.size < n) {
    var nextKey = Array.from(frontier.keys())[Math.randInt(0, frontier.size)];
    var nextVal = frontier.get(nextKey);
    coors.set(nextKey, nextVal);
    frontier.delete(nextKey);
    for (let neighbor of NEIGHBORS) {
      var nextFrontier = [nextVal[0] + neighbor[0], nextVal[1] + neighbor[1]];
      if (!coors.has(nextFrontier.toString())) {
        frontier.set(nextFrontier.toString(), nextFrontier);
      }
    }
  }
  return new Polyomino(coors);
}