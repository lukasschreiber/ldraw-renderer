import fetch from 'node-fetch';
import fs from 'fs';
import zlib from 'zlib';
import { exec } from 'child_process';
import { Colors, Elements, Inventories, InventoryMinifigs, InventoryParts, InventorySets, Minifigs, PartCategories, PartRelationships, Parts, Sets, Themes } from './mongo/index.js';

const srcs = [
    {
        url: "https://cdn.rebrickable.com/media/downloads/themes.csv.gz",
        db: Themes
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/colors.csv.gz",
        db: Colors
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/part_categories.csv.gz",
        db: PartCategories
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/parts.csv.gz",
        db: Parts
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/part_relationships.csv.gz",
        db: PartRelationships
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/elements.csv.gz",
        db: Elements
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/sets.csv.gz",
        db: Sets
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/minifigs.csv.gz",
        db: Minifigs
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/inventories.csv.gz",
        db: Inventories
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/inventory_parts.csv.gz",
        db: InventoryParts
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/inventory_sets.csv.gz",
        db: InventorySets
    },
    {
        url: "https://cdn.rebrickable.com/media/downloads/inventory_minifigs.csv.gz",
        db: InventoryMinifigs
    }
];

const updateDB = async () => {

    for (let src of srcs) {
        const res = await fetch(src.url);
        let path = src.url.split("/");
        let filename = path[path.length - 1].split('.')[0] + '.csv';
        const fileStream = fs.createWriteStream("db/" + filename);
        await new Promise((resolve, reject) => {
            res.body.pipe(zlib.createGunzip())
                .pipe(fileStream);

            res.body.on("error", reject);
            fileStream.on("finish", resolve);
        });
        console.log(`Updated ${filename} from ${src.url}`);
        const namespace = (await src.db.stats()).ns.split(".");
        const db = namespace[0];
        const collection = namespace[1];

        exec(`mongoimport -d ${db} -c ${collection} --file db/${filename} --type csv --headerline --drop`, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    }
};

updateDB();