var scene, camera, renderer, raycaster, mouse, viewSize = 60,
	dir_light, plane, objectiveMarker, objectiveTween,
	boidlings = [], objectiveVector = new THREE.Vector3(), boidlingsCenter = new THREE.Vector3(),
	audioContext, stringBuffers = [],
	userInteraction = false, audioLoaded = false, canvas = document.getElementById("three");

var stringUrls = [	
	"sounds/Excited1_1.mp3",
	"sounds/Excited2_1.mp3",
	"sounds/Excited3_1.mp3",
	"sounds/Excited4_1.mp3",
	"sounds/Excited5_1.mp3",
	"sounds/Excited6_1.mp3",
	"sounds/Excited7_1.mp3",
	"sounds/Excited8_1.mp3",
	"sounds/Excited9_1.mp3",
	"sounds/Excited10_1.mp3",
	"sounds/Excited12_1.mp3",
	"sounds/Excited13_1.mp3",
	"sounds/Excited14_1.mp3"
];

function Boidling() {
	this.parent = new THREE.Group();
	this.velocity = new THREE.Vector3();
	this.moving = false;
	this.speed = 1;

	this.init = function() {
		var hat_height = 0.3,
			head_height = 1,
			body_height = 3;
			
		var hat_color = Math.random() * 0xffffff;
		var hat_geometry = new THREE.BoxGeometry( 1, hat_height, 1 );
		var hat_material = new THREE.MeshStandardMaterial( { color: hat_color, emissive: hat_color, roughness: 1, metalness: 0 } );
		hat_material.flatShading = true;
		var hat = new THREE.Mesh( new THREE.BufferGeometry().fromGeometry( hat_geometry ), hat_material );

		var head_color = Math.random() * 0xffffff;
		var head_geometry = new THREE.BoxGeometry( 1, head_height, 1 );
		var head_material = new THREE.MeshStandardMaterial( { color: head_color, emissive: head_color, roughness: 1, metalness: 0 } );
		head_material.flatShading = true;
		var head = new THREE.Mesh( new THREE.BufferGeometry().fromGeometry( head_geometry ), head_material );

		var body_color = Math.random() * 0xffffff;
		var body_geometry = new THREE.BoxGeometry( 1, body_height, 1 );
		var body_material = new THREE.MeshStandardMaterial( { color: body_color, emissive: body_color, roughness: 1, metalness: 0 } );
		body_material.flatShading = true;
		var body = new THREE.Mesh( new THREE.BufferGeometry().fromGeometry( body_geometry ), body_material );
		
		this.parent.add( hat );
		this.parent.add( head );
		this.parent.add( body );

		hat.position.set( 0, body_height + head_height + hat_height/2, 0);
		head.position.set( 0, body_height + head_height/2, 0);
		body.position.set( 0, body_height/2, 0);

		hat.castShadow = head.castShadow = body.castShadow = hat.receiveShadow = head.receiveShadow = body.receiveShadow = true;

		scene.add(this.parent);
	}

	this.init();

	this.moveTo = function(targetPosition) {
		this.moving = true;
		var boidlingReference1 = this;
		var jump_speed = Math.random() * 50 + 150;

		var tween_xz = new TWEEN.Tween(this.parent.position).to({ x: targetPosition.x, z: targetPosition.z }, jump_speed).start();
        var tween_y = new TWEEN.Tween(this.parent.position).easing(TWEEN.Easing.Quadratic.In).to({ y: 1 + (this.parent.position.distanceTo(objectiveVector)/40) }, jump_speed/2).onComplete(function() {
        	var boidlingReference2 = boidlingReference1;
			var tween_y2 = new TWEEN.Tween(boidlingReference2.parent.position).easing(TWEEN.Easing.Quadratic.In).to({ y: 0 }, jump_speed/2).onComplete(function() {
				boidlingReference2.moving = false;
        	}).start();
        }).start();
	}

}

