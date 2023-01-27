const https = require('https');
const csv = require('csv');
const fs = require('fs');
const async = require('async');
const streamToString = require('./streamToString');
const _ = require('lodash');

const api = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const pageSize = 500;

function queryForCDSR(year0, year1, callback) {
  const url = `${api}/esearch.fcgi?db=pubmed&term=%28%22${year0}%2F01%2F01%22%5BDate%20-%20Publication%5D%20%3A%20%22${year1}%2F12%2F31%22%5BDate%20-%20Publication%5D%29%20AND%20%22Cochrane%20Database%20Syst%20Rev%22%5Bjour%5D&retmode=json&usehistory=y`;
  https.get(url, (res) => {
    if (res.statusCode != 200) {
      callback(`HTTP code ${res.statusCode}`);
    }
    streamToString(res, (err, body) => {
      if (err) {
        return callback(err);
      }
      const result = JSON.parse(body);
      callback(null, _.pick(result.esearchresult, [ 'count', 'webenv', 'querykey' ]));
    });
  });
}

function getResultPage(webenv, querykey, retstart, callback) {
  const url = `${api}/esummary.fcgi?db=pubmed&WebEnv=${webenv}&query_key=${querykey}&retmode=json&retstart=${retstart}&retmax=${pageSize}`;
  https.get(url, (res) => {
    if (res.statusCode != 200) {
      callback(`HTTP code ${res.statusCode}`);
    }
    streamToString(res, (err, body) => {
      if (err) {
        return callback(err);
      }
      const result = JSON.parse(body);
      callback(null, _.map(_.filter(result.result, 'uid'), (r) => {
        const obj = _.find(r.articleids, (obj) => obj.idtype === 'doi');
        return {
          'PMID': r.uid,
          'DOI': obj ? obj.value : undefined
        };
      }));
    });
  });
}

function getResults(info, callback) {
  const pages = Math.ceil(info.count / pageSize);
  console.log(pages);
  async.timesSeries(
    pages,
    (n, next) => { console.log(`${n}/${pages}`); getResultPage(info.webenv, info.querykey, pageSize * n, next) },
    (err, res) => {
      if (err) {
        callback(err);
      }
      callback(null, _.flatten(res));
    }
  );
}

function run() {
  const stringifier = csv.stringify({ columns: [ "DOI", "PMID" ], quoted: true, header: true });
  const output = fs.createWriteStream('doi-pmid.csv', { encoding: 'utf-8' });
  stringifier.pipe(output);
  
  function batch([year0, year1], callback) {
    async.waterfall([(cb) => queryForCDSR(year0, year1, cb), getResults], (err, res) => {
      if (err) {
        return callback(err);
      }
      res.forEach((el) => { stringifier.write(el); });
      console.log(`DONE - ${year0}-${year1}`);
      callback(null);
    });
  }
  
  batches = [[1990, 2009], [2010, 2019], [2020, 2029]];
  async.eachSeries(batches, batch, (err) => {
    if (err) {
      console.log(err);
      output.close();
    } else {
      output.close();
    }
  });
}

run();