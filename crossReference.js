const fs = require('fs');
const _ = require('lodash');
const async = require('async');
const csv = require('csv');
const parseCsv = require('./parseCsv');

const lang = process.argv[2];
const now = new Date();
const dir = `${now.getFullYear()}${('0' + (now.getMonth()+1)).slice(-2)}${('0' + now.getDate()).slice(-2)}-result-${lang}`;

fs.mkdirSync(dir);

function outputByGroup(prefix, data) {
  const grouped = _.groupBy(data, 'Group Name');
  const content = _.mapValues(grouped, (g, name) => `== ${name} ==\n\n` + _.join(_.map(g, (r) => `${r['Last Citation Change']} ${r.Title} PMID ${r.PMID} https://doi.org/${r['Review DOI']}`), '\n\n'));
  for (let groupName in content) {
    const groupNameClean = groupName.replace(/\W/g, '_');
    fs.writeFileSync(`${prefix}${groupNameClean}.txt`, content[groupName]);
  }
}

async.parallel([
  (cb) => parseCsv('doi-pmid.csv', cb),
  (cb) => parseCsv(`wikipedia-dois-${lang}.csv`, cb),
  (cb) => parseCsv('published-reviews.csv', cb)
], (err, [pmids, wiki, reviews]) => {
  const doiToPmid = _.fromPairs(_.map(pmids, (pmid) => [pmid.DOI, pmid.PMID]));
  const stem = (doi) => doi.substring(0, 25);
  const wikiDoiStems = new Set(_.map(wiki, (r) => stem(r.doi)));
  reviews = _.map(reviews, (review) => _.extend(review, {
    'PMID': doiToPmid[review['Review DOI']],
    'onWiki': wikiDoiStems.has(stem(review['Review DOI'])) ? 'TRUE' : 'FALSE'
  }));
  
  const stringifier = csv.stringify({ columns: [ "Review DOI", "Last Citation Change", "Title", "Group Name", "PMID", "onWiki" ], quoted: true, header: true });
  const output = fs.createWriteStream(`${dir}/reviews-on-wikipedia-${lang}.csv`, { encoding: 'utf-8' });
  stringifier.pipe(output);
  reviews.forEach((el) => { stringifier.write(el); });
  
  const notOnWiki = _.filter(reviews, (r) => r.onWiki === 'FALSE');
  outputByGroup(`${dir}/Not on Wiki - `, notOnWiki);
});