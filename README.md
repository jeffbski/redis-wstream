# redis-wstream

redis-wstream is a node.js redis write stream which streams binary or utf8 data into a redis key using an existing redis client. Tested with mranney/node_redis client.

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
readstream  // whatever read stream to read from
  .pipe(redisWStream(client, 'keyToSaveTo')) // create write stream instance saving to keyToSaveTo
  .on('error', function (err) { /* handle error */ })
  .on('end', function () {
    // readstream was successfully saved to redis key: keyToSaveTo
  });
```

Tested with mranney/node_redis client, but should work with any client that implements:

 - `set(key, cb)`
 - `append(key, cb)`

Note: This module works by appending chunks to a key as the data is streamed in, so you will not want to use this key until it is finished uploading (`end` is called), you can do this in a variety of ways (keeping an active or status flag or loading to a temporary key, then renaming to the real key when done).

## Goals

 - Simple write stream which can use existing redis client (and especially mranney/node_redis)
 - Remove all the complexity of managing a stream and storing to a redis key
 - Pipe a stream into this write stream to save
 - stream-spec compliant node.js write stream

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

