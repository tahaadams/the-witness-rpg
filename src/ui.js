// Configuration
var radius;
var spacing;
var horPadding;
var verPadding;

var latestPath = [];
var viewingSolution = false;
var highlightedNodes = new Set();
var highlightedHorEdges = new Set();
var highlightedVerEdges = new Set();

var gridEl = $("svg");

// Retrieve stored grid size or use default
selectedGridSize = JSON.parse(sessionStorage.getItem("selectedGridSize")) || [
  5, 5,
];

// Retrieve stored values from sessionStorage or use defaults
var selectedNumObs = parseInt(sessionStorage.getItem("selectedNumObs")) || 0;
var selectedNumReq = parseInt(sessionStorage.getItem("selectedNumReq")) || 0;

var selectedNumSqu = parseInt(sessionStorage.getItem("selectedNumSqu")) || 0;
var selectedNumSun = parseInt(sessionStorage.getItem("selectedNumSun")) || 0;
var selectedNumCan = parseInt(sessionStorage.getItem("selectedNumCan")) || 0;

var selectedNumCol = parseInt(sessionStorage.getItem("selectedNumCol")) || 2;

// Default to 0 if no values are stored
selectedNumObs = selectedNumObs || 0;
selectedNumReq = selectedNumReq || 0;

selectedNumSqu = selectedNumSqu || 0;
selectedNumSun = selectedNumSun || 0;
selectedNumCan = selectedNumCan || 0;

selectedNumCol = selectedNumCol || 2;

function calculateMetrics() {
  radius = 88 / Math.max(6, Math.max(puzzle.width, puzzle.height));
  spacing = 800 / (Math.max(puzzle.width, puzzle.height) + 1);
  horPadding = (800 - spacing * (puzzle.width - 1)) / 2;
  verPadding = (800 - spacing * (puzzle.height - 1)) / 2;
}

// X index to X position on visual grid for nodes
function nodeX(x) {
  return horPadding + spacing * x;
}

// Y index to Y position on visual grid for nodes
function nodeY(y) {
  return verPadding + spacing * y;
}

function deepMap(arr, fn) {
  if (typeof arr == "object" && arr.length !== undefined) {
    var arr = arr.slice();

    for (var i = 0; i < arr.length; i++) {
      arr[i] = deepMap(arr[i], fn);
    }

    return arr;
  } else {
    return fn(arr);
  }
}

function num2bool(n) {
  return !!n;
}

function bool2num(b) {
  return +b;
}

// Update URL that allows people to link puzzles
// These use the legacy format for compatibility
function updateURL() {
  var encoding = {
    gridWidth: puzzle.width,
    gridHeight: puzzle.height,
    horEdges: deepMap(puzzle.horEdges, function (n) {
      return n;
    }),
    verEdges: deepMap(puzzle.verEdges, function (n) {
      return n;
    }),
    nodeTypes: deepMap(puzzle.nodes, function (n) {
      return n.type;
    }),
    cellTypes: deepMap(puzzle.cells, function (c) {
      return { type: c.type, color: c.color };
    }),
    selectedNumObs: selectedNumObs,
    selectedNumReq: selectedNumReq,

    selectedNumSqu: selectedNumSqu,
    selectedNumSun: selectedNumSun,
    selectedNumCan: selectedNumCan,

    selectedNumCol: selectedNumCol,
  };

  encoding = btoa(JSON.stringify(encoding));
  location.hash = "#" + encoding;
}

