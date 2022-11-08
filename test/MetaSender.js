const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

async function getExample(quantity) {
	const addresses = [];
	const amounts = [];
	const accounts = [];
	const tokenIds = []
	const signers = await ethers.getSigners();
	let sI = 1;
	for (let i = 1; i <= quantity; i++) {
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
	const balances = [];
	for (const account of accounts) {
		const BigNum = await account.getBalance();
		balances.push(Number(ethers.utils.formatEther(BigNum)));
	}
	return balances;
}

async function getTokenBalance( contract, accounts ){
	const balances = [];
	for (const account of accounts) {
		const BigNum = await contract.balanceOf(account);
		balances.push(Number(ethers.utils.formatEther(BigNum)));
	}
	return balances;
}

function compareBalances(smaller, bigger) {
	return smaller.every((e, i) => e < bigger[i]);
}

function getPrice(amounts) {
	return amounts.reduce((prev, cur) => prev.add(cur));
}

describe("MetaSender", function () {

	async function deployMetaSender() {
		const [owner, anotherAccount] = await ethers.getSigners();

		const MetaSender = await ethers.getContractFactory("MetaSender");
		const metaSender = await MetaSender.deploy();

		const txFee = await metaSender.txFee() 
		const PALCOPass = await metaSender.PALCOPass() 

		const Token20 = await ethers.getContractFactory("Token20");
		const token20 = await Token20.deploy();

		const Token721 = await ethers.getContractFactory("Token721");
		const token721 = await Token721.deploy();

		return { metaSender, owner, anotherAccount, token20, token721, txFee, PALCOPass };
	}

	describe("PALCO List", () => {

		describe("Errors", () => {

			it("Should failed when try to add PALCO and doesn't pass current PALCO fee", async () => {

				const { metaSender, anotherAccount, owner } = await loadFixture( deployMetaSender )

				await expect( 

					metaSender.addPALCO(anotherAccount.address, { value: 0})

				).to.be.revertedWith("Can't add: Value must be equal or superior of current PALCO fee")

			})

			it("Should failed when try to add PALCO and user alrady exist", async () => {

				const { metaSender, anotherAccount, owner, PALCOPass } = await loadFixture( deployMetaSender )

				await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass})

				await expect( 

					metaSender.addPALCO(anotherAccount.address, { value: PALCOPass})

				).to.be.revertedWith("Can't add: The address is already and PALCO member")

			})

			it("Should failed when try to remove PALCO and caller is not owner", async () => {

				const { metaSender, anotherAccount, PALCOPass } = await loadFixture( deployMetaSender ) 

				await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass})

				expect( 

					metaSender.connect(anotherAccount.address).removeToPALCO(anotherAccount.address)

				).to.be.reverted

			})

			it("Should failed if a not PALCO doesn't pay fee", async () => {

				const { metaSender, token20, token721 } = await loadFixture(deployMetaSender);

				const { addresses, amounts, tokenIds } = await getExample(25);

				const value = ethers.utils.parseEther("1.0");

				await expect( metaSender.sendNativeTokenSameValue(addresses, value, {
					value: ethers.utils.parseEther("25"),
				})).to.be.reverted

				await expect( metaSender.sendNativeTokenDifferentValue(
					addresses,
					amounts,
					{ value: getPrice(amounts)}
				)).to.be.reverted

				await expect( metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1')
				)).to.be.reverted
				
				await expect( metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts
				)).to.be.reverted

				await expect( metaSender.sendIERC721(
					token721.address,
					addresses,
					tokenIds
				)).to.be.reverted

			})

		})

		describe("functionalities", () => {

			it("Should add a new PALCO", async () => {

				const { metaSender, anotherAccount, PALCOPass } = await loadFixture( deployMetaSender ) 

				expect( ! await metaSender.PALCO(anotherAccount.address) )

				await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass})

				expect( await metaSender.PALCO(anotherAccount.address) )

			})

			it("Should remove a PALCO", async () => {

				const { metaSender, anotherAccount, PALCOPass } = await loadFixture( deployMetaSender ) 

				expect( ! await metaSender.PALCO(anotherAccount.address) )

				await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass})

				expect( await metaSender.PALCO(anotherAccount.address) )

				await metaSender.removeToPALCO(anotherAccount.address)

				expect( ! await metaSender.PALCO(anotherAccount.address) )

			})

			it("should not charge the transaction fee for a PALCO", async () => {

				const { metaSender, token20, token721, anotherAccount, PALCOPass, owner } = await loadFixture(deployMetaSender);

				const { addresses, amounts, tokenIds } = await getExample(25);

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))

				const value = ethers.utils.parseEther("1.0");

				await token721.connect(anotherAccount).mintToken721(25)

				await token721.connect(anotherAccount).setApprovalForAll(metaSender.address, true)

				await metaSender.connect(anotherAccount).addPALCO( anotherAccount.address, { value: PALCOPass } )

				await metaSender.addPALCO( owner.address, { value: PALCOPass } )

				expect( await metaSender.connect(anotherAccount).sendNativeTokenSameValue(addresses, value, {
					value: ethers.utils.parseEther("25"),
				}))

				expect( await metaSender.connect(anotherAccount).sendNativeTokenDifferentValue(
					addresses,
					amounts,
					{ value: getPrice(amounts)}
				))

				expect( await metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1')
				))
				
				expect( await metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts
				))

				expect( await metaSender.connect(anotherAccount).sendIERC721(
					token721.address,
					addresses,
					tokenIds
				))

			})

		})

	})

	describe("Fees", () => {

		describe("Errors", () => {

			it("Should failed when try to change txFee and caller is not owner", async () => {

				const { metaSender, anotherAccount } = await loadFixture( deployMetaSender ) 

				await expect( 

					metaSender.connect(anotherAccount).setTxFee( 0 )

				).to.be.reverted

			})

			it("Should failed when try to change PALCO fee and caller is not owner", async () => {

				const { metaSender, anotherAccount } = await loadFixture( deployMetaSender ) 

				await expect( 

					metaSender.connect(anotherAccount).setPALCOPass( 0 )

				).to.be.reverted

			})

		})

		describe("functionalities", () => {

			it("Should change a txFee", async () => {

				const { metaSender } = await loadFixture( deployMetaSender )

				const fee = ethers.utils.parseEther('0.5')

				await metaSender.setTxFee( fee )

				const newTxFee = await metaSender.txFee()

				expect( fee == newTxFee )

			})

			it("Should change a PALCO fee", async () => {

				const { metaSender } = await loadFixture( deployMetaSender )

				const fee = ethers.utils.parseEther('0.5')

				await metaSender.setPALCOPass( fee )

				const newTxFee = await metaSender.PALCOPass()

				expect( fee == newTxFee )

			})

		})

	})

	describe("transfer ETH from same value", () => {

		describe("Errors", () => {

			it("it should fail if is passed more than 255 wallets", async () => {
				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses } = await getExample(256)

				await expect(

					metaSender.sendNativeTokenSameValue(addresses, 10, {
						value: ethers.utils.parseEther(`2550`).add( txFee ),
					})

				).to.be.revertedWith("Invalid Arguments: Max 255 transactions by batch");

			});

			it("it should fail if the passed value is less than needed", async () => {

				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(25);

				await expect(
					metaSender.sendNativeTokenSameValue(addresses, 10, {
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

				expect( 
					await metaSender.sendNativeTokenSameValue(
						addresses, 
						value, 
						{ value: ethers.utils.parseEther("25").add( txFee ) }
					)
				);

			});

			it("verify the transactions", async () => {

				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses, accounts } = await getExample(2);

				const value = ethers.utils.parseEther("1");

				const prevBalances = await getBalances(accounts);

				await metaSender.sendNativeTokenSameValue(addresses, value, {
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

				await metaSender.sendNativeTokenSameValue(addresses, value, {
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
					metaSender.sendNativeTokenDifferentValue(
						addresses,
						[1, 2],
						{
							value: ethers.utils.parseEther(`2`).add( txFee ),
						}
					)
				).to.be.revertedWith("Invalid Arguments: Addresses and values most be equal");
			});

			it("it should fail if is passed more than 255 wallets", async () => {

				const { metaSender, txFee } = await loadFixture(deployMetaSender);
				const { addresses, amounts } = await getExample(256);

				await expect(
					metaSender.sendNativeTokenDifferentValue(
						addresses,
						amounts,
						{
							value: getPrice(amounts).add( txFee ),
						}
					)
				).to.be.revertedWith("Invalid Arguments: Max 255 transactions by batch");
			});
			it("it should fail if the passed value is less than needed", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses, amounts } = await getExample(25);

				await expect(
					metaSender.sendNativeTokenDifferentValue(
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

				await metaSender.sendNativeTokenDifferentValue(
					addresses,
					amounts,
					{ value: getPrice(amounts).add( txFee ) }
				);

			});

			it("verify the transactions", async () => {
				const { metaSender, txFee } = await loadFixture(deployMetaSender);

				const { addresses, amounts, accounts } = await getExample(2);

				const prevBalances = await getBalances(accounts);

				await metaSender.sendNativeTokenDifferentValue(
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

				await metaSender.sendNativeTokenDifferentValue(
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

			it("should failed if pass more than 255 transactions", async() => {

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(256)

				await token20.approve(metaSender.address, ethers.utils.parseEther('256'))

				await expect( metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1').add( txFee )
				)).to.be.revertedWith("Invalid Arguments: Max 255 transactions by batch")

			})

			it("should failed if doesn't pass txfee", async() => {

				const { metaSender, token20 } = await loadFixture( deployMetaSender )

				const { addresses } = await getExample(255)

				await token20.approve(metaSender.address, ethers.utils.parseEther('255'))

				await expect( metaSender.sendIERC20SameValue(
					token20.address,
					addresses,
					ethers.utils.parseEther('1')
				)).to.be.revertedWith("The value is less than required")

			})

		})

		describe("functionalities", () => {

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

			it("should failed if pass more than 255 transactions", async() => {

				const { metaSender, token20, txFee } = await loadFixture( deployMetaSender )

				const { addresses, amounts } = await getExample(256)

				await token20.approve(metaSender.address, ethers.utils.parseEther('400'))
				
				await expect( metaSender.sendIERC20DifferentValue(
					token20.address,
					addresses,
					amounts, 
					{ value: txFee }
				)).to.be.revertedWith("Invalid Arguments: Max 255 transactions by batch")

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

		describe("functionalities", () => {

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

			it("should failed if pass more than 255 transactions", async() => {

				const { metaSender, token721, txFee } = await loadFixture( deployMetaSender )

				const { addresses, tokenIds } = await getExample(256)

				await token721.mintToken721(256)

				await token721.setApprovalForAll(metaSender.address, true)

				await expect( metaSender.sendIERC721(
					token721.address,
					addresses,
					tokenIds, 
					{ value: txFee }
				)).to.be.revertedWith("Invalid Arguments: Max 255 transactions by batch")

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

		describe("functionalities", () => {

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

	describe("withdraw functions", () => {

		describe("Errors", () => {

			it("Should failed when try to withdraw txFee and caller is not owner", async () => {

				const { metaSender, anotherAccount  } = await loadFixture(deployMetaSender);

				await expect( 

					metaSender.connect(anotherAccount).withdrawTxFee()

				).to.be.reverted

			})

			it("Should failed when try to withdraw txFee and contract have not founds", async () => {

				const { metaSender } = await loadFixture( deployMetaSender ) 

				await expect( 

					metaSender.withdrawTxFee() 

				).to.be.revertedWith("Can't withDraw: insufficient founds")

			})

		})

		describe("functionalities", () => {

			it("should withdraw contract founds", async () => {

				const { metaSender, txFee, anotherAccount, PALCOPass, owner } = await loadFixture(deployMetaSender);

				const { addresses } = await getExample(25);

				const value = ethers.utils.parseEther("1.0");

				await metaSender.sendNativeTokenSameValue(addresses, value, {
					value: ethers.utils.parseEther("25").add( txFee ),
				})

				await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass })

				const prevBalance = await getBalances([owner])

				await metaSender.withdrawTxFee()

				const currBalance = await getBalances([owner])

				expect( compareBalances( prevBalance, currBalance ))

			})

			it("should withdraw contract erc20 supply", async () => {

				const { metaSender, owner, token20 } = await loadFixture(deployMetaSender);

				const supply = token20.totalSupply()

				await token20.transfer(metaSender.address, supply)

				const erc20prevBalance = token20.balanceOf(owner.address)

				expect( erc20prevBalance == 0 )

				await metaSender.withDrawIRC20( token20.address )

				const erc20currBalance = token20.balanceOf(owner.address)

				expect( erc20currBalance > 0 )

			})

		})

	})

	describe("Events", () => {

		describe("functionalities", () => {

			it("NewPALCO", async () => {

				const { metaSender, anotherAccount, PALCOPass } = await loadFixture(deployMetaSender);

				expect( 

					await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass })

				).to.emit( anotherAccount.address )

			})

			it("removeToPALCO", async () => {

				const { metaSender, anotherAccount, PALCOPass } = await loadFixture(deployMetaSender);

				await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass })

				expect( metaSender.PALCO( anotherAccount.address ) )

				expect( 

					await metaSender.removeToPALCO(anotherAccount.address, { value: PALCOPass })

				).to.emit( anotherAccount.address )
			})

			it("SetPALCOPass", async () => {

				const { metaSender } = await loadFixture(deployMetaSender);

				const newValue = ethers.utils.parseEther('2') 

				expect( 

					await metaSender.setPALCOPass( newValue )

				).to.emit( newValue  )

			})

			it("SetTxFee", async () => {

				const { metaSender } = await loadFixture(deployMetaSender);

				const newValue = ethers.utils.parseEther('0.1') 

				expect( 

					await metaSender.setTxFee( newValue )

				).to.emit( newValue  )

			})

			it("LogNativeTokenBulkTransfer", async () => {

				const { metaSender, txFee, owner } = await loadFixture(deployMetaSender);

				const { addresses, amounts } = await getExample(25);

				const value = ethers.utils.parseEther("1.0");

				expect( 

					await metaSender.sendNativeTokenSameValue(
						addresses, 
						value, 
						{ value: ethers.utils.parseEther("25").add( txFee ) }
					)

				).to.emit( owner.address,  ethers.utils.parseEther("25") )


				expect( 

					await metaSender.sendNativeTokenDifferentValue(
						addresses,
						amounts,
						{ value: getPrice(amounts).add( txFee ) }
					)

				).to.emit( owner.address,  getPrice(amounts) )

			})

			it("LogTokenBulkTransfer", async () => {

				const { metaSender, txFee, token20, token721 } = await loadFixture(deployMetaSender);

				const { addresses, amounts, tokenIds } = await getExample(100);

				await token20.approve(metaSender.address, ethers.utils.parseEther('1000000'))

				await token721.mintToken721(254)

				await token721.setApprovalForAll(metaSender.address, true)

				expect( 

					await metaSender.sendIERC20SameValue(
						token20.address,
						addresses,
						ethers.utils.parseEther('1'), 
						{ value: txFee }
					)

				).to.emit( token20.address,  ethers.utils.parseEther('1').mul(100) )

				expect( 

					await metaSender.sendIERC20DifferentValue(
						token20.address,
						addresses,
						amounts, 
						{ value: txFee }
					)

				).to.emit( token20.address,  getPrice(amounts))

				expect( await metaSender.sendIERC721(
					token721.address,
					addresses,
					tokenIds, 
					{ value: txFee }
				)).to.emit( token20.address,  tokenIds.length )

			})

			it("WithDrawIRC20", async () => {

				const { metaSender, token20, owner } = await loadFixture(deployMetaSender);

				const supply = await token20.totalSupply()

				await token20.transfer(metaSender.address, supply)

				const prevBalance = await token20.balanceOf(owner.address)

				expect( prevBalance == 0)

				expect( 

					await metaSender.withDrawIRC20(token20.address)

				).to.emit( token20.address,  supply )

				expect( prevBalance == supply)

			})

			it("WithdrawTxFee", async () => {

				const { metaSender, owner, txFee, PALCOPass, anotherAccount } = await loadFixture(deployMetaSender);

				const { addresses } = await getExample(25);

				const value = ethers.utils.parseEther("1.0");

				await metaSender.sendNativeTokenSameValue(addresses, value, {

					value: ethers.utils.parseEther("25").add( txFee ),

				})

				await metaSender.addPALCO(anotherAccount.address, { value: PALCOPass })

				const [ prevBalance ] = await getBalances([owner])

				expect( 

					await metaSender.withdrawTxFee()

				).to.emit( owner.address,  txFee.add( PALCOPass ) )

				const [ currBalance ] = await getBalances([owner])

				expect( prevBalance < currBalance)

			})

		})

	})

});