function init() {
	initSound();

	// SCENE
	scene = new THREE.Scene();

    var aspectRatio = window.innerWidth / window.innerHeight;
	camera = new THREE.OrthographicCamera( -aspectRatio*viewSize/2, aspectRatio*viewSize/2, viewSize/2, -viewSize/2, 1, 500 );

	// RENDERER
	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( "#002aff", 1 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // RAYCASTING
    raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();

	// GROUND
	var plane_geometry = new THREE.PlaneGeometry( 500, 500 );
	var plane_material = new THREE.MeshStandardMaterial( {color: "#ffffff", emissive: "#aaaaaa", side: THREE.DoubleSide, roughness: 1, metalness: 0} );
	plane = new THREE.Mesh( plane_geometry, plane_material );
	plane.rotation.set(Math.PI/2, 0, 0);
	plane.receiveShadow = true;
	scene.add( plane );

	// LIGHT
	dir_light = new THREE.DirectionalLight( 0xffffff );
    dir_light.intensity = 0.7;
    dir_light.position.set( 50, 80, 0 );
    dir_light.castShadow = true;
    dir_light.shadow.camera.right = 50;
    dir_light.shadow.camera.left = -50;
    dir_light.shadow.camera.top = 50;
    dir_light.shadow.camera.bottom = -50;
    dir_light.shadow.mapSize.x = 1024;
    dir_light.shadow.mapSize.y = 1024;
    scene.add( dir_light, dir_light.target );

    // OBJECTIVE MARKER
    var objective_geometry = new THREE.CircleGeometry( 0.5, 20 );
	var objective_material = new THREE.MeshBasicMaterial( { color: "#ffff00", transparent: true, opacity: 0.5 } );
	objectiveMarker = new THREE.Mesh( objective_geometry, objective_material );
	objectiveMarker.rotation.x = -Math.PI/2;
	objectiveMarker.visible = false;
	scene.add( objectiveMarker );

	// SPAWN
	for(var i = 0; i < 15; i++) {
		boidlings.push( new Boidling() );
		boidlings[i].parent.position.set( Math.random() * 60 - 30, 0, Math.random() * 60 - 30 );
	}

	spawnObject();

	setObjectiveMarker(15, 0, 15, false);
	render();
}

function render( time ) {
	requestAnimationFrame( render );

	updateObjects();
	updateFollowers();
	moveBoidlings();
	TWEEN.update(time);

	renderer.render( scene, camera );
}

function updateFollowers() {
	boidlingsCenter = new THREE.Vector3();
	for(var i = 0; i < boidlings.length; i++) {
		boidlingsCenter = new THREE.Vector3(boidlingsCenter.x + boidlings[i].parent.position.x, 0, boidlingsCenter.z + boidlings[i].parent.position.z);
	}
	boidlingsCenter.divideScalar(boidlings.length);

	plane.position.set(boidlingsCenter.x, 0, boidlingsCenter.z);
	dir_light.position.set(boidlingsCenter.x + 50, 80, boidlingsCenter.z);
	dir_light.target.position.set(boidlingsCenter.x, 0, boidlingsCenter.z);
	camera.position.set(boidlingsCenter.x + 100, 100, boidlingsCenter.z + 100);
	camera.lookAt( boidlingsCenter );
}

function handleInput(event) {
	startUserInteraction();

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children );

	for ( var i = 0; i < intersects.length; i++ ) {
		if(intersects[i].object == plane) {
			setObjectiveMarker(intersects[i].point.x, 0, intersects[i].point.z, true);	
		}
	}
}

function setObjectiveMarker(x, y, z, hidden) {
	objectiveVector = new THREE.Vector3(x, 0, z);
	objectiveMarker.position.set(x, y + 0.1, z);
	objectiveMarker.scale.set(0.001, 0.001, 0.001);
	objectiveMarker.visible = hidden;
	if(objectiveTween) objectiveTween.stop();
	objectiveTween = new TWEEN.Tween(objectiveMarker.scale).easing(TWEEN.Easing.Quadratic.Out).to({ x: boidlings.length*0.7, y: boidlings.length*0.7, z: boidlings.length*0.7 }, 500).start();

	if( boidlingsCenter.distanceTo(objectiveVector) > 4 ) {
		getExcited();
	}
}

