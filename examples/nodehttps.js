var https = require('https')
var fs = require('fs')
var NodeSession = require('node-session')

var nodeSession = new NodeSession({
  secret: 'D?w5Sy4CJnO@Ae847l|)CgZ_W6cSIl4E',
  'lifetime': 24 * 60 * 60 * 1000,
  'secure': true,
  'encrypt': true
})

var secserver = https.createServer({
    key : fs.readFileSync('path/to/keys/agent2-key.pem'),
    cert: fs.readFileSync('path/to/keys/agent2-cert.pem')
  },
  function (req, res) {
    nodeSession.startSession(req, res, function () {
      // server handler goes here
      // req.session available
    })
  }
).listen(8000)
