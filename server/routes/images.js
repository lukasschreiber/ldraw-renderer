import sources from '../db/sources.json' assert {type: 'json'};
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { Sets } from '../mongo/index.js';

export const getImages = async (id) => {
    const name = await Sets.findOne({set_num: id}).name;
    const candidates = [
        {
            src: `https://img.bricklink.com/ItemImage/SN/0/${id}.png`,
            role: 'main',
            alt: `LEGO ${id} ${name}`,
            source: sources.bricklink
        },
        {
            src: `https://img.bricklink.com/ItemImage/ON/0/${id}.png`,
            role: 'box',
            alt: `LEGO Box of ${id} ${name}`,
            source: sources.bricklink
        },
        {
            src: `https://img.bricklink.com/ItemImage/IN/0/${id}.png`,
            role: 'instruction',
            alt: `LEGO Building Instructions for ${id} ${name}`,
            source: sources.bricklink
        }
    ];

    const images = [];

    for (let candidate of candidates) {
        const res = await fetch(candidate.src);
        if (res.status !== 404) {
            images.push(candidate);
        }
    }

    return images;
};

export const scrapeImages = async (id) => {
    const body = await fetch(`https://rebrickable.com/sets/${id}/`);
    const $ = cheerio.load(await body.text()); // jQuery Syntax -vomit -

    const imagesRaw = $(".flexslider").find("img");
    const images = [];


    for(let image of imagesRaw){
        images.push($(image).attr("src").split("/125x100")[0].replace("thumbs/", ""));
    }

    return images;
}