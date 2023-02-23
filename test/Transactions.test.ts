import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as chai from "chai";
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
import { keccak256 } from "ethers/lib/utils";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { token } from "../typechain-types/@openzeppelin/contracts";

function parseEther(amount: Number) {
    return ethers.utils.parseUnits(amount.toString(), 18);
}

describe("Transactions contract", function () {
    let tokenContract: Contract;
    let transactionsContract: Contract;
    let owner: SignerWithAddress;
    let sender: SignerWithAddress;
    let receiver: SignerWithAddress;

    async function deployTokenFixture() {
        [owner, sender, receiver] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("Token");
        tokenContract = await TokenFactory.deploy();
        await tokenContract.deployed();

        // Mint cho sender 100000 token
        await tokenContract.mint(sender.address, parseEther(100000));

        const TransactionsFactory = await ethers.getContractFactory("Transactions");
        transactionsContract = await TransactionsFactory.deploy(tokenContract.address);
        await transactionsContract.deployed();

        // Fixtures can return anything you consider useful for your tests
        return { tokenContract, transactionsContract, sender, receiver };
    }

    describe("Deployment", function () {
        it("Should set the right token", async function () {
            const { tokenContract, transactionsContract } = await loadFixture(deployTokenFixture);

            expect(await transactionsContract.getToken()).to.equal(tokenContract.address);
        });

        it("Should sender has 100000 token", async function () {
            const { tokenContract, sender } = await loadFixture(deployTokenFixture);

            expect(await tokenContract.balanceOf(sender.address)).to.equal(parseEther(100000));
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            const { tokenContract, transactionsContract, sender, receiver } = await loadFixture(
                deployTokenFixture
            );

            const message = "Hi receiver";
            const amount = parseEther(100);
            const keyword = "HI";

            await tokenContract.connect(sender).approve(transactionsContract.address, amount);
            const addTx = await transactionsContract.connect(sender).addToBlockchain(receiver.address, amount, message, keyword);

            await expect(addTx).to.emit(transactionsContract, "Transfer").withArgs(sender.address, receiver.address, amount, message, keyword);

            expect(await tokenContract.balanceOf(receiver.address)).to.equal(amount);

            const remainingAmount = parseEther(100000 - 100);
            expect(await tokenContract.balanceOf(sender.address)).to.equal(remainingAmount);
        });

        it("Should list all transactions", async function () {
            const { tokenContract, transactionsContract, sender, receiver } = await loadFixture(
                deployTokenFixture
            );

            const message = "Hi receiver";
            const amount = parseEther(100);
            const keyword = "HI";

            await tokenContract.connect(sender).approve(transactionsContract.address, amount);
            await transactionsContract.connect(sender).addToBlockchain(receiver.address, amount, message + "1", keyword + "1");

            const newAmount = parseEther(200);
            await tokenContract.connect(sender).approve(transactionsContract.address, newAmount);
            await transactionsContract.connect(sender).addToBlockchain(receiver.address, newAmount, message + "2", keyword + "2");

            const list: any[] = await transactionsContract.getAllTransactions();

            console.log(list);

            expect(await transactionsContract.getTransactionCount()).to.equal(list.length);
        });
    });
});