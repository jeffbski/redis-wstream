/*global suite:false test:false */
'use strict';

var crypto = require('crypto');
var chai = require('chai-stack');
var spec = require('stream-spec');
var tester = require('stream-tester');
var redisWStream = require('..'); // require('redis-wstream');
var redis = require('redis');
var client = redis.createClient(null, null, { detect_buffers: true });

var t = chai.assert;

var KEY = 'foo';

suite('stream-spec');

function cleanup(cb) {
  client.del(KEY, cb);
}

before(function (done) { cleanup(done); });
after(function (done) { cleanup(done); });

test('spec random pausing Buffer stream', function (done) {
  var stream = redisWStream(client, KEY);
  spec(stream)
    .writable()
    .drainable()
    .validateOnExit();

  var accum = [];

  var master = tester.createConsistentStream();

  function gen() {
    return crypto.randomBytes(1000);
  }

  tester.createRandomStream(gen, 1000) //1k 1k Buffers ~ 1M
    .pipe(master)
    .pipe(tester.createUnpauseStream())
    .pipe(stream)
    .pipe(tester.createPauseStream())
    .pipe(master.createSlave())
    .on('error', function (err) { done(err); })
    .on('data', function (data) { accum.push(data); })  // data is passed through as well as being stored
    .on('end', function () {
      var allBuffer = Buffer.concat(accum);
      var expectedDigest = crypto.createHash('sha1').update(allBuffer).digest('base64');
      client.get(new Buffer(KEY), function (err, data) {
        if (err) return done(err);
        var dataDigest = crypto.createHash('sha1').update(data).digest('base64');
        t.equal(data.length, 1000 * 1000); // ~1M
        t.equal(data.length, allBuffer.length);
        t.equal(dataDigest, expectedDigest);
        done();
      });
    });
});

