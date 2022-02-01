const ethers = require("ethers");
const abi = require("./NFP_ABI.json");
const contractAddress = "0xB5dFF5d0dBDA0e56a3a80aDd5Cca33483aA0fe11";
const rink = new ethers.providers.InfuraProvider(
  "rinkeby",
  process.env.INFURA_ID
);
const main = new ethers.providers.InfuraProvider(
  "mainnet",
  process.env.INFURA_ID
);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY_ADMIN, rink);
const con = new ethers.Contract(contractAddress, abi, signer);

module.exports = {
  providers: {
    rinkeby: rink,
    mainnet: main,
  },
  contract: con,
};
