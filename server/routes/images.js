import sources from '../db/sources.json' assert {type: 'json'};
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
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
    const blocked_domains = [
        'googlesyndication.com',
        'adservice.google.com',
        'smartadserver.com',
        'adnxs.com',
        'servenobid.com',
        'yahoo.com',
        '1rx.io',
        'amazon-adsystem.com',
        'e-planning.net',
        'openx.net',
        '33across.com',
        'yieldmo.com',
        'sonobi.com',
        'casalemedia.com',
        'rubiconproject.com',
    ];

    const browser = await puppeteer.launch({
        headless: true,
        userDataDir: './puppeteer'
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const url = request.url();
        if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1 || blocked_domains.some(domain => url.includes(domain))) {
            request.abort();
        } else {
            request.continue();
        }
    });
    await page.goto(`https://rebrickable.com/sets/${id}/`);
    const body = await page.evaluate(() => {
        const imagesRaw = Array.from(document.querySelector('.flex-control-thumbs').querySelectorAll('li > img'));
        const images = [];

        for (let image of imagesRaw) {
            images.push(image.src.split("/125x100")[0].replace("thumbs/", ""));
        }
        return images;
    });
    await browser.close();

    return body;
}