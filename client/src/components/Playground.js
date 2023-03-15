import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';
// import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import './helpers/creaseVertexNormals.js';
import { LoopSubdivision } from './helpers/loopSubsivision.js';

export const Playground = () => {

    const mount = useRef(null);
    const { id, /*color*/ } = useParams();
    const [brick, setBrick] = useState(null);
    const [colors, /*setColors*/] = useState({ 16: "#B40000", 24: "#333333" });
    const [abortController, setAbortController] = useState(new AbortController());

    const materials = {};
    const geometries = {};

    const Matrix3 = new THREE.Matrix3();
    const Matrix4 = new THREE.Matrix4();

    const positionLight = new THREE.Matrix3().set(4, 0, 0.2, 0, 3.9, 0, 0.2, 0, 4);
    const changeBasis = new THREE.Matrix3().set(1, 0, 0, 0, -1, 0, 0, 0, -1);

    const renderBrick = async (scene) => {
        if (!brick) {
            try {
                const data = await fetch(`http://localhost:3001/pack?part=${id}`, { signal: abortController.signal }).then(res => res.json());
                setBrick(data);
            } catch (err) {
                if (err.name === "AbortError") setAbortController(new AbortController());
            }
        } else {
            preprocessGeometries(brick, scene);
            renderPart(brick.start);

        }

        const group = new THREE.Group();

        for (let materialKey in materials) {
            const material = materials[materialKey];
            const rest = [];

            for (let geometryKey in material.geometries) {
                const geometry = material.geometries[geometryKey];
                const instances = geometry.transformationMatrices.length;

                if (instances > 6) { // only use instanced mesh if rendering more than n geometries of one type
                    const mesh = new THREE.InstancedMesh(geometry.geometry, material.material, instances);
                    for (let i = 0; i < instances; i++) {
                        mesh.setMatrixAt(i, geometry.transformationMatrices[i]);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        group.add(mesh);
                    }
                } else {
                    for (let i = 0; i < instances; i++) {
                        const geometryCopy = geometry.geometry.clone();
                        geometryCopy.applyMatrix4(geometry.transformationMatrices[i]);
                        rest.push(geometryCopy);
                    }
                }
            }

            if (rest.length > 0) {
                const mergedGeometry = BufferGeometryUtils.mergeVertices(BufferGeometryUtils.mergeBufferGeometries(rest)).computeAngleVertexNormals(Math.PI / 3);
                const subdividedGeometry = LoopSubdivision.modify(mergedGeometry, 2);
                const mesh = new THREE.Mesh(subdividedGeometry, material.material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);
            }
        }

        group.applyMatrix4(Matrix4.setFromMatrix3(changeBasis));

        scene.add(group);
    };

    const preprocessGeometries = (data) => {
        if (!data) return;

        for (let hash in data.files) {
            const part = data.files[hash];
            const faces = part.filter(p => p.vertices);

            if (faces.length <= 0) continue;

            const clockwise = data.inverted.includes(parseInt(hash));
            const facesByColor = {};
            for (let face of faces) {
                if (!facesByColor[face.color]) {
                    facesByColor[face.color] = [];
                }
                facesByColor[face.color].push(getPreprocessedFace(face.vertices, clockwise));
            }

            for (let color in facesByColor) {
                const geometry = BufferGeometryUtils.mergeVertices(BufferGeometryUtils.mergeBufferGeometries(facesByColor[color])).computeAngleVertexNormals(Math.PI / 3);
                geometry.name = data.names[hash];
                facesByColor[color] = BufferGeometryUtils.mergeVertices(geometry);
            }

            geometries[hash] = facesByColor;
        }
    };

    const getPreprocessedFace = (vertices, clockwise) => {
        const geometry = new THREE.BufferGeometry();
        const v = new Float32Array(vertices);

        if (clockwise) {
            for (let i = 0; i < v.length; i += 9) {
                [v[i + 3], v[i + 4], v[i + 5], v[i + 6], v[i + 7], v[i + 8]] = [v[i + 6], v[i + 7], v[i + 8], v[i + 3], v[i + 4], v[i + 5]];
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));

        return geometry;
    };

    const renderPart = (hash, transformation = new THREE.Matrix4(), mainColor = colors[16], invert = false) => {
        if (hash === null || !brick.files[hash]) return;

        const data = brick.files[hash];
        const geometryHash = hash + (invert ? 1 : 0);

        const precomputedGeometries = geometries[hash];
        if (precomputedGeometries) {
            for (let materialHash in precomputedGeometries) {
                let color = getColor(materialHash, mainColor);

                // create new bucket for material
                if (!materials[color]) {
                    // const randomColor = Math.floor(Math.random()*16777215);
                    materials[color] = {
                        material: new THREE.MeshStandardMaterial({ color: color, metalness: 0, roughness: .3 }),
                        geometries: {}
                    };
                }

                // create new bucket for geometry
                if (!materials[color].geometries[geometryHash]) {
                    let geometry = precomputedGeometries[materialHash].clone();
                    if (invert) {
                        const index = geometry.index.array;
                        for (let i = 0, il = index.length / 3; i < il; i++) {
                            let x = index[i * 3];
                            index[i * 3] = index[i * 3 + 2];
                            index[i * 3 + 2] = x;
                        }
                    }

                    materials[color].geometries[geometryHash] = {
                        geometry,
                        transformationMatrices: [transformation]
                    };
                } else {
                    materials[color].geometries[geometryHash].transformationMatrices.push(transformation);
                }
            }
        }

        for (let instruction of data) {

            if (instruction.type === 1) {
                let invertReference = instruction.invert;
                if (invert) invertReference = !invertReference;

                const Transformations = transformation.clone();
                Transformations.multiply(Matrix4.setFromMatrix3(Matrix3.fromArray(instruction.transformation).transpose()).setPosition(...instruction.translation));
                renderPart(instruction.reference, Transformations, getColor(instruction.color, mainColor), invertReference);
            }
        }
    };

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

        renderBrick(scene);

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

        // new RGBELoader().load('../../Field-Path-Rummbach-4K.hdr', (texture) => {
        //     texture.mapping = THREE.EquirectangularReflectionMapping;
        //     scene.environment = texture;
        // });

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

    const getColor = (code, mainColor) => {
        let color = brick.materials[code];
        if (color === 24) {
            return colors[color];
        } else if (color === 16) {
            return mainColor;
        }
        return color.main;
    };

    return (
        <div ref={mount}></div>
    );
};