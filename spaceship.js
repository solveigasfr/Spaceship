/*

A simple version of an inertial, thrusty,
rotateable space ship/s

Thrust ship/s forward "W"
Thrust ship/s backfards "S"
Fly ship/s left "A" 
Fly ship/s right "D"
Halt ship/s by pressing a "H".
Reset ship/s to original coords "R"
Toggle off/on "extra" ships with "E"

Also possible to set ship/s position to that of the most recent mouse-click.

*/

"use strict";

/* jshint browser: true, devel: true, globalstrict: true */

var g_canvas = document.getElementById("myCanvas");
var g_ctx = g_canvas.getContext("2d");

/*
0        1         2         3         4         5         6         7         8         9
123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
*/

// =================
// KEYBOARD HANDLING
// =================

const g_keys = [];

function handleKeydown(evt) {
  const keyCode = evt.keyCode;
  g_keys[keyCode] = true;

  // Add/remove extra spaceships - E
  if (KEY_EXTRAS === keyCode) {
    g_useExtras = !g_useExtras;
  }
  // Turn on/off gravitatonial pull - G
  if (KEY_GRAVITY === keyCode) {
    g_useGravity = !g_useGravity;
    console.log("gravity on!");
  }
  // Allow mixed actions - M
  if (KEY_MIXED === keyCode) {
    g_allowMixedActions = !g_allowMixedActions;
  }
}

function handleKeyup(evt) {
  const keyCode = evt.keyCode;
  g_keys[keyCode] = false;
}

// Inspects, and then clears, a key's state
function eatKey(keyCode) {
  var isDown = g_keys[keyCode];
  g_keys[keyCode] = false;
  return isDown;
}

window.addEventListener("keydown", handleKeydown);
window.addEventListener("keyup", handleKeyup);

// ==============
// MOUSE HANDLING
// ==============

function handleMouse(evt) {
  // If no button is being pressed, then ignore
  if (!evt.which) return;

  var x = evt.clientX - g_canvas.offsetLeft;
  var y = evt.clientY - g_canvas.offsetTop;

  g_ship.cx = x;
  g_ship.cy = y;
}

// Handle "down" and "move" events the same way.
window.addEventListener("mousedown", handleMouse);
window.addEventListener("mousemove", handleMouse);

// ============
// SPRITE STUFF
// ============

// Construct a "sprite" from the given `image`
function Sprite(image) {
  this.halfwidth = image.naturalWidth / 2;
  this.halfheight = image.naturalHeight / 2;
  this.image = image;
}

Sprite.prototype.drawCentredAt = function (ctx, cx, cy, rotation) {
  if (rotation === undefined) rotation = 0;

  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(
    this.image,
    -this.halfwidth,
    -this.halfheight,
    this.image.width,
    this.image.height
  );
  ctx.rotate(-rotation);
  ctx.translate(-cx, -cy);
};

Sprite.prototype.drawWrappedCentredAt = function (ctx, cx, cy, rotation) {
  // Draw 8 phantom spaceships around spaceship
  const arr = [
    // Left top
    { x: -g_canvas.width, y: -g_canvas.height },
    // Left middle
    { x: -g_canvas.width, y: 0 },
    // Left bottom
    { x: -g_canvas.width, y: g_canvas.height },
    // Middle top
    { x: 0, y: -g_canvas.height },
    // Middle bottom
    { x: 0, y: g_canvas.height },
    // Right top
    { x: g_canvas.width, y: -g_canvas.height },
    // Right Middle
    { x: g_canvas.width, y: 0 },
    // Right bottom
    { x: g_canvas.width, y: g_canvas.height },
  ];

  for (let i = 0; i < arr.length; i++) {
    g_shipSprite.drawCentredAt(ctx, cx + arr[i].x, cy + arr[i].y, rotation);
  }
};

// ==========
// SHIP STUFF
// ==========

// A generic contructor which accepts an arbitrary descriptor object
function Ship(descr) {
  for (var property in descr) {
    this[property] = descr[property];
  }

  // Remember my reset positions
  this.reset_cx = this.cx;
  this.reset_cy = this.cy;
  this.reset_rotation = this.rotation;
}

Ship.prototype.KEY_THRUST = keyCode("W");
Ship.prototype.KEY_RETRO = keyCode("S");
Ship.prototype.KEY_LEFT = keyCode("A");
Ship.prototype.KEY_RIGHT = keyCode("D");

// Initial, inheritable, default values
Ship.prototype.rotation = 0;
Ship.prototype.velX = 0;
Ship.prototype.velY = 0;

