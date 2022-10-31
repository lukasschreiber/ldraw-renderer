import '../helpers/stringhelpers.js';

import fs from 'graceful-fs';
import util from "util";
import { Matrix3 } from 'three';
import { Part3D } from '../mongo/index.js';

const readFileAsync = util.promisify(fs.readFile);

const FLAGS = {
    invertNextLine: false
};

const CACHE = {
    files: {},
    matrix: new Matrix3()
};

const RESPONSE = {
    files: {},
    materials: {},
    inverted: new Set(),
    names: {},
    start: null
};

const COLORS = {};

export const initParser = async () => {
    const parsedColors = await parseFile("./ldraw/LDConfig.ldr", true);
    for (let color of parsedColors) {
        COLORS[color.code] = color.color;
    }
};

const clearResponse = () => {
    RESPONSE.files = {};
    RESPONSE.materials = {};
    RESPONSE.inverted = new Set();
    RESPONSE.names = {};
    RESPONSE.start = null;
};

const parseLine = async (type, content, nosave = false) => {
    switch (type) {
        case 0: return parseComment(content, nosave);
        case 1: return await parseReference(content);
        case 2: return parseLineBetweenPoints(content);
        case 3: return parseTriangle(content);
        case 4: return parseQuad(content);
        case 5: return parseOptionalLines(content);
    };
};

const parseFile = async (path, nosave = false) => {
    RESPONSE.names[path.hashCode()] = path;

    const file = await readFile(path);
    let clockwise = false;

    const lines = (await Promise.all(file.map(async (line, index) => {
        if (index === 0) return null; // title

        const content = line.substring(2);
        const parsedLine = await parseLine(parseInt(line.charAt(0)), content, file[1].split(": ")[1], nosave);
        if (parsedLine?.BFC) {
            if (parsedLine.BFC.clockwise) clockwise = true;
            return null;
        }
        return parsedLine;
    }))).filter(line => line !== null);

    if (clockwise) {
        RESPONSE.inverted.add(path.hashCode());
    }

    return lines;
};

const parseReference = async (line) => {
    const chars = splitLine(line);
    let path = parsePath(chars[chars.length - 1]).replace("/stud.dat", "/stud-logo4.dat");
    // const highresVersionExists = fs.existsSync(path.replace("parts/", "parts/48/"));
    // if(highresVersionExists) path = path.replace("parts/", "parts/48/");

    const hash = path.hashCode();

    let invert = FLAGS.invertNextLine;

    if (FLAGS.invertNextLine) {
        FLAGS.invertNextLine = false;
    }

    const color = parseColor(chars[0]);
    const m = chars.filter((p, i) => i > 0 && i < chars.length - 1).map(p => parseFloat(p));

    const transformation = [
        m[3], m[4], m[5],
        m[6], m[7], m[8],
        m[9], m[10], m[11]
    ];

    const matrix = CACHE.matrix.set(...transformation);
    if (matrix.determinant() < 0) invert = !invert;

    if (!RESPONSE.names[hash]) {
        RESPONSE.files[hash] = await parseFile(path);
    }

    return {
        type: 1,
        color: JSON.stringify(color).hashCode(),
        transformation,
        translation: [m[0], m[1], m[2]],
        reference: hash,
        invert
    };
};

const parseLineBetweenPoints = (line) => {
    const chars = splitLine(line);
    const color = parseColor(chars[0]);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    return {
        type: 2,
        color: JSON.stringify(color).hashCode(),
        points: [x, y]
    };
};

const parseTriangle = (line) => {
    const chars = splitLine(line);
    const color = parseColor(chars[0]);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    const z = chars.filter((p, i) => i > 6 && i < 10).map(p => parseFloat(p));
    return {
        type: 3,
        color: JSON.stringify(color).hashCode(),
        vertices: [...x, ...y, ...z]
    };
};

