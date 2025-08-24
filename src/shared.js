// Types
var NODE_TYPE = {
  NORMAL: 0,
  START: 1,
  REQUIRED: 2,
  EXIT: 3,

  // Used in UI to loop around
  LAST: 3,
};

var EDGE_TYPE = {
  NORMAL: 0,
  REQUIRED: 1,
  OBSTACLE: 2,

  // Used in UI to loop around
  LAST: 2,
};

var CELL_TYPE = {
  NONE: 0,
  SQUARE: 1,
  SUN: 2,
  CANCELLATION: 3,

  // Used in UI to loop around
  LAST: 3,
};

var BACKGROUND_COLOR = "#BBBBBB";
var CELL_COLOR = {
  BLACK: 0,
  WHITE: 1,
  CYAN: 2,
  MAGENTA: 3,
  YELLOW: 4,
  RED: 5,
  GREEN: 6,
  BLUE: 7,
  ORANGE: 8,

  LAST: 8,
};

var CELL_COLOR_STRINGS = [
  "black",
  "white",
  "cyan",
  "magenta",
  "yellow",
  "red",
  "green",
  "blue",
  "orange",
];

function getColorString(c) {
  return CELL_COLOR_STRINGS[c];
}

// Helpers
var ORIENTATION_TYPE = {
  HOR: 0, // Horizontal
  VER: 1, // Vertical
};

// Puzzle definition
var puzzle = {};

// Used for keeping track of visited points with a Set
// This requires that a given X,Y point is always the exact same JS object
var pointPool = [];

function point(x, y) {
  if (!pointPool[x]) pointPool[x] = [];
  if (!pointPool[x][y]) pointPool[x][y] = { x: x, y: y };

  return pointPool[x][y];
}

var edgePool = [];

// x and y are the left top point of a edge. ori is orientation
function edge(x, y, ori) {
  ori = ori == ORIENTATION_TYPE.HOR ? 0 : 1;
  if (!edgePool[x]) edgePool[x] = [];
  if (!edgePool[x][y]) edgePool[x][y] = { x: x, y: y };
  if (!edgePool[x][y][ori]) edgePool[x][y][ori] = { x: x, y: y, ori: ori };

  return edgePool[x][y][ori];
}

function create2DArray(w, h) {
  var arr = [];

  for (var x = 0; x < w; x++) {
    arr[x] = [];
    arr[x].length = h;
  }

  return arr;
}

// Set up default puzzle with all edges and no special nodes or cells
function initPuzzle(puzzle, width, height) {
  puzzle.width = width;
  puzzle.height = height;

  initNodes(puzzle);
  initCells(puzzle);
  initEdges(puzzle);

  puzzle.nodes[0][height - 1].type = NODE_TYPE.START;
  puzzle.nodes[width - 1][0].type = NODE_TYPE.EXIT;

  // Update UI
  $('option[value="' + width + "," + height + '"]').prop("selected", true);
  calculateMetrics();
}

