import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import getInstructions, { getInstructionLink } from './routes/instructions.js';
import cors from 'cors';
import { getSet, getSetById } from './routes/sets.js';
import { getImages } from './routes/images.js';
import { getMinifigs } from './routes/minifigs.js';
import { getParts, getInventory } from './routes/inventories.js';

import './helpers/stringhelpers.js';
import { parseBrick, initParser, getColor } from './ldraw/parse.js';
import * as Packager from './ldraw/pack.js';

const app = express();
dotenv.config();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
const port = parseInt(process.env.PORT) || 3000;

// initParserialize Parser
initParser();
Packager.initParser();

app.get('/sets/:id', async (req, res) => {
    res.send(await getSetById(req.params.id, true));
});

app.get('/sets', async (req, res) => {
    let result = [];
    if (req.query.name) {
        result = result.concat(await getSet(req.query.name, req.query.theme, req.query.year));
    }

    res.send(result);
});

app.get('/sets/:id/instructions', async (req, res) => {
    res.send(await getInstructions(req.params.id));
});

app.get('/sets/:id/images', async (req, res) => {
    res.send(await getImages(req.params.id));
});

app.get('/sets/:id/minifigs', async (req, res) => {
    res.send(await getMinifigs(req.params.id));
});

app.get('/sets/:id/parts', async (req, res) => {
    res.send(await getParts(await getInventory(req.params.id)));
});

app.get('/', async (req, res) => {
    res.send("Hallo du");
})


app.get('/instructions/:id/:instruction_id', async (req, res) => {
    res.redirect(307, (await getInstructionLink(req.params.id, req.params.instruction_id)) ?? "back");
});

app.get('/parse', async (req, res) => {
    const color = getColor(req.query.color);
    res.send(await parseBrick(`./ldraw/parts/${req.query.part}.dat`, { colors: color }));//0xB40000
});

app.get('/pack', async (req, res) => {
    console.log("test")
    res.send(await Packager.parseBrick(`./ldraw/parts/${req.query.part}.dat`));//0xB40000
});

app.listen(port, () => {
    console.log(`Very cool lego app listening on port ${port}`);
});