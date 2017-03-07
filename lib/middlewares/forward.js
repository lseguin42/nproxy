var utils = require('../utils');
var log = require('../log');
var Buffer = require('buffer').Buffer;
var zlib = require('zlib');

/**
 * Forward the request directly
 */
function forward(){
  return function forward(req, res, next){
    var url  = utils.processUrl(req);
    var options = {
      url: url,
      method: req.method,
      headers: req.headers
    }
    var buffers = [];

    log.debug('forward: ' + url);

    if(utils.isContainBodyData(req.method)){
      req.on('data', function(chunk){
        buffers.push(chunk);
      });

      req.on('end', function(){
        options.data = Buffer.concat(buffers);
        utils.request(options, function(err, data, proxyRes){
          _forwardHandler(err, data, proxyRes, res);
        });
      });
    }else{
      utils.request(options, function(err, data, proxyRes){
        _forwardHandler(err, data, proxyRes, res)
      });
    }
  };
};

function _forwardHandler(err, data, proxyRes, res){
  if(err){
    res.writeHead(404);
    res.end();
    return;
  }
  if (res.transform) {
    var encoding = proxyRes.headers['content-encoding'] || '';
    if (encoding.match('gzip')) {
        data = zlib.gunzipSync(data);
    } else if (encoding.match('deflate')) {
        data = zlib.deflateRawSync(data);
    }
    data = res.transform(data, proxyRes);
    res.writeHead(200, {
      'Content-Length': data.length,
      'Content-Type': proxyRes.headers['content-type'],
      'Server': 'nproxy'
    });
  } else {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
  }
  res.write(data);
  res.end();
}

module.exports = forward;