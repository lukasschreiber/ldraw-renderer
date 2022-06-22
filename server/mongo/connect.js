import { MongoClient } from "mongodb";

const MongoDB = async (uri = '', options = {}) => {
  if (!process.mongodb) {
    const mongodb = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: process.env.NODE_ENV === "production",
      ...options,
    });

    const db = mongodb.db('lego');
    process.mongodb = db;

    return {
      db,
      Collection: db.collection.bind(db),
      connection: mongodb,
    };
  }

  return null;
};

export default await MongoDB('mongodb://127.0.0.1:27017', {});