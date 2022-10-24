const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

async function getExample(cuantity) {
	const addresses = [];
	const amounts = [];
	const accounts = [];
	const signers = await ethers.getSigners();
	let sI = 1;
	for (let i = 1; i <= cuantity; i++) {
		if (sI == signers.length - 1) sI = 1;
		accounts.push(signers[sI]);
		addresses.push(signers[sI].address);
		amounts.push(
			ethers.utils.parseEther(
				`${Math.round(Math.random() * 50) / 50}`
			)
		);
		sI++;
	}
	return { addresses, amounts, accounts };
}

async function getBalances(accounts) {
	const balanaces = [];
	for (const account of accounts) {
		const BigNum = await account.getBalance();
		balanaces.push(Number(ethers.utils.formatEther(BigNum)));
	}
	return balanaces;
}

async function getTokenBalance( contract, accounts ){
	const balanaces = [];
	for (const account of accounts) {
		const BigNum = await contract.balanceOf(account);
		balanaces.push(Number(ethers.utils.formatEther(BigNum)));
	}
	return balanaces;
}

function compareBalances(smaller, bigger) {
	return smaller.every((e, i) => e < bigger[i]);
}

function getPrice(amounts) {
	return amounts.reduce((prev, cur) => prev.add(cur));
}

describe("MetaSender", function () {

	async function deployMetaSender() {
		const [owner, anotherAcount] = await ethers.getSigners();

		const MetaSender = await ethers.getContractFactory("MetaSender");
		const metaSender = await MetaSender.deploy();

		const Token20 = await ethers.getContractFactory("Token20");
		const token20 = await Token20.deploy();

		const Token721 = await ethers.getContractFactory("Token721");
		const token721 = await Token721.deploy();

		return { metaSender, owner, anotherAcount, token20, token721 };
	}

	describe("transfer ETH from same value", () => {
		describe("Errors", () => {
			it("it should fail if is passed more than 254 wallets", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(255)
				await expect(
					metaSender.sendEthSameValue(addresses, 10, {
						value: ethers.utils.parseEther(`2550`),
					})
				).to.be.revertedWith("Max 244 transaction by batch");
			});
			it("it should fail if the passed value is less than needed", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(25);

				await expect(
					metaSender.sendEthSameValue(addresses, 10, {
						value: ethers.utils.parseEther(`0`),
					})
				).to.be.revertedWith("The value is less than required");
			});
		});
		describe("functionalities", () => {
			it("Should transfer a batch of transactions with same value", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);

				const { addresses } = await getExample(25);

				const value = ethers.utils.parseEther("1.0");

				await metaSender.sendEthSameValue(addresses, value, {
					value: ethers.utils.parseEther("25"),
				});
			});
			it("verify the transactions", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);

				const { addresses, accounts } = await getExample(2);

				const value = ethers.utils.parseEther("1");

				const prevBalances = await getBalances(accounts);

				await metaSender.sendEthSameValue(addresses, value, {
					value: ethers.utils.parseEther("10"),
				});

				const postBalances = await getBalances(accounts);

				expect(compareBalances(prevBalances, postBalances));
			});
			it("check if it returns the remaining value", async () => {
				const { metaSender, owner } = await loadFixture(
					deployMetaSender
				);

				const { addresses } = await getExample(2);

				const [prevBalance] = await getBalances([owner]);

				const value = ethers.utils.parseEther("1");

				await metaSender.sendEthSameValue(addresses, value, {
					value: ethers.utils.parseEther("10"),
				});

				const [postBalance] = await getBalances([owner]);

				expect(prevBalance - 10 < postBalance);
			});
		});
	});

	describe("transfer ETH from different value", () => {
		describe("Errors", () => {
			it("it should fail if number of accounts is different of amounts", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(25);

				await expect(
					metaSender.sendEthDifferentValue(
						addresses,
						[1, 2],
						{
							value: ethers.utils.parseEther(`2`),
						}
					)
				).to.be.revertedWith("Addresses and values most be iqual");
			});
			it("it should fail if is passed more than 254 wallets", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses, amounts } = await getExample(255);

				await expect(
					metaSender.sendEthDifferentValue(
						addresses,
						amounts,
						{
							value: getPrice(amounts),
						}
					)
				).to.be.revertedWith("Max 244 transaction by batch");
			});
			it("it should fail if the passed value is less than needed", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses, amounts } = await getExample(25);

				await expect(
					metaSender.sendEthDifferentValue(
						addresses,
						amounts,
						{
							value: getPrice(amounts).sub(2),
						}
					)
				).to.be.revertedWith("The value is less than required");
			});
		});
		describe("functionalities", () => {
			it("Should transfer a batch of transactions with different value", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);

				const { addresses, amounts } = await getExample(1);

				await metaSender.sendEthDifferentValue(
					addresses,
					amounts,
					{ value: getPrice(amounts) }
				);
			});
			it("verify the transactions", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);

				const { addresses, amounts, accounts } = await getExample(2);

				const prevBalances = await getBalances(accounts);

				await metaSender.sendEthDifferentValue(
					addresses,
					amounts,
					{
						value: getPrice(amounts),
					}
				);

				const postBalances = await getBalances(accounts);

				expect(compareBalances(prevBalances, postBalances));
			});
			it("check if it returns the remaining value", async () => {
				const { metaSender, owner } = await loadFixture(
					deployMetaSender
				);

				const { addresses, amounts } = await getExample(2);

				const [prevBalance] = await getBalances([owner]);

				await metaSender.sendEthDifferentValue(
					addresses,
					amounts,
					{
						value: getPrice(amounts).add(10),
					}
				);

				const cost = ethers.utils.formatEther(
					getPrice(amounts).add(10)
				);

				const [postBalance] = await getBalances([owner]);

				expect(prevBalance - cost < postBalance);
			});
		});
	});

	describe("transfer ERC20 from same value", () => {

		describe("Errors", () => {

			it("should failed if pass more than 254 transactions", async() => {

				const { metaSender, token20 } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(255)

				await token20.approve(metaSender.address, ethers.utils.parseEther('255'))

				await expect( metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1')
				)).to.be.revertedWith("Max 244 transaction by batch")

			})

		})
		describe("functinalities", () => {

			it("should send ERC20 tokens", async() => {

				const { metaSender, token20, owner } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(200)

				await token20.approve(metaSender.address, ethers.utils.parseEther('200'))

				expect( await metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1')
				))

			})

			it("verify transactions", async() => {

				const { metaSender, token20, owner } = await loadFixture( deployMetaSender )

				const { addresses, accounts } = await getExample(100)

				await token20.approve(metaSender.address, ethers.utils.parseEther('244'))

				const prevBalance = await getTokenBalance( token20, addresses)

				expect( await metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1')
				))

				const currBalance = await getTokenBalance( token20, addresses)

				expect(compareBalances(prevBalance, currBalance))

			})
		})

	})

	describe("transfer ERC20 from different value", () => {

		describe("Errors", () => {

			it("should failed if pass more than 254 transactions", async() => {

				const { metaSender, token20 } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(255)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
				await expect( metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts
				)).to.be.revertedWith("Max 244 transaction by batch")

			})

		})

		describe("functinalities", () => {

			it("should send ERC20 tokens", async() => {

				const { metaSender, token20 } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(254)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
				expect( await metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts
				))

			})

			it("verify transactions", async() => {

				const { metaSender, token20 } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(100)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))

				const prevBalance = await getTokenBalance( token20, addresses)

				expect( await metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts
				))

				const currBalance = await getTokenBalance( token20, addresses)

				expect(compareBalances(prevBalance, currBalance))

			})
		})

	})

	describe("transfer ERC721 from same value", () => {

		describe("Errors", () => {

			it("should failed if pass more than 254 transactions", async() => {

				const { metaSender, token721 } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(255)

				await token721.mintToken721(255)

				await token721.approve(metaSender.address, ethers.utils.parseEther('255'))

				await expect( metaSender.sendIERC20SameValue(
					token721.address,
					addresses,
					1
				)).to.be.revertedWith("Max 244 transaction by batch")

			})

		})

		// describe("functinalities", () => {

		// 	it("should send ERC20 tokens", async() => {

		// 		const { metaSender, token721, owner } = await loadFixture( deployMetaSender )

		// 		const { addresses } = await getExample(200)

		// 		await token20.approve(metaSender.address, ethers.utils.parseEther('200'))

		// 		expect( await metaSender.sendIERC20SameValue(
		// 			token20.address,
		// 			addresses,
		// 			ethers.utils.parseEther('1')
		// 		))

		// 	})

		// 	it("verify transactions", async() => {

		// 		const { metaSender, token20, owner } = await loadFixture( deployMetaSender )

		// 		const { addresses, accounts } = await getExample(100)

		// 		await token20.approve(metaSender.address, ethers.utils.parseEther('244'))

		// 		const prevBalance = await getTokenBalance( token20, addresses)

		// 		expect( await metaSender.sendIERC20SameValue(
		// 			token20.address,
		// 			addresses,
		// 			ethers.utils.parseEther('1')
		// 		))

		// 		const currBalance = await getTokenBalance( token20, addresses)

		// 		expect(compareBalances(prevBalance, currBalance))

		// 	})
		// })
		
	})

	// describe("transfer ERC721 from different value", () => {

	// 	describe("Errors", () => {

	// 		it("should failed if pass more than 254 transactions", async() => {

	// 			const { metaSender, token20 } = await loadFixture( deployMetaSender )

	// 			const { addresses, amounts } = await getExample(255)

	// 			await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
	// 			await expect( metaSender.sendIERC20DifferentValue(
	// 				token20.address,
	// 				addresses,
	// 				amounts
	// 			)).to.be.revertedWith("Max 244 transaction by batch")

	// 		})

	// 	})

	// 	describe("functinalities", () => {

	// 		it("should send ERC20 tokens", async() => {

	// 			const { metaSender, token20 } = await loadFixture( deployMetaSender )

	// 			const { addresses, amounts } = await getExample(254)

	// 			await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
	// 			expect( await metaSender.sendIERC20DifferentValue(
	// 				token20.address,
	// 				addresses,
	// 				amounts
	// 			))

	// 		})

	// 		it("verify transactions", async() => {

	// 			const { metaSender, token20 } = await loadFixture( deployMetaSender )

	// 			const { addresses, amounts } = await getExample(100)

	// 			await token20.approve(metaSender.address, ethers.utils.parseEther('400'))

	// 			const prevBalance = await getTokenBalance( token20, addresses)

	// 			expect( await metaSender.sendIERC20DifferentValue(
	// 				token20.address,
	// 				addresses,
	// 				amounts
	// 			))

	// 			const currBalance = await getTokenBalance( token20, addresses)

	// 			expect(compareBalances(prevBalance, currBalance))

	// 		})
	// 	})
		
	// })

});
