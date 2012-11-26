/*global suite:false test:false */
'use strict';

var chai = require('chai-stack');
var crypto = require('crypto');
var redisWStream = require('..'); // require('redis-wstream');
var passStream = require('pass-stream');
var redis = require('redis');
var client = redis.createClient(null, null, { detect_buffers: true });


var t = chai.assert;

var KEY = 'foo';

suite('basic');

function cleanup(cb) {
  client.del(KEY, cb);
}

beforeEach(function (done) { cleanup(done); });
after(function (done) { cleanup(done); });

test('basic use with string, stream data is stored and end is fired', function (done) {
  var stream = passStream();
  stream
    .pipe(redisWStream(client, KEY))
    .on('error', function (err) { done(err); })
    .on('end', function () {
      client.get(KEY, function (err, data) {
        if (err) return done(err);
        t.deepEqual(data, 'abcdefghi');
        done();
      });
    });
  process.nextTick(function () {
    stream.write('abc');
    stream.write('def');
    stream.end('ghi');
  });
});

test('basic use with Buffer, stream data is stored and end is fired', function (done) {
  var stream = passStream();
  stream
    .pipe(redisWStream(client, KEY))
    .on('error', function (err) { done(err); })
    .on('end', function () {
      client.get(new Buffer(KEY), function (err, data) {
        if (err) return done(err);
        t.deepEqual(data, new Buffer('abcdefghi123'));
        done();
      });
    });
  process.nextTick(function () {
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
  var stream = redisWStream(client, KEY);
  stream
    .on('error', function (err) { done(err); })
    .on('end', function () {
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
    process.nextTick(gen); // use next tick so doesnt blow stack
  }
  process.nextTick(gen); // kick it off
});


test('all arguments missing for factory, throws error', function () {
  function throwsErr() {
    var stream = redisWStream();
  }
  t.throws(throwsErr, /redisWStream requires client and key/);
});

test('client null, throws error', function () {
  function throwsErr() {
    var stream = redisWStream(null, KEY);
  }
  t.throws(throwsErr, /redisWStream requires client and key/);
});

test('key null, throws error', function () {
  function throwsErr() {
    var stream = redisWStream(client, null);
  }
  t.throws(throwsErr, /redisWStream requires client and key/);
});

