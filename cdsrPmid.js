const https = require('https');
const csv = require('csv');
const fs = require('fs');
const async = require('async');
const streamToString = require('./streamToString');

const re = /<Id>([0-9]+)<\/Id>/;

function findPubMedId(doi, callback) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${doi}%5bdoi%5d`;
  https.get(url, (res) => {
    if (res.statusCode != 200) {
      callback(`HTTP code ${res.statusCode}`);
    }
    streamToString(res, (err, body) => {
      const match = body.match(re);
      if (match) {
        callback(null, match[1]);
      } else {
        callback(null, null);
      }
    });
  });
}

//const doi = '10.1002/14651858.CD000230.pub5';
//findPubMedId(doi, (err, id) => {
//  console.log(err, id);
//});

var records = [];

var parser = csv.parse({ columns: true });
parser.on('readable', () => {
  while (record = parser.read()) {
    records.push(record);
  }
});

parser.on('error', (err) => {
  console.err(err);
});

parser.on('finish', () => {
  async.mapLimit(records, 10, (record, callback) => {
    findPubMedId(record['Review DOI'], function(err, pmid) {
      if (!err) {
        record['PMID'] = pmid;
        callback(null, record);
      } else {
        callback(err);
      }
    });
  }, (err, res) => {
    const stringifier = csv.stringify({ columns: [ "Review DOI", "Title", "PMID" ], quoted: true, header: true });
    const output = fs.createWriteStream('reviews-not-withdrawn-pmid.csv', { encoding: 'utf-8' });
    stringifier.pipe(output);
    res.forEach((el) => { stringifier.write(el); });
  });
});

const input = fs.createReadStream('reviews-not-withdrawn.csv', { encoding: 'utf-8' });
input.pipe(parser);