// Parse URL to restore puzzle state
// This uses the legacy format for compatibility
function parseFromURL() {
  try {
    var encoding = JSON.parse(atob(location.hash.substr(1)));

    // Restore grid size
    selectedGridSize = [encoding.gridWidth, encoding.gridHeight];
    sessionStorage.setItem(
      "selectedGridSize",
      JSON.stringify(selectedGridSize)
    );

    // Restore selectedNum variables
    selectedNumObs = encoding.selectedNumObs || 0;
    selectedNumReq = encoding.selectedNumReq || 0;

    selectedNumSqu = encoding.selectedNumSqu || 0;
    selectedNumSun = encoding.selectedNumSun || 0;
    selectedNumCan = encoding.selectedNumCan || 0;

    selectedNumCol = encoding.selectedNumCol || 2;

    sessionStorage.setItem("selectedNumObs", selectedNumObs);
    sessionStorage.setItem("selectedNumReq", selectedNumReq);

    sessionStorage.setItem("selectedNumSqu", selectedNumSqu);
    sessionStorage.setItem("selectedNumSun", selectedNumSun);
    sessionStorage.setItem("selectedNumCan", selectedNumCan);

    sessionStorage.setItem("selectedNumCol", selectedNumCol);

    // Initialize the puzzle
    initPuzzle(puzzle, encoding.gridWidth, encoding.gridHeight);

    puzzle.horEdges = deepMap(encoding.horEdges, function (t) {
      return t;
    });
    puzzle.verEdges = deepMap(encoding.verEdges, function (t) {
      return t;
    });
    puzzle.nodes = deepMap(encoding.nodeTypes, function (t) {
      return { type: t };
    });
    puzzle.cells = deepMap(encoding.cellTypes, function (t) {
      return t;
    });

    updateVisualGrid();

    return true;
  } catch (e) {
    console.error("Invalid puzzle URL provided:", e);
    alert("Invalid puzzle URL provided! Displaying the default puzzle.");
    return false;
  }
}

// Update visualization of grid
function updateVisualGrid() {
  updateURL();

  // Remove old grid
  $("svg").empty();

  addVisualGridCells();

  // Draw highlighted edges over other edges
  addVisualGridEdges(false);
  addVisualGridEdges(true);

  addVisualGridPoints();

  // Re-render SVG
  $("svg").html($("svg").html());

  // Elements are now ready for adding event handlers
  addGridEventHandlers();
}

function addVisualGridCells() {
  for (var x = 0; x < puzzle.width - 1; x++) {
    for (var y = 0; y < puzzle.height - 1; y++) {
      var baseEl = $("<rect />")
        .attr("class", "cell")
        .attr("data-x", x)
        .attr("data-y", y)
        .attr("x", nodeX(x))
        .attr("y", nodeY(y))
        .attr("width", spacing)
        .attr("height", spacing)
        .attr("rx", radius / 2)
        .attr("ry", radius / 2)
        .css("fill", "rgba(0, 0, 0, 0)")
        .appendTo(gridEl);

      if (puzzle.cells[x][y].type == CELL_TYPE.SQUARE) {
        addVisualSquareCell(x, y, baseEl);
      } else if (puzzle.cells[x][y].type == CELL_TYPE.SUN) {
        addVisualSunCell(x, y, baseEl);
      } else if (puzzle.cells[x][y].type == CELL_TYPE.CANCELLATION) {
        addVisualCancellationCell(x, y, baseEl);
      }
    }
  }
}

function addVisualSquareCell(x, y, baseEl) {
  var iconEl = baseEl
    .clone()
    .attr("x", nodeX(x) + spacing / 2 - spacing / 8)
    .attr("y", nodeY(y) + spacing / 2 - spacing / 8)
    .attr("width", spacing / 4)
    .attr("height", spacing / 4)
    .appendTo(gridEl);

  iconEl.css("fill", getColorString(puzzle.cells[x][y].color));
}

function addVisualSunCell(x, y, baseEl) {
  var cx = nodeX(x) + spacing / 2;
  var cy = nodeY(y) + spacing / 2;

  var iconEl = baseEl
    .clone()
    .attr("x", cx - spacing / 8)
    .attr("y", cy - spacing / 8)
    .attr("width", spacing / 4)
    .attr("height", spacing / 4)
    .attr("rx", 0)
    .attr("ry", 0)
    .css("fill", getColorString(puzzle.cells[x][y].color));

  var iconEl2 = iconEl.clone();
  iconEl2.css(
    "transform",
    "translate(" +
      cx +
      "px, " +
      cy +
      "px) rotate(45deg) translate(" +
      -cx +
      "px, " +
      -cy +
      "px)"
  );

  iconEl.appendTo(gridEl);
  iconEl2.appendTo(gridEl);
}

