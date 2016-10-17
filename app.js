//////////////////////////////////////////////////////////////////////////////////////////
// Openshift requirements
//////////////////////////////////////////////////////////////////////////////////////////

const fs           = require('fs'),
      path         = require('path'),
      contentTypes = require('./utils/content-types'),
      sysInfo      = require('./utils/sys-info'),
      env          = process.env;
// http         = require('http'),
      

//////////////////////////////////////////////////////////////////////////////////////////
// Express dependencies
//////////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
// var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ajax = require('./routes/ajax');
// var scikit_learn = require('./routes/scikit_learn');


//////////////////////////////////////////////////////////////////////////////////////////
// Application dependencies & helpers
//////////////////////////////////////////////////////////////////////////////////////////

var	queue = require("queue-async");
var chroma = require("chroma-js");

/*
 * passthrough
 * ===========
 * 
 * A helper function for async handling to just funnel items into the queue to make
 * it available at next stage, at the right time, and avoiding using globals or 
 * having to worry about synchronisation issues.
 *
*/

function passthrough(item, callback) {
	callback(null, item);
}


/*
 * getRandomArbitrary
 * ==================
 * 
 * Returns a random number between min (inclusive) and max (exclusive)
 * @param	range = [min, max]
 * @return	number
*/
	
function getRandomArbitrary(range) {
	return Math.random() * (range[1] - range[0]) + range[0];
}


/*
 * get_sql_data
 * ============
 * 
 * Sets up query to MySQL with callback for asynchronous use
 * @param	sql = valid SQL statement
 * @return	number
*/
	
function get_sql_data(sql, callback) {
	var mysql      = require('mysql');
	var internal_connection = {
		host     : 'localhost',
		port: '8889',
		database: 'csps',
		user     : 'root',
		password : 'root'
	};
	
	var external_connection = {
		host: '192.168.2.22', 
		database: 'wp_debug', 
		user: 'node',
		password : 'N0DE__db_',
	};
	
	var connection = mysql.createConnection(internal_connection);

	connection.connect();

	connection.query(sql, function(err, rows, fields) {
		if (err) {
			if (err.code == 'ECONNREFUSED') {
				console.log("ECONNREFUSED: Database connection refused - maybe switch it on first?");
			}
		}
		callback(err, rows);
	});
	connection.end();
}


/*
 * process_sql_data
 * ================
 * 
 * Handles MySQL query results via asynchronous callback
 * @param	err = error object
 * @param	results = array, consisting of result of each function passed into queue
 * @return	n/a
*/
	
function process_sql_data(err, results) {
	console.log('sql errors================');
	console.log(err);
	if (!err){
		results.forEach( function (e, i) {
			console.log('sql[' + i + ']================');
			console.log(e);
		})
	}
}




//////////////////////////////////////////////////////////////////////////////////////////
// Express startup
//////////////////////////////////////////////////////////////////////////////////////////

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// AJAX HANDLING /////////////////////////////////////////////////////////////////////////

app.get('/xhr', ajax.nothing);
app.post('/xhr', ajax.respond);



// OPENSHIFT HEALTH HANDLING /////////////////////////////////////////////////////////////
app.get('/', ajax.nothing);


app.get('/health', function (req, res) {
	res.writeHead(200);
    res.end();
});



app.get('/info/gen', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.end(JSON.stringify(sysInfo['gen']()));
});



app.get('/info/poll', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.end(JSON.stringify(sysInfo['poll']()));
});



app.get('/info/test', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.end(JSON.stringify("hello"));
});





// ERROR HANDLING ////////////////////////////////////////////////////////////////////////


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;





//////////////////////////////////////////////////////////////////////////////////////////
// This to be replaced by proper express code
//////////////////////////////////////////////////////////////////////////////////////////


/*
let server = http.createServer(function (req, res) {
  let url = req.url;
  if (url == '/') {
    url += 'index.html';
  }

  // IMPORTANT: Your application HAS to respond to GET /health with status 200
  //            for OpenShift health monitoring

  if (url == '/health') {
    res.writeHead(200);
    res.end();
  } else if (url == '/info/gen' || url == '/info/poll') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.end(JSON.stringify(sysInfo[url.slice(6)]()));
  } else {
    fs.readFile('./static' + url, function (err, data) {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        let ext = path.extname(url).slice(1);
        res.setHeader('Content-Type', contentTypes[ext]);
        if (ext === 'html') {
          res.setHeader('Cache-Control', 'no-cache, no-store');
        }
        res.end(data);
      }
    });
  }
});

server.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost', function () {
  console.log(`Application worker ${process.pid} started...`);
});
*/