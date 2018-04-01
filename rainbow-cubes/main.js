function Event(name, data) {
  this.time = performance.now();
  this.name = name;
  this.data = data;
};

function EventLoop() {
  this.eventBuffer = [];

  this.documentKeyDown = (event) => {
    this.eventBuffer.push(new Event('KeyDown', event));
  }

  this.documentKeyUp = (event) => {
    this.eventBuffer.push(new Event('KeyUp', event));
  }

  this.mouseDown = (event) => {
    this.eventBuffer.push(new Event('MouseDown', event));
  }

  this.mouseMove = (event) => {
    this.eventBuffer.push(new Event('MouseMove', event));
  }

  this.mouseUp = (event) => {
    this.eventBuffer.push(new Event('MouseUp', event));
  }
};

function wasdDurationToVelocity(wasdDuration, vel) {
  if(vel === undefined) { 
    vel = 1;
  }

  var wasdDeltas = [
    new THREE.Vector3(0, 0, -vel),
    new THREE.Vector3(0, 0, vel),
    new THREE.Vector3(-vel, 0, 0),
    new THREE.Vector3(vel, 0, 0),
    new THREE.Vector3(0, -vel, 0),
    new THREE.Vector3(0, vel, 0)
  ];

  // Clamped linear acceleration
  var scale = wasdDuration.map(
    x => THREE.Math.clamp(Math.log(1 + x/1000), -vel, vel)
  );

  wasdDeltas = wasdDeltas.map(
    (x,i) => x.multiplyScalar(scale[i])
  );

  return wasdDeltas.reduce( (a, v) => a.add(v) );
};

function Game() {
  this.lastUpdateTime = null;

  this.scene = new THREE.Scene();

  this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 100 );
  this.camera.rotation.order = 'YXZ'; // FPS-like rotation

  this.camera.position.set(0, 3, 5);
  this.cameraVelocity = new THREE.Vector3(0, 0, 0);

  this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);

  // add a 20x20 grid of cubes, rainbow-coloured
  this.ncubes = 20;
  this.cubes = [];
  var n = this.ncubes * this.ncubes;
  for(var i = 0; i < n; i++) {
    //var material = new THREE.MeshLambertMaterial({color: 0x000000});
    var material = new THREE.MeshPhongMaterial({color: 0x000000});
    var cube = new THREE.Mesh(
      this.blockGeometry, material
    );
    cube.position.x = Math.floor(i / this.ncubes) - this.ncubes/2;
    cube.position.z = (i % this.ncubes) - this.ncubes + 2;
    cube.material.color.setHSL(i / n, 0.75, 0.5);
    cube.material.specular.setHSL(1, 1, 1);
    this.cubes.push(cube);
    this.scene.add(cube);
  }

  this.light = new THREE.PointLight( 0xFFFFFF, 10, 100 );
  this.light.position.set( 0, 2, -this.ncubes/2 );
  this.scene.add( this.light );

  this.renderer = new THREE.WebGLRenderer( { antialias: true } );
  this.renderer.setSize( window.innerWidth, window.innerHeight );

  // null if not down; x > 0 otherwise.
  this.wasdStart = [null, null, null, null, null, null];
  this.mouseStart = null; // vector if mouse is down, else null

  // Event Handlers
  this.Tick = function(tickEvent) {
    var time = tickEvent.time;

    // Camera velocity
    var wasdDuration = this.wasdStart.map(
      x => x === null ? null : time - x
    );

    var vel = wasdDurationToVelocity(wasdDuration, 0.5);
    vel.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);
    this.cameraVelocity = vel;
    this.camera.position.add(this.cameraVelocity);

    // Update cubes
    for(var i = 0; i < this.cubes.length; i++) {
      var x = Math.floor(i / this.ncubes);
      var z = i % this.ncubes;
      this.cubes[i].position.y = 0.5*Math.sin(time/1000 + x + 0.5*z);
    }

  }

  this.KeyDown = function(event) {
    var i = keyCodeToIndex(event.data);
    if(i === null) return;

    var v = this.wasdStart[i];
    this.wasdStart[i] = v === null ? event.time : v;
  }
  
  this.KeyUp = function(event) {
    var i = keyCodeToIndex(event.data);
    if(i === null) return;

    this.wasdStart[i] = null;
  }

  this.MouseDown = function(event) {
    glob = event;
    this.mouseStart = new THREE.Vector2(
      event.data.clientX, event.data.clientY
    );
  }

  this.MouseUp = function(event) {
    this.mouseStart = null;
  }

  this.MouseMove = function(event) {
    if(this.mouseStart === null) return;

    var diff = new THREE.Vector2(
      event.data.clientX, event.data.clientY
    );

    diff = diff.sub(this.mouseStart);

    this.mouseStart = new THREE.Vector2(
      event.data.clientX, event.data.clientY
    );

    var timeDiff = event.time - this.lastUpdateTime;

    this.camera.rotation.x += diff.y/500;
    this.camera.rotation.y += diff.x/500;
  }

	this.update = function(event) {
    // Dispatch events to handlers
    if (event.name in this) {
      this[event.name](event);
    }

    this.lastUpdateTime = event.time;
	}

  this.render = function() {
    this.renderer.render( this.scene, this.camera );
  }
}

function animate(eventLoop, game) {
	requestAnimationFrame( () => animate(eventLoop, game) );
	
  // Process all events in eventLoop buffer
  for(var i = 0; i < eventLoop.eventBuffer.length; i++) {
    var event = eventLoop.eventBuffer[i];
    game.update(event);
  }

  // Empty buffer
  eventLoop.eventBuffer = [];

  // Force ticks
  game.update(new Event('Tick', null));

  game.render();
};

var game = new Game();
var eventLoop = new EventLoop();
document.body.appendChild( game.renderer.domElement );
animate(eventLoop, game);

document.addEventListener(
  "keydown", eventLoop.documentKeyDown);
document.addEventListener(
  "keyup", eventLoop.documentKeyUp);
document.addEventListener(
  "mousedown", eventLoop.mouseDown);
document.addEventListener(
  "mouseup", eventLoop.mouseUp);
document.addEventListener(
  "mousemove", eventLoop.mouseMove);