function getExcited() {
	if(userInteraction && audioLoaded) {
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[0], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[1], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[2], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[3], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[4], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[5], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[6], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.9) setTimeout(function() { playSound(stringBuffers[7], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.8) setTimeout(function() { playSound(stringBuffers[8], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[9], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[10], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[11], 1); }, Math.random() * 400 + 50);
		if(Math.random() > 0.5) setTimeout(function() { playSound(stringBuffers[12], 1); }, Math.random() * 400 + 50);
	}
}

function automateMarker() {
	if(boidlingsCenter.distanceTo(objectiveVector) < 10) setObjectiveMarker( objectiveVector.x, objectiveVector.y, objectiveVector.z + 30, true );
}

/**** BOIDS ****/

var initialSpeedMultiplier = 0;

var cohesionMultiplier = 0; // 0.5 
var cohesionDistance = 5;

var separationDistance = 20; // 2.0
var separationMultiplier = 10; // 5.0

var objectiveMultiplier = 1.2;

var avoidanceMultiplier = 2.5;
var avoidanceDistance = 10;

function moveBoidlings() {
	boidlings.forEach(function(boidling) {
		if(!boidling.moving) {
			var v1 = cohesion(boidling);
			var v2 = separate(boidling);
			var v3 = objective(boidling);
			var v4 = avoidance(boidling);
			boidling.velocity = new THREE.Vector3(	boidling.velocity.x + (v1.x*cohesionMultiplier) + (v2.x*separationMultiplier) + (v3.x*objectiveMultiplier) + (v4.x*avoidanceMultiplier),
													boidling.velocity.y + (v1.y*cohesionMultiplier) + (v2.y*separationMultiplier) + (v3.y*objectiveMultiplier) + (v4.y*avoidanceMultiplier),
													boidling.velocity.z + (v1.z*cohesionMultiplier) + (v2.z*separationMultiplier) + (v3.z*objectiveMultiplier) + (v4.z*avoidanceMultiplier)
												);
			boidling.speed = 2 + boidling.parent.position.distanceTo(objectiveVector)/50 * initialSpeedMultiplier;
			boidling.velocity.normalize().multiplyScalar(boidling.speed);

			boidling.moveTo(new THREE.Vector3(boidling.parent.position.x + boidling.velocity.x, boidling.parent.position.y + boidling.velocity.y, boidling.parent.position.z + boidling.velocity.z));
		}
	});
}

function cohesion( boid ) {
	var perceivedCenter = new THREE.Vector3();
	for(var i = 0; i < boidlings.length; i++) {
		if(boidlings[i].parent.position.distanceTo(boid.parent.position) < cohesionDistance) {
			perceivedCenter = new THREE.Vector3(perceivedCenter.x + boidlings[i].parent.position.x, perceivedCenter.y + boidlings[i].parent.position.y, perceivedCenter.z + boidlings[i].parent.position.z);
		}
	}
	perceivedCenter.divideScalar(boidlings.length);
	var distance = new THREE.Vector3(perceivedCenter.x - boid.parent.position.x, perceivedCenter.y - boid.parent.position.y, perceivedCenter.z - boid.parent.position.z);
	return distance.normalize();
}

function separate( boid ) {
	var separationVector = new THREE.Vector3();
	for(var i = 0; i < boidlings.length; i++) {
		if(boidlings[i] != boid && boidlings[i].parent.position.distanceTo(boid.parent.position) < separationDistance) {
			separationVector = new THREE.Vector3( separationVector.x - (boidlings[i].parent.position.x - boid.parent.position.x), separationVector.y - (boidlings[i].parent.position.y - boid.parent.position.y), separationVector.z - (boidlings[i].parent.position.z - boid.parent.position.z) );
		}
	}
	return separationVector.normalize();
}

function objective( boid ) {
	var objectiveVelocity = new THREE.Vector3(objectiveVector.x - boid.parent.position.x, objectiveVector.y - boid.parent.position.y, objectiveVector.z - boid.parent.position.z);
	return objectiveVelocity.normalize();
}

function avoidance( boid ) {
	var avoidanceVector = new THREE.Vector3();
	for(var i = 0; i < objects.buildings.length; i++) {
		if(objects.buildings[i].parent.position.distanceTo(boid.parent.position) < avoidanceDistance) {
			avoidanceVector = new THREE.Vector3( avoidanceVector.x - (objects.buildings[i].parent.position.x - boid.parent.position.x), avoidanceVector.y - (objects.buildings[i].parent.position.y - boid.parent.position.y), avoidanceVector.z - (objects.buildings[i].parent.position.z - boid.parent.position.z) );
		}
	}
	return avoidanceVector.normalize();
}

/**** SOUNDS ****/

function initSound() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    loadSound(stringUrls[0]);
}

function loadSound(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
        audioContext.decodeAudioData(request.response, function(buffer) {
            stringBuffers.push(buffer);
            if(stringBuffers.length != stringUrls.length) {
                loadSound(stringUrls[stringBuffers.length]);
            } else {
	            // init();
	            // initDOM();
	            audioLoaded = true;
            }
        }, function() {
            console.log("error");
        });
    }
    request.send();
}

function playSound(buffer, gain) {
    var source = audioContext.createBufferSource();
    var gainNode = audioContext.createGain();

    gainNode.gain.value = gain;

    source.buffer = buffer;
    source.connect(gainNode);

    gainNode.connect(audioContext.destination);
    source.start(0);
}

function startUserInteraction() {
    if(!userInteraction) {
        cohesionMultiplier = 0.5;
		separationMultiplier = 2.0;
		separationDistance = 5.0;

		initialSpeedMultiplier = 1;

        userInteraction = true;
    }
}

/********/

function onTapStart( event ) {
	playSound(stringBuffers[0], 0);
	handleInput({clientX: event.touches[0].clientX, clientY: event.touches[0].clientY});
}

function onTapEnd( event ) {
	event.preventDefault();
}

function onMouseDown( event ) {
	handleInput({clientX: event.clientX, clientY: event.clientY});
}

function onWindowResize() {
    var aspectRatio = window.innerWidth / window.innerHeight;
	camera = new THREE.OrthographicCamera( -aspectRatio*viewSize/2, aspectRatio*viewSize/2, viewSize/2, -viewSize/2, -1000, 1000 );
    if(renderer) renderer.setSize( window.innerWidth, window.innerHeight );
}

canvas.addEventListener( 'touchstart', onTapStart, false );
canvas.addEventListener( 'touchend', onTapEnd, false );
canvas.addEventListener( 'mousedown', onMouseDown, false );
window.addEventListener( 'resize', onWindowResize, false );
window.addEventListener( 'load', init, false );
