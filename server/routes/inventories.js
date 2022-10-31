import { Inventories, InventoryMinifigs, InventoryParts } from '../mongo/index.js';

export const getInventory = async (id) => {
    return (await Inventories.findOne({ set_num: id })).id;
};

export const getParts = async (inventory_id) => {
    const parts = (await InventoryParts.aggregate([
        { $match: { $and: [{ inventory_id: inventory_id }, { is_spare: "f" }] } },
        { $project: { _id: 0, inventory_id: 0, is_spare: 0 } }
    ]).toArray());

    const spare = (await InventoryParts.aggregate([
        { $match: { $and: [{ inventory_id: inventory_id }, { is_spare: "t" }] } },
        { $project: { _id: 0, inventory_id: 0, is_spare: 0 } }
    ]).toArray());

    return {spare, parts};
};

export const getNumberOfMinifigs = async (set_num) => {
    const inventory = await getInventory(set_num);
    const minifigs = await InventoryMinifigs.aggregate(
        [
            {
                $match: { inventory_id: inventory }
            },
            {
                $group: { _id: "$inventory_id", minifigs: { $sum: "$quantity" } }
            }
        ]).toArray();
    return minifigs.length > 0 ? minifigs[0].minifigs : 0;
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