function addVisualCancellationCell(x, y, baseEl) {
  var cx = nodeX(x) + spacing / 2;
  var cy = nodeY(y) + spacing / 2;

  var iconEl = $("<line/>")
    .attr("class", "cell")
    .attr("data-x", baseEl.attr("data-x"))
    .attr("data-y", baseEl.attr("data-y"))
    .attr("x1", cx)
    .attr("x2", cx)
    .attr("y1", cy)
    .attr("y2", cy - spacing / 8)
    .attr("stroke-width", "10px")
    .attr("stroke", getColorString(puzzle.cells[x][y].color));

  var iconEl2 = iconEl.clone();
  var iconEl3 = iconEl.clone();
  iconEl2.css(
    "transform",
    "translate(" +
      cx +
      "px, " +
      cy +
      "px) rotate(120deg) translate(" +
      -cx +
      "px, " +
      -cy +
      "px)"
  );
  iconEl3.css(
    "transform",
    "translate(" +
      cx +
      "px, " +
      cy +
      "px) rotate(240deg) translate(" +
      -cx +
      "px, " +
      -cy +
      "px)"
  );

  iconEl.appendTo(gridEl);
  iconEl2.appendTo(gridEl);
  iconEl3.appendTo(gridEl);
}

function addVisualGridEdges(drawHighlighted) {
  // Set up horizontal edges
  for (var x = 0; x < puzzle.width - 1; x++) {
    for (var y = 0; y < puzzle.height; y++) {
      var highlighted = highlightedHorEdges.has(point(x, y));

      if (highlighted != drawHighlighted) continue;

      var baseEl = $("<rect />")
        .attr("class", "edge")
        .attr("data-type", "hor-edge")
        .attr("data-x", x)
        .attr("data-y", y)
        .attr("x", nodeX(x))
        .attr("y", nodeY(y) - radius)
        .attr("width", spacing)
        .attr("height", radius * 2)
        .css("fill", highlighted ? "#ffffff" : "#1b3439")
        .appendTo(gridEl);

      if (puzzle.horEdges[x][y] == EDGE_TYPE.OBSTACLE) {
        baseEl
          .clone()
          .attr("x", nodeX(x) + spacing / 2 - radius)
          .attr("width", radius * 2)
          .attr("y", nodeY(y) - radius - 2)
          .attr("height", radius * 2 + 4)
          .css("fill", "#00a27d")
          .appendTo(gridEl);
      } else if (puzzle.horEdges[x][y] == EDGE_TYPE.REQUIRED) {
        var r = radius * 0.8;
        var hr = radius * 0.5;

        var path = "";
        path += "M " + (nodeX(x) + spacing / 2 + radius) + " " + nodeY(y);
        path += "l " + -hr + " " + r;
        path += "h " + -r;
        path += "l " + -hr + " " + -r;
        path += "l " + hr + " " + -r;
        path += "h " + r;
        path += "l " + hr + " " + r;

        $("<path />")
          .attr("class", "edge")
          .attr("data-type", "hor-edge")
          .attr("data-x", x)
          .attr("data-y", y)
          .css("fill", highlightedNodes.has(point(x, y)) ? "#ffffff" : "black")
          .attr("d", path)
          .appendTo(gridEl);
      }
    }
  }

  // Set up vertical edges
  for (var x = 0; x < puzzle.width; x++) {
    for (var y = 0; y < puzzle.height - 1; y++) {
      var highlighted = highlightedVerEdges.has(point(x, y));

      if (highlighted != drawHighlighted) continue;

      var baseEl = $("<rect />")
        .attr("class", "edge")
        .attr("data-type", "ver-edge")
        .attr("data-x", x)
        .attr("data-y", y)
        .attr("x", nodeX(x) - radius)
        .attr("y", nodeY(y))
        .attr("width", radius * 2)
        .attr("height", spacing)
        .css("fill", highlighted ? "#ffffff" : "#1b3439")
        .appendTo(gridEl);

      if (puzzle.verEdges[x][y] == EDGE_TYPE.OBSTACLE) {
        baseEl
          .clone()
          .attr("y", nodeY(y) + spacing / 2 - radius)
          .attr("height", radius * 2)
          .attr("x", nodeX(x) - radius - 2)
          .attr("width", radius * 2 + 4)
          .css("fill", "#00a27d")
          .appendTo(gridEl);
      } else if (puzzle.verEdges[x][y] == EDGE_TYPE.REQUIRED) {
        var r = radius * 0.8;
        var hr = radius * 0.5;

        var path = "";
        path += "M " + (nodeX(x) + radius - 2) + " " + (nodeY(y) + spacing / 2);
        path += "l " + -hr + " " + r;
        path += "h " + -r;
        path += "l " + -hr + " " + -r;
        path += "l " + hr + " " + -r;
        path += "h " + r;
        path += "l " + hr + " " + r;

        $("<path />")
          .attr("class", "edge")
          .attr("data-type", "ver-edge")
          .attr("data-x", x)
          .attr("data-y", y)
          .css("fill", highlightedNodes.has(point(x, y)) ? "#ffffff" : "black")
          .attr("d", path)
          .appendTo(gridEl);
      }
    }
  }
}

