import sources from '../db/sources.json' assert {type: 'json'};
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { v4 as uuid } from 'uuid';
import { Images, SetImages, Sets } from '../mongo/index.js';

export const getImages = async (id) => {
    const setImages = await SetImages.findOne({ set_num: id });
    const images = [];
    if (setImages) {
        // take images from db
        if(setImages.bricklink){
            images.push(...await Images.find({id: setImages.bricklink}).toArray())
        }
        if(setImages.rebrickable){
            images.push(...await Images.find({id: setImages.rebrickable}).toArray())
        }
    } else {
        // find images
        images.push(...await scrapeImages(id));
        images.push(...await getBricklinkImages(id));
    }

    return images.map(image => ({
        src: image.src,
        alt: image.alt,
        role: image.role,
        source: sources[image.source]
    }));
};

const getBricklinkImages = async (id) => {
    const name = (await Sets.findOne({ set_num: id })).name;
    const imageId = uuid();
    const candidates = [
        {
            src: `https://img.bricklink.com/ItemImage/SN/0/${id}.png`,
            role: 'main',
            alt: `LEGO Set ${id} ${name}`,
            source: "bricklink"
        },
        {
            src: `https://img.bricklink.com/ItemImage/ON/0/${id}.png`,
            role: 'box',
            alt: `LEGO Box of Set ${id} ${name}`,
            source: "bricklink"
        },
        {
            src: `https://img.bricklink.com/ItemImage/IN/0/${id}.png`,
            role: 'instruction',
            alt: `LEGO Building Instructions for Set ${id} ${name}`,
            source: "bricklink"
        }
    ];

    const images = [];
    const bulk = Images.initializeUnorderedBulkOp();
    for (let candidate of candidates) {
        const res = await fetch(candidate.src);
        if (res.status !== 404) {
            images.push(candidate);
            candidate.id = imageId;
            bulk.insert(candidate);
        }
    }

    bulk.execute();
    SetImages.updateOne({ set_num: id }, { $set: { bricklink: imageId } }, { upsert: true });

    return images;
};

const scrapeImages = async (id) => {
    const imageId = uuid();

    const body = await fetch(`https://rebrickable.com/sets/${id}/`);
    const $ = cheerio.load(await body.text()); // jQuery Syntax -vomit -

    const imagesRaw = $(".flexslider").find("img");
    const images = [];
    const bulk = Images.initializeUnorderedBulkOp();

    for (let image of imagesRaw) {
        let candidate = {
            src: $(image).attr("src").split("/1000x800")[0].replace("thumbs/", ""),
            alt: $(image).attr("alt"),
            source: "rebrickable",
            role: "",
            id: imageId
        };

        bulk.insert(candidate);
        images.push(candidate);
    }

    bulk.execute();
    SetImages.updateOne({ set_num: id }, { $set: { rebrickable: imageId } }, { upsert: true });

    return images;
};