// Validate the puzzle parameters
// wid: width of the puzzle
// hgt: height of the puzzle 
// obs: number of obstacles
// req: number of required edges/nodes
// squ: number of squares
// sun: number of suns
// can: number of cancellations
// col: number of colors
// Returns true if the puzzle is valid, false otherwise
// Displays an alert with the error message if invalid
function validatePuzzle(wid, hgt, obs, req, squ, sun, can, col) {
  var width = wid;
  var height = hgt;

  var maxNodes = width * height;
  var maxEdges = width * (height - 1) + height * (width - 1);
  var maxCells = (width - 1) * (height - 1);

  var maxReq = maxNodes + maxEdges - 2;

  if ((width - 1) % 2 == 0 || (height - 1) % 2 == 0) {
    var difReq = (width - 1) * (height - 1);
  } else {
    var difReq = (width - 1) * (height - 1) + 2;
  }

  maxReq = maxReq - difReq;

  if ((hgt - 1) % 2 == 0 || (wid - 1) % 2 == 0) {
    var numBreakForMaxHexes = (wid - 1) * (hgt - 1) + 1;
  } else {
    var numBreakForMaxHexes = (wid - 1) * (hgt - 1) + 2;
  }

  var maxHexesForCurBreak = maxReq;

  var tempObs = obs;

  while (tempObs > numBreakForMaxHexes - 1) {
    maxHexesForCurBreak = maxHexesForCurBreak - 4;
    tempObs = tempObs - 2;
  }

  var valid = true;
  var errorMessage = "";

  // Validate that amount of puzzle elements are within the limits
  if (squ + sun + can > maxCells) {
    valid = false;
    errorMessage +=
      "Total number of squares, suns, and cancellations cannot exceed the number of cells.\n";
  }
  if (obs + req > maxEdges + maxNodes - 2) {
    valid = false;
    errorMessage +=
      "Total number of breaks and hexes cannot exceed the number of edges and nodes.\n";
  }

  // Validate puzzle elements for edges and nodes are within the rules
  if (req > maxHexesForCurBreak) {
    valid = false;
    errorMessage +=
      "Number of hexes must be smaller given the amount of breaks.\n";
  }

  // Validate puzzle elements for cells are within the rules
  if (squ != 0 && squ < col - 1) {
    valid = false;
    errorMessage +=
      "Number of squares must be greater than or equal to the number of colors.\n";
  }
  if (sun % 2 == 1 && can == 0) {
    valid = false;
    errorMessage +=
      "Number of suns must be even if there are no cancellations.\n";
  }

  if (sun % 2 == 0 && col == 2 && can > 0 && can % 2 == 1) {s
    valid = false;
    errorMessage +=
      "Number of cancellations must be zero if there are no puzzle elements to be cancelled.\n";
  }

  if (!valid) {
    alert(errorMessage);
  }

  return valid;
}

// Generate a puzzle with the given parameters
// puzzle: the puzzle object to be modified
// wid: width of the puzzle
// hgt: height of the puzzle 
// obs: number of obstacles
// req: number of required edges/nodes
// squ: number of squares
// sun: number of suns
// can: number of cancellations
// col: number of colors
// Updates the puzzle object and returns void
function genPuzzle(puzzle, wid, hgt, obs, req, squ, sun, can, col) {
  if (!validatePuzzle(wid, hgt, obs, req, squ, sun, can, col)) {
    return;
  }

  initPuzzle(puzzle, wid, hgt);

  var newHorEdges = puzzle.horEdges;
  var newVerEdges = puzzle.verEdges;
  var newNodes = puzzle.nodes;
  var newCells = puzzle.cells;

  // Randomly assign obstacles to vertical and horizontal edges
  while (obs > 0) {
    var x = Math.floor(Math.random() * puzzle.width);
    var y = Math.floor(Math.random() * puzzle.height);

    var edgeType = Math.floor(Math.random() * 2) == 0 ? 0 : 1; // 0: hor, 1: ver
    if (edgeType == 0) {
      if (horEdgeExists(x, y)) {
        newHorEdges[x][y] = EDGE_TYPE.OBSTACLE;
        obs--;
      }
    } else {
      if (verEdgeExists(x, y)) {
        newVerEdges[x][y] = EDGE_TYPE.OBSTACLE;
        obs--;
      }
    }
  }

  // Randomly assign required edges/nodes to edges and nodes
  while (req > 0) {
    var x = Math.floor(Math.random() * puzzle.width);
    var y = Math.floor(Math.random() * puzzle.height);

    var varType = Math.floor(Math.random() * 3); // 0: hor, 1: ver 2: node

    if (varType == 0) {
      if (horEdgeExists(x, y) && newHorEdges[x][y] == EDGE_TYPE.NORMAL) {
        newHorEdges[x][y] = EDGE_TYPE.REQUIRED;
        req--;
      }
    } else if (varType == 1) {
      if (verEdgeExists(x, y) && newVerEdges[x][y] == EDGE_TYPE.NORMAL) {
        newVerEdges[x][y] = EDGE_TYPE.REQUIRED;
        req--;
      }
    } else {
      if (newNodes[x][y].type == NODE_TYPE.NORMAL) {
        newNodes[x][y].type = NODE_TYPE.REQUIRED;
        req--;
      }
    }
  }

  // Ensure every color is assigned to at least one cell, but only if enough cells are available
  var colorsAssigned = new Set();
  var colorRange = Array.from(
    { length: Math.max(1, col - 2 + 1) },
    (_, i) => i + 2
  );

  // Limit the number of colors to the number of available cells
  var colorsToAssign = colorRange.slice(0, Math.min(squ, colorRange.length));

  // Assign one cell for each color in the limited range
  for (var color of colorsToAssign) {
    while (true) {
      var x = Math.floor(Math.random() * (puzzle.width - 1));
      var y = Math.floor(Math.random() * (puzzle.height - 1));

      if (newCells[x][y].type == CELL_TYPE.NONE) {
        newCells[x][y].type = CELL_TYPE.SQUARE;
        newCells[x][y].color = color;
        colorsAssigned.add(color);
        squ--;
        break;
      }
    }
  }

  // Randomly assign the remaining sqaures to cells
  while (squ > 0) {
    var x = Math.floor(Math.random() * (puzzle.width - 1));
    var y = Math.floor(Math.random() * (puzzle.height - 1));

    if (newCells[x][y].type == CELL_TYPE.NONE) {
      newCells[x][y].type = CELL_TYPE.SQUARE;

      // Assign a random color from the range
      var colorIndex = Math.floor(Math.random() * Math.max(1, col - 2 + 1) + 2);
      newCells[x][y].color = colorIndex;

      squ--;
    }
  }

  // Randomly assign the suns to cells
  while (sun > 0) {
    var x = Math.floor(Math.random() * (puzzle.width - 1));
    var y = Math.floor(Math.random() * (puzzle.height - 1));

    if (newCells[x][y].type == CELL_TYPE.NONE) {
      newCells[x][y].type = CELL_TYPE.SUN;
      newCells[x][y].color = CELL_COLOR.BLACK;
      sun--;
    }
  }

  // Randomly assign the cancellations to cells
  while (can > 0) {
    var x = Math.floor(Math.random() * (puzzle.width - 1));
    var y = Math.floor(Math.random() * (puzzle.height - 1));

    if (newCells[x][y].type == CELL_TYPE.NONE) {
      newCells[x][y].type = CELL_TYPE.CANCELLATION;
      newCells[x][y].color = CELL_COLOR.WHITE;
      can--;
    }
  }

  puzzle.horEdge = newHorEdges;
  puzzle.verEdge = newVerEdges;
  puzzle.nodes = newNodes;
  puzzle.cells = newCells;
}

