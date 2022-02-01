// load .env
require("dotenv").config();

// mongodb
const mongo = require("mongodb").MongoClient;

const connect = async (collection) => {
  const client = await mongo.connect(process.env.MONGODB_URL);
  return client.db("NFP").collection(collection);
};

module.exports = connect;
