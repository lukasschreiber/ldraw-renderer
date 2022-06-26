import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import './helpers/creaseVertexNormals.js';

export const Three = (props) => {

    const mount = useRef(null);
    const [brick, setBrick] = useState(null);
    const [abortController, setAbortController] = useState(new AbortController());

    const materials = {};

    const Matrix4 = new THREE.Matrix4();
    const Vector31 = new THREE.Vector3();
    const Vector32 = new THREE.Vector3();

    // const moveLight = new THREE.Vector3().set(40, 40, 40);
    const positionLight = new THREE.Matrix3().set(
        1, 0, 0.2,
        0, 0.9, 0,
        0.2, 0, 1
    );

    const changeBasis = new THREE.Matrix3().set(
        1, 0, 0,
        0, -1, 0,
        0, 0, -1);

    const renderBrick = async (scene) => {
        console.warn(`rendering brick`);
        if (!brick) {
            try{
                //26074p01 Penguin 0
                //64452p02 Cow 15
                const data = await fetch(`http://192.168.178.53:3001/parse?part=3001&color=1`, {signal: abortController.signal}).then(res => res.json());
                renderPart(scene, data);
                setBrick(data);
            }catch(err) {
                if(err.name === "AbortError")
                    setAbortController(new AbortController());
            }
            
        }

        renderPart(scene, brick);

        const group = new THREE.Group();

        for (let color in materials) {
            const material = materials[color];
            let a = performance.now();
            const mergedGeometry = BufferGeometryUtils.mergeVertices(BufferGeometryUtils.mergeBufferGeometries(material.geometries)).computeAngleVertexNormals(Math.PI * 0.3888889); // 70deg
            let b = performance.now();
            console.log(`calculating normals took ${b-a}ms`)
            const mesh = new THREE.Mesh(mergedGeometry, material.material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            group.add(mesh);
        }

        new THREE.Box3().setFromObject(group).getCenter(group.position).multiplyScalar(- 1);

        scene.add(group);
    };

    const renderPart = (scene, data, transformations = [], translations = []) => {
        if (data === null) return;
        if (typeof data[Symbol.iterator] !== 'function') data = [data];

        for (let part of data) {
            if (part.vertices) {
                renderFace(scene, part.vertices, part.color, transformations, translations, 1.0, part.name);
            }

            if (part.from && part.to && !part.optional) {
                // renderLine(scene, part.from, part.to, part.color, transformations, translations);
            }

            if (part.subpart) {
                for (let subpart of part.subpart) {
                    renderPart(scene, subpart, [...transformations, new THREE.Matrix3().set(...part.transformation)], [...translations, new THREE.Vector3().set(...part.translation)]);
                }
            }
        }
    };

    const renderLine = (scene, from, to, color, transformations, translations) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([Vector31.set(...to), Vector32.set(...from)]);
        const material = new THREE.LineBasicMaterial({ color: color });

        const line = new THREE.Line(geometry, material);

        for (let i = transformations.length - 1; i >= 0; i--) {
            geometry.applyMatrix4(Matrix4.setFromMatrix3(transformations[i]));
            geometry.translate(translations[i].x, translations[i].y, translations[i].z);
        }

        geometry.applyMatrix4(Matrix4.setFromMatrix3(changeBasis));

        scene.add(line);
    };

    const renderFace = (scene, vertices, color, transformations, translations, opacity, name = "") => {
        const geometry = new THREE.BufferGeometry();
        const verticesArray = new Float32Array(vertices);

        geometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));

        for (let i = transformations.length - 1; i >= 0; i--) {
            geometry.applyMatrix4(Matrix4.setFromMatrix3(transformations[i]));
            geometry.translate(translations[i].x, translations[i].y, translations[i].z);
        }

        geometry.applyMatrix4(Matrix4.setFromMatrix3(changeBasis));

        if (!materials[color]) {
            materials[color] = {
                material: new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: .4 }),
                geometries: [geometry]
            };
        } else {
            materials[color].geometries.push(geometry);
        }
    };

    useEffect(() => {
        let a = performance.now();

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0xffffff, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;

        renderer.setSize(window.innerWidth, window.innerHeight);
        mount.current.appendChild(renderer.domElement);
        const rendererDomElement = mount.current;

        console.log("About to render Brick");
        renderBrick(scene);

        const light = new THREE.HemisphereLight(0x404040, 0x808080, 1);
        scene.add(light);

        const ambient = new THREE.AmbientLight(0x808080); // soft white light
        scene.add(ambient);

        const shadowLight = new THREE.DirectionalLight(0xffffff, 0.3);
        shadowLight.castShadow = true;
        shadowLight.position.set(40, 40, 40);
        const d = 100;
        shadowLight.shadow.camera.left = - d;
        shadowLight.shadow.camera.right = d;
        shadowLight.shadow.camera.top = d;
        shadowLight.shadow.camera.bottom = - d;
        shadowLight.shadow.mapSize.width = 1024;
        shadowLight.shadow.mapSize.height = 1024;
        shadowLight.shadow.radius = 2;

        scene.add(shadowLight);


        // new RGBELoader().load('./Field-Path-Rummbach-4K.hdr', (texture) => {
        //     texture.mapping = THREE.EquirectangularReflectionMapping;
        //     scene.environment = texture;
        // });

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.minPolarAngle = 0.2*Math.PI;
        controls.maxPolarAngle = 0.8*Math.PI;
        controls.minDistance = 50;
        controls.enablePan = false;

        camera.position.set(0, 10, 80);
        shadowLight.position.copy(camera.position).applyMatrix3(positionLight);
        controls.update();

        controls.addEventListener("change", () => {
            renderer.render(scene, camera);
            shadowLight.position.copy(camera.position).applyMatrix3(positionLight);

        });

        renderer.render(scene, camera);
        let b = performance.now();
        console.log(`initial render took ${b-a}ms`)


        return () => {
            abortController.abort();
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