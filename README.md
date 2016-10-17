# README #

Civil Service People Survey - 2016 Data Science Accelerator Project
===================================================================


This project consists of a node.js + python server and d3 client that explores the Civil Service People Survey.

The data used is in the public domain, available from [GOV.UK](https://www.gov.uk/government/collections/civil-service-people-surveys)

There are essentially two versions of this project: the original development version that did clustering in python/scikit-learn on the fly, and a memoised version that stored the results of the clustering in a separate database table both for quick retrieval, and because it was easier when uploading to the cloud server to not have to configure it to be both a node.js and python server.

This version is the memoised version.


Data
----

The sql dump is in the /data directory. The database used was MySQL. The database is called `csps` - the data needs to be loaded into this.