import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import './helpers/creaseVertexNormals.js';

export const ThreePack = (props) => {

    const mount = useRef(null);
    const { id, color } = useParams();
    const [brick, setBrick] = useState(null);
    const [colors, setColors] = useState(null);
    const [abortController, setAbortController] = useState(new AbortController());

    const materials = {};
    // const creases = [];

    const Matrix4 = new THREE.Matrix4();
    // const Vector31 = new THREE.Vector3();
    // const Vector32 = new THREE.Vector3();

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
                const data = await fetch(`http://localhost:3001/pack?part=${id}`, {signal: abortController.signal}).then(res => res.json());
                setBrick(data);
                console.log(color);
                setColors({16: "#B40000", 24: "#333333"});

                renderPart(scene, brick.start);
            }catch(err) {
                if(err.name === "AbortError")
                    setAbortController(new AbortController());
            }
            
        }else{
            renderPart(scene, brick.start);
        }

        const group = new THREE.Group();

        for (let color in materials) {
            const material = materials[color];

            let a = performance.now();
            const mergedGeometry = BufferGeometryUtils.mergeVertices(BufferGeometryUtils.mergeBufferGeometries(material.geometries)).computeAngleVertexNormals(Math.PI/3); // 70deg
            let b = performance.now();
            console.log(`calculating normals took ${b-a}ms`)
            // const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(material.geometries);
            // mergedGeometry.computeVertexNormals();

            console.log(mergedGeometry.getAttribute("position").array.length/3);

            const mesh = new THREE.Mesh(mergedGeometry, material.material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            group.add(mesh);
        }

        new THREE.Box3().setFromObject(group).getCenter(group.position).multiplyScalar(- 1);

        scene.add(group);
    };

    const getColor = (code, mainColor) => {
        let color = brick.materials[code];
        if(color === 24){
            return colors[color];
        }

        if(color === 16){
            return mainColor;
        }

        return color.main;
    }

    const renderPart = (scene, hash, transformations = [], translations = [], mainColor = colors[16], invert = false) => {
        if (hash === null || !brick.files[hash]) return;
        
        const data = brick.files[hash];
        const clockwise = brick.inverted.includes(hash);

        for (let part of data) {
            if (part.vertices) {
                renderFace(scene, part.vertices, getColor(part.color, mainColor), transformations, translations, invert, clockwise);
            }

            if (part.type === 2) {
                // renderLine(scene, part.points[0], part.points[1], getColor(part.color, "#333333"), transformations, translations);
            }

            if (part.type === 1) {
                let invertReference = part.invert;
                if(invert) invertReference = !invertReference;
                // 16 changes dependent on context
                renderPart(scene, part.reference, [...transformations, new THREE.Matrix3().set(...part.transformation)], [...translations, new THREE.Vector3().set(...part.translation)], getColor(part.color, mainColor), invertReference);
            }
        }
    };

    // const renderLine = (scene, from, to, color, transformations, translations) => {
    //     const geometry = new THREE.BufferGeometry().setFromPoints([Vector31.set(...to), Vector32.set(...from)]);
    //     const material = new THREE.LineBasicMaterial({ color: color, linewidth: 1 });

    //     const line = new THREE.Line(geometry, material);

    //     for (let i = transformations.length - 1; i >= 0; i--) {
    //         geometry.applyMatrix4(Matrix4.setFromMatrix3(transformations[i]));
    //         geometry.translate(translations[i].x, translations[i].y, translations[i].z);
    //     }

    //     geometry.applyMatrix4(Matrix4.setFromMatrix3(changeBasis));

    //     creases.push(line);
    //     // scene.add(line);
    // };

    const renderFace = (scene, vertices, color, transformations, translations, invert = false, clockwise = false) => {
        const geometry = new THREE.BufferGeometry();
        const v = new Float32Array(vertices);

        if(clockwise) invert = !invert;

        if(invert){
            for(let i = 0; i < v.length; i += 9){
                [v[i+3], v[i+4], v[i+5], v[i+6], v[i+7], v[i+8]] = [v[i+6], v[i+7], v[i+8], v[i+3], v[i+4], v[i+5]];
            }
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));

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


        // new RGBELoader().load('../../Field-Path-Rummbach-4K.hdr', (texture) => {
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

        // let a = performance.now();
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