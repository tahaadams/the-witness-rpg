# The Witness Random Puzzle Generator (RPG)

This is a tool for generating puzzles given a series of elements applied to the game enviornment
[The Witness](http://store.steampowered.com/app/210970/). It provides an
interface for inputting puzzles similar to the panels in the game. It generates a random permutation
provided the puzzle elements and finds the simplest solution to display on the grid.

You can try out the solver here:

https://tahaadams.github.io/the-witness-rpg/

## Algorithm

Currently a very simple branch-and-bound algorithm is used that walks through
all possible paths from each starting node and evaluates if the current path
forms a correct solution when it hits an exit node.

Apart from the brute forst BFS search, the algorithm that is the focus here is
the random puzzle generator, which utilizes principles of DFS  tree problems,
applying all the puzzle elements before determining whether or not it is solvable,
only that it immediately restarts at the initial node if the terminal branch fails
to meet the criteria of the goal state, effectively acting a constraint satisfaction problem.

## Formulation

The game environment is a WxH Grid consisting of four distinct 2D arrays.

### Horizontal Edges and Vertical Edges

-Connects nodes and form cells.
-Can contain Breaks and Hexes.
-Array of W*(H+1) and (W+1)*H sizes respectively.

### Nodes

-Vertices adjoined by Edges.
-Can contain Hexes. Array of (W+1)*(H+1) size.

### Cells

-Faces adjoined by Edges.
-Can contain Squares, Suns, or Ticks.
-Array of W*H size.

## Search Problem

The permutation found by the search problem is as follows.

### States

Consist of all permutations of the grid with the puzzle elements provided.

### Actions

The random placement of puzzle elements onto the grid in their respective array.

### Inital State

A W*H grid with pre-decided initial/goal vertices and a list of puzzle elements to be applied to the grid’s vertices/edges/faces.

### Transition Models

entering a new permutation from randomly placing the puzzle element onto the grid.

### Goal Test

Runs a brute force BFS to determine whether or not the permutation created from placing all puzzle elements onto the grid is solvable.

_(there is no path cost / edge / step cost necessary for this algorithm)_

## Puzzle Elements

This is a list of the mechanics as implemented by this solver:

### Path

The path must be a self-avoiding walk starting at a start node and ending at an end node.

### Breaks

The solution path cannot include the edge the break is on.

### Hexes

The solution path must include the node/edge the hex is on.

### Squares

The solution path must separate all different color squares. That is to say, the path must separate the game environment into connected components in which all cells in said components are of the same color.

### Color

Manages the amount of colors between squares.

### Suns

The solution path must isolate connected components such that a sun is paired with another.

### Cancellation symbols

When present, it must nullify one puzzle element contained within its connected component that would otherwise cause an error to the path's solution.

## Restrictions

- Ticks do not cancel Hexes.
- Ticks and Suns do not interact with the Color property (Suns are always Black, Ticks are always White)
- Starting node is always situated in the bottom-left, and the end-node is always situated in the top right.
