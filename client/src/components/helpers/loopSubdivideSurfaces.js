import * as THREE from 'three';

THREE.BufferGeometry.prototype.subdivideSurfaces = function(){
    const positions = this.getAttribute("position").array;
    const index = this.getIndex().array;

    const adjacentVertices = [];

    const hashVertex = (vector) => {
        return `${vector.x}${vector.y}${vector.z}`;
    }

    // console.log(`${positions.length/3} vertices for geometry ${this.name}`)
    
    for(let i = 0; i < positions.length; i+=3){ // loop through vertices to create adjacence structure
        let vertexIndex = Math.ceil(i / 3);
        let adjacentVerticesForI = new Set();

        for(let j = 0; j < index.length; j+=3){
            const a = index[j];
            const b = index[j+1];
            const c = index[j+2];

            if(a === vertexIndex){
                adjacentVerticesForI.add(b);
                adjacentVerticesForI.add(c);
            }else if(b === vertexIndex){
                adjacentVerticesForI.add(a);
                adjacentVerticesForI.add(c);
            }else if(c === vertexIndex){
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

    for(let i = 0; i < index.length; i+=3){
        const a = index[i];
        const b = index[i+1];
        const c = index[i+2];
        VertexA.set(positions[a*3], positions[a*3+1], positions[a*3+2]);
        VertexB.set(positions[b*3], positions[b*3+1], positions[b*3+2]);
        VertexC.set(positions[c*3], positions[c*3+1], positions[c*3+2]);

        VertexAtoB.copy(VertexA).addScaledVector(VertexB.clone().sub(VertexA), 0.5);
        VertexBtoC.copy(VertexB).addScaledVector(VertexC.clone().sub(VertexB), 0.5);
        VertexCtoA.copy(VertexC).addScaledVector(VertexA.clone().sub(VertexC), 0.5);

        newIndex.push(a, b, c);

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

    this.index.set(newIndex);

    // console.log(adjacentVertices);
    return this;
}