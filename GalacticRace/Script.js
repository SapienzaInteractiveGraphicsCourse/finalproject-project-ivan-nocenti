var vehicle, scene, chassisMesh;
var wheelMeshes;
var actions = { accelerate: false, brake: false, right: false, left: false };

var keysActions = {
    "KeyW": 'acceleration',
    "KeyS": 'braking',
    "KeyA": 'left',
    "KeyD": 'right'
};

var vehicleReady = false;

var ZERO_QUATERNION = new BABYLON.Quaternion();

var chassisWidth = 1.8;
var chassisHeight = 0.6;
var chassisLength = 1.5;
var massVehicle = 150;

var wheelAxisPositionBack = - 0.65;
var wheelRadiusBack = .2;
var wheelWidthBack = 2;
var wheelHalfTrackBack = 0.6;
var wheelAxisHeightBack = 0.1;

var wheelAxisFrontPosition = 0.6;
var wheelHalfTrackFront = 0.6;
var wheelAxisHeightFront = 0.1;
var wheelRadiusFront = .2;
var wheelWidthFront = .3;

var friction = 5;
var suspensionStiffness = 50;
var suspensionDamping = 0.3;
var suspensionCompression = 4.4;
var suspensionRestLength = .7;
var rollInfluence = 0.0;

var steeringIncrement = 0.1;
var steeringClamp = 0.15;
var maxEngineForce = 300;
var maxBreakingForce = 5;
var incEngine = 10.0;

var FRONT_LEFT = 0;
var FRONT_RIGHT = 1;
var BACK_LEFT = 2;
var BACK_RIGHT = 3;

var wheelDirectionCS0;
var wheelAxleCS;


var date;

var track;

var checkpoint = [false, false, false];
var checkpointMesh = [];
var chronometer; 

