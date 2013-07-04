'use strict';

var crypto = require('crypto');
var Stream = require('stream');
var util = require('util');
var ReadableStream = require('readable-stream');

// node 0.10+ has Writable stream so use it if available
// otherwise use readable-stream module
var Writable = Stream.Writable || ReadableStream.Writable;

var RANDOM_BYTES_LENGTH = 15;

function RedisWStream(client, key, options) {
  if (!client || !key) throw new Error('RedisWStream requires client and key');
  // allow call without new
  if (!(this instanceof RedisWStream)) return new RedisWStream(client, key, options);
  if (!options) options = {};
  Writable.call(this, options);
  this._redisClient = client;
  this._redisKey = key;
  this._redisTempKey = (options.tempKeySuffix) ?
    key + options.tempKeySuffix :
    key + '.' + crypto.randomBytes(RANDOM_BYTES_LENGTH).toString('base64');
  this._redisClientMulti = options.clientMulti;
  this._redisClient.set(this._redisTempKey, '', function (err, result) { // truncate any existing data
    if (err) throw (err && err.message) ? err : new Error(err);
  });
}

util.inherits(RedisWStream, Writable);

RedisWStream.prototype._write = function _write(chunk, encoding, cb) {
  this._redisClient.append(this._redisTempKey, chunk, function (err, result) {
    cb(err);
  });
};

RedisWStream.prototype.end = function (chunk, encoding, cb) {
  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  var self = this;
  function done(err) {
    if (err) {
      if (cb) return cb(err);
      else throw new Error(err);
    }
    Writable.prototype.end.call(self, cb); // already handled the chunk, so just do the rest
  }

  if (!chunk) chunk = ''; // just to simply this code
  self.write(chunk, encoding, function (err) {
    if (err) return done(err);
    if (self._redisClientMulti) { // make rename part of another batch and dont exec
      self._redisClientMulti.rename(self._redisTempKey, self._redisKey); // no cb since multi
      done();
    } else { // no multi provided, so go ahead and rename on client
      self._redisClient.rename(self._redisTempKey, self._redisKey, done);
    }
  });
};

module.exports = RedisWStream;