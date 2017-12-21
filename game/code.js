var scene, camera, renderer, meshfloor,ambientLight , light, cube, crosshair, position,clock,killsLeft,ammoLeft,  winOrLose;
var mesh;

var meshes = {};
var bullets = [];
var enemy = [];
var PLAYABLE = true;
var MAP_SIZE_W = 100;
var MAP_SIZE_H = 100;
var LatestTreeX = -30, LatestTreeZ = 30; 
var LatestEnemyX = 60, LatestEnemyZ = -30; 
var USE_WIREFRAME = false;
var TREE_COUNT = 300;
var TREE_SPAWN_DISTANCE = 15;
var ENEMY_COUNT = 4;
var ENEMY_DOWN = false;
var ENEMY_SPAWN_DISTANCE = 30;
var ENEMY_WIN_DISTANCE = 5; 
var HIT_BOX = 2;
var AMMUNITION = 15;
var AMMO_LESS = false;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var player = { height: 1.0, speed: 0.2, turnSpeed: Math.PI * 0.02, canShoot:0};
var keyboard = {};
var crosshairpositioning = { top: (HEIGHT / 2)-15, left: (WIDTH / 2)-2};

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
function didBulletHitEnemy(enemyPosZ,enemyPosX,bulletPosZ,bulletPosX,id){
  var distanceInX = Math.floor(enemyPosX-bulletPosX);
  var distanceInZ = Math.floor(enemyPosZ-bulletPosZ);
  if((distanceInX > -HIT_BOX && distanceInX < HIT_BOX) && (distanceInZ > -HIT_BOX && distanceInZ < HIT_BOX))
  {
    enemy[id].isDown = true;
  }
}
function outOfSpawnArea(positionX, positionZ, area){
  if(!((-area < positionX && positionX < area) && (-area < positionZ && positionZ < area))){
      return true;
  }else { return false; }
}
function isCubeInSpawn(positionX, positionZ,id){
    if(!((-ENEMY_WIN_DISTANCE < positionX && positionX < ENEMY_WIN_DISTANCE) && (-ENEMY_WIN_DISTANCE < positionZ && positionZ < ENEMY_WIN_DISTANCE))){
        return true;
    }else { return false; }

}
function isInMapArea(positionX, positionZ){
  if((-MAP_SIZE_W < positionZ && positionX < MAP_SIZE_W) && (-MAP_SIZE_H < positionZ && positionZ < MAP_SIZE_H)){
    return true;
  }else { return false };
}
function objSpawnCollision(latestZ,latestX,newestX, newestZ){
  if((latestZ>newestX || latestX<newestX) && (latestZ>newestZ || latestZ<newestZ)){
    return true;
  }else { return false; }
}
function spawnRules(latestX,latestZ,newestX, newestZ,area){
  if(isInMapArea(newestX, newestZ)){
    if(outOfSpawnArea(newestX, newestZ,area)){
      if(objSpawnCollision(latestX,latestZ,newestX, newestZ)){
        return true;
      }
    }
  }else{
    return false;
  }
}
var loadingScreen = {
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(90,WIDTH/HEIGHT,0.1,100),
  box: new THREE.Mesh(
    new THREE.BoxGeometry(0.5,0.5,0.5),
    new THREE.MeshBasicMaterial({color:0x4444ff})
  )
};
var RESOURCES_LOADED = false;
var LOADING_MANAGER = null;
var models = {
	tree: {
		obj:"./models/Large_Oak_Dark_01.obj",
		mtl:"./models/Large_Oak_Dark_01.mtl",
		mesh: null,
    castShadow: false,
    receiveShadow: false,
	},
  gun: {
		obj:"./models/uziGold.obj",
		mtl:"./models/uziGold.mtl",
		mesh: null,
    castShadow: false,
    receiveShadow: false,
	},
  tent: {
    obj:"./models/Tent_Poles_01.obj",
    mtl:"./models/Tent_Poles_01.mtl",
    mesh: null,
    castShadow: false,
    receiveShadow: false,
  }
};

