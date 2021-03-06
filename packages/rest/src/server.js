const express = require('express')
const { setImmutableKey: set, getImmutableKey: get, isNetName, fromJS, Logger,
  ensureDir, DB_DIR, COMPILES_DIR, LINKS_DIR, DEPLOYS_DIR, FLATS_DIR, OUTS_DIR }
	      = require('demo-utils')
const { Map } = require('immutable')
const utils = require('ethereumjs-util')
const solc = require('solc')
const http = require('http')
const path = require('path')
const LOGGER = new Logger('rest-server')

var bodyParser = require('body-parser')

const server = {}

server.RESTServer = class {

  constructor(_port, _allowCORS) {
    this.port = _port || 7000
    this.app  = express()

    // configure app to use bodyParser()
    // this will let us get the data from a POST
    this.app.use(bodyParser.json({limit: '50mb'}));
    this.app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));

    if (_allowCORS) {
      // Allow CORS for development use
      this.app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Democracy-Overwrite, Origin, X-Requested-With, Content-Type, Accept");
        next();
      })
    }
    this.router = express.Router()
    this.populateRoutes(this.router)
    this.app.use('/api', this.router)
    ensureDir(path.join(DB_DIR,COMPILES_DIR))
    ensureDir(path.join(DB_DIR,LINKS_DIR))
    ensureDir(path.join(DB_DIR,DEPLOYS_DIR))
    ensureDir(path.join(DB_DIR,FLATS_DIR))
    ensureDir(path.join(DB_DIR,OUTS_DIR))
  }

  getRouter() {
    return this.router
  }

  getApp() {
    return this.app
  }

  static constructKey(body, res) {
    const address = body.address
    utils.isValidAddress(address) || res.send(`Invalid address ${address}`)
    const sym = body.sym
    const netName = body.netName
    isNetName(netName) || res.send(`Invalid net name ${netName}`)
    const suffix = body.hash ? `/${hash}` : ``
    return `${address}/${netName}/unspent/${sym}${suffix}`
  }

  populateRoutes(_router) {
    // middleware to use for all requests
    _router.use((req, res, next) => {
        // do logging
        //LOGGER.debug('Received route', req)
        next() // make sure we go to the next routes and don't stop here
    });

    _router.route('/sourcesFlattened/:sourceFileName').get((req, res) => {
      const sourceFileName = req.params.sourceFileName
      const flats = get(`/${FLATS_DIR}/${sourceFileName}`, new Map({}))
      res.json(flats.toJS())
    })

    _router.route('/sourcesFlattened/:sourceFileName').post((req, res) => {
      const sourceFileName = req.params.sourceFileName
      const jsBody = fromJS(req.body)
      const overwrite = (req.headers['democracy-overwrite'] === 'true')
      try {
        const result = set(`/${FLATS_DIR}/${sourceFileName}`, jsBody, overwrite)
        res.json({result: result, body: jsBody})
      } catch(e) {
        LOGGER.error('Failed to set key:', e, sourceFileName)
        res.json({result: false, error: e})
      }
    })

    _router.route('/compileOutputs/:sourceFileName').get((req, res) => {
      const sourceFileName = req.params.sourceFileName
      const outs = get(`/${OUTS_DIR}/${sourceFileName}`, new Map({}))
      res.json(outs.toJS())
    })

    _router.route('/compileOutputs/:sourceFileName').post((req, res) => {
      const sourceFileName = req.params.sourceFileName
      const jsBody = fromJS(req.body)
      const overwrite = (req.headers['democracy-overwrite'] === 'true')
      try {
        const result = set(`/${OUTS_DIR}/${sourceFileName}`, jsBody, overwrite)
        res.json({result: result, body: jsBody})
      } catch(e) {
        LOGGER.error('Failed to set key:', e, sourceFileName)
        res.json({result: false, error: e})
      }
    })

    _router.route('/deploys').get((req, res) => {
      const deploys = get(`/${DEPLOYS_DIR}`, new Map({}))
      res.json(deploys.toJS())
    })

    _router.route('/deploys/:chainId').get((req, res) => {
      const chainId = req.params.chainId
      const deploys = get(`/${DEPLOYS_DIR}/${chainId}`, new Map({}))
      res.json(deploys.toJS())
    })

    _router.route('/deploys/:chainId/:deployName/deploy').get((req, res) => {
      const chainId    = req.params.chainId
      const deployName = req.params.deployName
      const deploy     = get(`/${DEPLOYS_DIR}/${chainId}/${deployName}/deploy`, new Map({}))
      res.json(deploy.toJS())
    })

    _router.route('/deploys/:chainId/:deployName/deploy').post((req, res) => {
      const chainId    = req.params.chainId
      const deployName = req.params.deployName
      const jsBody     = fromJS(req.body)
      const overwrite  = (req.headers['democracy-overwrite'] === 'true')
      try {
        const result = set(`/${DEPLOYS_DIR}/${chainId}/${deployName}/deploy`, jsBody, overwrite)
        res.json({result: result, body: jsBody})
      } catch(e) {
        LOGGER.error('Failed to set key:', e, chainId, deployName)
        res.json({result: false, error: e})
      }
    })

    _router.route('/deploys/:chainId/:deployName/forks/:forkTime').get((req, res) => {
      const chainId    = req.params.chainId
      const deployName = req.params.deployName
      const forkTime   = req.params.forkTime
      const deploy     = get(`/${DEPLOYS_DIR}/${chainId}/${deployName}/${forkTime}`, new Map({}))
      res.json(deploy.toJS())
    })

    _router.route('/deploys/:chainId/:deployName/forks/:forkTime').post((req, res) => {
      const chainId    = req.params.chainId
      const deployName = req.params.deployName
      const forkTime   = req.params.forkTime
      const jsBody     = fromJS(req.body)
      const overwrite  = (req.headers['democracy-overwrite'] === 'true')
      try {
        const result = set(`/${DEPLOYS_DIR}/${chainId}/${deployName}/${forkTime}`, jsBody, overwrite)
        res.json({result: result, body: jsBody})
      } catch(e) {
        LOGGER.error('Failed to set key:', e, chainId, deployName)
        res.json({result: false, error: e})
      }
    })

    _router.route('/deploys/:chainId/:deployName').get((req, res) => {
      const chainId = req.params.chainId
      const deployName = req.params.deployName
      const deploy = get(`/${DEPLOYS_DIR}/${chainId}/${deployName}`, new Map({}))
      res.json(deploy.toJS())
    })

    _router.route('/deploys/:chainId/:deployName').post((req, res) => {
      const chainId = req.params.chainId
      const deployName = req.params.deployName
      const jsBody = fromJS(req.body)
      const overwrite = (req.headers['democracy-overwrite'] === 'true')
      try {
        const result = set(`/${DEPLOYS_DIR}/${chainId}/${deployName}`, jsBody, overwrite)
        res.json({result: result, body: jsBody})
      } catch(e) {
        LOGGER.error('Failed to set key:', e, chainId, deployName)
        res.json({result: false, error: e})
      }
    })

    _router.route('/links').get((req, res) => {
      const links = get(`/${LINKS_DIR}`, new Map({}))
      res.json(links.toJS())
    })

    _router.route('/links/:linkName').get((req, res) => {
      const linkName = req.params.linkName
      const link = get(`/${LINKS_DIR}/${linkName}`, new Map({}))
      res.json(link.toJS())
    })

    _router.route('/links/:linkName').post((req, res) => {
      const linkName = req.params.linkName
      const jsBody = fromJS(req.body)
      const overwrite = (req.headers['democracy-overwrite'] === 'true')
      try {
        const result = set(`/${LINKS_DIR}/${linkName}`, jsBody, overwrite)
        res.json({result: result, body: jsBody})
      } catch(e) {
        LOGGER.error('Failed to set key:', e, linkName)
        res.json({result: false, error: e})
      }
    })

    /*
    // Perform a remote compile and cache the result
    _router.route('/compile/:version').post((req, res) => {
      const version = req.params.version
      LOGGER.debug('req.body', req.body)
      solc.loadRemoteVersion(version, (err, solc) => {
        if (err) {
          LOGGER.error(`Error getting solc version ${version}`, err)
        } else {
          const c = new Compiler({ solc })
          c.compile(
        }
      })
    })
*/
    // Return all compiles
    _router.route('/compiles').get((req, res) => {
      const compiles = get(`/${COMPILES_DIR}`, new Map({}))
      res.json(compiles.toJS())
    })

    _router.route('/compiles/:contractName').post((req, res) => {
      const cn = req.params.contractName
      const cxt = req.params.context
      const overwrite = (req.headers['democracy-overwrite'] === 'true')
      LOGGER.debug('req.body', req.body)
      const val = (req.body === 'null') ? null : fromJS(req.body)
      set(`/compiles/${cn}`, val, overwrite)
      res.json(req.body) 
    })

    _router.route('/compiles/:contractName').get((req, res) => {
      const cn = req.params.contractName
      const cxt = req.params.context
      const compile = get(`/compiles/${cn}`, new Map({}))
      res.json(compile.toJS())
    })

    _router.route('/sourcesFlattened/:sourceName').post((req, res) => {
      const sn = req.params.sourceName
      const cxt = req.params.context
      const overwrite = (req.headers['democracy-overwrite'] === 'true')
      LOGGER.debug('req.body', req.body)
      const val = (req.body === 'null') ? null : fromJS(req.body)
      set(`/sourcesFlattened/${sn}`, val, overwrite)
      res.json(req.body) 
    })

    _router.route('/sourcesFlattened/:sourceName').get((req, res) => {
      const sn = req.params.sourceName
      const cxt = req.params.context
      const compile = get(`/sourcesFlattened/${sn}`, new Map({}))
      res.json(compile.toJS())
    })

    _router.route('/keys/:chainId/:ethAddress').post((req, res) => {
      const chainId = req.params.chainId
      const ethAddress = req.params.ethAddress
      set(`/keys/${chainId}/${ethAddress}`, fromJS(req.body))
      res.json(req.body)
    })

    _router.route('/keys/:chainId/:ethAddress').get((req, res) => {
      const chainId = req.params.chainId
      const ethAddress = req.params.ethAddress
      const keyDump = get(`/keys/${chainId}/${ethAddress}`, new Map({}))
      res.json(keyDump.toJS())
    })

    _router.route('/test/:testSpace').get((req, res) => {
      const testSpace = req.params.testSpace
      const val = get(`/test/${testSpace}`, '')
      res.json({ ...val.toJS() })
    })

    _router.route('/test/:testSpace').post((req, res) => {
      const testSpace = req.params.testSpace
      LOGGER.debug('BODY', req.body)
      const testVal = fromJS(req.body)
      // Always allow overwriting on tests, so we can reset the state
      const overwrite = (req.headers['democracy-overwrite'] === 'true')
      set(`/test/${testSpace}`, testVal, overwrite)
      res.json({ message: 'Test posted!', ...req.body });
    })
   
  }

  start() {
    LOGGER.debug(`Starting server on  port ${this.port}`)
    this.server = http.createServer(this.app).listen(this.port)
  }
  
  listen() {
    const server = this.app.listen(this.port, () => {
      console.log(`Express server listening on port ${server.address().port}`)
    })
    return server
  }

  stop() {
    if (this.server) {
      LOGGER.debug(`Stopping server on  port ${this.port}`)
      this.server.close()
    } else {
      LOGGER.debug(`Trying to stop server that's not started.`)
    }
  }

}

module.exports = server