Ship.prototype.update = function (du) {
  var thrust = this.computeThrustMag();

  // Apply thrust directionally, based on our rotation
  var accelX = +Math.sin(this.rotation) * thrust;
  var accelY = -Math.cos(this.rotation) * thrust;

  accelY += this.computeGravity();

  this.applyAccel(accelX, accelY, du);

  this.wrapPosition();

  if (thrust === 0 || g_allowMixedActions) {
    this.updateRotation(du);
  }
};

var NOMINAL_GRAVITY = 0.12;

Ship.prototype.computeGravity = function () {
  if (g_useGravity === true) {
    return NOMINAL_GRAVITY;
  }

  return 0;
};

var NOMINAL_THRUST = +0.2;
var NOMINAL_RETRO = -0.1;

Ship.prototype.computeThrustMag = function () {
  if (g_keys[this.KEY_THRUST] && g_keys[this.KEY_RETRO]) {
    return NOMINAL_THRUST + NOMINAL_RETRO;
  }

  // Thrust forward
  if (g_keys[this.KEY_THRUST]) {
    return NOMINAL_THRUST;
  }

  // Thrust backwards
  if (g_keys[this.KEY_RETRO]) {
    return NOMINAL_RETRO;
  }

  return 0;
};

Ship.prototype.applyAccel = function (accelX, accelY, du) {
  // Velocity calculations
  var velocityX = this.velX + accelX * du;
  var velocityY = this.velY + accelY * du;
  var vx = (velocityX + this.velX) / 2;
  var vy = (velocityY + this.velY) / 2;
  this.cx = this.cx + vx * du;
  this.cy = this.cy + vy * du;
  this.velX = vx;
  this.velY = vy;

  let shipRadius = g_shipSprite.halfheight;

  // If gravity is on ship/s will bounce off bottom of canvas
  if (g_useGravity) {
    if (this.cy + shipRadius >= g_canvas.height) {
      this.velY *= -0.9;
      this.cy = g_canvas.height - shipRadius;
    }
  }

  // If gravity is on ship/s will bounce off top of canvas
  if (g_useGravity) {
    if (this.cy - shipRadius <= 0) {
      this.velY *= -0.9;
      this.cy = 0 + shipRadius;
    }
  }
};

Ship.prototype.reset = function () {
  this.cx = this.reset_cx;
  this.cy = this.reset_cy;
  this.rotation = this.reset_rotation;

  this.halt();
};

Ship.prototype.halt = function () {
  this.velX = 0;
  this.velY = 0;
};

var NOMINAL_ROTATE_RATE = 0.1;

Ship.prototype.updateRotation = function (du) {
  if (g_keys[this.KEY_LEFT]) {
    this.rotation -= NOMINAL_ROTATE_RATE * du;
  }
  if (g_keys[this.KEY_RIGHT]) {
    this.rotation += NOMINAL_ROTATE_RATE * du;
  }
};

Ship.prototype.wrapPosition = function () {};

Ship.prototype.render = function (ctx) {
  // Normal render
  g_shipSprite.drawCentredAt(ctx, this.cx, this.cy, this.rotation);
  g_shipSprite.drawWrappedCentredAt(ctx, this.cx, this.cy, this.rotation);

  const shipHalfWidth = g_shipSprite.halfwidth;
  const shipHalfHeight = g_shipSprite.halfheight;
  const canH = g_canvas.height;
  const canW = g_canvas.width;

  const rightX = this.cx + shipHalfWidth;
  const leftX = this.cx - shipHalfWidth;
  const topY = this.cy - shipHalfHeight;
  const bottomY = this.cy + shipHalfHeight;

  // Adjusting phantom ships if ship goes off canvas
  if (rightX > g_canvas.width) {
    this.cx = rightX - canW - shipHalfWidth;
  }

  if (leftX < 0) {
    this.cx = leftX + canW + shipHalfWidth;
  }

  if (topY < 0) {
    this.cy = topY + canH + shipHalfHeight;
  }

  if (bottomY > canH) {
    this.cy = bottomY - canH - shipHalfHeight;
  }

  g_shipSprite.drawWrappedCentredAt(ctx, this.cx, this.cy, this.rotation);
};

// -------------------
// CONSTRUCT THE SHIPS
// -------------------

var g_ship = new Ship({
  cx: 140,
  cy: 200,
});

var g_extraShip1 = new Ship({
  cx: 200,
  cy: 200,
});