function addVisualGridPoints() {
  for (var x = 0; x < puzzle.width; x++) {
    for (var y = 0; y < puzzle.height; y++) {
      // Create base node for event handling
      var baseEl = $("<circle />")
        .attr("class", "node")
        .attr("data-x", x)
        .attr("data-y", y)
        .attr("cx", nodeX(x))
        .attr("cy", nodeY(y))
        .attr("r", radius)
        .css("fill", highlightedNodes.has(point(x, y)) ? "#ffffff" : "#1b3439")
        .appendTo(gridEl);

      // Extend visualization based on special node types
      if (puzzle.nodes[x][y].type == NODE_TYPE.START) {
        baseEl.attr("r", radius * 2);
      } else if (puzzle.nodes[x][y].type == NODE_TYPE.REQUIRED) {
        var r = radius * 0.8;
        var hr = radius * 0.5;

        var path = "";
        path += "M " + (nodeX(x) + r) + " " + nodeY(y);
        path += "l " + -hr + " " + r;
        path += "h " + -r;
        path += "l " + -hr + " " + -r;
        path += "l " + hr + " " + -r;
        path += "h " + r;
        path += "l " + hr + " " + r;

        $("<path />")
          .attr("class", "node")
          .attr("data-x", x)
          .attr("data-y", y)
          .css("fill", highlightedNodes.has(point(x, y)) ? "#ffffff" : "black")
          .attr("d", path)
          .appendTo(gridEl);
      } else if (puzzle.nodes[x][y].type == NODE_TYPE.EXIT) {
        var ang = 0;

        if (x == 0) ang = 0;
        else if (x == puzzle.width - 1) ang = 180;

        if (y == 0) ang = 90;
        else if (y == puzzle.height - 1) ang = -90;

        // Diagonally for corner nodes
        if (x == 0 && y == 0) ang -= 45;
        else if (x == 0 && y == puzzle.height - 1) ang += 45;
        else if (x == puzzle.width - 1 && y == 0) ang += 45;
        else if (x == puzzle.width - 1 && y == puzzle.height - 1) ang -= 45;

        var parentEl = $("<g />")
          .css(
            "transform",
            "translate(" +
              nodeX(x) +
              "px, " +
              nodeY(y) +
              "px) rotate(" +
              ang +
              "deg) translate(" +
              -nodeX(x) +
              "px, " +
              -nodeY(y) +
              "px)"
          )
          .appendTo(gridEl);

        $("<rect />")
          .attr("class", "node")
          .attr("data-x", x)
          .attr("data-y", y)
          .attr("x", nodeX(x) - radius * 2)
          .attr("y", nodeY(y) - radius)
          .attr("width", radius * 2)
          .attr("height", radius * 2)
          .css(
            "fill",
            highlightedNodes.has(point(x, y)) ? "#ffffff" : "#1b3439"
          )
          .appendTo(parentEl);

        $("<circle />")
          .attr("class", "node")
          .attr("data-x", x)
          .attr("data-y", y)
          .attr("cx", nodeX(x) - radius * 2)
          .attr("cy", nodeY(y))
          .attr("r", radius)
          .css(
            "fill",
            highlightedNodes.has(point(x, y)) ? "#ffffff" : "#1b3439"
          )
          .appendTo(parentEl);
      }
    }
  }
}

