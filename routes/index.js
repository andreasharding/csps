var express = require('express');
var router = express.Router();
var current_year = 2014;
var current_org = 'Civil Service';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Civil Service People Survey', year: current_year, organisation: current_org });
});

module.exports = router;
