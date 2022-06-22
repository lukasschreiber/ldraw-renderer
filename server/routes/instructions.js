import sources from '../db/sources.json' assert {type: 'json'};
import fetch from 'node-fetch';
import cheerio from 'cheerio';

const getInstructions = async (id) => {
    const body = await fetch(`https://rebrickable.com/instructions/${id}/`);
    const $ = cheerio.load(await body.text()); // jQuery Syntax -vomit -
    const instructionsRaw = $("#bi_list_html div > a");
    const instructions = [];

    for(let instruction of instructionsRaw){
        const text = $(instruction).text().split("\n").filter(a => a !== "");
        const image = $(instruction).find('img');
        instructions.push({
            image: {
                src: $(image).attr('data-src').split("/180x144")[0].replace("thumbs/", ""),
                alt: $(image).attr("alt"),
                source: sources.rebrickable
            },
            url: `https://rebrickable.com${instruction.attribs.href}`,
            name: text[0],
            paper: text.find(p => p.includes("Paper: ")) ?? "",
            size: text[text.length - 1]
        });
    }
    return instructions;
}

export default getInstructions;