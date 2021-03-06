const chai = require('chai')
const assert = chai.assert
chai.use(require('chai-as-promised'))

const util = require('ethereumjs-util')
const keys = require('../src/keys')
const randombytes = require('randombytes')
const { getImmutableKey, setImmutableKey, fromJS }
  = require('demo-utils')

const { Map } = require('immutable')

describe('Self-generated keys and signing', () => {
 
  let account

  before(() => {
    //setImmutableKey('encryptedKeys', null, true)
    account = keys.create()
  })
 
  it('randomly created account is valid', async () => {
    keys.isAccount(account)
  })

  it('generates a valid key randomly from scratch', async () => {
    assert(util.isValidAddress(account.get('addressPrefixed')))
    assert.equal(40 , account.get('addressString'  ).length)
    assert.equal(42 , account.get('addressPrefixed').length)
    assert.equal(64 , account.get('privateString'  ).length)
    assert.equal(66 , account.get('privatePrefixed').length)
    assert.equal(128, account.get('publicString'   ).length)
    assert.equal(130, account.get('publicPrefixed' ).length)
    assert.equal(32 , account.get('ivString'       ).length)
    assert.equal(64 , account.get('saltString'     ).length)
    const address =
      util.publicToAddress(account.get('publicPrefixed'))
        .toString('hex')
    assert.equal(util.toChecksumAddress(address), account.get('addressPrefixed'))
  })

  it( 'dumps a password and recovers it', async () => {
    const password = randombytes(32).toString('hex')
    const password2 = randombytes(32).toString('hex')
    const encryptedJSON = keys.accountToEncryptedJSON({ account: account, password: password })
    setImmutableKey('encryptedKeys', fromJS(encryptedJSON))
    const retrieved = getImmutableKey('encryptedKeys', new Map({}))
    const recovered = keys.encryptedJSONToAccount({ encryptedJSON: retrieved.toJS(),
      password: password })
    assert.equal(recovered.get('privateString'), account.get('privateString'))
    try {
      keys.encryptedJSONToAccount({ encryptedJSON: retrieved.toJS(),
        password: password2 })
      assert.fail()
    } catch(e) {
      assert(true)
      //we expect to catch an error here
    }
  })

  it('generates a valid wallet from private key', async () => {
    const account = keys.createFromPrivateString(
      '4DBE88D79BCACD8C3EE962213A58C67BAD17660AF2CF66F9891CE74CC6FCAC34')
    keys.isAccount(account)
    const account2 = keys.createFromPrivateString(randombytes(32).toString('hex'))
    keys.isAccount(account2)
  })
  
  after(() => {
    setImmutableKey('encryptedKeys', null)
  })

})

