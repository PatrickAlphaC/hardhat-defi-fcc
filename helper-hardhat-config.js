const networkConfig = {
    31337: {
        name: "localhost",
        wethToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        lendingPoolAddressesProvider: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        daiEthPriceFeed: "0x773616E4d11A78F511299002da57A0a94577F1f4",
        daiToken: "0x6b175474e89094c44da98b954eedeac495271d0f",
    },
    // Due to the changing testnets, this testnet might not work as shown in the video
    5: {
        name: "goerli",
        ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
        wethToken: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
        // This is the AaveV2 Lending Pool Addresses Provider
        lendingPoolAddressesProvider: "0x5E52dEc931FFb32f609681B8438A51c675cc232d",
        // This is LINK/ETH feed
        daiEthPriceFeed: "0xb4c4a493AB6356497713A78FFA6c60FB53517c63",
        // This is the LINK token
        daiToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    },
    // Due to the different testnets, we are leaving kovan in as a reference
    42: {
        name: "kovan",
        ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
        wethToken: "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
        lendingPoolAddressesProvider: "0x88757f2f99175387aB4C6a4b3067c77A695b0349",
        daiEthPriceFeed: "0x22B58f1EbEDfCA50feF632bD73368b2FdA96D541",
        daiToken: "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
