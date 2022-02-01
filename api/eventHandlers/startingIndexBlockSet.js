// load .env
require("dotenv").config();

// web3
const web3 = require("../resources/web3");
const ethers = require("ethers");
const dev = new ethers.Wallet(process.env.PRIVATE_KEY_ADMIN, web3.provider);

// mongodb
const connect = require("../resources/mongo");
const mongo = require("mongodb").MongoClient;

// SMS
const sendSMS = require("../resources/SMS");

web3.contract.on("EditionStartIndexBlockSet", async (edNum, blockNum) => {
  try {
    console.log("starting");
    const editions = await connect("editions");
    await (await web3.contract.setStartingIndex()).wait((confirms = 3));
    const edition = await web3.contract.editions(edNum);
    await editions.updateOne(
      { edition: edNum },
      {
        $set: {
          prov_hash: edition.prov_hash,
          start_index_block: edition.start_index_block.toNumber(),
          start_index: edition.start_index.toNumber(),
          revealTimestamp: edition.revealTimestamp.toNumber(),
        },
      }
    );
  } catch (err) {
    await sendSMS(
      "NFP-API",
      process.env.DEV_NUMBER,
      `NFP/eventHandlers/startingIndexBlockSet:\n${err}`
    );
  }
});

const reIndex = async (edNum, startingIndex) => {
  const meta = await connect(process.env.METADATA);
  const num = await meta
    .find({
      claimed: true,
      edition: edNum,
    })
    .count();
  let left = 250 - num;
  let newIndices = Array.from(Array(left).keys()).map(
    (val) => ((val + left - startingIndex) % left) + ((edNum - 1) * 250 + num)
  );
  for (i = 0; i < left; ++i) {
    await meta.updateOne({ initId: i }, { $set: { tokenId: newIndices[i] } });
  }
};

const duplicateColl = async (init, copy) => {
  console.log(`Starting`);

  const client = await mongo.connect(process.env.MONGODB_URL);
  const initColl = client.db("NFP").collection(init);
  const copyColl = await client.db("NFP").createCollection(copy);
  const initArray = await initColl.find().toArray();
  copyColl.insertMany(initArray);
  console.log(`Collection ${copy} Copied`);
  return copyColl;
};
// duplicateColl("nfp-metadata", "edition-1");

// duplicateColl("nfp_data", "nfp_data_backup");
const test = async () => {
  const meta = await connect("nfp_data_backup");
  const cursor = meta.find();
  let counter = 0;
  cursor.forEach((doc) => {
    meta.updateOne({ _id: doc._id }, { $set: { initId: counter } });
    ++counter;
  });
  console.log("done");
};
