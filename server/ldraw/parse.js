import fs from 'fs';
import * as THREE from 'three';
import { Matrix3 } from 'three';
import { Part3D } from '../mongo/index.js';
import '../helpers/stringhelpers.js';

let invert = false;

let files = {};
const colors = {};

export const initParser = async () => {
    const parsedColors = await parseFile("./ldraw/LDConfig.ldr");
    for (let color of parsedColors) {
        colors[color.code] = color.color;
    }
};

const parseLine = async (type, content, options, invertInFile) => {
    let invertNextLine = invertInFile;
    if (invert) invertNextLine = !invertNextLine;
    invert = false;
    switch (type) {
        case 0: return parseComment(content, options);
        case 1: return await parseReference(content, options, invertNextLine);
        case 2: return parseLineBetweenPoints(content, options);
        case 3: return parseTriangle(content, options, invertNextLine);
        case 4: return parseQuad(content, options, invertNextLine);
        case 5: return parseOptionalLines(content, options);
    };
};

const parseFile = async (path, options, invertNextLine) => {
    const file = await readFile(path);
    file.find(line => {
        const tokens = splitLine(line);
        if(tokens[1] === "BFC" && tokens.find(p => p === "CW")){
            console.log("CW");
            invertNextLine = !invertNextLine;
        }
    });

    const lines = (await Promise.all(file.map(async (line, index) => {
        if (index === 0) return null; // title

        const content = line.substring(2);
        return await parseLine(parseInt(line.charAt(0)), content, options, invertNextLine, file[1].split(": ")[1]);
    }))).filter(line => line !== null);

    return lines;
};

const parseReference = async (line, options, invertNextLine) => {
    const chars = splitLine(line);
    let path = parsePath(chars[chars.length - 1]).replace("stud.dat", "stud-logo4.dat");

    // const highresVersionExists = fs.existsSync(path.replace("parts/", "parts/48/"));
    // if(highresVersionExists) path = path.replace("parts/", "parts/48/");

    const color = parseColor(chars[0], options);
    const m = chars.filter((p, i) => i > 0 && i < chars.length - 1).map(p => parseFloat(p));

    const transformation = [
        m[3], m[4], m[5],
        m[6], m[7], m[8],
        m[9], m[10], m[11]
    ];

    const matrix = new Matrix3().set(...transformation);
    if (matrix.determinant() < 0) invertNextLine = !invertNextLine;

    const subpart = await parseFile(path, { colors: { main: color, edge: options.colors.edge } }, invertNextLine); //FIX ME take new edge Color
    return {
        color,
        transformation,
        translation: [m[0], m[1], m[2]],
        subpart,
    };
};

const parseLineBetweenPoints = (line, options) => {
    const chars = splitLine(line);
    const color = parseColor(chars[0], options);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    return {
        color,
        from: x,
        to: y
    };
};

const parseTriangle = (line, options, invertNextLine) => {
    const chars = splitLine(line);
    const color = parseColor(chars[0], options);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    const z = chars.filter((p, i) => i > 6 && i < 10).map(p => parseFloat(p));
    return {
        color,
        vertices: !invertNextLine ? [...x, ...y, ...z] : [...x, ...z, ...y],
    };
};

const parseQuad = (line, options, invertNextLine) => {
    const chars = splitLine(line);

    const clockwise = !invertNextLine;

    const color = parseColor(chars[0], options);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    const z = chars.filter((p, i) => i > 6 && i < 10).map(p => parseFloat(p));
    const w = chars.filter((p, i) => i > 9 && i < 13).map(p => parseFloat(p));

    const triangles = [];

    if (clockwise) {
        triangles.push(...x, ...y, ...z); // x y z
        triangles.push(...z, ...w, ...x); // z w x
    } else {
        triangles.push(...x, ...z, ...y); // x z y
        triangles.push(...z, ...x, ...w); // z x w
    }

    return {
        color,
        vertices: triangles,
    };
};

