const fs = require('fs');
const _ = require('lodash');
const async = require('async');
const csv = require('csv');
const util = require('node:util');
const parseCsv = util.promisify(require('./parseCsv'));

const coverage = (data, year, lang) => {
  const total = data.length; const onWiki = data.filter(row => row.onWiki === 'TRUE').length;
  return {
    'Language': lang,
    'Year': year,
    'Coverage': onWiki / total,
  }
};

const now = new Date();
const date = process.argv[2] || `${now.getFullYear()}${('0' + (now.getMonth() + 1)).slice(-2)}${('0' + now.getDate()).slice(-2)}`;
const prefix = `${date}-result-`;
const bylang = fs.readdirSync('.').filter(name => name.startsWith(prefix)).map(async (dir) => {
  const lang = dir.substring(prefix.length);
  const data = await parseCsv(`${dir}/reviews-on-wikipedia-${lang}.csv`);
  const byYear = _.values(_.mapValues(_.groupBy(data, row => row['Last Citation Change'].substring(0, 4)), (data, year) => coverage(data, year, lang)));
  byYear.push(coverage(data, 'Total', lang));
  return byYear;
});

Promise.all(bylang).then((values) => {
  const byyear = values[0].map(row => row.Year).map(year => {
    const obj = Object.fromEntries(values.map(data => {
      const row = data.filter(row => row.Year === year)[0];
      return [row.Language, row.Coverage];
    }));
    obj.Year = year;
    return obj;
  });
  console.log(byyear);
  const stringifier = csv.stringify({ quoted: true, header: true });
  const output = fs.createWriteStream(`${date}-summary.csv`, { encoding: 'utf-8' });
  stringifier.pipe(output);
  byyear.forEach((el) => { stringifier.write(el); });
});

