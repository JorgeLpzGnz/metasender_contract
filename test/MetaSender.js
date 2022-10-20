const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MetaSender", function () {
	async function getExample(cuantity) {
		const addresses = [];
		const amounts = [];
		const signers = await ethers.getSigners();
		let sI = 0;
		for (let i = 0; i <= cuantity; i++) {
			if (sI == signers.length - 1) sI = 0;
			addresses.push(signers[sI].address);
			amounts.push(
				ethers.utils.parseEther(
					`${Math.round(Math.random() * 50) / 50}`
				)
			);
			sI++;
		}
		return { addresses, amounts };
	}

	function getPrice(amounts) {
		return amounts.reduce((prev, cur) => prev.add(cur));
	}

	async function deployMetaSender() {
		const [owner, anotherAcount] = await ethers.getSigners();

		const MetaSender = await ethers.getContractFactory("MetaSender");
		const metaSender = await MetaSender.deploy();

		return { metaSender, owner, anotherAcount };
	}

	describe("transfer from same value", () => {
		describe("Errors", () => {
			it("it should fail if is passed more than 254 wallets", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(255);

				await expect(
					metaSender.transferBatchSameValueETH(addresses, 10, {
						value: ethers.utils.parseEther(`2550`),
					})
				).to.be.revertedWith("Max 244 transaction by batch");
			});
			it("it should fail if the passed value is less than needed", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(25);

				await expect(
					metaSender.transferBatchSameValueETH(addresses, 10, {
						value: ethers.utils.parseEther(`0`),
					})
				).to.be.revertedWith("The value is less than required");
			});
		});
		describe("functionalities", () => {
			it("Should transfer a batch of transactions with same value", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);

				const { addresses } = await getExample(25);

				await metaSender.transferBatchSameValueETH(addresses, 1, {
					value: ethers.utils.parseEther("25"),
				});
			});
		});
	});

	describe("transfer from different value", () => {
		describe("Errors", () => {
			it("it should fail if number of accounts is different of amounts", async () => {
				const { metaSender } = await loadFixture(deployMetaSender);
				const { addresses } = await getExample(25);

				await expect(
					metaSender.transferBatchDifferenValueETH(
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
					metaSender.transferBatchDifferenValueETH(
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
					metaSender.transferBatchDifferenValueETH(
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

				await metaSender.transferBatchDifferenValueETH(
					addresses,
					amounts,
					{ value: getPrice(amounts) }
				);
			});
		});
	});
});