const parseOptionalLines = (line, options) => {
    const chars = splitLine(line);
    const color = parseColor(chars[0], options);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    const z = chars.filter((p, i) => i > 6 && i < 10).map(p => parseFloat(p));
    const w = chars.filter((p, i) => i > 9 && i < 13).map(p => parseFloat(p));

    return {
        color,
        from: x,
        to: y,
        optional: true,
        controlPoints: [z, w]
    };

};

const parseComment = (line, options) => {
    const chars = splitLine(line);
    const unsupportedCommands = ["STEP", "WRITE", "PRINT", "CLEAR", "PAUSE", "SAVE"];
    if (
        line === "" || // empty lines
        line.includes("//") || // comments
        chars[0].substring(chars[0].length - 1) === ":" || // names and credits
        unsupportedCommands.includes(chars[0])
    ) return null;

    // do some BFC parsing here
    if (chars[0] === "BFC") {
        if (chars.find(p => p === "INVERTNEXT")) invert = true;
        return null;
    }

    if (chars[0].charAt(0) === "!") return parseMetaCommand(line, options);

    return null;
};


const parseMetaCommand = (line, options) => {
    const chars = splitLine(line);
    switch (chars[0].replace("!", "")) {
        case "COLOUR": return parseMetaCommandColor(chars, options);
        default: return null;
    }
};

const parseMetaCommandColor = (line, options) => {
    const code = line[line.indexOf("CODE") + 1];
    const value = parseColor(line[line.indexOf("VALUE") + 1], options);
    const edge = parseColor(line[line.indexOf("EDGE") + 1], options);

    const color = {
        main: value,
        edge
    };

    if (line.indexOf("ALPHA") > 0) {
        color.alpha = parseAlpha(line[line.indexOf("ALPHA") + 1]);
    }

    if (line.indexOf("LUMINANCE") > 0) {
        color.luminance = line[line.indexOf("LUMINANCE") + 1];
    }

    if (line.indexOf("CHROME") > 0) {
        color.material = 0;
    }

    if (line.indexOf("PEARLESCENT") > 0) {
        color.material = 1;
    }

    if (line.indexOf("RUBBER") > 0) {
        color.material = 2;
    }

    if (line.indexOf("MATTE_METALLIC") > 0) {
        color.material = 3;
    }

    if (line.indexOf("METAL") > 0) {
        color.material = 4;
    }

    if (line.indexOf("MATERIAL") > 0) {
        color.material = 5;
        color.customMaterial = parseMaterial(line.slice(line.indexOf("MATERIAL") + 1), options);
    }

    return { code, color };
};

const splitLine = (line) => line.split(/\s+/);
const parsePath = (file) => `./ldraw/parts/${file.replace("\\", "/")}`;
const parseAlpha = (value) => parseFloat((parseInt(value) / 255).toFixed(2));

const parseMaterial = (line, options) => {
    return null;
};

const parseColor = (color, options) => {
    if (color.includes("0x2")) {
        return new THREE.Color(parseInt(color.split("0x2")[1], 16));
    }

    if (color.includes("#")) {
        return new THREE.Color(parseInt(color.split("#")[1], 16));
    }

    switch (parseInt(color)) {
        case 16: return new THREE.Color(options.colors.main);
        case 24: return new THREE.Color(options.colors.edge);
        default: return colors[color.toString()].main;
    }
};

export const parseBrick = async (path, options) => {
    // const hash = `${path}${JSON.stringify(options)}`.hashCode();
    // const savedFile = await Part3D.findOne({ hash });
    // if (savedFile) {
    //     return savedFile.package;
    // } else {
        const packedFile = await parseFile(path, options);
        // Part3D.updateOne({ hash }, { $set: { package: packedFile } }, { upsert: true });
        return packedFile;
    // }

};

export const getColor = (color) => {
    return { main: colors[color.toString()].main.getHex(), edge: colors[color.toString()].edge.getHex() };
};

const readFile = async (path) => {
    let hash = path.hashCode();

    if (!files[hash]) {
        const file = await fs.promises.readFile(path, 'utf-8');
        const lines = file.split(/\r?\n/).filter(line => line !== "").map(line => line.trim());
        files[hash] = lines;
        return lines;
    } else {
        return files[hash];
    }
};