function addGridEventHandlers() {
  $(".cell").click(function () {
    if (viewingSolution) return;

    var x = +this.getAttribute("data-x");
    var y = +this.getAttribute("data-y");

    puzzle.cells[x][y].type =
      (puzzle.cells[x][y].type + 1) % (CELL_TYPE.LAST + 1);

    updateVisualGrid();
  });
  $(".cell").contextmenu(function (e) {
    if (viewingSolution) return;

    var x = +this.getAttribute("data-x");
    var y = +this.getAttribute("data-y");

    puzzle.cells[x][y].color =
      (puzzle.cells[x][y].color + 1) % (CELL_COLOR.LAST + 1);

    updateVisualGrid();
  });

  $("rect").contextmenu(function () {
    return false;
  });

  $(".edge").click(function () {
    if (viewingSolution) return;

    var type = this.getAttribute("data-type");
    var x = +this.getAttribute("data-x");
    var y = +this.getAttribute("data-y");

    if (type == "hor-edge") {
      puzzle.horEdges[x][y] =
        (puzzle.horEdges[x][y] + 1) % (EDGE_TYPE.LAST + 1);
    } else if (type == "ver-edge") {
      puzzle.verEdges[x][y] =
        (puzzle.verEdges[x][y] + 1) % (EDGE_TYPE.LAST + 1);
    }

    updateVisualGrid();
  });

  $(".node").click(function () {
    if (viewingSolution) return;

    var x = +this.getAttribute("data-x");
    var y = +this.getAttribute("data-y");

    puzzle.nodes[x][y].type =
      (puzzle.nodes[x][y].type + 1) % (NODE_TYPE.LAST + 1);

    // Only outer nodes can be exits
    if (puzzle.nodes[x][y].type == NODE_TYPE.EXIT) {
      if (x != 0 && y != 0 && x != puzzle.width - 1 && y != puzzle.height - 1) {
        puzzle.nodes[x][y].type = NODE_TYPE.NORMAL;
      }
    }

    updateVisualGrid();
  });
}

// Function to solve the puzzle
// This function is called when the "Solve" button is clicked
function solve(fractionChange) {
  if (!fractionChange) {
    $("#solve-button").val("Solving...").prop("disabled", true);
  }

  // Allows browser to redraw button before starting computation
  setTimeout(function () {
    actualSolve(fractionChange);
  }, 0);
}

// Function to find the solution to the puzzle
// This function is called by the solve function
// It uses a branch and bound algorithm to search for the solution
// The function returns the path to the solution if found, or false if no solution exists
function actualSolve(fractionChange) {
  // Search for solution using branch and bound algorithm
  if (!fractionChange) {
    var start = +new Date();
    latestPath = findSolution();
    var end = +new Date();
    console.log("solving took " + (end - start) + " ms");
  }

  highlightedNodes.clear();
  highlightedHorEdges.clear();
  highlightedVerEdges.clear();

  if (latestPath) {
    path = latestPath.slice(0, Math.ceil(latestPath.length));
    x;
    // Do it in updateVisualGrid instead and mark edges as selected (draw those later)
    for (var i = 0; i < path.length; i++) {
      var cur = path[i];
      var next = path[i + 1];

      // Highlight visited node
      highlightedNodes.add(point(cur.x, cur.y));

      // Highlight edge to next node
      if (next) {
        if (next.x > cur.x) highlightedHorEdges.add(point(cur.x, cur.y));
        if (next.x < cur.x) highlightedHorEdges.add(point(next.x, next.y));
        if (next.y > cur.y) highlightedVerEdges.add(point(cur.x, cur.y));
        if (next.y < cur.y) highlightedVerEdges.add(point(next.x, next.y));
      }
    }

    viewingSolution = true;

    updateVisualGrid();
  } else {
    viewingSolution = false;

    updateVisualGrid();

    alert("No solution!");
  }

  $("#solve-button").val("Solve").prop("disabled", false);
}

