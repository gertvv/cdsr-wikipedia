const https = require('https');
const csv = require('csv');
const fs = require('fs');
const async = require('async');
const streamToString = require('./streamToString');
const _ = require('lodash');

const api = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const pageSize = 500;

function queryForCDSR(callback) {
  const url = `${api}/esearch.fcgi?db=pubmed&term="Cochrane%20Database%20Syst%20Rev"%5bjour%5d&retmode=json&usehistory=y`;
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

queryForCDSR((err, res) => {
  if (err) {
    return console.error(err);
  }
  console.log(res);
  getResults(res, (err, res) => {
    if (err) {
      return console.error(err);
    }
    const stringifier = csv.stringify({ columns: [ "DOI", "PMID" ], quoted: true, header: true });
    const output = fs.createWriteStream('doi-pmid.csv', { encoding: 'utf-8' });
    stringifier.pipe(output);
    res.forEach((el) => { stringifier.write(el); });
    console.log("DONE");
  });
});