var g_extraShip2 = new Ship({
  cx: 260,
  cy: 200,
});

// =====
// UTILS
// =====

function clearCanvas(ctx) {
  var prevfillStyle = ctx.fillStyle;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = prevfillStyle;
}

function fillCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function fillBox(ctx, x, y, w, h, style) {
  var oldStyle = ctx.fillStyle;
  ctx.fillStyle = style;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = oldStyle;
}

function keyCode(keyChar) {
  return keyChar.charCodeAt(0);
}

// =============
// GATHER INPUTS
// =============

function gatherInputs() {
  // The event handlers do everything we need for now.
}

// --------------------------
// GAME-SPECIFIC UPDATE LOGIC
// --------------------------

function updateSimulation(du) {
  processDiagnostics();

  g_ship.update(du);

  if (!g_useExtras) return;

  g_extraShip1.update(du / 2);
  g_extraShip1.update(du / 2);

  g_extraShip2.update(du / 4);
  g_extraShip2.update(du / 4);
  g_extraShip2.update(du / 4);
  g_extraShip2.update(du / 4);
}

// -------------------------
// GAME-SPECIFIC DIAGNOSTICS
// -------------------------

let g_allowMixedActions = true;
let g_useExtras = true;
let g_useGravity = false;

const KEY_EXTRAS = keyCode("E");
const KEY_GRAVITY = keyCode("G");
const KEY_MIXED = keyCode("M");

const KEY_HALT = keyCode("H");
const KEY_RESET = keyCode("R");

function processDiagnostics() {
  // -------------------------
  // Find toggle key stuff in handleKeyDown
  // -------------------------

  // Reset spaceship/s location
  if (eatKey(KEY_RESET)) {
    g_ship.reset();
    g_extraShip1.reset();
    g_extraShip2.reset();
  }

  // Halt spaceship/s
  if (eatKey(KEY_HALT)) {
    g_ship.halt();
    g_extraShip1.halt();
    g_extraShip2.halt();
  }
}

// --------------------
// GENERIC UPDATE LOGIC
// --------------------

// The "nominal interval" is the one that all of our time-based units are
// calibrated to e.g. a velocity unit is "pixels per nominal interval"
var NOMINAL_UPDATE_INTERVAL = 16.666;

// Dt means "delta time" and is in units of the timer-system (i.e. milliseconds)
var g_prevUpdateDt = null;

// Du means "delta u", where u represents time in multiples of our nominal interval
var g_prevUpdateDu = null;

// Track odds and evens for diagnostic / illustrative purposes
var g_isUpdateOdd = false;

function update(dt) {
  // Get out if skipping (e.g. due to pause-mode)
  if (shouldSkipUpdate()) return;

  var original_dt = dt;

  // Warn about very large dt values -- they may lead to error
  if (dt > 200) {
    console.log("Big dt =", dt, ": CLAMPING TO NOMINAL");
    dt = NOMINAL_UPDATE_INTERVAL;
  }

  // If using variable time, divide the actual delta by the "nominal" rate,
  // giving us a conveniently scaled "du" to work with.
  var du = dt / NOMINAL_UPDATE_INTERVAL;

  updateSimulation(du);

  g_prevUpdateDt = original_dt;
  g_prevUpdateDu = du;

  g_isUpdateOdd = !g_isUpdateOdd;
}

// Togglable Pause Mode
var KEY_PAUSE = "P".charCodeAt(0);
var KEY_STEP = "O".charCodeAt(0);

var g_isUpdatePaused = false;

function shouldSkipUpdate() {
  if (eatKey(KEY_PAUSE)) {
    g_isUpdatePaused = !g_isUpdatePaused;
  }
  return g_isUpdatePaused && !eatKey(KEY_STEP);
}

// -----------------------
// GAME-SPECIFIC RENDERING
// -----------------------

function renderSimulation(ctx) {
  g_ship.render(ctx);

  if (!g_useExtras) return;

  g_extraShip1.render(ctx);
  g_extraShip2.render(ctx);
}

// -----------------
// GENERIC RENDERING
// -----------------

var g_doClear = true;
var g_doBox = false;
var g_undoBox = false;
var g_doFlipFlop = false;
var g_doRender = true;

var g_frameCounter = 1;

var TOGGLE_CLEAR = "C".charCodeAt(0);
var TOGGLE_BOX = "B".charCodeAt(0);
var TOGGLE_UNDO_BOX = "U".charCodeAt(0);
var TOGGLE_FLIPFLOP = "F".charCodeAt(0);
var TOGGLE_RENDER = "R".charCodeAt(0);