function clearSolution() {
  highlightedNodes.clear();
  highlightedHorEdges.clear();
  highlightedVerEdges.clear();

  viewingSolution = false;

  updateVisualGrid();
}

// Set up UI controls
$("#solve-button").click(function () {
  solve();
});
$("#clear-button").click(clearSolution);
$("#gen-button").click(function () {
  generate();
});

// Set up grid size and number of obstacles selectors
var gridSizeSelector = $("#grid-size-selector");

var obsNumSelector = $("#obs-num-selector");
var reqNumSelector = $("#req-num-selector");

var squNumSelector = $("#squ-num-selector");
var sunNumSelector = $("#sun-num-selector");
var canNumSelector = $("#can-num-selector");

var colNumSelector = $("#col-num-selector");

for (var x = 1; x <= 6; x++) {
  for (var y = 1; y <= 6; y++) {
    var el = $(
      '<option value="' +
        (x + 1) +
        "," +
        (y + 1) +
        '">' +
        x +
        " x " +
        y +
        " Grid</option>"
    ).appendTo(gridSizeSelector);
  }
}

for (var x = 1; x <= 7; x++) {
  if (x == 1) {
    var el = $(
      '<option value="' + (x + 1) + '">' + x + " Color</option>"
    ).appendTo(colNumSelector);
  } else {
    var el = $(
      '<option value="' + (x + 1) + '">' + x + " Colors</option>"
    ).appendTo(colNumSelector);
  }
}

// Initialize previousGridSize to the current grid size
var previousGridSize = [...selectedGridSize];

