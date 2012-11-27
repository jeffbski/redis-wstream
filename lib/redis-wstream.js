'use strict';

var passStream = require('pass-stream');

function redisWStream(client, key) {
  if (!client || !key) throw new Error('redisWStream requires client and key');
  var pendingWrites = 0;
  var ended = false;
  function writeFn(data) {
    /*jshint validthis:true */
    pendingWrites++;
    this.queueWrite(data);
  }
  function endFn() {
    /*jshint validthis:true */
    this.writable = false;
    ended = true;
    if (!pendingWrites) finished();
  }
  var stream = passStream(writeFn, endFn);
  function errored(err) {
    stream.emit('error', err);
    stream.destroy();
  }
  function onData(data) {
    client.append(key, data, function (err, result) {
      if (err) return errored(err);
      pendingWrites--;
      if (ended && !pendingWrites) finished();
    });
  }
  stream.on('data', onData);

  var origDestroyFn = stream.destroy;
  stream.destroy = function () {
    stream.removeListener('data', onData);
    origDestroyFn.call(stream);
  };

  function finished() {
    stream.queueEnd(); // let end go out, we are done
  }
  stream.pause();  // pause until we can truncate the data
  client.set(key, '', function (err, result) { // truncate any existing data
    if (err) return errored(err);
    stream.resume();  // resume, data has been truncated, can proceed with appending
  });
  return stream;
}

module.exports = redisWStream;