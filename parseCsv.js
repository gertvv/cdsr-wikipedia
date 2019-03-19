const fs = require('fs');
const csv = require('csv');

function parseCsv(fname, callback) {
  var records = [];

  var parser = csv.parse({ columns: true });
  parser.on('readable', () => {
    while (record = parser.read()) {
      records.push(record);
    }
  });

  parser.on('error', (err) => {
    callback(err);
  });

  parser.on('finish', () => {
    callback(null, records);
  });

  const input = fs.createReadStream(fname, { encoding: 'utf-8' });
  input.pipe(parser);
}

module.exports = parseCsv;