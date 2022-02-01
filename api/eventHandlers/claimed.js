// load .env
require("dotenv").config();

// web3
const web3 = require("../resources/web3");
const ethers = require("ethers");

// mongodb
const connect = require("../resources/mongo");

// SMS
const sendSMS = require("../resources/SMS");

// rename to include tokenId
const rename = (oldName, id) => {
  let sliced = oldName.split(":");
  let newName = `${sliced[0]} #${id}:${sliced[1]}`;
  return newName;
};

// listen for contract event
web3.contract.on("Claimed", async (address, nonce, tokenId, edIndex) => {
  try {
    const addys = await connect("nfp-addresses");
    const numFound = await addys.find({ address: address }).toArray();
    if (numFound.length > 1) {
      sendSMS(
        "NFP",
        process.env.DEV_NUMBER,
        "MULTIPLE ADDRESSES FOUND FOR CLAIM"
      );
      throw Error("MULTIPLE ADDRESSES FOUND FOR CLAIM");
    }
    if (numFound.length === 1) {
      addys
        .updateOne({ address: address }, { $set: { nonce: nonce } })
        .catch((e) => {
          sendSMS("NFP", process.env.DEV_NUMBER, e);
        });
    } else {
      const temp = {
        address: address,
        nonce: nonce,
      };
      addys.insertOne(temp);
    }
    const meta = await connect("nfp-metadata");
    const doc = await meta.findOne({ address: address });
    if (doc == null) {
      const res = await sendSMS(
        "NFP-API",
        process.env.DEV_NUMBER,
        `NFP/eventHandlers/claimed.js:\nCannot find metadata pair\n\nAddress: ${address}\nTokenID: ${tokenId}`
      );
      console.log(res);
    } else {
      const public = await connect("nfp-public");
      await public.insertOne({
        tokenId: tokenId,
        metadata: doc.metadata,
      });
    }
  } catch (err) {
    await sendSMS(
      "NFP-API",
      process.env.DEV_NUMBER,
      `NFP/eventHandlers/claimed.js:\nMongoDB connection error\n\nAddress: ${address}\nTokenID: ${tokenId}\nError message:\n${err}`
    );
  }
});
