import sources from '../db/sources.json' assert {type: 'json'};
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { v4 as uuid } from 'uuid';
import { SetInstructions, Instructions } from '../mongo/index.js';

const getInstructions = async (id) => {
    const instructionId = (await SetInstructions.findOne({ set_num: id }))?.instructions_id;
    const instructions = [];
    if(instructionId){
        instructions.push(...await Instructions.find({ instructions_id: instructionId }).toArray());
    }else{
        instructions.push(...await scrapeInstructionInformation(id));
    }

    return instructions.map(instruction => ({
        image: {
            src: instruction.src,
            alt: instruction.alt,
            source: sources[instruction.source]
        },
        url: `${process.env.HOST}/instructions/${id}/${instruction.id}`,
        name: instruction.name,
        paper: instruction.paper,
        size: instruction.size
    }));
}

const scrapeInstructionInformation = async (id) => {
    const instructionsId = uuid();

    const body = await fetch(`https://rebrickable.com/instructions/${id}/`);
    const $ = cheerio.load(await body.text()); // jQuery Syntax -vomit -
    const instructionsRaw = $("#bi_list_html div > a");
    const instructions = [];

    const bulk = Instructions.initializeUnorderedBulkOp();

    for(let instruction of instructionsRaw){
        const text = $(instruction).text().split("\n").filter(a => a !== "");
        const image = $(instruction).find('img');

        const candidate = {
            instructions_id: instructionsId,
            id: parseInt(instruction.attribs.href.split("/")[instruction.attribs.href.split("/").findIndex(p => p === "instructions")+1]),
            name: text[0],
            paper: text.find(p => p.includes("Paper: ")) ?? "",
            size: text[text.length - 1],
            src: $(image).attr('data-src').split("/180x144")[0].replace("thumbs/", ""),
            alt: $(image).attr("alt"),
            source: "rebrickable"
        }

        bulk.insert(candidate);
        instructions.push(candidate);
    }

    bulk.execute();
    SetInstructions.updateOne({ set_num: id }, { $set: { instructions_id: instructionsId } }, { upsert: true });

    return instructions;
}

export const getInstructionLink = async (id, instruction_id) => {
    console.log("here")
    const body = await fetch(`https://rebrickable.com/instructions/${id}/`);
    const $ = cheerio.load(await body.text()); // jQuery Syntax -vomit -
    const instructionsRaw = $("#bi_list_html div > a");
    for(let instruction of instructionsRaw){
        if(instruction.attribs.href.includes(instruction_id)){
            return `https://rebrickable.com/${instruction.attribs.href}`;
        }
    }
    return null;
}

export default getInstructions;