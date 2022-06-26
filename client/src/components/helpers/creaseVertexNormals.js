import * as THREE from 'three';

THREE.BufferGeometry.prototype.computeAngleVertexNormals = function (creaseAngle = Math.PI / 3) {
    const creaseDot = Math.cos(creaseAngle);
    const hashMultiplier = (1 + 1e-10) * 1e2;

    const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const n1 = new THREE.Vector3();
    const n2 = new THREE.Vector3();

    const hashVertex = (v) => {
        const x = ~ ~(v.x * hashMultiplier);
        const y = ~ ~(v.y * hashMultiplier);
        const z = ~ ~(v.z * hashMultiplier);
        return `${x},${y},${z}`;
    }

    const resultGeometry = this.toNonIndexed();
    const positionAttribute = resultGeometry.attributes.position;
    const vertexMap = {};

    for (let i = 0, l = positionAttribute.count / 3; i < l; i++) {
        const i3 = 3 * i;
        const a = vertices[0].fromBufferAttribute(positionAttribute, i3 + 0);
        const b = vertices[1].fromBufferAttribute(positionAttribute, i3 + 1);
        const c = vertices[2].fromBufferAttribute(positionAttribute, i3 + 2);

        v1.subVectors(c, b);
        v2.subVectors(a, b);

        const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
        for (let n = 0; n < 3; n++) {
            const vert = vertices[n];
            const hash = hashVertex(vert);
            if (!(hash in vertexMap)) {
                vertexMap[hash] = [];
            }
            vertexMap[hash].push(normal);
        }

    }

    const normalArray = new Float32Array(positionAttribute.count * 3);
    const normalAttribute = new THREE.BufferAttribute(normalArray, 3, false);
    for (let i = 0, l = positionAttribute.count / 3; i < l; i++) {

        const i3 = 3 * i;
        const a = vertices[0].fromBufferAttribute(positionAttribute, i3 + 0);
        const b = vertices[1].fromBufferAttribute(positionAttribute, i3 + 1);
        const c = vertices[2].fromBufferAttribute(positionAttribute, i3 + 2);

        v1.subVectors(c, b);
        v2.subVectors(a, b);

        n1.crossVectors(v1, v2).normalize();

        for (let n = 0; n < 3; n++) {
            const vertex = vertices[n];
            const hash = hashVertex(vertex);
            const otherNormals = vertexMap[hash];
            n2.set(0, 0, 0);
            for (let k = 0, lk = otherNormals.length; k < lk; k++) {
                const otherNormal = otherNormals[k];
                if (n1.dot(otherNormal) > creaseDot) {
                    n2.add(otherNormal);
                }
            }
            n2.normalize();
            normalAttribute.setXYZ(i3 + n, n2.x, n2.y, n2.z);
        }
    }

    resultGeometry.setAttribute('normal', normalAttribute);
    return resultGeometry;
};