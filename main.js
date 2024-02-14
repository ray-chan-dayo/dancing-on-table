
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './humanoidAnimation/loadMixamoAnimation.js';
// import * as THREEx from './ar-threex.js'
import { THREEx } from './ar-threex.js'

//index.htmlから移動
THREEx.ArToolkitContext.baseURL = './'

//////////////////////////////////////////////////////////////////////////////////
//		Init
//////////////////////////////////////////////////////////////////////////////////
// init renderer
var renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});
renderer.setClearColor(new THREE.Color('lightgrey'), 0)
renderer.setSize(640, 480);
renderer.domElement.style.position = 'absolute'
renderer.domElement.style.top = '0px'
renderer.domElement.style.left = '0px'
document.body.appendChild(renderer.domElement);
// array of functions for the rendering loop
var onRenderFcts = [];
var arToolkitContext, arMarkerControls;
// init scene and camera
var scene = new THREE.Scene();

//load vrm-mixamo-three.js
const defaultModelUrl = './humanoidAnimation/rei_siro8.vrm';
const mixamoFbxUrl = './humanoidAnimation/Dancing.fbx'

// gltf and vrm
let currentVrm = undefined;
let currentAnimationUrl = undefined;
let currentMixer = undefined;

const helperRoot = new THREE.Group();
helperRoot.renderOrder = 10000;
scene.add( helperRoot );

//////////////////////////////////////////////////////////////////////////////////
//		Initialize a basic camera
//////////////////////////////////////////////////////////////////////////////////
// Create a camera
var camera = new THREE.Camera();
scene.add(camera);
////////////////////////////////////////////////////////////////////////////////
//          handle arToolkitSource
////////////////////////////////////////////////////////////////////////////////
var arToolkitSource = new THREEx.ArToolkitSource({
    // to read from the webcam
    sourceType: 'webcam',
    sourceWidth: window.innerWidth > window.innerHeight ? 640 : 480,
    sourceHeight: window.innerWidth > window.innerHeight ? 480 : 640,
    // // to read from an image
    // sourceType : 'image',
    // sourceUrl : THREEx.ArToolkitContext.baseURL + '../data/images/img.jpg',
    // to read from a video
    // sourceType : 'video',
    // sourceUrl : THREEx.ArToolkitContext.baseURL + '../data/videos/headtracking.mp4',
})
arToolkitSource.init(function onReady() {
    arToolkitSource.domElement.addEventListener('canplay', () => {
        console.log(
            'canplay',
            'actual source dimensions',
            arToolkitSource.domElement.videoWidth,
            arToolkitSource.domElement.videoHeight
        );
        initARContext();
    });
    window.arToolkitSource = arToolkitSource;
    setTimeout(() => {
        onResize()
    }, 2000);
})
// handle resize
window.addEventListener('resize', function () {
    onResize()
})
function onResize() {
    arToolkitSource.onResizeElement()
    arToolkitSource.copyElementSizeTo(renderer.domElement)
    if (window.arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(window.arToolkitContext.arController.canvas)
    }
}
////////////////////////////////////////////////////////////////////////////////
//          initialize arToolkitContext
////////////////////////////////////////////////////////////////////////////////
function initARContext() { // create atToolkitContext
    arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: THREEx.ArToolkitContext.baseURL + 'example/camera_para.dat',
        detectionMode: 'mono',
        debug: true
    })
    // initialize it
    arToolkitContext.init(() => { // copy projection matrix to camera
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        arToolkitContext.arController.orientation = getSourceOrientation();
        arToolkitContext.arController.options.orientation = getSourceOrientation();
        console.log('arToolkitContext', arToolkitContext);
        window.arToolkitContext = arToolkitContext;
    })
    // MARKER
    arMarkerControls = new THREEx.ArMarkerControls(arToolkitContext, camera, {
        type: 'pattern',
        patternUrl: THREEx.ArToolkitContext.baseURL + 'example/pattern-marker.patt',
        // patternUrl : THREEx.ArToolkitContext.baseURL + '../data/data/patt.kanji',
        // as we controls the camera, set changeMatrixMode: 'cameraTransformMatrix'
        changeMatrixMode: 'cameraTransformMatrix'
    })
    scene.visible = false
    console.log('ArMarkerControls', arMarkerControls);
    window.arMarkerControls = arMarkerControls;
}
function getSourceOrientation() {
    if (!arToolkitSource) {
        return null;
    }
    console.log(
        'actual source dimensions',
        arToolkitSource.domElement.videoWidth,
        arToolkitSource.domElement.videoHeight
    );
    if (arToolkitSource.domElement.videoWidth > arToolkitSource.domElement.videoHeight) {
        console.log('source orientation', 'landscape');
        return 'landscape';
    } else {
        console.log('source orientation', 'portrait');
        return 'portrait';
    }
}
// update artoolkit on every frame
onRenderFcts.push(function () {
    if (!arToolkitContext || !arToolkitSource || !arToolkitSource.ready) {
        return;
    }
    arToolkitContext.update(arToolkitSource.domElement)
    // update scene.visible if the marker is seen
      scene.visible = camera.visible
})
//////////////////////////////////////////////////////////////////////////////////
//		add an object in the scene
//////////////////////////////////////////////////////////////////////////////////
// add a torus knot
// var geometry = new THREE.BoxGeometry(1, 1, 1);
// var material = new THREE.MeshNormalMaterial({
//     transparent: true,
//     opacity: 0.5,
//     side: THREE.DoubleSide
// });
// var mesh = new THREE.Mesh(geometry, material);
// mesh.position.y = geometry.parameters.height / 2
// scene.add(mesh);
// var geometry = new THREE.TorusKnotGeometry(0.3, 0.1, 64, 16);
// var material = new THREE.MeshNormalMaterial();
// var mesh = new THREE.Mesh(geometry, material);
// mesh.position.y = 0.5
// scene.add(mesh);
// onRenderFcts.push(function (delta) {
//     mesh.rotation.x += Math.PI * delta
// })
//////////////////////////////////////////////////////////////////////////////////
//		load vrm and fbx
//////////////////////////////////////////////////////////////////////////////////
function loadVRM( modelUrl ) {

	const loader = new GLTFLoader();
	loader.crossOrigin = 'anonymous';

	// helperRoot.clear();

	loader.register( ( parser ) => {

		return new VRMLoaderPlugin( parser, { helperRoot: helperRoot, autoUpdateHumanBones: true } );

	} );

	loader.load(
		// URL of the VRM you want to load
		modelUrl,

		// called when the resource is loaded
		( gltf ) => {

			const vrm = gltf.userData.vrm;

			if ( currentVrm ) {

				scene.remove( currentVrm.scene );

				VRMUtils.deepDispose( currentVrm.scene );

			}

			// put the model to the scene
			currentVrm = vrm;
			scene.add( vrm.scene );

			// Disable frustum culling
			vrm.scene.traverse( ( obj ) => {

				obj.frustumCulled = false;

			} );

			if ( mixamoFbxUrl ) {

				loadFBX( mixamoFbxUrl );

			}

			// rotate if the VRM is VRM0.0
			VRMUtils.rotateVRM0( vrm );

			console.log( vrm );

		},

		// called while loading is progressing
		( progress ) => console.log( 'Loading model...', 100.0 * ( progress.loaded / progress.total ), '%' ),

		// called when loading has errors
		( error ) => console.error( error ),
	);

}

