import { Inventories, InventoryParts } from '../mongo/index.js';

export const getInventory = async (id) => {
    return (await Inventories.findOne({ set_num: id })).id;
};

export const getParts = async (inventory_id) => {
    return (await InventoryParts.find({ inventory_id: inventory_id }).toArray());
};

export const getNumberOfSpareParts = async (set_num) => {
    const inventory = await getInventory(set_num);
    const spare = await InventoryParts.aggregate(
        [
            {
                $match: { inventory_id: inventory, is_spare: "t" }
            },
            {
                $group: { _id: "$inventory_id", spare: { $sum: "$quantity" } }
            }
        ]).toArray();
    return spare.length > 0 ? spare[0].spare : 0;

};