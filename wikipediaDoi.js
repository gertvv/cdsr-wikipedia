const https = require('https');
const fs = require('fs');
const csv = require('csv');
const streamToString = require('./streamToString');

function search(acc, offset, callback) {
  const query = 'insource:doi=10.1002/14651858';
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${query}&srwhat=text&srprop=snippet&srlimit=500&sroffset=${offset}`;
  https.get(url, (res) => {
    if (res.statusCode != 200) {
      callback(`HTTP code ${res.statusCode}`);
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

const re = /(10.1002\/14651858.(CD|MR)[0-9]{6}(.pub[0-9]+)?)/i;
function extractDoi(snippet) {
  const clean = snippet.replace(/<span class="searchmatch">/g, '').replace(/<\/span>/g, '');
  const match = clean.match(re);
  if (match) {
    return match[1];
  } else {
    console.log(clean);
    return null;
  }
}

search([], 0, (err, result) => {
  if (err) {
    return console.log(err);
  }
  const mapped = result.map((page) => {
    return {
      pageid: page.pageid,
      title: page.title,
      doi: extractDoi(page.snippet)
    };
  });
  csv.stringify(mapped, { columns: [ 'pageid', 'title', 'doi' ], quoted: true, header: true }, (err, csv) => {
    fs.writeFileSync('wikipedia-dois.csv', csv, { 'encoding': 'utf-8' });
  });
});