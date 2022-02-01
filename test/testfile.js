require("dotenv").config();

const { expect } = require("chai");
const { MockProvider } = require("ethereum-waffle");
const hre = require("hardhat");
const { parseUnits, arrayify, parseEther } = require("ethers/lib/utils");
const { createHash } = require("crypto");
const { ethers } = require("ethers");

describe("NFP Contract", () => {
  let nfp, owner, admin, tester;
  beforeEach(async () => {
    [owner, admin, tester] = await hre.ethers.getSigners();
    const NFP = await hre.ethers.getContractFactory("NFP");
    nfp = await NFP.deploy();
    await (await nfp.connect(owner)).flipAllStatus();
    await (await nfp.connect(owner)).setAdmin(admin.address);
  });
  it("Function Tests", async () => {
    let numEds = 4;
    let price = 0.08;
    for (i = 1; i < numEds + 1; i++) {
      await nfp.setEdition(
        i,
        200 + getRandInt(100),
        Math.floor(Date.now() / 1000) + 60,
        Math.floor(Date.now() / 1000) - 30,
        parseEther(price.toString()),
        true,
        getRandomHash(),
        `www.nfp.com/edition/${i}/`
      );
    }
    for (i = 1; i < numEds + 1; i++) {
      let edition = parseEdition(await nfp.getEdition(i));
      console.log(edition);
    }
    let finished = [];
    let localTokens = [];
    while (true) {
      let edId = getRandInt(numEds) + 1;
      if (finished.includes(edId)) {
        continue;
      }
      let edition = parseEdition(await nfp.getEdition(edId));
      let mintsLeft = edition.MAX_SUPPLY - edition.supply;
      if (mintsLeft <= 10) {
        let overrides = {
          value: parseEther((price * mintsLeft).toString()),
        };
        await nfp.mintPerson(mintsLeft, edId, overrides);
        finished.push(edId);
        for (i = 0; i < mintsLeft; i++) {
          localTokens.push(edId);
        }
      } else {
        let numMints = 1 + getRandInt(10);
        let overrides = {
          value: parseEther((price * numMints).toString()),
        };
        await nfp.mintPerson(numMints, edId, overrides);
        for (i = 0; i < numMints; i++) {
          localTokens.push(edId);
        }
      }
      if (numEds == finished.length) {
        break;
      }
    }
    let totalSupply = (await nfp.totalSupply()).toNumber();
    let edIndexs = (await nfp.getAllTokens())[0].map((elem) => elem.toNumber());
    let tokenIdsOfeditions = (await nfp.getAllTokens())[1].map((elem) =>
      elem.toNumber()
    );
    console.log("local:");
    console.log(localTokens);
    console.log("contract:");
    console.log(edIndexs);
    console.log(tokenIdsOfeditions);
    for (i = 0; i < 20; i++) {
      let randTokenId = getRandInt(totalSupply + 1);
      let tokenURI = await nfp.tokenURI(randTokenId);
      console.log(`Loc - edId:\n${localTokens[randTokenId]}`);
      console.log(`Con - edId:\n${edIndexs[randTokenId]}`);
      console.log(
        `Con - tokenIdsOfedition:\n${tokenIdsOfeditions[randTokenId]}`
      );
      console.log(`Con - URI:\n${tokenURI}\n`);
    }
  });
});

// create signed message
function createSig(address, nonce, edId, signer) {
  const message = hre.ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256", "uint256"],
    [address, nonce, edId]
  );
  let hashed = hre.ethers.utils.keccak256(message);
  return signer
    .signMessage(arrayify(hashed))
    .then((sig) => {
      let recAddress = hre.ethers.utils.recoverAddress(
        arrayify(hre.ethers.utils.hashMessage(arrayify(hashed))),
        sig
      );
      if (recAddress == signer.address) {
        return {
          addy: address,
          claimNonce: nonce,
          edIndex: edId,
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

const getRandomHash = () => {
  const randint = getRandInt(9999);
  return createHash("sha256").update(randint.toString()).digest("hex");
};
const getRandInt = (max) => {
  return Math.floor(Math.random() * max);
};
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