// This function is called when the grid size changes
// It updates the maximum number of puzzle elements based on the grid size
function updateNumSelectors(width, height) {
  // Check if the grid size has changed
  if (previousGridSize[0] !== width || previousGridSize[1] !== height) {
    // Reset selectedNum variables to 0 if grid size changes
    selectedNumObs = 0;
    selectedNumReq = 0;

    selectedNumSqu = 0;
    selectedNumSun = 0;
    selectedNumCan = 0;

    selectedNumCol = 2;

    // Save the reset values to sessionStorage
    sessionStorage.setItem("selectedNumObs", selectedNumObs);
    sessionStorage.setItem("selectedNumReq", selectedNumReq);

    sessionStorage.setItem("selectedNumSqu", selectedNumSqu);
    sessionStorage.setItem("selectedNumSun", selectedNumSun);
    sessionStorage.setItem("selectedNumCan", selectedNumCan);

    sessionStorage.setItem("selectedNumCol", selectedNumCol);

    // Update the grid size
    selectedGridSize = [width, height];
    sessionStorage.setItem(
      "selectedGridSize",
      JSON.stringify(selectedGridSize)
    );

    // Update previousGridSize to the new grid size
    previousGridSize = [...selectedGridSize];
  }

  var maxNodes = width * height;
  var maxEdges = width * (height - 1) + height * (width - 1);
  var maxCells = (width - 1) * (height - 1);

  var maxObs = maxEdges - (width - 1) - (height - 1);
  var maxReq = maxNodes + maxEdges - 2;

  if ((width - 1) % 2 == 0 || (height - 1) % 2 == 0) {
    maxReq = maxReq - (width - 1) * (height - 1);
  } else {
    maxReq = maxReq - (width - 1) * (height - 1) - 2;
  }

  // Clear existing options before adding new ones
  obsNumSelector.empty();
  reqNumSelector.empty();

  squNumSelector.empty();
  sunNumSelector.empty();
  canNumSelector.empty();

  // Retrieve stored values or use defaults
  selectedNumObs =
    parseInt(sessionStorage.getItem("selectedNumObs")) || selectedNumObs;
  selectedNumReq =
    parseInt(sessionStorage.getItem("selectedNumReq")) || selectedNumReq;

  selectedNumSqu =
    parseInt(sessionStorage.getItem("selectedNumSqu")) || selectedNumSqu;
  selectedNumSun =
    parseInt(sessionStorage.getItem("selectedNumSun")) || selectedNumSun;
  selectedNumCan =
    parseInt(sessionStorage.getItem("selectedNumCan")) || selectedNumCan;

  selectedNumCol =
    parseInt(sessionStorage.getItem("selectedNumCol")) || selectedNumCol;

  // Add new options based on the grid size (width x height)
  for (var x = 0; x <= maxObs; x++) {
    $(
      '<option value="' +
        x +
        '">' +
        x +
        (x === 1 ? " Break" : " Breaks") +
        "</option>"
    ).appendTo(obsNumSelector);
  }
  for (var x = 0; x <= maxReq; x++) {
    $(
      '<option value="' +
        x +
        '">' +
        x +
        (x === 1 ? " Hex" : " Hexes") +
        "</option>"
    ).appendTo(reqNumSelector);
  }
  for (var x = 0; x <= maxCells; x++) {
    $(
      '<option value="' +
        x +
        '">' +
        x +
        (x === 1 ? " Square" : " Squares") +
        "</option>"
    ).appendTo(squNumSelector);
    $(
      '<option value="' +
        x +
        '">' +
        x +
        (x === 1 ? " Sun" : " Suns") +
        "</option>"
    ).appendTo(sunNumSelector);
    $(
      '<option value="' +
        x +
        '">' +
        x +
        (x === 1 ? " Tick" : " Ticks") +
        "</option>"
    ).appendTo(canNumSelector);
  }

  // Update selectors with stored or default values
  obsNumSelector.val(selectedNumObs);
  reqNumSelector.val(selectedNumReq);

  squNumSelector.val(selectedNumSqu);
  sunNumSelector.val(selectedNumSun);
  canNumSelector.val(selectedNumCan);

  colNumSelector.val(selectedNumCol);
}

obsNumSelector.change(function () {
  selectedNumObs = +this.value;
  sessionStorage.setItem("selectedNumObs", selectedNumObs);
});
reqNumSelector.change(function () {
  selectedNumReq = +this.value;
  sessionStorage.setItem("selectedNumReq", selectedNumReq);
});

squNumSelector.change(function () {
  selectedNumSqu = +this.value;
  sessionStorage.setItem("selectedNumSqu", selectedNumSqu);
});
sunNumSelector.change(function () {
  selectedNumSun = +this.value;
  sessionStorage.setItem("selectedNumSun", selectedNumSun);
});
canNumSelector.change(function () {
  selectedNumCan = +this.value;
  sessionStorage.setItem("selectedNumCan", selectedNumCan);
});

colNumSelector.change(function () {
  selectedNumCol = +this.value;
  sessionStorage.setItem("selectedNumCol", selectedNumCol);
});

gridSizeSelector.change(function () {
  var x = +this.value.split(",")[0];
  var y = +this.value.split(",")[1];

  selectedGridSize = [x, y];
  sessionStorage.setItem("selectedGridSize", JSON.stringify(selectedGridSize));

  updateNumSelectors(x, y);
});

function generate(fractionChange) {
  if (!fractionChange) {
    $("#gen-button").val("Generating...").prop("disabled", true);
  }

  // Allows browser to redraw button before starting computation
  setTimeout(function () {
    clearSolution();
    actualGenerate();
  }, 0);
}