loadVRM( defaultModelUrl );

// mixamo animation
function loadFBX( animationUrl ) {

	currentAnimationUrl = animationUrl;

	// create AnimationMixer for VRM
	currentMixer = new THREE.AnimationMixer( currentVrm.scene );

	// Load animation
	loadMixamoAnimation( animationUrl, currentVrm ).then( ( clip ) => {

		// Apply the loaded animation to mixer and play
		currentMixer.clipAction( clip ).play();
		currentMixer.timeScale = 1.0;

	} );

}
//////////////////////////////////////////////////////////////////////////////////
//		render the whole thing on the page
//////////////////////////////////////////////////////////////////////////////////
// render the scene
onRenderFcts.push(function () {
    renderer.render(scene, camera);
})
//deltaを取得するためclockを定義
const clock = new THREE.Clock();
// run the rendering loop
var lastTimeMsec = null
requestAnimationFrame(function animate(nowMsec) {
    // keep looping
    requestAnimationFrame(animate);
    // measure time
    lastTimeMsec = lastTimeMsec || nowMsec - 1000 / 60
    var deltaMsec = Math.min(200, nowMsec - lastTimeMsec)
    lastTimeMsec = nowMsec
    // call each update function
    onRenderFcts.forEach(function (onRenderFct) {
        onRenderFct(deltaMsec / 1000, nowMsec / 1000)
    })

	const deltaTime = clock.getDelta();

	// if animation is loaded
	if ( currentMixer ) {

		// update the animation
		currentMixer.update( deltaTime );

	}

	if ( currentVrm ) {

		currentVrm.update( deltaTime );

	}

	renderer.render( scene, camera );
})
