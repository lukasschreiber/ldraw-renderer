// based of: https://github.com/stevinz/three-subdivide/blob/master/three-example/webgl_modifier_subdivision.html

import * as THREE from 'three';

const POSITION_DECIMALS = 2;

const _average = new THREE.Vector3();
const _temp = new THREE.Vector3();

const _vector0 = new THREE.Vector3();
const _vector1 = new THREE.Vector3();
const _vector2 = new THREE.Vector3();
const _vec0to1 = new THREE.Vector3();
const _vec1to2 = new THREE.Vector3();
const _vec2to0 = new THREE.Vector3();

const _position = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
];

const _vertex = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
];

class LoopSubdivision {

    /**
     * Applies Loop subdivision modifier to geometry
     *
     * @param {Object} bufferGeometry - Three.js geometry to be subdivided
     * @param {Number} iterations - How many times to run subdividion
     * @returns {Object} Returns new, subdivided, three.js BufferGeometry object
     *
    */
    static modify(bufferGeometry, iterations = 1) {

        if (!verifyGeometry(bufferGeometry)) return bufferGeometry;
        let modifiedGeometry = bufferGeometry.clone();

        for (let i = 0; i < iterations; i++) {
            let subdividedGeometry;

            subdividedGeometry = LoopSubdivision.smooth(modifiedGeometry);

            modifiedGeometry.groups.forEach((group) => {
                subdividedGeometry.addGroup(group.start * 4, group.count * 4, group.materialIndex);
            });

            modifiedGeometry.dispose();
            modifiedGeometry = subdividedGeometry;
        }

        return modifiedGeometry;
    }


    /** Applies one iteration of Loop (flat) subdivision (1 triangle split into 4 triangles) */
    static flat(geometry) {

        ///// Geometries
        if (!verifyGeometry(geometry)) return geometry;
        const existing = (geometry.index !== null) ? geometry.toNonIndexed() : geometry.clone();
        const loop = new THREE.BufferGeometry();

        ///// Attributes
        const attributeList = gatherAttributes(existing);
        const vertexCount = existing.attributes.position.count;

        ///// Build Geometry
        attributeList.forEach((attributeName) => {
            const attribute = existing.getAttribute(attributeName);
            if (!attribute) return;

            loop.setAttribute(attributeName, LoopSubdivision.flatAttribute(attribute, vertexCount));
        });

        ///// Morph Attributes
        const morphAttributes = existing.morphAttributes;
        for (const attributeName in morphAttributes) {
            const array = [];
            const morphAttribute = morphAttributes[attributeName];

            // Process Array of Float32BufferAttributes
            for (let i = 0, l = morphAttribute.length; i < l; i++) {
                if (morphAttribute[i].count !== vertexCount) continue;
                array.push(LoopSubdivision.flatAttribute(morphAttribute[i], vertexCount));
            }
            loop.morphAttributes[attributeName] = array;
        }
        loop.morphTargetsRelative = existing.morphTargetsRelative;

        ///// Clean Up
        existing.dispose();
        return loop;
    }

    static flatAttribute(attribute, vertexCount) {
        const newTriangles = 4;
        const arrayLength = (vertexCount * attribute.itemSize) * newTriangles;
        const floatArray = new attribute.array.constructor(arrayLength);

        let index = 0;
        let step = attribute.itemSize;
        for (let i = 0; i < vertexCount; i += 3) {

            // Original Vertices
            _vector0.fromBufferAttribute(attribute, i + 0);
            _vector1.fromBufferAttribute(attribute, i + 1);
            _vector2.fromBufferAttribute(attribute, i + 2);

            // Midpoints
            _vec0to1.copy(_vector0).add(_vector1).divideScalar(2.0);
            _vec1to2.copy(_vector1).add(_vector2).divideScalar(2.0);
            _vec2to0.copy(_vector2).add(_vector0).divideScalar(2.0);

            // Add New Triangle Positions
            setTriangle(floatArray, index, step, _vector0, _vec0to1, _vec2to0); index += (step * 3);
            setTriangle(floatArray, index, step, _vector1, _vec1to2, _vec0to1); index += (step * 3);
            setTriangle(floatArray, index, step, _vector2, _vec2to0, _vec1to2); index += (step * 3);
            setTriangle(floatArray, index, step, _vec0to1, _vec1to2, _vec2to0); index += (step * 3);
        }

        return new THREE.BufferAttribute(floatArray, attribute.itemSize);
    }


