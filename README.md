# redis-wstream

redis-wstream is a node.js redis write stream which streams binary or utf8 data into a redis key using an existing redis client. Tested with mranney/node_redis client. (streams2)

[![Build Status](https://secure.travis-ci.org/jeffbski/redis-wstream.png?branch=master)](http://travis-ci.org/jeffbski/redis-wstream)

## Installation

```bash
npm install redis-wstream
```

You will also need the `redis` client (`npm install redis`) or other compatible library. You an also optionally install `hiredis` along with `redis` for additional performance.

## Usage

Construct a write stream instance by passing in client and key to save stream to. Pipe to this instance and when end is emitted, the stream has been saved to redis.

```javascript
var redis = require('redis');
var redisWStream = require('redis-wstream'); // factory
var client = redis.createClient(); // create client using your options and auth
var d = domain.create();
d.on('error', function (err) {
  /* handle error */
  })
  .run(function () {
    readstream  // whatever read stream to read from
      .pipe(redisWStream(client, 'keyToSaveTo')) // create write stream instance saving to keyToSaveTo
      .on('end', function () {
        // readstream was successfully saved to redis key: keyToSaveTo
      });
  });
```

 - `redisWStream(client, saveKey, [options])` - construct a new write stream using redis `client`, saving to the key at `saveKey`. Client should not be a normal (non-multi batch) client otherwise it will accumulate the stream in memory before sending. You can provide a batch client as part of `options.clientMulti` if you want the final rename to happen as part of another batch.
 - `options` can be used to provide additional stream options.
 - `options.tempKeySuffix` - can be provided to tell redis what suffix to use for its temporary key which will be used while the stream is being written (which will be renamed to `saveKey` when complete). If not provided then a random string will be appended. Note that this needs to be unique so that concurrent writes for same key will not conflict with each other.
 - `options.clientMulti` - if provided then once the stream is completely written, the rename operation will be written to this client but not executed, so you can later call `exec()` along with any other operations that are par of your transaction. If this option is not provided, then the rename will be performed and executed on the original client. So if you provide this option, you must call `options.clientMulti.exec()` yourself at some point after this finishes.

Tested with mranney/node_redis client, but should work with any client that implements:

 - `set(key, cb)`
 - `append(key, cb)`

Note: This module works by appending chunks to a tempKey as the data is streamed in, and then once complete, renames the tempKey to saveKey. In this way the original key is unaffected until the rename happens which is atomic. If `options.clientMulti` is provided then the rename will be appended after the stream is done writing and it is up to the user to `exec()` the multi client when they are ready for it to occur along with the rest of a batch.

## Goals

 - Simple write stream which can use existing redis client (and especially mranney/node_redis)
 - Remove all the complexity of managing a stream and storing to a redis key
 - Pipe a stream into this write stream to save
 - uses streams2 from node 0.10+, but is also compatible with 0.8
 - allow operation to be part of another multi operation (transaction) (if you use `options.clientMulti`)

## Why

mranney/node_redis does not have direct ability to take a stream and save it to a redis key, so rather than writing this logic again and again, wrap this up into a write stream so we simply pipe to it and it is stored.

Other redis stream implementations use their own direct network connections to redis, but I would prefer to use an existing connection for all my redis work which makes authentication and things lke failover easier to deal with.

## Get involved

If you have input or ideas or would like to get involved, you may:

 - contact me via twitter @jeffbski  - <http://twitter.com/jeffbski>
 - open an issue on github to begin a discussion - <https://github.com/jeffbski/redis-wstream/issues>
 - fork the repo and send a pull request (ideally with tests) - <https://github.com/jeffbski/redis-wstream>

## License

 - [MIT license](http://github.com/jeffbski/redis-wstream/raw/master/LICENSE)