function actualGenerate() {
  genPuzzle(
    puzzle,
    selectedGridSize[0],
    selectedGridSize[1],
    selectedNumObs,
    selectedNumReq,
    selectedNumSqu,
    selectedNumSun,
    selectedNumCan,
    selectedNumCol
  );

  const startTime = Date.now(); // Record the start time

  while (findSolution() === false) {
    // Check if five minutes has passed
    if (Date.now() - startTime > 600000) {
      alert(
        "The permutation was difficult to find. You can try generating again or creating the puzzle yourself above."
      );
      // Reset the puzzle to its initial state
      initPuzzle(puzzle, selectedGridSize[0], selectedGridSize[1]);
      break; // Exit the function
    }
    genPuzzle(
      puzzle,
      selectedGridSize[0],
      selectedGridSize[1],
      selectedNumObs,
      selectedNumReq,
      selectedNumSqu,
      selectedNumSun,
      selectedNumCan,
      selectedNumCol
    );
  }

  updateVisualGrid();

  $("#gen-button").val("Generate").prop("disabled", false);
}

// Initialize the puzzle and set up event handlers
// This function is called when the page loads
// It checks if the URL hash contains valid puzzle data and restores the state if so
// Otherwise, it retrieves stored values from sessionStorage or uses defaults
function initialize() {
  // Check if the URL hash contains valid puzzle data
  if (location.hash.length > 0 && parseFromURL()) {
    // Values will be restored from the URL hash by parseFromURL
    return;
  }

  // Retrieve stored grid size or use default
  selectedGridSize = JSON.parse(sessionStorage.getItem("selectedGridSize")) || [
    5, 5,
  ];

  // Retrieve stored values for selectedNum variables or use defaults
  selectedNumObs = parseInt(sessionStorage.getItem("selectedNumObs")) || 0;
  selectedNumReq = parseInt(sessionStorage.getItem("selectedNumReq")) || 0;

  selectedNumSqu = parseInt(sessionStorage.getItem("selectedNumSqu")) || 0;
  selectedNumSun = parseInt(sessionStorage.getItem("selectedNumSun")) || 0;
  selectedNumCan = parseInt(sessionStorage.getItem("selectedNumCan")) || 0;

  selectedNumCol = parseInt(sessionStorage.getItem("selectedNumCol")) || 2;

  // Generate the puzzle if no valid hash is provided
  actualGenerate();
}

// Initialize the puzzle and set up event handlers
// This function is called when the page loads for the first time
// It checks if the URL hash contains valid puzzle data and restores the state if so
// Otherwise, it retrieves stored values from sessionStorage or uses defaults
function setup() {
  // Function to generate a unique session key based on the current URL
  function getSessionKey() {
    return `initialized_${location.pathname}${location.search}${location.hash}`;
  }

  // Generate the initial session key
  let sessionKey = getSessionKey();

  updateNumSelectors(selectedGridSize[0], selectedGridSize[1]);
  // Check if the page is being opened for the first time with this URL
  if (!sessionStorage.getItem(sessionKey)) {
    // Perform one-time initialization
    sessionStorage.setItem("selectedNumObs", 4);
    sessionStorage.setItem("selectedNumReq", 4);

    sessionStorage.setItem("selectedNumSqu", 4);
    sessionStorage.setItem("selectedNumSun", 4);
    sessionStorage.setItem("selectedNumCan", 4);

    sessionStorage.setItem("selectedNumCol", 5);

    obsNumSelector.val(sessionStorage.getItem("selectedNumObs"));
    reqNumSelector.val(sessionStorage.getItem("selectedNumReq"));

    squNumSelector.val(sessionStorage.getItem("selectedNumSqu"));
    sunNumSelector.val(sessionStorage.getItem("selectedNumSun"));
    canNumSelector.val(sessionStorage.getItem("selectedNumCan"));

    colNumSelector.val(sessionStorage.getItem("selectedNumCol"));

    // Set the initialization flag for this specific URL
    sessionStorage.setItem(sessionKey, "true");
  }

  // Ensure the session key is updated dynamically when the URL changes
  window.addEventListener("hashchange", () => {
    sessionKey = getSessionKey();
    sessionStorage.setItem(sessionKey, "true");
  });
}
