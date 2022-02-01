// load .env
require("dotenv").config();

// express
const express = require("express");
const router = express.Router();

// ethers utils
const { arrayify } = require("@ethersproject/bytes");
const { hashMessage } = require("@ethersproject/hash");
const ethers = require("ethers");
const web3 = require("../resources/web3");
const dev = new ethers.Wallet(process.env.PRIVATE_KEY_ADMIN);
const connect = require("../resources/mongo");
const sendSMS = require("../resources/SMS");

// mongodb
const mongo = require("mongodb").MongoClient;
const asyncHandler = require("express-async-handler");

// variables
let supply = 0;

// check total supply
async function checkSupply() {
  let temp = await web3.contract.totalSupply();
  let response = temp.toNumber();
  supply = response === undefined ? supply : response;
}
// interval to check total supply
const interval = setInterval(checkSupply, 1000);

// get the edition that the address is eligible for
function getEdition(Doc) {
  let temp = 0;
  Doc.metadata.attributes.forEach((elem) => {
    if (elem.trait_type === "Edition") {
      temp = parseInt(elem.value);
    }
  });
  return temp;
}

// get number of collections
function getEdNums() {
  return web3.contract
    .edNums()
    .then((edNums) => {
      return edNums.toNumber();
    })
    .catch((err) => {
      return err;
    });
}

// create signed message
function createSig(_addy) {
  const ts = Date.now();
  const message = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256"],
    [_addy, ts]
  );
  let hashed = ethers.utils.keccak256(message);
  return dev
    .signMessage(arrayify(hashed))
    .then((sig) => {
      let recAddress = ethers.utils.recoverAddress(
        arrayify(hashMessage(arrayify(hashed))),
        sig
      );
      if (recAddress == dev.address) {
        return {
          timestamp: ts,
          signature: sig,
        };
      } else {
        throw new Error("COULDNT RECOVER ADDRESS FROM SIGNATURE");
      }
    })
    .catch((err) => {
      return err;
    });
}
router.get(
  "/test",
  asyncHandler(async (req, res, next) => {
    console.log("got");
    console.log(found);
  })
);
// check if address is on claim list
router.get("/claims/:address", (req, res, next) => {
  const sender = req.params.address;
  if (!ethers.utils.isAddress(sender)) {
    res.status(400).send("INVALID ADDRESS");
  }
  mongo.connect(process.env.MONGODB_URL, (err, client) => {
    if (err) {
      next(err);
    }
    client
      .db("NFP")
      .collection(process.env.METADATA)
      .findOne({
        address: sender,
      })
      .then((addyDoc) => {
        if (addyDoc == null) {
          res.status(400).send("NOT ON CLAIM LIST");
        } else {
          const addyEdition = getEdition(addyDoc);
          getEdNums()
            .then((edNums) => {
              if (addyEdition <= edNums) {
                res
                  .status(400)
                  .send(`CLAIM PERIOD IS OVER FOR EDITION ${addyEdition}`);
              } else {
                createSig(sender)
                  .then((resJSON) => {
                    res.status(200).json(resJSON);
                  })
                  .catch(next);
              }
            })
            .catch(next);
        }
      })
      .catch(next);
  });
});

// token uri's
router.get(
  "/edition/:edId/:id",
  asyncHandler(async (req, res, next) => {
    const editionIndex = parseInt(req.params.edId);
    const tokenId = parseInt(req.params.id);
    if (!(editionIndex > 0) || editionIndex > 1) {
      res.status(400).send("invalid query");
    } else {
      let edition = parseEdition(await web3.contract.getEdition(editionIndex));
      if (tokenId >= edition.supply) {
        res.sendStatus(404).send("invalid query");
      } else {
        const client = await connect(`edition-${editionIndex}`);
        const metadata = (
          await client.find({ tokenIndex: tokenId }).toArray()
        )[0].metadata;
        res.json(metadata);
      }
    }
  })
);

// constract uri
router.get("/contract", (req, res) => {
  res.status(200).json({
    name: "Non-Fungible-People",
    description:
      "Non-Fungible-People is an NFT collection containing unique IRL photos of people with various traits.",
    image: "https://twitter.com/NFP_Project/photo",
  });
});

router.get("/", (req, res) => {
  res.send("uuuuhhhh... well this is awkward");
});
const parseEdition = (edData) => {
  let temp = {};
  temp.edId = edData[0].toNumber();
  temp.MAX_SUPPLY = edData[1].toNumber();
  temp.REVEAL_TS = edData[2].toNumber();
  temp.PUBLIC_TS = edData[3].toNumber();
  temp.price = edData[4].div(1000000000000000).toNumber() / 1000;
  temp.startIndex = edData[5].toNumber();
  temp.startIndexBlock = edData[6].toNumber();
  temp.status = edData[7];
  temp.supply = edData[8].toNumber();
  temp.provHash = edData[9];
  temp.edURI = edData[10];
  return temp;
};

module.exports = router;
