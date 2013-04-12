'use strict';

var Stream = require('stream');
var util = require('util');
var ReadableStream = require('readable-stream');

// node 0.10+ has Writable stream so use it if available
// otherwise use readable-stream module
var Writable = Stream.Writable || ReadableStream.Writable;

function RedisWStream(client, key, options) {
  if (!client || !key) throw new Error('RedisWStream requires client and key');
  // allow call without new
  if (!(this instanceof RedisWStream)) return new RedisWStream(client, key, options);
  Writable.call(this, options);
  this._redisClient = client;
  this._redisKey = key;
  this._redisClient.set(key, '', function (err, result) { // truncate any existing data
    if (err) throw (err && err.message) ? err : new Error(err);
  });
}

util.inherits(RedisWStream, Writable);

RedisWStream.prototype._write = function _write(chunk, encoding, cb) {
  this._redisClient.append(this._redisKey, chunk, function (err, result) {
    cb(err);
  });
};

module.exports = RedisWStream;