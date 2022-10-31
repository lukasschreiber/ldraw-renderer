import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { IcosahedronBufferGeometry } from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';
// import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import './helpers/creaseVertexNormals.js';
import './helpers/loopSubdivideSurfaces.js';
import { LoopSubdivision } from './helpers/loopSubsivision.js';

export const PlaygroundIso = () => {

    const mount = useRef(null);

    const positionLight = new THREE.Matrix3().set(4, 0, 0.2, 0, 3.9, 0, 0.2, 0, 4);

    useEffect(() => {
        let a = performance.now();

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0xffffff, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.enabled = true;

        renderer.setSize(window.innerWidth, window.innerHeight);
        mount.current.appendChild(renderer.domElement);
        const rendererDomElement = mount.current;



        const light = new THREE.HemisphereLight(0x404040, 0x808080, 1);
        scene.add(light);

        const ambient = new THREE.AmbientLight(0x808080); // soft white light
        scene.add(ambient);

        const shadowLight = new THREE.DirectionalLight(0xffffff, 0.2);
        shadowLight.castShadow = true;
        shadowLight.position.set(40, 40, 40);
        const d = 200;
        shadowLight.shadow.camera.left = - d;
        shadowLight.shadow.camera.right = d;
        shadowLight.shadow.camera.top = d;
        shadowLight.shadow.camera.bottom = - d;
        shadowLight.shadow.mapSize.width = 2048;
        shadowLight.shadow.mapSize.height = 2048;
        shadowLight.shadow.radius = 2;
        shadowLight.shadow.bias = 0.0001;

        scene.add(shadowLight);

        
        let geometry = new IcosahedronBufferGeometry(40);
        geometry = LoopSubdivision.modify(geometry, 5);
        geometry = geometry.computeAngleVertexNormals(Math.PI/100);
        const material = new THREE.MeshStandardMaterial({ color: '#B40000', metalness: 0, roughness: .3 });
        // const edges = new THREE.EdgesGeometry(geometry, 0);
        // const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        // scene.add(line);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);



        const controls = new OrbitControls(camera, renderer.domElement);

        camera.position.set(0, 10, 80);
        shadowLight.position.copy(camera.position).applyMatrix3(positionLight);
        controls.update();

        controls.addEventListener("change", () => {
            renderer.render(scene, camera);
            shadowLight.position.copy(camera.position).applyMatrix3(positionLight);
        });

        renderer.render(scene, camera);

        let b = performance.now();
        console.log(`rendering took ${(b - a).toFixed(2)}ms`);

        return () => {
            // abortController.abort(); // does not work on the server currently with /pack
            rendererDomElement.removeChild(renderer.domElement);
            controls.removeEventListener("change", () => renderer.render(scene, camera));
            controls.dispose();
            renderer.dispose();
        };
    });

    return (
        <div ref={mount}></div>
    );
};