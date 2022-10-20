require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: "0.8.17",
	networks: {
		goerli: {
			url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		rinkeby: {
			url: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
	},
	etherscan: {
		apiKey: `${process.env.ETHERSCAN_KEY}`,
	},
};
