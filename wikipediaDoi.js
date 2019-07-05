const https = require('https');
const fs = require('fs');
const csv = require('csv');
const async = require('async');
const streamToString = require('./streamToString');

function search(acc, offset, callback) {
  const query = 'insource:doi=10.1002/14651858';
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${query}&srwhat=text&srlimit=500&sroffset=${offset}`;
  https.get(url, (res) => {
    if (res.statusCode != 200) {
      return callback(`HTTP code ${res.statusCode}`);
    }
    streamToString(res, (err, body) => {
      if (err) {
        return callback(err);
      }
      
      const result = JSON.parse(body);
      acc = acc.concat(result.query.search);
      if (result.continue) {
        search(acc, result.continue.sroffset, callback);
      } else {
        callback(null, acc);
      }
    });
  });
}

const re = /(14651858.(CD|MR)[0-9]{6}(.pub[0-9]+)?)/i; // not including "10.1002/" prefix to avoid dealing with urlencoding variations
function getPageDois(page, callback) {
  console.log(page.title);
  const url = `https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=externallinks&pageid=${page.pageid}`;
  https.get(url, (res) => {
    if (res.statusCode != 200) {
      return callback(`HTTP code ${res.statusCode}`);
    }
    streamToString(res, (err, body) => {
      if (err) {
        return callback(err);
      }
      
      const result = JSON.parse(body);
      const links = result.parse.externallinks;
      const matches = links.map((url) => url.match(re)).filter((m) => !!m).map((m) => "10.1002/" + m[1].substring(0, 17).toUpperCase() + m[1].substring(17).toLowerCase());
      callback(null, matches.map((m) => { return {
        pageid: page.pageid,
        title: page.title,
        doi: m
      }; }));
    });
  });
}

//getPageDois({ pageid: '25875', title: 'Rheumatoid arthritis' }, function(err, res) { console.log(err, res); });
//getPageDois({ pageid: '1537', title: 'Acupuncture' }, function(err) { console.error(err); });

search([], 0, (err, result) => {
  if (err) {
    return console.log(err);
  }
  async.concatSeries(result, getPageDois, (err, mapped) => {
    csv.stringify(mapped, { columns: [ 'pageid', 'title', 'doi' ], quoted: true, header: true }, (err, csv) => {
      fs.writeFileSync('wikipedia-dois.csv', csv, { 'encoding': 'utf-8' });
    });
  });
});