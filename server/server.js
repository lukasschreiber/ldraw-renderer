import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import getInstructions from './routes/instructions.js';
import { getSet, getSetById } from './routes/sets.js';
import { getImages, scrapeImages } from './routes/images.js';
import { getMinifigs } from './routes/minifigs.js';

import './helpers/stringhelpers.js';

const app = express();
dotenv.config();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const port = parseInt(process.env.PORT) || 3000;

app.get('/sets/:id', async (req, res) => {
    res.send(await getSetById(req.params.id, true));
});

app.get('/sets', async (req, res) => {
    let result = [];
    if (req.query.name) {
        result = result.concat(await getSet(req.query.name, req.query.theme, req.query.year))
    } 

    res.send(result);
});

app.get('/sets/:id/instructions', async (req, res) => {
    res.send(await getInstructions(req.params.id));
});

app.get('/sets/:id/images', async (req, res) => {
    res.send(await getImages(req.params.id));
});

app.get('/sets/:id/scrape', async (req, res) => {
    res.send(await scrapeImages(req.params.id));
});

app.get('/sets/:id/lite', async (req, res) => {
    res.send(await getSetById(req.params.id));
});

app.get('/sets/:id/minifigs', async (req, res) => {
    res.send(await getMinifigs(req.params.id));
});

app.listen(port, () => {
    console.log(`Cool lego app listening on port ${port}`);
});