var canvas;
var engine;
var scene;
function createScene() {


    canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });


    canvas.style.width = '100%';
    canvas.style.height = '100%';﻿

    // Setup basic scene
    scene = new BABYLON.Scene(engine);
    //scene.debugLayer.show();


    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    

    // Enable physics
    scene.enablePhysics(new BABYLON.Vector3(0, -10, 0), new BABYLON.AmmoJSPlugin());

    wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
    wheelAxleCS = new Ammo.btVector3(-1, 0, 0);



    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    chronometer = new BABYLON.GUI.TextBlock();
    chronometer.text = "00'000";
    chronometer.color = "white";
    chronometer.fontSize = 34;
    chronometer.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    chronometer.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    chronometer.top = "28px";
    chronometer.left = "-75px";
    advancedTexture.addControl(chronometer);

    //Texture for the sky
    skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    var texture = "space";
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("./texture/" + texture + "/5dim", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;



    // with assetsManager we import the model of babylon
    var assetsManager = new BABYLON.AssetsManager(scene);

    var meshCollisionerTask = assetsManager.addMeshTask("track task", "", "./assets/", "pista.babylon");
    meshCollisionerTask.onSuccess = function (task) {


        var physicsWorld = scene.getPhysicsEngine().getPhysicsPlugin().world; 
        let mesh = task.loadedMeshes[0]; 
        track = mesh;
        mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.MeshImpostor , { mass: 0, restitution: 0.9 }, scene);

        for (var i = 1; i < 4; i++) {
            checkpointMesh.push(task.loadedMeshes[i]);
            task.loadedMeshes[i].visibility = 0;
            console.log(checkpointMesh);
        }
    }

    //Import Collision bloks 
    var meshCollisionerTask = assetsManager.addMeshTask("car task", "", "./assets/", "car.babylon");
    meshCollisionerTask.onSuccess = function (task) {
        var newMeshes = task.loadedMeshes;
        wheelMeshes = [newMeshes[1], newMeshes[2], newMeshes[4], newMeshes[3]];
        chassisMesh = newMeshes[0]; 
        wheelMeshes.forEach(function (element) {
            element.rotationQuaternion = new BABYLON.Quaternion();
            element.position = new BABYLON.Vector3();
        });
        var camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -10), scene);
        camera.radius = 10;
        camera.heightOffset = 4;
        camera.rotationOffset = 0;
        camera.cameraAcceleration = 0.05;
        camera.maxCameraSpeed = 400;
        camera.attachControl(canvas, false);
        camera.lockedTarget = chassisMesh; //version 2.5 onwards
        scene.activeCamera = camera;
        engine.runRenderLoop(function () {
            if (start) { 
                if (date == null) {
                    date = new Date();
                }
                var now = new Date();
                chronometer.text = numeral(now - date).format(" 0,0[.]00");
                if (scene) {
                    if (chassisMesh.position.y < -10) {
                        engine.stopRenderLoop();
                        EndGame("You lose!");
                    }

                    
                }
            }scene.render();
        });
    };
    meshCollisionerTask.onError = function (task, message, exception) {
        console.log(message, exception);
    };
    assetsManager.load();



    var positionCar = new BABYLON.Vector3(0, 5, 0);
    createVehicle(positionCar, ZERO_QUATERNION);

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    scene.registerBeforeRender(function () {

        var dt = engine.getDeltaTime().toFixed() / 1000;

        if (vehicleReady) {

            var speed = vehicle.getCurrentSpeedKmHour();
            var maxSteerVal = 0.2;
            breakingForce = 0;
            engineForce = 0;


            if (actions.acceleration) {
                if (speed < -1) {
                    breakingForce = maxBreakingForce;
                } else {
                    engineForce = maxEngineForce;
                }

            } else if (actions.braking) {
                if (speed > 1) {
                    breakingForce = maxBreakingForce;
                } else {
                    engineForce = -maxEngineForce;
                }
            }

            if (actions.right) {
                if (vehicleSteering < steeringClamp) {
                    vehicleSteering += steeringIncrement;
                }

            } else if (actions.left) {
                if (vehicleSteering > -steeringClamp) {
                    vehicleSteering -= steeringIncrement;
                }

            } else {
                vehicleSteering = 0;
            }

            vehicle.applyEngineForce(engineForce, FRONT_LEFT);
            vehicle.applyEngineForce(engineForce, FRONT_RIGHT);

            vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
            vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
            vehicle.setBrake(breakingForce, BACK_LEFT);
            vehicle.setBrake(breakingForce, BACK_RIGHT);

            vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
            vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);


            var tm, p, q, i;
            var n = vehicle.getNumWheels();
            for (i = 0; i < n; i++) {
                vehicle.updateWheelTransform(i, true);
                tm = vehicle.getWheelTransformWS(i);
                p = tm.getOrigin();
                q = tm.getRotation();
                wheelMeshes[i].position.set(p.x(), p.y(), p.z());
                wheelMeshes[i].rotationQuaternion.set(q.x(), q.y(), q.z(), q.w());
                wheelMeshes[i].rotate(BABYLON.Axis.Z, Math.PI);
            }

            tm = vehicle.getChassisWorldTransform();
            p = tm.getOrigin();
            q = tm.getRotation();
            chassisMesh.position.set(p.x(), p.y(), p.z());
            chassisMesh.rotationQuaternion.set(q.x(), q.y(), q.z(), q.w());
            chassisMesh.rotate(BABYLON.Axis.Y, Math.PI);

        }


        for (var i = 0; i < 3; i++) {
            if (checkpointMesh[i].intersectsMesh(chassisMesh, false)) {
                switch (i) {
                    case 0:
                        if (checkpoint[1] == false) {
                            checkpoint[0] = true; 
                        } else {
                            checkpoint[1] = false;
                        }
                        break;
                    case 1:
                        if (checkpoint[0] == true) {
                            checkpoint[1] = true;
                        } else {
                            checkpoint[1] = false;
                        }
                        break;
                    case 2:
                        if (checkpoint[1] == true) {
                            checkpoint[2] = true;
                            var now = new Date();
                            var time = numeral(now - date).format(" 0,0[.]00");
                            EndGame("You Win! Time: " + time);
                            engine.stopRenderLoop();
                        } else {
                            checkpoint[2] = false;
                        }
                }
            }
        }
    });
    Start();
    return scene;
};