    /** Applies one iteration of Loop (smooth) subdivision (1 triangle split into 4 triangles) */
    static smooth(geometry) {

        ///// Geometries
        if (!verifyGeometry(geometry)) return geometry;
        const existing = (geometry.index !== null) ? geometry.toNonIndexed() : geometry.clone();
        const flat = LoopSubdivision.flat(existing);
        const loop = new THREE.BufferGeometry();

        ///// Attributes
        const attributeList = gatherAttributes(existing);
        const vertexCount = existing.attributes.position.count;
        const posAttribute = existing.getAttribute('position');
        const flatPosition = flat.getAttribute('position');
        const hashToIndex = {};             // Position hash mapped to index values of same position
        const existingNeighbors = {};       // Position hash mapped to existing vertex neighbors
        const flatOpposites = {};           // Position hash mapped to new edge point opposites
        const existingEdges = {};

        const addNeighbor = (posHash, neighborHash, index) => {
            if (!existingNeighbors[posHash]) existingNeighbors[posHash] = {};
            if (!existingNeighbors[posHash][neighborHash]) existingNeighbors[posHash][neighborHash] = [];
            existingNeighbors[posHash][neighborHash].push(index);
        }

        const addOpposite = (posHash, index) => {
            if (!flatOpposites[posHash]) flatOpposites[posHash] = [];
            flatOpposites[posHash].push(index);
        }

        const addEdgePoint = (posHash, edgeHash) => {
            if (!existingEdges[posHash]) existingEdges[posHash] = new Set();
            existingEdges[posHash].add(edgeHash);
        }

        ///// Existing Vertex Hashes
        for (let i = 0; i < vertexCount; i += 3) {
            const posHash0 = hashFromVector(_vertex[0].fromBufferAttribute(posAttribute, i + 0));
            const posHash1 = hashFromVector(_vertex[1].fromBufferAttribute(posAttribute, i + 1));
            const posHash2 = hashFromVector(_vertex[2].fromBufferAttribute(posAttribute, i + 2));

            // Neighbors (of Existing Geometry)
            addNeighbor(posHash0, posHash1, i + 1);
            addNeighbor(posHash0, posHash2, i + 2);
            addNeighbor(posHash1, posHash0, i + 0);
            addNeighbor(posHash1, posHash2, i + 2);
            addNeighbor(posHash2, posHash0, i + 0);
            addNeighbor(posHash2, posHash1, i + 1);

            // Opposites (of new FlatSubdivided vertices)
            _vec0to1.copy(_vertex[0]).add(_vertex[1]).divideScalar(2.0);
            _vec1to2.copy(_vertex[1]).add(_vertex[2]).divideScalar(2.0);
            _vec2to0.copy(_vertex[2]).add(_vertex[0]).divideScalar(2.0);
            const hash0to1 = hashFromVector(_vec0to1);
            const hash1to2 = hashFromVector(_vec1to2);
            const hash2to0 = hashFromVector(_vec2to0);
            addOpposite(hash0to1, i + 2);
            addOpposite(hash1to2, i + 0);
            addOpposite(hash2to0, i + 1);

            // Track Edges for edgePreserve
            addEdgePoint(posHash0, hash0to1);
            addEdgePoint(posHash0, hash2to0);
            addEdgePoint(posHash1, hash0to1);
            addEdgePoint(posHash1, hash1to2);
            addEdgePoint(posHash2, hash1to2);
            addEdgePoint(posHash2, hash2to0);
        }

        ///// Flat Position to Index Map
        for (let i = 0; i < flat.attributes.position.count; i++) {
            const posHash = hashFromVector(_vertex[0].fromBufferAttribute(flatPosition, i));
            if (!hashToIndex[posHash]) hashToIndex[posHash] = [];
            hashToIndex[posHash].push(i);
        }

        ///// Build Geometry, Set Attributes
        attributeList.forEach((attributeName) => {
            const existingAttribute = existing.getAttribute(attributeName);
            const flatAttribute = flat.getAttribute(attributeName);
            if (existingAttribute === undefined || flatAttribute === undefined) return;

            const floatArray = subdivideAttribute(attributeName, existingAttribute, flatAttribute);
            loop.setAttribute(attributeName, new THREE.BufferAttribute(floatArray, flatAttribute.itemSize));
        });

        ///// Morph Attributes
        const morphAttributes = existing.morphAttributes;
        for (const attributeName in morphAttributes) {
            const array = [];
            const morphAttribute = morphAttributes[attributeName];

            // Process Array of Float32BufferAttributes
            for (let i = 0, l = morphAttribute.length; i < l; i++) {
                if (morphAttribute[i].count !== vertexCount) continue;
                const existingAttribute = morphAttribute[i];
                const flatAttribute = LoopSubdivision.flatAttribute(morphAttribute[i], morphAttribute[i].count);

                const floatArray = subdivideAttribute(attributeName, existingAttribute, flatAttribute);
                array.push(new THREE.BufferAttribute(floatArray, flatAttribute.itemSize));
            }
            loop.morphAttributes[attributeName] = array;
        }
        loop.morphTargetsRelative = existing.morphTargetsRelative;

        ///// Clean Up
        flat.dispose();
        existing.dispose();
        return loop;

        //////////

        // Loop Subdivide Function
        function subdivideAttribute(attributeName, existingAttribute, flatAttribute) {
            const arrayLength = (flat.attributes.position.count * flatAttribute.itemSize);
            const floatArray = new existingAttribute.array.constructor(arrayLength);

            let index = 0;
            for (let i = 0; i < flat.attributes.position.count; i += 3) {

                for (let v = 0; v < 3; v++) {
                    _vertex[v].fromBufferAttribute(flatAttribute, i + v);
                    _position[v].fromBufferAttribute(flatPosition, i + v);

                    let positionHash = hashFromVector(_position[v]);
                    let neighbors = existingNeighbors[positionHash];
                    let opposites = flatOpposites[positionHash];

                    ///// Adjust Source Vertex
                    if (neighbors) {

                        // Number of Neighbors
                        const k = Object.keys(neighbors).length;

                        ///// Loop's Formula
                        const beta = 1 / k * ((5 / 8) - Math.pow((3 / 8) + (1 / 4) * Math.cos(2 * Math.PI / k), 2));

                        ///// Warren's Formula
                        // const beta = (k > 3) ? 3 / (8 * k) : ((k === 3) ? 3 / 16 : 0);

                        ///// Stevinz' Formula
                        // const beta = 0.5 / k;

                        ///// Average with Neighbors
                        const startWeight = 1.0 - (beta * k);
                        _vertex[v].multiplyScalar(startWeight);

                        for (let neighborHash in neighbors) {
                            const neighborIndices = neighbors[neighborHash];

                            _average.set(0, 0, 0);
                            for (let j = 0; j < neighborIndices.length; j++) {
                                _average.add(_temp.fromBufferAttribute(existingAttribute, neighborIndices[j]));
                            }
                            _average.divideScalar(neighborIndices.length);

                            _average.multiplyScalar(beta);
                            _vertex[v].add(_average);
                        }

                        ///// Newly Added Edge Vertex
                    } else if (opposites && opposites.length === 2) {
                        const k = opposites.length;
                        const beta = 0.125; /* 1/8 */
                        const startWeight = 1.0 - (beta * k);
                        _vertex[v].multiplyScalar(startWeight);

                        opposites.forEach(oppositeIndex => {
                            _average.fromBufferAttribute(existingAttribute, oppositeIndex);
                            _average.multiplyScalar(beta);
                            _vertex[v].add(_average);
                        });
                    }
                }

                // Add New Triangle Position
                setTriangle(floatArray, index, flatAttribute.itemSize, _vertex[0], _vertex[1], _vertex[2]);
                index += (flatAttribute.itemSize * 3);
            }

            ///// Smooth 'normal' Values
            if (attributeName === 'normal') {
                index = 0;
                for (let i = 0; i < flat.attributes.position.count; i += 3) {
                    for (let v = 0; v < 3; v++) {
                        _position[v].fromBufferAttribute(flatPosition, i + v);
                        let positionHash = hashFromVector(_position[v]);
                        let positions = hashToIndex[positionHash];

                        const k = Object.keys(positions).length;
                        const beta = 0.625 / k; /* 5/8 */
                        const startWeight = 1.0 - (beta * k);

                        _vertex[v].fromBufferAttribute(flatAttribute, i + v);
                        _vertex[v].multiplyScalar(startWeight);

                        positions.forEach(positionIndex => {
                            _average.fromBufferAttribute(flatAttribute, positionIndex);
                            _average.multiplyScalar(beta);
                            _vertex[v].add(_average);
                        });
                    }

                    // Set Triangle
                    setTriangle(floatArray, index, flatAttribute.itemSize, _vertex[0], _vertex[1], _vertex[2]);
                    index += (flatAttribute.itemSize * 3);
                }

                // Add New Triangle Position
                setTriangle(floatArray, index, flatAttribute.itemSize, _vertex[0], _vertex[1], _vertex[2]);
                index += (flatAttribute.itemSize * 3);
            }

            return floatArray;
        }

    }

}

