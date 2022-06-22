import getInstructions from "./instructions.js";
import sources from '../db/sources.json' assert {type: 'json'};
import { Sets, Themes } from '../mongo/index.js';
import getTheme from "./themes.js";
import { getNumberOfSpareParts } from "./inventories.js";

export const getSet = async (searchString, theme = null, year = null, instructions = false) => {
    const query = [
        { num_parts: { $gt: 0 } }
    ];

    let textSearch = false;
    
    if(searchString.isQuoted()){
        query.push({ $text: { $search: searchString.fixQuotes() } });
        textSearch = true;
    }else{
        query.push({name: {$regex: searchString.introduceWhitespaces(true), $options: "si"}});
    }

    if(theme){
        const themes = await getTheme(theme);
        query.push({theme_id: {$in: themes.map(t => t.id)}});
    }

    if(year){
        query.push({year: parseInt(year)});
    }
    
    
    return await querySet({$and: query}, textSearch ? { score: { $meta: "textScore" } } : {},  instructions);
};

export const getSetById = async (id, instructions = false) => {
    return await querySet({set_num: id}, null, instructions);
}

const querySet = async (query, sort = null, instructions) => {
    const sets = await Promise.all((await Sets.find(query, {}).sort(sort).toArray()).map(
        async (data) => {
            const themesOfSet = [];
            let parent_id = data.theme_id;
            while (parent_id !== "") {
                let theme = await Themes.findOne({ id: parseInt(parent_id) });
                parent_id = theme.parent_id;
                themesOfSet.push(theme.name);
            }

            const num_spare_parts = await getNumberOfSpareParts(data.set_num);

            const ret = ({
                set_num: data.set_num,
                name: data.name,
                year: data.year,
                num_parts: data.num_parts,
                num_spare_parts: num_spare_parts,
                image: {
                    src: `https://img.bricklink.com/ItemImage/SN/0/${data.set_num}.png`,
                    alt: `LEGO ${data.set_num} ${data.name}`,
                    source: sources.bricklink
                },
                themes: themesOfSet,
                links: {
                    rebrickable: `https://rebrickable.com/sets/${data.set_num}`,
                    bricklink: `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${data.set_num}`,
                    set_info: `${process.env.HOST}/sets/${data.set_num}`,
                    set_images: `${process.env.HOST}/sets/${data.set_num}/images`,
                    set_minifigs: `${process.env.HOST}/sets/${data.set_num}/minifigs`
                }
            });

            if (instructions) {
                const instructions = await getInstructions(data.set_num);
                ret.instructions = instructions;
            }

            return ret;
        }
    ));

    return sets;
}