function initNodes(puzzle) {
  puzzle.nodes = create2DArray(puzzle.width, puzzle.height);

  for (var x = 0; x < puzzle.width; x++) {
    for (var y = 0; y < puzzle.height; y++) {
      puzzle.nodes[x][y] = { type: NODE_TYPE.NORMAL };
    }
  }
}

function initEdges(puzzle) {
  puzzle.horEdges = create2DArray(puzzle.width - 1, puzzle.height);

  for (var x = 0; x < puzzle.width - 1; x++) {
    for (var y = 0; y < puzzle.height; y++) {
      puzzle.horEdges[x][y] = EDGE_TYPE.NORMAL;
    }
  }

  puzzle.verEdges = create2DArray(puzzle.width, puzzle.height - 1);

  for (var x = 0; x < puzzle.width; x++) {
    for (var y = 0; y < puzzle.height - 1; y++) {
      puzzle.verEdges[x][y] = EDGE_TYPE.NORMAL;
    }
  }
}

function initCells(puzzle) {
  puzzle.cells = create2DArray(puzzle.width - 1, puzzle.height - 1);

  for (var x = 0; x < puzzle.width - 1; x++) {
    for (var y = 0; y < puzzle.height - 1; y++) {
      puzzle.cells[x][y] = { type: CELL_TYPE.NONE, color: CELL_COLOR.BLACK };
    }
  }
}

function horEdgeExists(x, y) {
  if (x < 0 || y < 0 || x >= puzzle.width - 1 || y >= puzzle.height)
    return false;
  return puzzle.horEdges[x][y] != EDGE_TYPE.OBSTACLE;
}

function verEdgeExists(x, y) {
  if (x < 0 || y < 0 || x >= puzzle.width || y >= puzzle.height - 1)
    return false;
  return puzzle.verEdges[x][y] != EDGE_TYPE.OBSTACLE;
}

function powerSet(list) {
  var set = [],
    listSize = list.length,
    combinationsCount = 1 << listSize,
    combination;

  for (var i = 0; i < combinationsCount; i++) {
    var combination = [];
    for (var j = 0; j < listSize; j++) {
      if (i & (1 << j)) {
        combination.push(list[j]);
      }
    }
    set.push(combination);
  }
  return set;
}