function createVehicle(pos, quat) {
    //Going Native
    var physicsWorld = scene.getPhysicsEngine().getPhysicsPlugin().world;

    var geometry = new Ammo.btBoxShape(new Ammo.btVector3(chassisWidth * .5, chassisHeight * .5, chassisLength * .5));
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    geometry.calculateLocalInertia(massVehicle, localInertia);
     

    var massOffset = new Ammo.btVector3(0, 0.4, 0);
    var transform2 = new Ammo.btTransform();
    transform2.setIdentity();
    transform2.setOrigin(massOffset);
    var compound = new Ammo.btCompoundShape();
    compound.addChildShape(transform2, geometry);

    var body = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(massVehicle, motionState, compound, localInertia));
    body.setActivationState(4);

    physicsWorld.addRigidBody(body);

    var engineForce = 0;
    var vehicleSteering = 0;
    var breakingForce = 0;
    var tuning = new Ammo.btVehicleTuning();
    var rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
    vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
    vehicle.setCoordinateSystem(0, 1, 2);
    physicsWorld.addAction(vehicle);

    var trans = vehicle.getChassisWorldTransform();



    function addWheel(isFront, pos, radius) {


        var wheelInfo = vehicle.addWheel(
            pos,
            wheelDirectionCS0,
            wheelAxleCS,
            suspensionRestLength,
            radius,
            tuning,
            isFront);

        wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
        wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
        wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
        wheelInfo.set_m_maxSuspensionForce(600000);
        wheelInfo.set_m_frictionSlip(40);
        wheelInfo.set_m_rollInfluence(rollInfluence);
         
    }

    addWheel(true, new Ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_LEFT);
    addWheel(true, new Ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT);
    addWheel(false, new Ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_LEFT);
    addWheel(false, new Ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_RIGHT);

    vehicleReady = true;
}





function keyup(e) {
    if (keysActions[e.code]) {
        actions[keysActions[e.code]] = false;
        //e.preventDefault();
        //e.stopPropagation();

        //return false;
    }
}

function keydown(e) {
    if (keysActions[e.code]) {
        actions[keysActions[e.code]] = true;
        //e.preventDefault();
        //e.stopPropagation();

        //return false;
    }
}


function EndGame(endingString) {
    $("#ending").dialog({
        dialogClass: "no-close",
        width: 512
    });
    $("#btnRestart").click(function (event) {
        event.preventDefault();
        location.reload();
    });
    $("#btnQuit").click(function (event) {
        event.preventDefault();
        window.location.href = "HomePage.html";
    });
    $("#txtEnding").text(endingString);
}
var difficult;
var start = false;
function Start() {
    $("#starting").dialog({
        dialogClass: "no-close",
        width: 512
    });
    $("#btnEasy").click(function (event) {
        event.preventDefault();
        $("#btnEasy").addClass("selected");
        $("#btnMedium").removeClass("selected");
        $("#btnHard").removeClass("selected");
        difficult = 0;
    });
    $("#btnMedium").click(function (event) {
        event.preventDefault();
        $("#btnMedium").addClass("selected");
        $("#btnEasy").removeClass("selected");
        $("#btnHard").removeClass("selected");
        difficult = -2;
    });
    $("#btnHard").click(function (event) {
        event.preventDefault();
        $("#btnHard").addClass("selected");
        $("#btnEasy").removeClass("selected");
        $("#btnMedium").removeClass("selected");
        difficult = -3;
    });
    $("#btnPlay").click(function (event) {
        if (difficult == null) difficult = 0;
        track.scaling.z += difficult;
        track.physicsImpostor = new BABYLON.PhysicsImpostor(track, BABYLON.PhysicsImpostor.MeshImpostor, { mass: 0, restitution: 0.9 }, scene);
        start = true;
        $("#starting").dialog("close");
    });
}