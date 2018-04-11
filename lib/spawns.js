var objects = {
	buildings: [],
};

function updateObjects() {
	for(var i = 0; i < objects.buildings.length; i++) {
		objects.buildings[i].update();
	}
}

function spawnObject() {
	if(userInteraction && objects.buildings.length <= 12) {
		var gridSize = 7;
		var closestCorner_x = boidlingsCenter.x % gridSize > gridSize - (boidlingsCenter.x % gridSize) ? boidlingsCenter.x + (gridSize - (boidlingsCenter.x % gridSize)) : boidlingsCenter.x - (boidlingsCenter.x % gridSize);
		var closestCorner_z = boidlingsCenter.z % gridSize > gridSize - (boidlingsCenter.z % gridSize) ? boidlingsCenter.z + (gridSize - (boidlingsCenter.z % gridSize)) : boidlingsCenter.z - (boidlingsCenter.z % gridSize);
		var closestCorner = new THREE.Vector3( closestCorner_x, 0, closestCorner_z );

		var closestCornerOffset = { x: Math.floor(Math.random() * 3 + 3) * (Math.random() > 0.5 ? 1 : -1), z: Math.floor(Math.random() * 3 - 3) * (Math.random() > 0.5 ? 1 : -1) };

		var building_height = Math.random() * 20 + 5;
		var building_color = Math.random() * 0xffffff;

		var nextPosition = new THREE.Vector3(closestCorner.x + closestCornerOffset.x * gridSize, 0, closestCorner.z + closestCornerOffset.z * gridSize);
		for(var i = 0; i < 5; i++) {
			var direction = {x: 0, z: 0};
			if(Math.random() >= 0.5 && i != 0) {
				direction.x = Math.random() > 0.5 ? 1 : -1;
			} else if(Math.random() < 0.5 && i != 0) {
				direction.z = Math.random() > 0.5 ? 1 : -1;
			}

			nextPosition = new THREE.Vector3(nextPosition.x + direction.x * gridSize, 0, nextPosition.z + direction.z * gridSize);

			var exists = false;
			for(var building_index = 0; building_index < objects.buildings.length; building_index++) {
				if(objects.buildings[building_index].parent.position.x == nextPosition.x && objects.buildings[building_index].parent.position.y == nextPosition.y && objects.buildings[building_index].parent.position.z == nextPosition.z) {
					exists = true;
				}
			}

			if(exists) break;

			var building2 = new Building( building_height, building_color );
			objects.buildings.push(building2);
			building2.place( nextPosition.x, nextPosition.y, nextPosition.z );
			building2.spawn();
		}
	}

	setTimeout(spawnObject, 1000);
}

function arrayRemove(array, element) {
    const index = array.indexOf(element);
    
    if (index !== -1) {
        array.splice(index, 1);
    }
}

function Building(height, color) {
	this.parent = new THREE.Group();
	this.exists = false;
	this.animating = false;
	this.segments = [];

	var buildingObject_geometry = new THREE.BoxGeometry( 7, height, 7 );
	var buildingObject_material = new THREE.MeshStandardMaterial( { color: color, emissive: color, roughness: 1, metalness: 0 } );
	var buildingObject = new THREE.Mesh( buildingObject_geometry, buildingObject_material );

	this.parent.add( buildingObject );
	buildingObject.position.set( 0, height/2, 0);
	buildingObject.castShadow = buildingObject.receiveShadow = true;

	this.parent.visible = false;
	scene.add(this.parent);

	this.show = function() {
		this.parent.visible = true;
		this.exists = true;
	}

	this.hide = function() {
		this.parent.visible = false;
		this.exists = false;
	}

	this.spawn = function() {
		var objectRef = this;
		if(!objectRef.animating) {
			objectRef.parent.scale.set(1, 0.001, 1);
			objectRef.show();
			objectRef.animating = true;
			if(TWEEN) var treeScaleTween = new TWEEN.Tween(objectRef.parent.scale).easing(TWEEN.Easing.Elastic.Out).to({ x: 1, y: 1, z: 1 }, 1000).onComplete(function(){
				objectRef.animating = false;
			}).start();
		}
	}

	this.despawn = function() {
		var objectRef = this;
		if(!objectRef.animating) {
			objectRef.parent.scale.set(1, 1, 1);
			objectRef.animating = true;
			if(TWEEN) var treeScaleTween = new TWEEN.Tween(objectRef.parent.scale).easing(TWEEN.Easing.Elastic.In).to({ x: 1, y: 0.001, z: 1 }, 1000).onComplete(function(){
				objectRef.hide();
				objectRef.animating = false;
				scene.remove(objectRef);
				arrayRemove(objects.buildings, objectRef);
			}).start();
		}
	}

	this.place = function(x, y, z) {
		this.parent.position.set(x, y, z);
	}

	this.delete = function() {
		scene.remove(this.parent);
	}

	this.update = function() {
		if(this.parent.position.distanceTo(boidlingsCenter) > 40) {
			this.despawn();
		}
	}
}