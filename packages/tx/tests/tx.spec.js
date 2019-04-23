const utils = require('demo-utils')
const { getConfig, getNetwork, getEndpointURL, Logger } = utils
utils.setFS(require('fs'))
utils.setPath(require('path'))

const { Transactor } = require('../src/tx')
const { Wallet, create, pay }
             = require('demo-keys')
const assert = require('chai').assert
const { BuildsManager, Linker, Deployer, isDeploy, Contract }
             = require('demo-contract')
const LOGGER = new Logger('tx.spec')
const { toWei } = require('web3-utils')
const BN = require('bn.js')
const abi = require('ethjs-abi')

describe( 'transaction sender', () => {

  let contract
  let deploy
  let bm
  let txor
  let accounts
  let tx
  let senderAccount
  let eth
  let chainId

  before(async () => {
    eth = getNetwork()
    chainId = await eth.net_version()
    accounts = await eth.accounts()
    senderAccount = create()
    const ethSigner = Wallet.createSignerEth(getEndpointURL(), senderAccount)
    txor = new Transactor({ethSender: ethSigner, gasPrice: '21000'})
    bm = new BuildsManager({
      startSourcePath: 'node_modules/demo-test-contracts/contracts',
      chainId: chainId
    })
    const d = new Deployer({
      eth            : eth,
      bm             : bm,
      chainId        : chainId,
      address        : accounts[7],
    })
    deploy = await d.deploy( 'DifferentSender', 'link', 'deploy' ) 
    assert(isDeploy(deploy), `DifferentSender-deploy not found.`)
    contract = new Contract(eth, deploy)
  })

  it( 'estimates gas for a contract' , async () => {
    const methodObj = contract.getABIObjectByName('send')
    const gas = await txor.getGasEstimate({
      fromAddress: accounts[1],
      toAddress  : deploy.get('deployAddress'),
      value      : '10000',
      data       : contract.getMethodCallData('send', [accounts[2]])
    })
    assert.equal(gas, 83443)
  })

  it( 'creates a raw tx' , async () => {
    const data = contract.getMethodCallData('send', [accounts[2]])
    const deployAddress = deploy.get('deployAddress')
    const senderAddress = senderAccount.get('addressPrefixed')
    tx = await txor.createRawTx({
      fromAddress: senderAddress,
      toAddress  : deployAddress,
      value      : toWei('0.001', 'ether'),
      data       : data,
    })
    const hexChainId = '0x' + Number(chainId).toString(16)
    const methodObj = contract.getABIObjectByName('send')
    const expected = abi.encodeMethod(methodObj, [accounts[2]])
    const nonce = await eth.getTransactionCount(senderAddress)
    const value = toWei("0.001", "ether")
    assert.equal(JSON.stringify(tx),
      `{"nonce":"${nonce}","gas":"1668b","gasPrice":"0x1319718a5000","data":`+
      `"${expected}",`+
      `"from":"${senderAddress}","to":`+
      `"${deployAddress}","value":"${value}","chainId":"${hexChainId}"}`
    )
  })

  it( 'sends a signed tx', async () => {
    await pay({
      eth         : eth,
      weiValue    : toWei('2', 'ether'),
      fromAddress : accounts[7],
      toAddress   : senderAccount.get('addressPrefixed'),
    })
    const txHash = await txor.sendSignedTx(tx)
  }) 

  it( 'verified sent tx', async () => {
    const owner = await contract.instance.owner()
    assert.equal(owner['0'], accounts[7])
    const lastPayer = await contract.instance.lastPayer()
    assert.equal(lastPayer['0'], accounts[2])
    const lastValue = await contract.instance.lastValue()
    assert.equal(lastValue['0'].toString(), toWei('0.001', 'ether'))
    const lastSender = await contract.instance.lastSender()
    assert.equal(lastSender['0'], senderAccount.get('addressPrefixed'))
  })

  it( 'send an official transaction', async () => {
    await contract.getTxReceipt(
      contract.instance.send(accounts[3], {from: accounts[4], value: toWei('0.01', 'ether')})
    )
    const owner = await contract.instance.owner()
    assert.equal(owner['0'], accounts[7])
    const lastPayer = await contract.instance.lastPayer()
    assert.equal(lastPayer['0'], accounts[3])
    const lastValue = await contract.instance.lastValue()
    assert.equal(lastValue['0'].toString(), toWei('0.01', 'ether'))
    const lastSender = await contract.instance.lastSender()
    LOGGER.info('lastSender', lastSender)
    assert.equal(lastSender['0'], accounts[4])
  })

  after(async () => {
    await bm.cleanDeploy('DifferentSender-deploy')
  })

})
    
