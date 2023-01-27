CDSR / Wikipedia
================

Scripts to help cross-reference the Cochrane Database of Systematic Reviews and Wikipedia.

Dependencies
------------

You need a recent version of [Node.js](https://nodejs.org/) with npm (the installer for Windows has NPM included). The scripts were verified to work with v6.9.2 (`node --version`).

Then, you will need to install the required packages using the command:

```
npm install
```

Getting PubMed IDs for Cochrane reviews
---------------------------------------

Run

```
node queryPubMed
```

This will generate a file `doi-pmid.csv`.

Listing active Cochrane reviews
-------------------------------

You need a UTF-8 CSV file named `published-reviews.csv`, containing columns named "Review DOI", "Title", "Group Name", and "Last Citation Change". The following database query can be used:

```
SELECT
  CONCAT('10.1002/14651858.', r.doi, CASE WHEN dv.updateNo > 1 THEN CONCAT('.pub', dv.updateNo) ELSE '' END) AS "Review DOI",
  dv.title AS "Title", e.name AS "Group Name", dv.journalIssue AS "Last Citation Change"
FROM ReviewEJB AS r
INNER JOIN DocumentEJB AS d ON r.document = d.uuid
INNER JOIN DocumentVersionEJB AS dv ON r.lastCitationVersion = dv.uuid
INNER JOIN CochraneEntityEJB as e ON d.entity = e.uuid
WHERE r.status = 0 AND dv.reviewStage = 3
  AND dv.journalIssue >= '2011'
ORDER BY dv.journalIssue DESC;
```

(Note: Excel saves files with BOM, the scripts require a file without BOM.)

Finding DOIs of cited Cochrane Reviews on Wikipedia
---------------------------------------------------

Run

```
node wikipediaDoi en
```

This will generate a file `wikipedia-dois-en.csv`.

Cross-referencing the files
---------------------------

Run

```
node crossReference en
```

Running many languages
----------------------

MS PowerShell:

```
Foreach ($lang in "de","en","es","nl","fr","ms","fa") {
  node wikipediaDoi $lang
  node crossReference $lang
}
```

License
-------

This software has been released under the terms of the MIT license. See LICENSE.txt for details.