function render(ctx) {
  if (eatKey(TOGGLE_CLEAR)) g_doClear = !g_doClear;
  if (eatKey(TOGGLE_BOX)) g_doBox = !g_doBox;
  if (eatKey(TOGGLE_UNDO_BOX)) g_undoBox = !g_undoBox;
  if (eatKey(TOGGLE_FLIPFLOP)) g_doFlipFlop = !g_doFlipFlop;
  if (g_doClear) {
    clearCanvas(ctx);
  }

  // double-buffering prevents flicker!
  if (g_doBox) fillBox(ctx, 200, 200, 50, 50, "red");

  // The core rendering of the actual game / simulation
  if (g_doRender) renderSimulation(ctx);

  if (g_doFlipFlop) {
    var boxX = 250,
      boxY = g_isUpdateOdd ? 100 : 200;

    // Draw flip-flop box
    fillBox(ctx, boxX, boxY, 50, 50, "green");

    // Display the current frame-counter in the box...
    ctx.fillText(g_frameCounter % 1000, boxX + 10, boxY + 20);
    // ..and its odd/even status too
    var text = g_frameCounter % 2 ? "odd" : "even";
    ctx.fillText(text, boxX + 10, boxY + 40);
  }

  if (g_undoBox) ctx.clearRect(200, 200, 50, 50);

  ++g_frameCounter;
}

// =============
// PRELOAD STUFF
// =============

let g_shipSprite;

function preloadStuff_thenCall(completionCallback) {
  var g_shipImage = new Image();

  g_shipImage.onload = function () {
    g_shipSprite = new Sprite(g_shipImage);
    completionCallback();
  };

  g_shipImage.src = "https://notendur.hi.is/~pk/308G/images/ship.png";
}

// ========
// MAINLOOP
// ========

var g_main = {
  _frameTime_ms: null,
  _frameTimeDelta_ms: null,
};

// Perform one iteration of the mainloop
g_main.iter = function (frameTime) {
  // Use the given frameTime to update all of our game-clocks
  this._updateClocks(frameTime);

  // Perform the iteration core to do all the "real" work
  this._iterCore(this._frameTimeDelta_ms);

  // Diagnostics, such as showing current timer values etc.
  this._debugRender(g_ctx);

  // Request the next iteration if needed
  if (!this._isGameOver) this._requestNextIteration();
};

g_main._updateClocks = function (frameTime) {
  // First-time initialisation
  if (this._frameTime_ms === null) this._frameTime_ms = frameTime;

  // Track frameTime and its delta
  this._frameTimeDelta_ms = frameTime - this._frameTime_ms;
  this._frameTime_ms = frameTime;
};

g_main._iterCore = function (dt) {
  // Handle QUIT
  if (requestedQuit()) {
    this.gameOver();
    return;
  }

  gatherInputs();
  update(dt);
  render(g_ctx);
};

g_main._isGameOver = false;

g_main.gameOver = function () {
  this._isGameOver = true;
  console.log("gameOver: quitting...");
};

// Simple voluntary quit mechanism
var KEY_QUIT = "Q".charCodeAt(0);
function requestedQuit() {
  return g_keys[KEY_QUIT];
}

// Annoying shim for Firefox and Safari
window.requestAnimationFrame =
  window.requestAnimationFrame || // Chrome
  window.mozRequestAnimationFrame || // Firefox
  window.webkitRequestAnimationFrame; // Safari

function mainIterFrame(frameTime) {
  g_main.iter(frameTime);
}

g_main._requestNextIteration = function () {
  window.requestAnimationFrame(mainIterFrame);
};

// Mainloop-level debug-rendering
var TOGGLE_TIMER_SHOW = "T".charCodeAt(0);

g_main._doTimerShow = false;

g_main._debugRender = function (ctx) {
  if (eatKey(TOGGLE_TIMER_SHOW)) this._doTimerShow = !this._doTimerShow;

  if (!this._doTimerShow) return;

  var y = 350;
  ctx.fillText("FT " + this._frameTime_ms, 50, y + 10);
  ctx.fillText("FD " + this._frameTimeDelta_ms, 50, y + 20);
  ctx.fillText("UU " + g_prevUpdateDu, 50, y + 30);
  ctx.fillText("FrameSync ON", 50, y + 40);
};

g_main.init = function () {
  g_ctx.fillStyle = "white";

  this._requestNextIteration();
};

function mainInit() {
  g_main.init();
}

preloadStuff_thenCall(mainInit);
