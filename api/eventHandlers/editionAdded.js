// load .env
require("dotenv").config();

// web3
const web3 = require("../resources/web3");
const ethers = require("ethers");
const dev = new ethers.Wallet(process.env.PRIVATE_KEY_ADMIN, web3.provider);

// mongodb
const connect = require("../resources/mongo");
const mongo = require("mongodb").MongoClient;

// pinata
const pinataClient = require("@pinata/sdk");
const pinata = pinataClient(process.env.PINATA_KEY, process.env.PINATA_SECRET);

// SMS
const sendSMS = require("../resources/SMS");

// other
const NFPs = require("../resources/nfp_metadata.json");
const { createHash } = require("crypto");
const Promise = require("bluebird");

const test = async (edNum, ts) => {
  try {
    const editions = await connect("editions");
    const meta = await connect("nfp-metadata");
    const num = await meta
      .find({
        edition: edNum,
      })
      .count();
    if (num != 250) {
      throw Error(
        `Incorrect number of NFPs for edition.\n\nEdition #:\n${edNum}\nNFPs found:\n${num}`
      );
    }
    let hashes = [];
    let index = 0;
    const cursor = meta.find();
    await cursor.forEach((doc) => {
      if (!doc.claimed && doc.edition == edNum) {
        meta.updateOne({ _id: doc._id }, { $set: { initId: index } });
        ++index;
      }
      console.log(`Hashed: ${hashString(doc.metadata.image)}`);
      hashes.push(hashString(doc.metadata.image));
    });
    const hashConcat = hashes.join("");
    const provHash = hashString(hashConcat);
    await editions.updateOne(
      { edition: edNum },
      { $set: { prov_hash: provHash, revealTimestamp: ts } }
    );
    await sendSMS(
      "NFP-API",
      process.env.DEV_NUMBER,
      `NFP-API:\n\nNew Edition Added\n\nEdition #:\n${edNum}\n\nReveal Timestamp:\n${ts}\n\nProvenance Hash:\n${provHash}`
    );
  } catch (err) {
    await sendSMS(
      "NFP-API",
      process.env.DEV_NUMBER,
      `NFP/eventHandlers/editionAdded:\n${err}`
    );
  }
};

const hashString = (testStr) => {
  return createHash("sha256").update(testStr).digest("hex");
};

const upload = async (edNum) => {
  try {
    const meta = await connect("nfp-metadata");
    const toUpload = await Promise.map(NFPs, async (elem) => {
      let traits = genTraits(elem, 1);
      let name = elem.name.split(" ")[0];
      let addy = null;
      if (elem.address != "") {
        try {
          addy = ethers.utils.getAddress(elem.address);
        } catch {
          addy = await web3.providers.mainnet.resolveName(elem.address);
        }
      } else {
        addy = null;
      }

      const data = {
        address: addy,
        metadata: {
          name: `Non Fungible People: ${name}`,
          description:
            "Non fungible people is a collection of 250 random strangers, friends, and family members given algorithmically assigned traits and backgrounds. The goal of Non Fungible People is to introduce and educate all participants of this project on NFTs and grow a community around the shared experience. We are incredibly thankful to everyone willing to participate in this project that is a first of its kind.",
          image: elem.img_link,
          attributes: traits,
        },
        edition: edNum,
      };
      return data;
    });
    let res = await meta.insertMany(toUpload);
    console.log(res);
  } catch (err) {
    console.log(err);
  }
};
const genTraits = (data, edNum) => {
  attributes = [];
  traits = [
    "background",
    "type",
    "head",
    "expression",
    "mouth",
    "glasses",
    "body",
    "necklace",
    "left_hand",
    "right_hand",
  ];
  attributes.push({
    trait_type: "Edition",
    value: `${edNum}`,
  });
  traits.forEach((trait) => {
    if (data[trait] != "") {
      attributes.push({
        trait_type: trait
          .toString()
          .toLowerCase()
          .split(" ")
          .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
          .join(" "),
        value: data[trait],
      });
    }
  });
  return attributes;
};

const main = async () => {
  const meta = await connect("nfp_data_backup");
  const cursor = meta.find();
  let index = 0;
  cursor.forEach((doc) => {
    if (doc.address != null) {
      meta.updateOne(
        { _id: doc._id },
        { $set: { tokenId: index, claimed: true } }
      );
      ++index;
    }
  });
};
