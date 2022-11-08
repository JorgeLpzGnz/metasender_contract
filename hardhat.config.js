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
		bsc_test: {
			url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		mumbai: {
			url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_POLYGON_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
	},
	etherscan: {
		apiKey: `${process.env.POLYGONSCAN_API_KEY}`,
	},
};
