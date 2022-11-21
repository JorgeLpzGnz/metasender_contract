require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: "0.8.17",
	networks: {
		mainnet: {
			url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		goerli: {
			url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		rinkeby: {
			url: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		bsc: {
			url: `https://bsc-dataseed1.binance.org`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		bscTestnet: {
			url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		polygon: {
			url: `https://polygon-rpc.com/`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		polygonMumbai: {
			url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_POLYGON_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		avalanche: {
			url: `https://api.avax.network/ext/bc/C/rpc`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		avalancheFujiTestnet: {
			url: `https://avalanche-fuji.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		opera: {
			url: `https://rpc.ftm.tools`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		ftmTestnet: {
			url: `https://rpc.ankr.com/fantom_testnet`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		kotti: {
			url: `https://www.ethercluster.com/kotti`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
	},
	etherscan: {
		apiKey: {
			mainnet: `${process.env.ETHERSCAN_API_KEY}`,
			goerli: `${process.env.ETHERSCAN_API_KEY}`,
			bsc: `${process.env.BSCSCAN_API_KEY}`,
			bscTestnet: `${process.env.BSCSCAN_API_KEY}`,
			polygon: `${process.env.POLYGONSCAN_API_KEY}`,
			polygonMumbai: `${process.env.POLYGONSCAN_API_KEY}`,
			avalanche: `${process.env.SNOWTRACE_API_KEY}`,
			avalancheFujiTestnet: `${process.env.SNOWTRACE_API_KEY}`,
			opera: `${process.env.FTMSCAN_API_KEY}`,
			ftmTestnet: `${process.env.FTMSCAN_API_KEY}`,
			ethereumClassic: `?module=contract`,
		},
		customChains: [
			{
			  network: "ethereumClassic",
			  chainId: 6,
			  urls: {
				apiURL: "https://blockscout.com/etc/mainnet/api",
				browserURL: "https://blockscout.com/etc/mainnet/"
			  }
			},
			{
			  network: "kotti",
			  chainId: 77,
			  urls: {
				apiURL: "https://blockscout.com/etc/kotti/api",
				browserURL: "https://blockscout.com/etc/kotti/"
			  }
			}
		  ]
	},
};
