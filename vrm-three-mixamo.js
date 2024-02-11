import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from '/humanoidAnimation/loadMixamoAnimation.js';
// import GUI from 'three/addons/libs/lil-gui.module.min.js';

// renderer
// const renderer = new THREE.WebGLRenderer();
// renderer.setSize( window.innerWidth, window.innerHeight );
// renderer.setPixelRatio( window.devicePixelRatio );
// document.body.appendChild( renderer.domElement );

// camera
// const camera = new THREE.PerspectiveCamera( 30.0, window.innerWidth / window.innerHeight, 0.1, 20.0 );
// camera.position.set( 0.0, 1.0, 5.0 );

// camera controls
// const controls = new OrbitControls( camera, renderer.domElement );
// controls.screenSpacePanning = true;
// controls.target.set( 0.0, 1.0, 0.0 );
// controls.update();

// scene
// const scene = new THREE.Scene();

// light
// const light = new THREE.DirectionalLight( 0xffffff, Math.PI );
// light.position.set( 1.0, 1.0, 1.0 ).normalize();
// scene.add( light );

const defaultModelUrl = 'rei_siro8.vrm';
const mixamoFbxUrl = 'Dancing.fbx'

// gltf and vrm
let currentVrm = undefined;
let currentAnimationUrl = undefined;
let currentMixer = undefined;

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

			if ( currentAnimationUrl ) {

				loadFBX( currentAnimationUrl );

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
		currentMixer.timeScale = params.timeScale;

	} );

}

loadFBX( mixamoFbxUrl );
export { currentMixer, currentVrm };
