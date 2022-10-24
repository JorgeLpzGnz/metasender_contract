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
	const tokenIds = []
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
		tokenIds.push(i)
		sI++;
	}
	return { addresses, amounts, accounts, tokenIds };
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

		const txFee = await metaSender.txFee() 
		const vipFee = await metaSender.vipFee() 

		const Token20 = await ethers.getContractFactory("Token20");
		const token20 = await Token20.deploy();

		const Token721 = await ethers.getContractFactory("Token721");
		const token721 = await Token721.deploy();

		return { metaSender, owner, anotherAcount, token20, token721, txFee, vipFee };
	}

	describe("VIP List", () => {

		describe("Errors", () => {

			it("Should failed when try to add VIP and doesn't pass current VIP fee", async () => {

				const { metaSender, anotherAcount, owner } = await loadFixture( deployMetaSender )

				await expect( 

					metaSender.addVIP(anotherAcount.address, { value: 0})

				).to.be.revertedWith("Value must be equal or superior of current VIP fee")

			})

			it("Should failed when try to remove VIP and caller is not owner", async () => {

				const { metaSender, anotherAcount, vipFee } = await loadFixture( deployMetaSender ) 

				await metaSender.addVIP(anotherAcount.address, { value: vipFee})

				expect( 

					metaSender.connect(anotherAcount.address).removeVIP(anotherAcount.address)

				).to.be.reverted

			})

		})

		describe("functionalities", () => {

			it("Should add a new VIP", async () => {

				const { metaSender, anotherAcount, vipFee } = await loadFixture( deployMetaSender ) 

				expect( ! await metaSender.VIP(anotherAcount.address) )

				await metaSender.addVIP(anotherAcount.address, { value: vipFee})

				expect( await metaSender.VIP(anotherAcount.address) )

			})

			it("Should remove a VIP", async () => {

				const { metaSender, anotherAcount, vipFee } = await loadFixture( deployMetaSender ) 

				expect( ! await metaSender.VIP(anotherAcount.address) )

				await metaSender.addVIP(anotherAcount.address, { value: vipFee})

				expect( await metaSender.VIP(anotherAcount.address) )

				await metaSender.removeVIP(anotherAcount.address)

				expect( ! await metaSender.VIP(anotherAcount.address) )

			})

		})

	})

	describe("transfer ETH from same value", () => {

		describe("Errors", () => {

			it("it should fail if is passed more than 254 wallets", async () => {
				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses } = await getExample(255)

				await expect(

					metaSender.sendEthSameValue(addresses, 10, {
						value: ethers.utils.parseEther(`2550`).add( txFee ),
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

				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses } = await getExample(25);

				const value = ethers.utils.parseEther("1.0");

				await metaSender.sendEthSameValue(addresses, value, {
					value: ethers.utils.parseEther("25").add( txFee ),
				});

			});

			it("verify the transactions", async () => {

				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses, accounts } = await getExample(2);

				const value = ethers.utils.parseEther("1");

				const prevBalances = await getBalances(accounts);

				await metaSender.sendEthSameValue(addresses, value, {
					value: ethers.utils.parseEther("10").add( txFee ),
				});

				const postBalances = await getBalances(accounts);

				expect(compareBalances(prevBalances, postBalances));

			});

			it("check if it returns the remaining value", async () => {

				const { metaSender, owner, txFee } = await loadFixture(
					deployMetaSender
				);

				const { addresses } = await getExample(2);

				const [prevBalance] = await getBalances([owner]);

				const value = ethers.utils.parseEther("1");

				await metaSender.sendEthSameValue(addresses, value, {
					value: ethers.utils.parseEther("10").add( txFee ),
				});

				const [postBalance] = await getBalances([owner]);

				expect(prevBalance - 10 < postBalance);

			});

		});

	});

	describe("transfer ETH from different value", () => {
		describe("Errors", () => {
			it("it should fail if number of accounts is different of amounts", async () => {
				const { metaSender, txFee } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(25);

				await expect(
					metaSender.sendEthDifferentValue(
						addresses,
						[1, 2],
						{
							value: ethers.utils.parseEther(`2`).add( txFee ),
						}
					)
				).to.be.revertedWith("Addresses and values most be iqual");
			});
			it("it should fail if is passed more than 254 wallets", async () => {
				const { metaSender, txFee } = await loadFixture(deployMetaSender);
				const { addresses, amounts } = await getExample(255);

				await expect(
					metaSender.sendEthDifferentValue(
						addresses,
						amounts,
						{
							value: getPrice(amounts).add( txFee ),
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
				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses, amounts } = await getExample(1);

				await metaSender.sendEthDifferentValue(
					addresses,
					amounts,
					{ value: getPrice(amounts).add( txFee ) }
				);
			});
			it("verify the transactions", async () => {
				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses, amounts, accounts } = await getExample(2);

				const prevBalances = await getBalances(accounts);

				await metaSender.sendEthDifferentValue(
					addresses,
					amounts,
					{
						value: getPrice(amounts).add( txFee ),
					}
				);

				const postBalances = await getBalances(accounts);

				expect(compareBalances(prevBalances, postBalances));
			});
			it("check if it returns the remaining value", async () => {
				const { metaSender, owner, txFee } = await loadFixture(
					deployMetaSender
				);

				const { addresses, amounts } = await getExample(2);

				const [prevBalance] = await getBalances([owner]);

				await metaSender.sendEthDifferentValue(
					addresses,
					amounts,
					{
						value: getPrice(amounts).add( 10 + txFee ),
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

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(255)

				await token20.approve(metaSender.address, ethers.utils.parseEther('255'))

				await expect( metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1').add( txFee )
				)).to.be.revertedWith("Max 244 transaction by batch")

			})

			it("should failed if doesn't pass txfee", async() => {

				const { metaSender, token20 } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(254)

				await token20.approve(metaSender.address, ethers.utils.parseEther('255'))

				await expect( metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1')
				)).to.be.revertedWith("The value is less than required")

			})

		})

		describe("functinalities", () => {

			it("should send ERC20 tokens", async() => {

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(200)

				await token20.approve(metaSender.address, ethers.utils.parseEther('200'))

				expect( await metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1'), 
					{ value: txFee }
				))

			})

			it("verify transactions", async() => {

				const { metaSender, token20, txFee  } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(100)

				await token20.approve(metaSender.address, ethers.utils.parseEther('244'))

				const prevBalance = await getTokenBalance( token20, addresses)

				expect( await metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1'), 
					{ value: txFee }
				))

				const currBalance = await getTokenBalance( token20, addresses)

				expect(compareBalances(prevBalance, currBalance))

			})
		})

	})

	describe("transfer ERC20 from different value", () => {

		describe("Errors", () => {

			it("should failed if pass more than 254 transactions", async() => {

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(255)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
				await expect( metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts, 
					{ value: txFee }
				)).to.be.revertedWith("Max 244 transaction by batch")

			})

			it("should failed if doesn't pass txfee", async() => {

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(254)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
				await expect( metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts
				)).to.be.revertedWith("The value is less than required")

			})

		})

		describe("functinalities", () => {

			it("should send ERC20 tokens", async() => {

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(254)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
				expect( await metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts, 
					{ value: txFee }
				))

			})

			it("verify transactions", async() => {

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(100)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))

				const prevBalance = await getTokenBalance( token20, addresses)

				expect( await metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts, 
					{ value: txFee }
				))

				const currBalance = await getTokenBalance( token20, addresses)

				expect(compareBalances(prevBalance, currBalance))

			})
		})

	})

	describe("transfer ERC721 from same value", () => {

		describe("Errors", () => {

			it("should failed if pass more than 254 transactions", async() => {

				const { metaSender, token721, txFee } = await loadFixture( deployMetaSender )

				const { addresses, tokenIds } = await getExample(255)

				await token721.mintToken721(255)

				await token721.setApprovalForAll(metaSender.address, true)

				await expect( metaSender.sendIERC721(
					token721.address,
					addresses,
					tokenIds, 
					{ value: txFee }
				)).to.be.revertedWith("Max 244 transaction by batch")

			})

			it("should failed if doesn't pass txfee", async() => {

				const { metaSender, token721, txFee } = await loadFixture( deployMetaSender )

				const { addresses, tokenIds } = await getExample(254)

				await token721.mintToken721(254)

				await token721.setApprovalForAll(metaSender.address, true)

				await expect( metaSender.sendIERC721(
					token721.address,
					addresses,
					tokenIds
				)).to.be.revertedWith("The value is less than required")

			})

		})

		describe("functinalities", () => {

			it("should send ERC721 tokens", async() => {

				const { metaSender, token721, txFee } = await loadFixture( deployMetaSender )

				const { addresses, tokenIds } = await getExample(254)

				await token721.mintToken721(254)

				await token721.setApprovalForAll(metaSender.address, true)

				expect( await metaSender.sendIERC721(
					token721.address,
					addresses,
					tokenIds, 
					{ value: txFee }
				))

			})

			it("verify transactions", async() => {

				const { metaSender, token721, txFee } = await loadFixture( deployMetaSender )

				const { addresses, tokenIds } = await getExample(254)

				await token721.mintToken721(254)

				await token721.setApprovalForAll(metaSender.address, true)

				const prevBalance = await getTokenBalance( token721, addresses)

				expect( await metaSender.sendIERC721(
					token721.address,
					addresses,
					tokenIds, 
					{ value: txFee }
				))

				const currBalance = await getTokenBalance( token721, addresses)

				expect(compareBalances(prevBalance, currBalance))

			})

		})
		
	})

});