/////////////////////////////////////////////////////////////////////////////////////
/////   Local Functions, Hash
/////////////////////////////////////////////////////////////////////////////////////

const _positionShift = Math.pow(10, POSITION_DECIMALS);

/** Generates hash strong from Number */
const hashFromNumber = (num, shift = _positionShift) => {
    let roundedNumber = round(num * shift);
    if (roundedNumber === 0) roundedNumber = 0; /* prevent -0 (signed 0 can effect Math.atan2(), etc.) */
    return `${roundedNumber}`;
}

/** Generates hash strong from Vector3 */
const hashFromVector = (vector, shift = _positionShift) => {
    return `${hashFromNumber(vector.x, shift)},${hashFromNumber(vector.y, shift)},${hashFromNumber(vector.z, shift)}`;
}

const round = (x) => {
    return (x + ((x > 0) ? 0.5 : -0.5)) << 0;
}

/////////////////////////////////////////////////////////////////////////////////////
/////   Local Functions, Geometry
/////////////////////////////////////////////////////////////////////////////////////

const gatherAttributes = (geometry) => {
    const desired = ['position', 'normal'];
    const contains = Object.keys(geometry.attributes);
    const attributeList = Array.from(new Set(desired.concat(contains)));
    return attributeList;
};

const setTriangle = (positions, index, step, vec0, vec1, vec2) => {
    if (step >= 1) {
        positions[index + 0 + (step * 0)] = vec0.x;
        positions[index + 0 + (step * 1)] = vec1.x;
        positions[index + 0 + (step * 2)] = vec2.x;
    }
    if (step >= 2) {
        positions[index + 1 + (step * 0)] = vec0.y;
        positions[index + 1 + (step * 1)] = vec1.y;
        positions[index + 1 + (step * 2)] = vec2.y;
    }
    if (step >= 3) {
        positions[index + 2 + (step * 0)] = vec0.z;
        positions[index + 2 + (step * 1)] = vec1.z;
        positions[index + 2 + (step * 2)] = vec2.z;
    }
    if (step >= 4) {
        positions[index + 3 + (step * 0)] = vec0.w;
        positions[index + 3 + (step * 1)] = vec1.w;
        positions[index + 3 + (step * 2)] = vec2.w;
    }
};

const verifyGeometry = (geometry) => {
    if (geometry === undefined) {
        console.warn(`LoopSubdivision: Geometry is undefined`);
        return false;
    }

    if (!geometry.isBufferGeometry) {
        console.warn(`LoopSubdivision: Geometry must be 'BufferGeometry' type`);
        return false;
    }

    if (geometry.attributes.position === undefined) {
        console.warn(`LoopSubdivision: Missing required attribute - 'position'`);
        return false;
    }

    if (geometry.attributes.normal === undefined) {
        geometry.computeVertexNormals();
    }
    return true;
};

export { LoopSubdivision };