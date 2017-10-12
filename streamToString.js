function streamToString(stream, callback) {
  var result = '';
  stream.on('data', (chunk) => {
    result += chunk;
  });
  stream.on('end', () => {
    callback(null, result);
  });
  stream.on('error', (err) => {
    callback(err);
  });
}

module.exports = streamToString;