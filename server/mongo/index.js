import MongoDB from './connect.js';

const Sets = MongoDB.Collection('sets');
Sets.createIndex({name: "text"},{ default_language: "english" });
Sets.createIndex( { name: 1 } );

const SetImages = MongoDB.Collection('set_images');
const Images = MongoDB.Collection('images');

const Themes = MongoDB.Collection('themes');
Themes.createIndex({name: "text"});

const Parts = MongoDB.Collection('parts');
const PartRelationships = MongoDB.Collection('part_relationships');
const PartCategories = MongoDB.Collection('part_categories');
const Minifigs = MongoDB.Collection('minifigs');
const InventorySets = MongoDB.Collection('inventory_sets');

const InventoryParts = MongoDB.Collection('inventory_parts');
InventoryParts.createIndex( { inventory_id : 1 } )

const InventoryMinifigs = MongoDB.Collection('inventory_minifigs');
const Inventories = MongoDB.Collection('inventories');
Inventories.createIndex( { set_num : 1 } )

const Elements = MongoDB.Collection('elements');
const Colors = MongoDB.Collection('colors');

export {
  Sets,
  SetImages,
  Images,
  Themes,
  Parts,
  PartCategories,
  PartRelationships,
  Minifigs,
  InventorySets,
  InventoryParts,
  InventoryMinifigs,
  Inventories, 
  Elements,
  Colors
};
