import * as THREE from 'three';

THREE.BufferGeometry.prototype.subdivideSurfaces = function () {
    const positions = this.getAttribute("position").array;
    const index = this.getIndex().array;

    const adjacentVertices = [];

    const hashVertex = (vector) => {
        return `${vector.x}${vector.y}${vector.z}`;
    };


    for (let i = 0; i < positions.length; i += 3) { // loop through vertices to create adjacence structure
        let vertexIndex = Math.ceil(i / 3);
        let adjacentVerticesForI = new Set();

        for (let j = 0; j < index.length; j += 3) {
            const a = index[j];
            const b = index[j + 1];
            const c = index[j + 2];

            if (a === vertexIndex) {
                adjacentVerticesForI.add(b);
                adjacentVerticesForI.add(c);
            } else if (b === vertexIndex) {
                adjacentVerticesForI.add(a);
                adjacentVerticesForI.add(c);
            } else if (c === vertexIndex) {
                adjacentVerticesForI.add(a);
                adjacentVerticesForI.add(b);
            }
        }

        adjacentVertices[vertexIndex] = adjacentVerticesForI;
    }

    // create new vertices
    const VertexA = new THREE.Vector3();
    const VertexB = new THREE.Vector3();
    const VertexC = new THREE.Vector3();

    const VertexAtoB = new THREE.Vector3();
    const VertexBtoC = new THREE.Vector3();
    const VertexCtoA = new THREE.Vector3();

    const newIndex = [];
    const newVertices = [];


    for (let i = 0; i < index.length; i += 3) {
        const aIndex = index[i];
        const bIndex = index[i + 1];
        const cIndex = index[i + 2];

        // even Vertices, unmodified
        VertexA.set(positions[aIndex * 3], positions[aIndex * 3 + 1], positions[aIndex * 3 + 2]);
        VertexB.set(positions[bIndex * 3], positions[bIndex * 3 + 1], positions[bIndex * 3 + 2]);
        VertexC.set(positions[cIndex * 3], positions[cIndex * 3 + 1], positions[cIndex * 3 + 2]);

        // odd Vertices, modified
        if (adjacentVertices[aIndex].size === 2) {
            VertexAtoB.copy(VertexA).addScaledVector(VertexB.clone().sub(VertexA), 0.5);
        }else {
            VertexAtoB.copy(VertexA).addScaledVector(VertexB.clone().sub(VertexA), 0.5);
        }

        if (adjacentVertices[bIndex].size === 2) {
            VertexBtoC.copy(VertexB).addScaledVector(VertexC.clone().sub(VertexB), 0.5);
        }

        if (adjacentVertices[cIndex].size === 2) {
            VertexCtoA.copy(VertexC).addScaledVector(VertexA.clone().sub(VertexC), 0.5);
        }

        console.log(aIndex, adjacentVertices[aIndex], adjacentVertices[bIndex], adjacentVertices[cIndex]);

        newVertices.push(VertexAtoB.x, VertexAtoB.y, VertexAtoB.z, VertexB.x, VertexB.y, VertexB.z, VertexBtoC.x, VertexBtoC.y, VertexBtoC.z,
            VertexA.x, VertexA.y, VertexA.z, VertexAtoB.x, VertexAtoB.y, VertexAtoB.z, VertexCtoA.x, VertexCtoA.y, VertexCtoA.z,
            VertexCtoA.x, VertexCtoA.y, VertexCtoA.z, VertexBtoC.x, VertexBtoC.y, VertexBtoC.z, VertexC.x, VertexC.y, VertexC.z,
            VertexAtoB.x, VertexAtoB.y, VertexAtoB.z, VertexBtoC.x, VertexBtoC.y, VertexBtoC.z, VertexCtoA.x, VertexCtoA.y, VertexCtoA.z);

        // add new Vertices to list (resolve with hashes) 
        // if new vertex is not found in new vertices List then add vertex to positions array and create a new reference in new vertex array
        // if new vertex is found take index from array
        // create new triangles 
        /*
        *  B  AtoB  A
        *
        *   BtoC  CtoA
        *       
        *       C 
        * 
        * AtoB, B, BtoC
        * AtoB, BtoC, CtoA
        * A, AtoB, CtoA
        * CtoA, BtoA, C
        */

        // be happy because everything worked out (hopefully)

        // recalculate vertex positions ):
    }

    this.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...newVertices]), 3));
    this.setIndex(null);

    return this;
};