function init() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(50, WIDTH/HEIGHT, 0.1, 10000);
  camera.position.set(0,player.height,-5);
  camera.lookAt(new THREE.Vector3(0, player.height, 0));

  loadingScreen.camera.lookAt(loadingScreen.box.position);
  loadingScreen.scene.add(loadingScreen.box);

  var loadingManager = new THREE.LoadingManager();
  loadingManager.onProgress = function(item,loaded,total){
    console.log(item,loaded,total);
  };
  loadingManager.onLoad = function(){
    console.log("Loaded all resources");
    onResourcesLoaded();
    RESOURCES_LOADED=true;
  }

  crosshair = document.getElementById('crosshair');
  crosshair.style.left = crosshairpositioning.left + 'px';
  crosshair.style.top = crosshairpositioning.top + 'px';

  position = document.getElementById('position');
  ammoLeft = document.getElementById('ammoLeft');
  winOrLose = document.getElementById('winOrLose');

  meshfloor = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_SIZE_W*2,MAP_SIZE_H*2),
    new THREE.MeshPhongMaterial({color:0x3B5323, wireframe:USE_WIREFRAME})
  );
  meshfloor.rotation.x -= Math.PI / 2;
  meshfloor.receiveShadow = true;

  ambientLight = new THREE.AmbientLight(0xffffff,0.2);
  light.castShadow = true;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 25;

  for( var _key in models ){
		(function(key){

			var mtlLoader = new THREE.MTLLoader(loadingManager);
			mtlLoader.load(models[key].mtl, function(materials){
				materials.preload();

				var objLoader = new THREE.OBJLoader(loadingManager);

				objLoader.setMaterials(materials);
				objLoader.load(models[key].obj, function(mesh){

					mesh.traverse(function(node){
						if( node instanceof THREE.Mesh ){
              if('castShadow' in models[key])
                node.castShadow = models[key].castShadow;
              else
                node.castShadow = true;
              if('receiveShadow' in models[key])
                  node.receiveShadow = models[key].receiveShadow;
                else
                  node.receiveShadow = true;
						}
					});
					models[key].mesh = mesh;

				});
			});
		})(_key);
	}

  function onResourcesLoaded(){

    for(var i = 0; i<TREE_COUNT;i++){
    	meshes["tree"+i] = models.tree.mesh.clone();
      while(true){
        var randomX = getRandomArbitrary(-MAP_SIZE_WIDTH,MAP_SIZE_WIDTH);
        var randomZ = getRandomArbitrary(-MAP_SIZE_HEIGHT,MAP_SIZE_HEIGHT);
        if(spawnRules(LatestTreeX,LatestTreeZ,randomX,randomZ,TREE_SPAWN_DISTANCE)){
        	meshes["tree"+i].position.set(randomX, 0, randomZ);
          LatestTreeX = randomX;
          LatestTreeZ = randomZ;
        	scene.add(meshes["tree"+i]);
          break;
        }
      }
  }
  for(var i=0;i<ENEMY_COUNT;i++){
    while(true){
      var randomX = Math.floor(getRandomArbitrary(-MAP_SIZE_WIDTH,MAP_SIZE_WIDTH));
      var randomZ = Math.floor(getRandomArbitrary(-MAP_SIZE_HEIGHT,MAP_SIZE_HEIGHT));
      if(spawnRules(LatestEnemyZ,LatestEnemyZ,randomX,randomZ,ENEMY_SPAWN_DISTANCE)){
        enemy[i] = new THREE.Mesh(
          new THREE.BoxGeometry(1,1,1),
          new THREE.MeshPhongMaterial({color:0xff4444, wireframe:USE_WIREFRAME})
        );
        enemy[i].position.x = randomX;
        enemy[i].position.z =  randomZ;
        enemy[i].position.y = 1;
        enemy[i].receiveShadow = true;
        enemy[i].castShadow = false;
        enemy[i].isDown = false;
        LatestEnemyZ = randomZ;
        LatestEnemyX = randomX;
        scene.add(enemy[i]);
        break;
      }
    }
  }

    meshes["tent"] = models.tent.mesh.clone();
    meshes["tent"].position.x=-1; meshes["tent"].position.y=-0.5; meshes["tent"].position.z=5;
    meshes["tent"].rotation.y = 60;
    scene.add(meshes["tent"]);
    meshes["tent2"] = models.tent.mesh.clone();
    meshes["tent2"].position.x=5; meshes["tent2"].position.y=-0.5; meshes["tent2"].position.z=-2;
    meshes["tent2"].rotation.y = 30;
    scene.add(meshes["tent2"]);
    meshes["gun"] = models.gun.mesh.clone();
    meshes["gun"].scale.set(10,10,5);
    scene.add(meshes["gun"]);
  }


  scene.add(light);
  scene.add(ambientLight);
  scene.add(camera);
  scene.add(meshfloor);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(WIDTH,HEIGHT);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  document.body.appendChild(renderer.domElement);
  animate();
}
function animate() {
    if(RESOURCES_LOADED == false){
      requestAnimationFrame(animate);
      renderer.render(loadingScreen.scene, loadingScreen.camera);
      return;
    }

    if(enemy[0].isDown&&
       enemy[1].isDown&&
       enemy[2].isDown&&
       enemy[3].isDown|| 
       AMMUNITION == 0)
    {
        requestAnimationFrame(animate);
        renderer.render(loadingScreen.scene, loadingScreen.camera);
        winOrLose.textContent = "Misson Clear";
        winOrLose.style.left = (WIDTH/2)-350 + "px";
        return;
    }

    if(!isCubeInSpawn(enemy[0].position.x,enemy[0].position.z,0)||
       !isCubeInSpawn(enemy[1].position.x,enemy[1].position.z,1)||
       !isCubeInSpawn(enemy[2].position.x,enemy[2].position.z,2)||
       !isCubeInSpawn(enemy[3].position.x,enemy[3].position.z,3))
    {
      requestAnimationFrame(animate);
      renderer.render(loadingScreen.scene, loadingScreen.camera);
      winOrLose.textContent = "Game Over";
      winOrLose.style.left = (WIDTH/2)-450 + "px";
      PLAYABLE = false;
      return;
    }
    if(AMMO_LESS == true){
      AMMUNITION--;
      AMMO_LESS = false;
    }


      if(enemy[0].isDown == true){
        enemy[0].position.y -= Math.sin(Math.PI/6) *0.15;
        if(enemy[0].position.y < 0) {
          enemy[0].position.x= -200;
          enemy[0].position.z= -200;
          scene.remove(enemy[0]);

        }
      }
      if(enemy[1].isDown == true){
        enemy[1].position.y -= Math.sin(Math.PI/6) *0.15;
        if(enemy[1].position.y < 0) {
          enemy[1].position.x= -200;
          enemy[1].position.z= -200;
          scene.remove(enemy[1]);
        }
      }
      if(enemy[2].isDown == true){
        enemy[2].position.y -= Math.sin(Math.PI/6) *0.15;
        if(enemy[2].position.y < 0) {
          enemy[2].position.x= -200;
          enemy[2].position.z= -200;
          scene.remove(enemy[2]);
        }
      }
      if(enemy[3].isDown == true){
        enemy[3].position.y -= Math.sin(Math.PI/6) *0.15;
        if(enemy[3].position.y < 0) {
          enemy[3].position.x= -200;
          enemy[3].position.z= -200;
          scene.remove(enemy[3]);
        }
      }

      var enemySpeed = Math.sin(Math.PI/6) *0.15;
      if(enemy[0].position.x > 0 && enemy[0].position.z > 0){
        enemy[0].position.x -= enemySpeed;
        enemy[0].position.z -= enemySpeed;
      } else if(enemy[0].position.x > 0 && enemy[0].position.z < 0){
        enemy[0].position.x -= enemySpeed;
        enemy[0].position.z += enemySpeed;
      }else if(enemy[0].position.x < 0 && enemy[0].position.z > 0){
        enemy[0].position.x += enemySpeed;
        enemy[0].position.z -= enemySpeed;
      }else {
        enemy[0].position.x += enemySpeed;
        enemy[0].position.z += enemySpeed;
      }

      if(enemy[1].position.x > 0 && enemy[1].position.z > 0){
        enemy[1].position.x -= enemySpeed;
        enemy[1].position.z -= enemySpeed;
      } else if(enemy[1].position.x > 0 && enemy[1].position.z < 0){
        enemy[1].position.x -= enemySpeed;
        enemy[1].position.z += enemySpeed;
      }else if(enemy[1].position.x < 0 && enemy[1].position.z > 0){
        enemy[1].position.x += enemySpeed;
        enemy[1].position.z -= enemySpeed;
      }else {
        enemy[1].position.x += enemySpeed;
        enemy[1].position.z += enemySpeed;
      }

      if(enemy[2].position.x > 0 && enemy[2].position.z > 0){
        enemy[2].position.x -= enemySpeed;
        enemy[2].position.z -= enemySpeed;
      } else if(enemy[2].position.x > 0 && enemy[2].position.z < 0){
        enemy[2].position.x -= enemySpeed;
        enemy[2].position.z += enemySpeed;
      }else if(enemy[2].position.x < 0 && enemy[2].position.z > 0){
        enemy[2].position.x += enemySpeed;
        enemy[2].position.z -= enemySpeed;
      }else {
        enemy[2].position.x += enemySpeed;
        enemy[2].position.z += enemySpeed;
      }

      if(enemy[3].position.x > 0 && enemy[3].position.z > 0){
        enemy[3].position.x -= enemySpeed;
        enemy[3].position.z -= enemySpeed;
      } else if(enemy[3].position.x > 0 && enemy[3].position.z < 0){
        enemy[3].position.x -= enemySpeed;
        enemy[3].position.z += enemySpeed;
      }else if(enemy[3].position.x < 0 && enemy[3].position.z > 0){
        enemy[3].position.x += enemySpeed;
        enemy[3].position.z -= enemySpeed;
      }else {
        enemy[3].position.x += enemySpeed;
        enemy[3].position.z += enemySpeed;
      }


      enemy[0].rotation.x += 0.01;
      enemy[0].rotation.y += 0.01;
      enemy[1].rotation.x += 0.01;
      enemy[1].rotation.y += 0.01;
      enemy[2].rotation.x += 0.01;
      enemy[2].rotation.y += 0.01;
      enemy[3].rotation.x += 0.01;
      enemy[3].rotation.y += 0.01;

    var time = Date.now()*0.0005;
    var delta = clock.getDelta();


  for(var index=0; index<bullets.length; index+=1){
		if( bullets[index] === undefined ) continue;
		if( bullets[index].alive == false ){
			continue;
		}else{
      for(var i =0; i<ENEMY_COUNT;i++){
        didBulletHitEnemy(
          enemy[i].position.z,
          enemy[i].position.x,
          bullets[index].position.z,
          bullets[index].position.x,i
        );
      }
    }

		bullets[index].position.add(bullets[index].velocity);
	}

   

  if(keyboard[87] && PLAYABLE){ 
    camera.position.x -= Math.sin(camera.rotation.y) * player.speed;
    camera.position.z -= -Math.cos(camera.rotation.y) * player.speed;
  }
  if(keyboard[83] && PLAYABLE){ 
    camera.position.x += Math.sin(camera.rotation.y) * player.speed;
    camera.position.z += -Math.cos(camera.rotation.y) * player.speed;
  }
  if(keyboard[65] && PLAYABLE){ 
    camera.position.x -= Math.sin(camera.rotation.y - Math.PI/2) * player.speed;
    camera.position.z -= -Math.cos(camera.rotation.y - Math.PI/2) * player.speed;
  }
  if(keyboard[68] && PLAYABLE){ 
    camera.position.x += Math.sin(camera.rotation.y - Math.PI/2) * player.speed;
    camera.position.z += -Math.cos(camera.rotation.y - Math.PI/2) * player.speed;
  }
  if(keyboard[37] && PLAYABLE){ 
    camera.rotation.y -= player.turnSpeed;
  }
  if(keyboard[39] && PLAYABLE){ 
    camera.rotation.y += player.turnSpeed;
  }

  if(keyboard[32] && player.canShoot <= 0 && AMMUNITION > 0 && PLAYABLE){
		

		var bullet = new THREE.Mesh(
			new THREE.SphereGeometry(0.05,8,8),
			new THREE.MeshBasicMaterial({color:0xffd700})
		);


		bullet.position.set(
			meshes["gun"].position.x,
			meshes["gun"].position.y + 0.15,
			meshes["gun"].position.z
		);

		bullet.velocity = new THREE.Vector3(
			-Math.sin(camera.rotation.y),
			0,
			Math.cos(camera.rotation.y)
		);

		bullet.alive = true;

		setTimeout(function(){
			bullet.alive = false;
			scene.remove(bullet);
		}, 1000);



		bullets.push(bullet);
		scene.add(bullet);
		player.canShoot = 70;
    AMMO_LESS = true;
	}

	if(player.canShoot > 0) player.canShoot -= 1;


  meshes["gun"].position.set(
    camera.position.x - Math.sin(camera.rotation.y + Math.PI/6) *0.55,
    camera.position.y - 0.4 + Math.sin(time+camera.position.x+camera.position.z)*0.03,
    camera.position.z + Math.cos(camera.rotation.y + Math.PI/6) *0.55
  );
  meshes["gun"].rotation.set(
    camera.rotation.x,
    camera.rotation.y - Math.PI,
    camera.rotation.z
  );

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
function keyDown(event){
  keyboard[event.keyCode] = true;
}
function keyUp(event){
  keyboard[event.keyCode] = false;
}
window.addEventListener('keydown',keyDown);
window.addEventListener('keyup',keyUp);
window.onload = init;