const parseQuad = (line) => {
    const chars = splitLine(line);

    const color = parseColor(chars[0]);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    const z = chars.filter((p, i) => i > 6 && i < 10).map(p => parseFloat(p));
    const w = chars.filter((p, i) => i > 9 && i < 13).map(p => parseFloat(p));

    const triangles = [];

    triangles.push(...x, ...y, ...z); // x y z
    triangles.push(...z, ...w, ...x); // z w x

    return {
        type: 4,
        color: JSON.stringify(color).hashCode(),
        vertices: triangles,
    };
};

const parseOptionalLines = (line) => {
    const chars = splitLine(line);
    const color = parseColor(chars[0]);
    const x = chars.filter((p, i) => i > 0 && i < 4).map(p => parseFloat(p));
    const y = chars.filter((p, i) => i > 3 && i < 7).map(p => parseFloat(p));
    const z = chars.filter((p, i) => i > 6 && i < 10).map(p => parseFloat(p));
    const w = chars.filter((p, i) => i > 9 && i < 13).map(p => parseFloat(p));

    return {
        color: JSON.stringify(color).hashCode(),
        points: [x, y, z, w],
        type: 5
    };

};

const parseComment = (line, nosave = false) => {
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
        if (chars.find(p => p === "INVERTNEXT")) FLAGS.invertNextLine = true;
        if (chars.find(p => p === "CERTIFY")) return { BFC: { clockwise: chars.find(p => p === "CW") } };
        return null;
    }

    if (chars[0].charAt(0) === "!") return parseMetaCommand(line, nosave);

    return null;
};


const parseMetaCommand = (line, nosave = false) => {
    const chars = splitLine(line);
    switch (chars[0].replace("!", "")) {
        case "COLOUR": return parseMetaCommandColor(chars, nosave);
        default: return null;
    }
};

const parseMetaCommandColor = (line, nosave = false) => {
    const code = line[line.indexOf("CODE") + 1];
    const value = parseColor(line[line.indexOf("VALUE") + 1], nosave);
    const edge = parseColor(line[line.indexOf("EDGE") + 1], nosave);

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
        color.customMaterial = parseMaterial(line.slice(line.indexOf("MATERIAL") + 1));
    }

    return { code, color };
};

const splitLine = (line) => line.split(/\s+/);
const parsePath = (file) => `./ldraw/parts/${file.replace("\\", "/")}`;
const parseAlpha = (value) => parseFloat((parseInt(value) / 255).toFixed(2));

const parseMaterial = (line) => {
    return null;
};

const parseColor = (color, nosave = false) => {
    let colorOutput = color;
    let direct = false;
    if (color.includes("0x2")) {
        colorOutput = parseInt(color.split("0x2")[1], 16);
        direct = true;
    }

    if (color.includes("#")) {
        colorOutput = parseInt(color.split("#")[1], 16);
        direct = true;
    }

    if (!direct) {
        switch (parseInt(color)) {
            case 16: colorOutput = 16; break;
            case 24: colorOutput = 24; break;
            default: colorOutput = COLORS[color.toString()];
        }
    }

    if (!nosave) {
        const hash = JSON.stringify(colorOutput).hashCode();
        if (!RESPONSE.materials[hash]) {
            RESPONSE.materials[hash] = colorOutput;
        }
    }

    return colorOutput;
};

export const parseBrick = async (path) => {
    clearResponse();

    const hash = path.hashCode();
    const savedFile = await Part3D.findOne({ hash });
    if (savedFile) {
        return savedFile.package;
    } else {
        const start = await parseFile(path);
        RESPONSE.names[hash] = path;
        RESPONSE.files[path.hashCode()] = start;

        const responsePackage = {
            files: RESPONSE.files,
            materials: RESPONSE.materials,
            inverted: Array.from(RESPONSE.inverted),
            start: path.hashCode(),
            names: RESPONSE.names
        };

        Part3D.updateOne({ hash }, { $set: { package: responsePackage } }, { upsert: true });
        return { ...responsePackage };
    }
};

export const getColor = (color) => {
    return { main: COLORS[color.toString()].main, edge: COLORS[color.toString()].edge };
};


const readFile = async (path) => {
    const file = await readFileAsync(path, 'utf-8');
    const lines = file.split(/\r?\n/).filter(line => line !== "").map(line => line.trim());
    return lines;
};

