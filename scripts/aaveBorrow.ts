import { ethers, getNamedAccounts, network } from "hardhat"
import { getWeth, AMOUNT } from "../scripts/getWeth"
import { networkConfig } from"../helper-hardhat-config"
import { ILendingPool, ILendingPoolAddressesProvider } from "../typechain-types"
import { Address } from "hardhat-deploy/dist/types"
import { BigNumber } from "ethers"


async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool: ILendingPool = await getLendingPool(deployer)
    const wethTokenAddress = networkConfig[network.config!.chainId!].wethToken!
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log(`Depositing WETH using ${wethTokenAddress} as WETH token and ${deployer} as address`)
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Desposited!")
    // Getting your borrowing stats
    let borrowReturnData = await getBorrowUserData(lendingPool, deployer)
    let availableBorrowsETH = borrowReturnData[0]
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.div(daiPrice)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    await borrowDai(
        networkConfig[network.config!.chainId!].daiToken!,
        lendingPool,
        amountDaiToBorrowWei.toString(),
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
    await repay(
        amountDaiToBorrowWei.toString(),
        networkConfig[network.config!.chainId!].daiToken!,
        lendingPool,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount: string, daiAddress: string, lendingPool: ILendingPool, account: Address) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress:string, lendingPool: ILendingPool, amountDaiToBorrow: string, account: Address) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config!.chainId!].daiEthPriceFeed!
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

async function approveErc20(erc20Address:string, spenderAddress:string, amount:string, signer: Address) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signer)
    const txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account: Address): Promise<ILendingPool> {
    const lendingPoolAddressesProvider: ILendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config!.chainId!].lendingPoolAddressesProvider!,
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool: ILendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

async function getBorrowUserData(lendingPool: ILendingPool, account: Address): Promise<[BigNumber, BigNumber]> {
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return [availableBorrowsETH, totalDebtETH ]
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
