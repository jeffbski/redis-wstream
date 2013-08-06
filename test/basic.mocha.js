/*global suite:false test:false */
'use strict';

var chai = require('chai-stack');
var crypto = require('crypto');
var redisWStream = require('..'); // require('redis-wstream');
var passStream = require('pass-stream');
var redis = require('redis');
var client = redis.createClient(null, null, { detect_buffers: true });
var immediate = (typeof setImmediate === 'function') ? setImmediate : process.nextTick;

var t = chai.assert;

var KEY = 'foo';

suite('basic');

function cleanup(cb) {
  client.del(KEY, cb);
}

beforeEach(function (done) { cleanup(done); });
after(function (done) { cleanup(done); });

test('basic use with string, stream data is stored and finish is fired', function (done) {
  var stream = passStream();
  stream
    .pipe(redisWStream(client, KEY))
    .on('finish', function () {
      client.get(KEY, function (err, data) {
        if (err) return done(err);
        t.deepEqual(data, 'abcdefghi');
        done();
      });
    });
  immediate(function () {
    stream.write('abc');
    stream.write('def');
    stream.end('ghi');
  });
});

test('options.clientMulti provided so rename added to it, user must exec when ready', function (done) {
  var stream = passStream();
  var clientMulti = client.multi(); // my batch
  stream
    .pipe(redisWStream(client, KEY, { clientMulti: clientMulti }))
    .on('finish', function () {
      // exec not called on clientMulti so won't exist yet
      client.get(KEY, function (err, data) {
        if (err) return done(err);
        t.isNull(data);
        clientMulti.exec(function (err) {
          if (err) return done(err);
          client.get(KEY, function (err, data) {
            if (err) return done(err);
            t.deepEqual(data, 'abcdefghi');
            done();
          });
        });
      });
    });
  immediate(function () {
    stream.write('abc');
    stream.write('def');
    stream.end('ghi');
  });
});

test('options.tempKeySuffix is provided so use `saveKey + tempKeySuffix` for tempKey ', function (done) {
  var stream = passStream();
  var clientMulti = client.multi(); // my batch
  var myTempKeySuffix = '.myUniqueTempSuffix';
  stream
    .pipe(redisWStream(client, KEY, { clientMulti: clientMulti, tempKeySuffix: myTempKeySuffix }))
    .on('finish', function () {
      // exec not called on clientMulti so saveKey won't exist yet, but saveKey+tempKeySuffix will
      client.get(KEY + myTempKeySuffix, function (err, data) {
        if (err) return done(err);
        t.deepEqual(data, 'abcdefghi');
        clientMulti.exec(function (err) {
          if (err) return done(err);
          client.get(KEY, function (err, data) {
            if (err) return done(err);
            t.deepEqual(data, 'abcdefghi');
            client.get(KEY + myTempKeySuffix, function (err, data) {
              if (err) return done(err);
              t.isNull(data);
              done();
            });
          });
        });
      });
    });
  immediate(function () {
    stream.write('abc');
    stream.write('def');
    stream.end('ghi');
  });
});


test('basic use with Buffer, stream data is stored and finish is fired', function (done) {
  var stream = passStream();
  stream
    .pipe(redisWStream(client, KEY))
    .on('finish', function () {
      client.get(new Buffer(KEY), function (err, data) {
        if (err) return done(err);
        t.deepEqual(data, new Buffer('abcdefghi123'));
        done();
      });
    });
  immediate(function () {
    stream.write(new Buffer('abc'));
    stream.write(new Buffer('def'));
    stream.end(new Buffer('ghi123'));
  });
});

test('basic use with binary data in Buffers', function (done) {
  var CHUNK_SIZE = 64 * 1024; // 64KB
  var DATA_LENGTH = 2 * 1024 * 1024 + 25; // 2,025 KB
  var shasum = crypto.createHash('sha1');
  var resultDigest;
  var bytesToGenerate = DATA_LENGTH;
  var stream = passStream();
  stream
    .pipe(redisWStream(client, KEY))
    .on('finish', function () {
      client.get(new Buffer(KEY), function (err, data) { // use Buffer key so returns Buffer data
        if (err) return done(err);
        var dataDigest = crypto.createHash('sha1').update(data).digest('base64');
        t.equal(resultDigest, dataDigest);
        done();
      });
    });

  function gen() {
    var size = (bytesToGenerate > CHUNK_SIZE) ? CHUNK_SIZE : bytesToGenerate;
    var buff = crypto.randomBytes(size);
    shasum.update(buff);
    stream.write(buff);
    bytesToGenerate -= size;
    if (!bytesToGenerate) {
      stream.end();
      resultDigest = shasum.digest('base64');
      return;
    }
    immediate(gen); // use next tick so doesnt blow stack
  }
  immediate(gen); // kick it off
});


test('all arguments missing for factory, throws error', function () {
  function throwsErr() {
    var stream = redisWStream();
  }
  t.throws(throwsErr, /RedisWStream requires client and key/);
});

test('client null, throws error', function () {
  function throwsErr() {
    var stream = redisWStream(null, KEY);
  }
  t.throws(throwsErr, /RedisWStream requires client and key/);
});

test('key null, throws error', function () {
  function throwsErr() {
    var stream = redisWStream(client, null);
  }
  t.throws(throwsErr, /RedisWStream requires client and key/);
});

