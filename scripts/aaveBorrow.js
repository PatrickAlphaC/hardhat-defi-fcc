const { ethers, getNamedAccounts, network } = require("hardhat")
const { BigNumber } = require("@ethersproject/bignumber")
const { getWeth, AMOUNT } = require("../scripts/getWeth.js")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)
    const NewDepositAmount = ethers.utils.parseEther("0.02");
    const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    const wethToken = await ethers.getContractAt(
        "IERC20",
        wethTokenAddress,
        deployer
      );
    const daiTokenAddress = networkConfig[network.config.chainId].daiToken
    const daiToken = await ethers.getContractAt(
    "IERC20",
    daiTokenAddress,
    deployer
    );
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing WETH...")
    await lendingPool.deposit(wethTokenAddress, NewDepositAmount, deployer, 0)
    console.log("Desposited!")
    // Getting your borrowing stats
    let { availableBorrowsETH} = await getBorrowUserData(lendingPool, deployer)
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    await borrowDai(
        networkConfig[network.config.chainId].daiToken,
        lendingPool,
        amountDaiToBorrowWei,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
    await repay(
        amountDaiToBorrowWei,
        networkConfig[network.config.chainId].daiToken,
        lendingPool,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)

//Everything below here is new, and is from a suggestion he had to pay off the remaining debt using a uniswap swap
  console.log("------------------------------------");
  const { totalDebtETH } = await getBorrowUserData(lendingPool, deployer);
  console.log(`You need to repay ${totalDebtETH} ETH to be free`);
  console.log("------------------------------------");
    
  //Uniswap needs a UNIX timestamp as a deadline, so I had 120 seconds to the current timestamp
  const latestBlock = await ethers.provider.getBlock("latest");
  const deadline = latestBlock.timestamp + 120;

  let balance = (await daiToken.balanceOf(deployer)).toString();
  console.log(`You have a total balance of ${balance} DAI`);
  await swap(totalDebtETH * 2, wethToken, daiToken, deployer, deadline);
  console.log("------------------------------------");
  balance = (await daiToken.balanceOf(deployer)).toString();

  console.log(`You have a new total balance of ${balance} DAI`);

  await repay(balance, daiTokenAddress, lendingPool, deployer);
  console.log("------------------------------------");

  await getBorrowUserData(lendingPool, deployer);
  balance = (await daiToken.balanceOf(deployer)).toString();

  console.log(`You have a new total balance of ${balance} DAI`);

  await swap(balance, daiToken, wethToken, deployer, deadline);
  balance = (await daiToken.balanceOf(deployer)).toString();
  console.log(`You have a new total balance of ${balance} DAI`);
  console.log(
    "User owns:",
    (await wethToken.balanceOf(deployer)).toString(),
    "WETH"
  );
}
async function swap(amountEthToSwap, token1, token2, account, deadline) {
  const address1 = token1.address;
  const address2 = token2.address;

  const UniswapV2RouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const UniRouter = await ethers.getContractAt(
    "IUniswapV2Router02",
    UniswapV2RouterAddress
  );
  console.log(
    "Swapping",
    amountEthToSwap.toString(),
    "of",
    await token1.symbol(),
    "for",
    await token2.symbol()
  );
  await token1.approve(UniswapV2RouterAddress, amountEthToSwap.toString() * 2);
  console.log(
    "User has allowed",
    (await token1.allowance(account, UniswapV2RouterAddress)).toString(),
    "of",
    await token1.symbol(),
    "to be spent by Uniswap"
  );
  console.log(
    "User owns:",
    (await token1.balanceOf(account)).toString(),
    "of",
    await token1.symbol()
  );
  await UniRouter.swapExactTokensForTokens(
    amountEthToSwap,
    0,
    [address1, address2],
    account,
    deadline
  );

  console.log("Swapped!");
}
async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId].daiEthPriceFeed
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signer)
    txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

async function getBorrowUserData(lendingPool, account) {
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
