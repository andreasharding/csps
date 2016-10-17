var queue = require("queue-async"), http = require('http');
var moment = require('moment');



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


// Database access //////////////////////////////////////////////////////////////////////

function get_sql_data(sql, callback) {
	var mysql      = require('mysql');
	//3306 8889
// 		database: 'hmcpsi',
// 		user     : 'node',
// 		password : 'VL2M7hDD6DGXFsTw9gUrtERy',
	
	var internal_connection = {
		host     : 'localhost',
		port: '8889',
		database: 'csps',
		user     : 'root',
		password : 'root',
		dateStrings: true
	};
	
	var external_connection = {
		host: '192.168.2.22', 
		database: 'wp_debug', 
		user: 'node',
		password: 'N0DE__db_',
		dateStrings: true
	};
	
	var connection = mysql.createConnection(internal_connection);

	connection.connect();

	connection.query(sql, function(err, rows, fields) {
		
		if (err) {
			console.log('SQL error in: ' + sql);
			
			switch (err.code) {
				case 'ECONNREFUSED' :
					console.log("ECONNREFUSED: Database connection refused - maybe switch it on first? Could be problem with SQL user account?");
				break;
			
				case 'ER_NO_SUCH_TABLE' :
					console.log("ER_NO_SUCH_TABLE: Database table doesn't exist - maybe you forgot to create it?");
				break;
			
				case 'ETIMEDOUT' :
					console.log("ETIMEDOUT: Couldn't find database server - make sure the database is connected to your network.");
				break;
				
				default:
					console.log("An error occurred with the database connection. Not sure what, though...");
				break;

			}
			callback(err, null);
			
		} else {
			callback(err, rows);
		}
	});
	connection.end();
}


// takes all async output and combines results
function process_data (err, result) {
	// first item in result array should be a response object, so separate it from result
	var res = result.shift();
	res.set({'cache-control': 'private, max-age=0, no-cache'})
	
	// second item should be user_search_params, so shift that off array too
	var user_search_params = result.shift();
	
	if (result.length != 0){
		user_search_params.respond_time = new Date().getTime();
		res.send(JSON.stringify({'payload': result, 'search_params': user_search_params, 'error': null}));
	} else {
		user_search_params.respond_time = new Date().getTime();
		res.send({'payload': [], 'search_params': user_search_params, 'error': "MailChimp returned no results."});
	}
	
}




function process_sql_data(err, result) {
	if (!err){
		var res = result.shift();
		var user_search_params = result.shift();//'user_search_params';
		var sql_response = result[0];
		res.set({'cache-control': 'private, max-age=0, no-cache'})
		if (sql_response == null) {
			console.log('nothing found in database...');
			user_search_params.respond_time = new Date().getTime();
			res.send(JSON.stringify({'payload': [], 'search_params': user_search_params, 'error': 'nothing found in database...'}));
		} else {
			user_search_params.respond_time = new Date().getTime();
			if (user_search_params.engine == 'memoized') {

				//var message = sql_response;
				var p_msg = JSON.parse(JSON.stringify(sql_response));
				//var p_msg = JSON.parse(message);
				console.log('********************************************** 3');
// 				console.log(typeof(result));
// 				console.log(result.length);
// 				console.log('------------');
// 				console.log(typeof(p_msg));
// 				console.log(p_msg.length);
// 				console.log(p_msg.toString());
// 				console.log(typeof(p_msg));
				//console.log(p_msg);
// 				console.log(typeof(p_msg[0].cluster_data));
// 				console.log(p_msg[0].cluster_data);
// 				console.log(user_search_params);
				var cluster_data = JSON.parse(p_msg[0].cluster_data);
// 				console.log(cluster_data);
				console.log('********************************************** 4');
				
				var cluster_metadata = cluster_data[0];
				var cluster_info = cluster_metadata.cluster_info;
				var category_labels = cluster_metadata.category_labels;// = ['EEI', 'headcount', 'year'];
				//console.log(cluster_metadata);
// 				console.log(cluster_info);//[ [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], [ 79, 87, 79, 78, 95, 87, 99, 39, 89, 40, 2014 ],
				//console.log(category_labels);//[ 'organisation', 'year', 'headcount', 'cluster', 'org', 'parent', 'EEI', 'RW', 'LC', 'LM', 'PB', 'MT', 'MW', 'IF', 'OP' ]
				
				user_search_params['silhouette_score'] = cluster_metadata.silhouette_score;
				
				var cluster_info = [];
				var stat_labels = ['count', 'mean', 'std', 'min', 'IQ1', 'median', 'IQ3', 'max'];
				var num_labels = stat_labels.length;
				var cluster_source = cluster_metadata.cluster_info;
				var item_info = [];

				for (var i = 0; i < cluster_source.length; i++) {
					if (i % num_labels == 0) {
						if (i > 0) {
							cluster_info.push(item_info);
							item_info = [];
						}
					}
					item_info[stat_labels[i % num_labels]] = cluster_source[i];
				}
				cluster_info.push(item_info);// add last element
				
				cluster_data[0].cluster_info = cluster_info;//copy labelled cluster_info back into main info
				console.log('********************************************** 5');
				console.log(cluster_data[0]);
				console.log(user_search_params);
				console.log('********************************************** 6');
				
			

				// end the input stream and allow the process to exit
			
				if (err) throw err;
				user_search_params.respond_time = new Date().getTime();
				res.send(JSON.stringify({'payload': cluster_data[1], 'search_params': user_search_params, 'error': null}));



				
			} else {
				res.send(JSON.stringify({'payload': sql_response, 'search_params': user_search_params, 'error': null}));
			}
		}
	} else {
		console.log('sql error================');
		console.log(err);
		console.log(result);
	}
}




/*
 * GET isn't used for Ajax requests, so fob off user
 */

exports.nothing = function(req, res, next){
	res.send('hello - nothing to see here!');
	next();
};


/*
 * POST respond to queries to get data via ajax
 */

exports.respond = function(req, res, next){

	var content = '';
	var organisation = '';
	var sql_stmt;
	var user_search_params = { start_date: '2014-05-01', end_date: '2014-05-08', arrival_time: new Date().getTime()};//dummy default data

	if(req.xhr) {
		req.on('data', function (data) {
			content += data; // Append data.
			if (content.length > 1e6) {
				res.json({ error: 'Request entity too large.' }, 413); // Flood attack or faulty client, nuke request.
			}
		});

		req.on('end', function () {
			// Return the posted data.
			user_search_params = JSON.parse(content);
			user_search_params.arrival_time = new Date().getTime();
			
			switch(user_search_params.action) {
			
			
			//////////  COMPARISONS
			
				case 'comparison_similar_orgs':
					console.log('********************************************');
					console.log(user_search_params);
					
					var similar_orgs_graph;
					
					// NB - remember that number of links is one fewer than number of nodes!!!
					similar_orgs_graph = {
								"nodes":[
									{"name":"Charity Commission","group":2,"EEI":53},
									{"name":"Crown Office and Procurator Fiscal Service","group":2,"EEI":55},
									{"name":"Defence Science and Technology Laboratory","group":2,"EEI":57},
									{"name":"FCO Services","group":2,"EEI":58},
									{"name":"Food Standards Agency","group":2,"EEI":53},
									{"name":"Food and Environment Research Agency","group":2,"EEI":53},
									{"name":"Highways Agency","group":2,"EEI":54},
									{"name":"Home Office (excl. agencies)","group":2,"EEI":55},
									{"name":"Maritime and Coastguard Agency","group":2,"EEI":59},
									{"name":"Medicines and Healthcare Products Regulatory Agency","group":2,"EEI":59},
									{"name":"Ministry of Defence","group":2,"EEI":57},
									{"name":"National Records of Scotland","group":2,"EEI":50},
									{"name":"Public Health England","group":2,"EEI":53},
									{"name":"Scottish Prison Service ","group":2,"EEI":58},
									{"name":"UK Hydrographic Office","group":2,"EEI":58}
								],
								"links":[
									{"source":1,"target":0,"value":1},
									{"source":2,"target":0,"value":1},
									{"source":3,"target":0,"value":1},
									{"source":4,"target":0,"value":1},
									{"source":5,"target":0,"value":1},
									{"source":6,"target":0,"value":1},
									{"source":7,"target":0,"value":1},
									{"source":8,"target":0,"value":1},
									{"source":9,"target":0,"value":1},
									{"source":10,"target":0,"value":1},
									{"source":11,"target":0,"value":1},
									{"source":12,"target":0,"value":1},
									{"source":13,"target":0,"value":1},
									{"source":14,"target":0,"value":1}
								]
							}
					
					
					user_search_params.respond_time = new Date().getTime();
					res.send(JSON.stringify({'payload': similar_orgs_graph, 'search_params': user_search_params, 'error': null}));						

				break;

				
				case 'comparison_self_time':
				
					var measures_list = "'" + user_search_params.measure.join("', '") + "'";
				
					sql_stmt = "SELECT `organisation`, `year`, `measure`, `score` FROM `scores` ";
// 					sql_stmt += "WHERE `year` = " + user_search_params.year;
					sql_stmt += "WHERE `organisation` = '" + user_search_params.organisation + "' ";
					sql_stmt += " AND `measure` IN(" + measures_list + ") ORDER BY `measure`, `year`;";
					
// 					sql_stmt = "SELECT `organisation`, `year`, `measure`, `score` FROM `scores` WHERE `year` = 2009 AND `organisation` = 'AGO' AND `measure` IN ('EEI', 'MW') ORDER BY `year`;"
					//console.log(sql_stmt);

				break;
				
				
				case 'sentiment':
					var the_org = 'CS';
					var the_year = 2015;
					
					sql_stmt = "SELECT `scores`.`organisation`, `scores`.`measure`, `scores`.`score`, `scores`.`year` FROM `scores` WHERE `scores`.`organisation` = '";
					sql_stmt += the_org + "' AND `scores`.`year` = '";
					sql_stmt += the_year + "' AND (`measure` LIKE 'E0%' OR `measure` LIKE 'W0%') ORDER BY `measure`;";
				break;
				
				
				
				case 'bullying':
					var the_org = 'CS';
					var the_year = 2015;
					
					sql_stmt = "SELECT `scores`.`organisation`, `scores`.`measure`, `scores`.`score`, `scores`.`year` FROM `scores` WHERE `scores`.`organisation` = '";
					sql_stmt += the_org + "' AND `scores`.`year` = '";
					sql_stmt += the_year + "' AND (`measure` LIKE 'E01%' OR `measure` LIKE 'E02%') ORDER BY `measure`;";
				break;

				case 'discrimination':
					var the_org = 'CS';
					var the_year = 2015;
					
					sql_stmt = "SELECT `scores`.`organisation`, `scores`.`measure`, `scores`.`score`, `scores`.`year` FROM `scores` WHERE `scores`.`organisation` = '";
					sql_stmt += the_org + "' AND `scores`.`year` = '";
					sql_stmt += the_year + "' AND (`measure` LIKE 'E03%' OR `measure` LIKE 'E04%') ORDER BY `measure`;";
				break;
				
				
				
				case 'wellbeing':
					var the_org = 'CS';
					var the_year = 2015;

					sql_stmt = "SELECT `scores`.`organisation`, `scores`.`measure`, `scores`.`score`, `scores`.`year` FROM `scores` WHERE `scores`.`organisation` = '";
					sql_stmt += the_org + "' AND `scores`.`year` = '";
					sql_stmt += the_year + "' AND `measure` LIKE 'W0%' ORDER BY `measure`;";
// 					console.log('********************************************');
// 					console.log(sql_stmt);
// 					console.log('********************************************');
				break;
				
				
				
				case 'engagement_drivers':
					// NB similar to comparison_self_time. TODO - fix this 
					var the_org = 'CS';
					var start_year = 2012;
					var end_year = 2015;
					var measures_list = "'" + user_search_params.measure.join("', '") + "'";
					
// 				SELECT * FROM `scores` WHERE `measure` LIKE 'EEI' AND `organisation` = 'CS' AND `year` >= 2011 AND `year` <= 2015;

					sql_stmt = "SELECT `scores`.`organisation`, `scores`.`measure`, `scores`.`year`, `scores`.`score` FROM `scores` WHERE `scores`.`organisation` = '";
					sql_stmt += the_org + "' AND `scores`.`year` >= '";
					sql_stmt += start_year + "' AND `scores`.`year` <= '";
					sql_stmt += end_year + "' AND `measure` IN(" + measures_list + ") ORDER BY `measure`, `year`;";
// 					console.log('********************************************');
// 					console.log(sql_stmt);
// 					console.log('********************************************');
				break;
				

				
				
				case 'cluster':
					
// 					console.log('********************************************');
// 					console.log(user_search_params);
// 					title: 'Clusters', year: self.current_year, organisation: current_org, action: 'cluster', 
// 					algorithm: 'KMeans', engine: 'scikit-learn', cluster_options: cluster_options 
// 					console.log('********************************************');
					
					switch(user_search_params.engine) {
					
						case 'memoized':
							sql_stmt = "SELECT `cluster_data` FROM `clusters` ";
							sql_stmt += "WHERE `year` = " + user_search_params.year;
							sql_stmt += " AND `feature_set` LIKE '" + user_search_params.feature_set + "';";
						break;
						
						case 'scikit-learn':
							var PythonShell = require('python-shell');
							var p_msg;
							var options = {
								mode: 'text',
								args: [user_search_params.organisation, user_search_params.year, user_search_params.algorithm, JSON.stringify(user_search_params.cluster_options), user_search_params.feature_set]
							};
							var pyshell = new PythonShell('./bin/csps_cluster_scikit.py', options);//_working

							// sends a message to the Python script via stdin
							pyshell.send('hello');

							pyshell.on('message', function (message) {
								// received a message sent from the Python script (a simple "print" statement)
								// note that this is JSON encoded, but will bundle up into a different structure shortly
								// so need to parse this first - slightly inefficient...
// 								console.log('********************************************** 1');
// 								console.log(message);
// 								console.log('********************************************** 2');

								p_msg = JSON.parse(message);
								user_search_params['silhouette_score'] = p_msg[0].silhouette_score;
// 								console.log('********************************************** 3');
// 								console.log(p_msg[0].cluster_info);
// 								console.log(user_search_params);
// 								console.log('********************************************** 4');
								
								var cluster_info = [];
								var category_labels = p_msg[0].category_labels;// = ['EEI', 'headcount', 'year'];
								var stat_labels = ['count', 'mean', 'std', 'min', 'IQ1', 'median', 'IQ3', 'max'];
								var num_labels = stat_labels.length;
								var cluster_source = p_msg[0].cluster_info;
								var item_info = [];
	
								for (var i = 0; i < cluster_source.length; i++) {
									if (i % num_labels == 0) {
										if (i > 0) {
											cluster_info.push(item_info);
											item_info = [];
										}
									}
									item_info[stat_labels[i % num_labels]] = cluster_source[i];
								}
								cluster_info.push(item_info);// add last element
								
								p_msg[0].cluster_info = cluster_info;//copy labelled cluster_info back into main info
// 								console.log('********************************************** 5');
// 								console.log(p_msg[0]);
// 								console.log(user_search_params);
// 								console.log('********************************************** 6');
								
							});

							// end the input stream and allow the process to exit
							pyshell.end(function (err) {
								if (err) throw err;
								user_search_params.respond_time = new Date().getTime();
								res.send(JSON.stringify({'payload': p_msg[1], 'search_params': user_search_params, 'error': null}));

								//next();//don't do this - it results in calling res.send again, which causes problems
							});
						break;
						
						default:
							user_search_params.respond_time = new Date().getTime();
							res.send(JSON.stringify({'payload': '-1', 'search_params': user_search_params, 'error': null}));						
						break;

					}
				break;

				// top-line  figure for all organisations for a particular measure in a given year, including headcount
				// NB: both headcount and scores using JOIN, so slower: ~20ms

				case 'scores_headcount_all':					
				case 'headcount_scores_all':
									
					sql_stmt = "SELECT `headcount`.`acronym` AS 'organisation', `headcount`.`year`, `headcount`.`number` AS 'headcount', `scores`.`score` ";
					sql_stmt += "FROM `headcount` JOIN `scores` ON `headcount`.`acronym` = `scores`.`organisation` ";
					if (user_search_params.year != '') {
						sql_stmt += "WHERE `headcount`.`year` = " + user_search_params.year;
						sql_stmt += " AND `scores`.`year` = " + user_search_params.year + " AND ";
					} else {sql_stmt += "WHERE ";}
					if (user_search_params.measure != '') {
						sql_stmt += "`scores`.`measure` = '" + user_search_params.measure + "';";
					} else {
						sql_stmt += "`scores`.`measure` != '';";
					}
				break;
				
				
				// just headcount of all organisations for given year
				// if year is supplied, just return results for that year, else all years
				
				case 'headcount_all':
					if (user_search_params.year != '') {
						sql_stmt = "SELECT `headcount`.`acronym` AS 'organisation', `headcount`.`year`, `headcount`.`number` AS 'headcount' FROM `headcount` ";
						sql_stmt += "WHERE `headcount`.`year` = " + user_search_params.year + ";";
					} else {
						// # total headcount by summing individual headcounts
						sql_stmt = "SELECT `headcount`.`year`, COUNT(`headcount`.`number`) AS 'num_orgs', SUM(`headcount`.`number`) AS 'total' FROM `headcount` ";
						sql_stmt += "WHERE `acronym` != 'ALL' AND `acronym` != 'TE' ";
						sql_stmt += "GROUP BY `headcount`.`year`;";
					}
				break;
				
				case 'headcount_total':
					if (user_search_params.year != '') {
						/* total headcount based on totals supplied and stored with 'TE' as acronym i.e. Total Employment */
						sql_stmt = "SELECT `headcount`.`year`, `headcount`.`number` AS 'headcount' ";
						sql_stmt += "FROM `headcount` WHERE `headcount`.`acronym` = 'TE' ";
						sql_stmt += "AND `headcount`.`year` = " + user_search_params.year + ";";
					} else {
						sql_stmt = "SELECT `headcount`.`year`, `headcount`.`number` AS 'headcount' ";
						sql_stmt += "FROM `headcount` WHERE `headcount`.`acronym` = 'TE' ";
						sql_stmt += "ORDER BY `headcount`.`year`;";
					}
				break;
				
				
				case 'headcount_change':
					var org;
					if (user_search_params.organisation != '') {
						org = user_search_params.organisation;
					} else {
						org = 'ALL';
					}
						sql_stmt = "SELECT `organisation`, `acronym`, `year`, `headcount`, `headcount_delta` FROM `org_demographics_ONS` WHERE `acronym` = '";
						sql_stmt += org + "' ORDER BY `year`;";
				break;
				


				
				// just scores of all organisations for given year
				
				case 'scores_all':
								
					sql_stmt = "SELECT `scores`.`organisation`, `scores`.`year`, `scores`.`score` FROM `scores`";
					sql_stmt += "WHERE `scores`.`year` = " + user_search_params.year;
					if (user_search_params.measure != '') {
						sql_stmt += " AND `scores`.`measure` = '" + user_search_params.measure + "';";
					} else {
						sql_stmt += ";";
					}
				break;
				
				
				// probably pointless, but used for demo purposes...
				case 'scores_average':
					if (user_search_params.year != '') {
						sql_stmt = "SELECT `scores`.`organisation`, `scores`.`year`, AVG(`scores`.`score`) AS 'mean' ";
						sql_stmt += "FROM `scores` WHERE `scores`.`year` = " + user_search_params.year;
						sql_stmt += " GROUP BY `scores`.`organisation`;";
					} else {
						sql_stmt = "SELECT `scores`.`organisation`, `scores`.`year`, AVG(`scores`.`score`) AS 'mean' ";
						sql_stmt += "FROM `scores` GROUP BY `scores`.`year`, `scores`.`organisation`;";
					}
				break;
				
				
				// gets implicitly grouped info on number_of_organisations and total headcount (only one row)
				case 'year_total_orgs_headcount':
				
					sql_stmt = "SELECT `headcount`.`year`, COUNT(`headcount`.`number`) AS 'number_of_organisations', ";
					sql_stmt += "SUM(`headcount`.`number`) AS 'total_headcount' FROM `headcount` ";
					sql_stmt += "WHERE `headcount`.`acronym` != 'ALL' AND `headcount`.`acronym` != 'TE' ";
					sql_stmt += "AND `headcount`.`year` = " + user_search_params.year + ";";
				break;
				
				
				
				case 'organisation_list':
					if (user_search_params.year != '') {
						if (user_search_params.full_names) {							
							sql_stmt = "SELECT DISTINCT `scores`.`organisation` as 'acronym', `acronyms`.`description` as 'organisation' FROM `scores` ";
							sql_stmt += " JOIN `acronyms` ON `scores`.`organisation` = `acronyms`.`acronym` WHERE `year` = " + user_search_params.year;
							sql_stmt += " ORDER BY `acronyms`.`description`;";
						} else {
							sql_stmt = "SELECT DISTINCT `organisation` FROM `scores` WHERE `year` = " + user_search_params.year + ";";
						}
					} else {
						sql_stmt = "SELECT DISTINCT `organisation` FROM `scores`;";
					}
				break;
				
				
				case 'survey_years':
					sql_stmt = "SELECT DISTINCT `year` FROM `scores` ORDER BY `year`;";
				break;
				
				
				

				case 'organisation_headcount_overview':
				
					sql_stmt = "SELECT `organisation`, `acronym`, `headcount`, `headcount_delta`, `year` ";
					sql_stmt += "FROM `org_demographics_ONS` WHERE `acronym` LIKE 'ALL' ORDER BY `year`;";

				break;
				
				// Demographics /////////////////////////////////////////////////
				
				
				// Get Grades v Gender split
				// Get Grades v Ethnicity split etc
				
				case 'demographic_summary':
					
					var demographics = "'" + user_search_params.demographics.join("', '") + "'";
					sql_stmt = "SELECT `demographic_category_totals`.`response_category` as 'demographic_category', ";
					sql_stmt += "`demographic_category_totals`.`demographic_total` ";
					sql_stmt += "FROM `demographic_category_totals` ";
					sql_stmt += "WHERE `response_category` IN(" + demographics + ") ";
					sql_stmt += "AND `demographic_category` = 'total' ";
					sql_stmt += "AND `measure` LIKE '" + user_search_params.measure + "' ";
					sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
					sql_stmt += " ORDER BY `measure`, `demographic_category`;";
					
				break;

				case 'demographics':
				
				
					if (typeof user_search_params.demographics === "undefined") {
						// if you want demographics but can't be bothered to say which ones, then too bad - you get nothing...
						sql_stmt = "SELECT 0 AS 'demographic_total';";
					
					} else {

						var demographics = "'" + user_search_params.demographics.join("', '") + "'";
						
						switch (typeof user_search_params.measure) {
						
							case "undefined":
								// WARNING - this may give unexpected results due to overlapping data summing to more than 100%
								sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
								sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total' ";
								sql_stmt += "FROM `demographic_category_totals` ";
								sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
								sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
								sql_stmt += " GROUP BY `demographic_category`;";
								
								
							break;

						
							case "string":
							if (user_search_params.measure != '') {
								sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
								sql_stmt += "`demographic_category_totals`.`demographic_total`, ";
								sql_stmt += "`demographic_category_totals`.`response_category` ";
								sql_stmt += "FROM `demographic_category_totals` ";
								sql_stmt += "JOIN `acronyms` ";
								sql_stmt += "ON `demographic_category_totals`.`response_category` = `acronyms`.`description` ";
								sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
								sql_stmt += "AND `measure` LIKE '" + user_search_params.measure + "' ";
								sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
								sql_stmt += " ORDER BY `demographic_category`, `acronyms`.`subdivision`;";
							} else {
								sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
								sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total' ";
								sql_stmt += "FROM `demographic_category_totals` ";
								sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
								sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
								sql_stmt += " GROUP BY `demographic_category`;";
							}
							break;
							
							
							case "object":
								var measures = "'" + user_search_params.measure.join("', '") + "'";

								sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
								sql_stmt += "`demographic_category_totals`.`demographic_total`, ";
								sql_stmt += "`demographic_category_totals`.`response_category` ";
								sql_stmt += "FROM `demographic_category_totals` ";
								sql_stmt += "JOIN `acronyms` ";
								sql_stmt += "ON `demographic_category_totals`.`response_category` = `acronyms`.`description` ";
								sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
								sql_stmt += "AND `measure` IN(" + measures + ") ";
								sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
								sql_stmt += " ORDER BY `demographic_category`, `acronyms`.`subdivision`;";
							break;
							
						}
					}

				break;
				
				
				case 'demographics_by_total':
					// get totals for category					
					
					
					switch (typeof user_search_params.measure) {
					
						case "undefined":
						
							switch (typeof user_search_params.demographics) {
					
								case "undefined":
									// No measures, no demographics
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, `measure`, ";
									sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total' ";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `demographic_category_totals`.`year` = " + user_search_params.year;
									sql_stmt += " GROUP BY `demographic_category`, `measure` WITH ROLLUP;";
								break;
								
								
								case "string":
									// No measures, one demographic as string
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total'";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `demographic_category` LIKE '" + user_search_params.demographics + "' ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
									sql_stmt += " GROUP BY `demographic_category`;";
								break;
								
								
								case "object":
									// No measures, several demographics in array
									var demographics = "'" + user_search_params.demographics.join("', '") + "'";
									/* This just gives you the highest level total e.g. female	2515952; male	2341361 */
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total'";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
									sql_stmt += " GROUP BY `demographic_category`;";
								break;
					console.log(user_search_params);
					console.log(sql_stmt);
							}
							
						break;
						
						
						
						case "string":
						
							switch (typeof user_search_params.demographics) {
					
								case "undefined":
									// one measure as string, no demographics
									/* breakdown of single measures for all categories 
										NB this requires selecting only those marked with demographic_category = 'total'*/
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "`demographic_category_totals`.`demographic_total`, ";
									sql_stmt += "`demographic_category_totals`.`response_category` ";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `measure` LIKE '" + user_search_params.measure + "' ";
									sql_stmt += "AND `demographic_category` = 'total' ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
									sql_stmt += " GROUP BY `demographic_category`, `response_category`;";
								break;
								
								
								case "string":
									// one measure as string, one demographic as string
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "`demographic_category_totals`.`demographic_total`, ";
									sql_stmt += "`demographic_category_totals`.`response_category` ";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `demographic_category` LIKE '" + user_search_params.demographics + "' ";
									sql_stmt += "AND `measure` LIKE '" + user_search_params.measure + "' ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
									sql_stmt += " GROUP BY `demographic_category`, `response_category`;";
								break;
								
								
								case "object":
									// one measure as string, several demographics in array
									/* breakdown of single measure for single category */
									/* This gives you the demographic totals broken down by measure too e.g. female	27494	Aged 16-34; male	25192	Aged 16-34 */
									var demographics = "'" + user_search_params.demographics.join("', '") + "'";
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "`demographic_category_totals`.`demographic_total`, ";
									sql_stmt += "`demographic_category_totals`.`response_category` ";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
									sql_stmt += "AND `measure` LIKE '" + user_search_params.measure + "' ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
									sql_stmt += " GROUP BY `demographic_category`, `response_category`;";
								break;
					
							}
							
						break;
						
						
						
						case "object":
						
							switch (typeof user_search_params.demographics) {
					
								case "undefined":
									// several measure in array, no demographics
									var measures = "'" + user_search_params.measure.join("', '") + "'";
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total', ";
									sql_stmt += "`demographic_category_totals`.`response_category` ";
									sql_stmt += "FROM `demographic_category_totals` ";									
									sql_stmt += "WHERE `measure` IN(" + measures + ") ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
									sql_stmt += " GROUP BY `response_category`, `demographic_category`;";

								break;
								
								
								case "string":
									// several measure in array, one demographic as string
									var measures = "'" + user_search_params.measure.join("', '") + "'";
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total', ";
									sql_stmt += "`demographic_category_totals`.`response_category` ";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `demographic_category` LIKE '" + user_search_params.demographics + "' ";
									sql_stmt += "AND `measure` IN(" + measures + ") ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
									sql_stmt += " GROUP BY `response_category`, `demographic_category`;";
								break;
								
								
								case "object":
									// several measure in array, several demographics in array
									var measures = "'" + user_search_params.measure.join("', '") + "'";
									var demographics = "'" + user_search_params.demographics.join("', '") + "'";
									sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
									sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total', ";
									sql_stmt += "`demographic_category_totals`.`response_category` ";
									sql_stmt += "FROM `demographic_category_totals` ";
									sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
									sql_stmt += "AND `measure` IN(" + measures + ") ";
									sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
									sql_stmt += " GROUP BY `response_category`, `demographic_category`;";
								break;
					
							}
							
						break;
					
					}

				
					
					if (user_search_params.measure != '') {
					
// 						if (typeof user_search_params.demographics === "undefined") {
// 							/* breakdown of single measures for all categories */
// 							sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
// 							sql_stmt += "`demographic_category_totals`.`demographic_total`, ";
// 							sql_stmt += "`demographic_category_totals`.`response_category` ";
// 							sql_stmt += "FROM `demographic_category_totals` ";
// 							sql_stmt += "WHERE `measure` LIKE '" + user_search_params.measure + "' ";
// 							sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
// 							sql_stmt += " GROUP BY `demographic_category`, `response_category`;";
// 						} else {
// 							/* breakdown of single measure for single category */
// 							/* This gives you the demographic totals broken down by measure too e.g. female	27494	Aged 16-34; male	25192	Aged 16-34 */
// 							var demographics = "'" + user_search_params.demographics.join("', '") + "'";
// 							sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
// 							sql_stmt += "`demographic_category_totals`.`demographic_total`, ";
// 							sql_stmt += "`demographic_category_totals`.`response_category` ";
// 							sql_stmt += "FROM `demographic_category_totals` ";
// 							sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
// 							sql_stmt += "AND `measure` LIKE '" + user_search_params.measure + "' ";
// 							sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year;
// 							sql_stmt += " GROUP BY `demographic_category`, `response_category`;";
// 							
// 						}
						
					} else {
						if (typeof user_search_params.demographics === "undefined") {
							/* breakdown of measures for all categories and measures - not very helpul for graphs, but may be OK for tables 
							 WITH ROLLUP makes it run about 33% faster as well as giving you the rolled up totals, although these need to be ignored
							 as the categories aren't mutually exclusive so things get double counted
							*/
// 							sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, `measure`, ";
// 							sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total' ";
// 							sql_stmt += "FROM `demographic_category_totals` ";
// 							sql_stmt += "WHERE `demographic_category_totals`.`year` = " + user_search_params.year;
// 							sql_stmt += " GROUP BY `demographic_category`, `measure` WITH ROLLUP;";
						} else {
// 							var demographics = "'" + user_search_params.demographics.join("', '") + "'";
// 							/* This just gives you the highest level total e.g. female	2515952; male	2341361 */
// 							sql_stmt = "SELECT `demographic_category_totals`.`demographic_category`, ";
// 							sql_stmt += "SUM(`demographic_category_totals`.`demographic_total`) as 'demographic_total'";
// 							sql_stmt += "FROM `demographic_category_totals` ";
// 							sql_stmt += "WHERE `demographic_category` IN(" + demographics + ") ";
// 							sql_stmt += "AND `demographic_category_totals`.`year` = " + user_search_params.year; 
// 							sql_stmt += " GROUP BY `demographic_category`;";
						}
					}
				break;

				
				
				// gets number of records for given table

				case 'count_acronyms':					
					sql_stmt = "SELECT COUNT(*) FROM `acronyms`;"
				break;			
				
				case 'count_headcount':					
					sql_stmt = "SELECT COUNT(*) FROM `headcount`;"
				break;			
				
				case 'count_demographics':					
					sql_stmt = "SELECT COUNT(*) FROM `demographic_category_totals`;"
				break;			
				
				case 'count_detailed_scores':					
					sql_stmt = "SELECT COUNT(*) FROM `detailed_scores`;"
				break;			
				
				case 'count_scores':					
					sql_stmt = "SELECT COUNT(*) FROM `scores`;"
				break;			
				
				
				
				
				
				default:
					sql_stmt = "SELECT 0;"
			}
			
// 			console.log(sql_stmt);
			
			// stop it doing all this stuff if have already done a res.send for the cluster
			if (user_search_params.action != 'cluster' || user_search_params.engine != 'scikit-learn') {
				var q = queue();
				
				// first, pass res and user_search_params through to final processing
				q.defer(passthrough, res);
				q.defer(passthrough, user_search_params);
				q.defer(get_sql_data, sql_stmt); // third item is the actual SQL lookup
				q.awaitAll(process_sql_data);
			}
// 			 else {
// 				if (user_search_params.engine == 'memoized') {
// 					var q = queue();
// 				
// 					// first, pass res and user_search_params through to final processing
// 					q.defer(passthrough, res);
// 					q.defer(passthrough, user_search_params);
// 					q.defer(get_sql_data, sql_stmt); // third item is the actual SQL lookup
// 					q.awaitAll(process_sql_data);
// 				
// 				}
// 			}
			
			// Maybe get rid of this - what does it do, exactly?
			//routes.get_metrics;
			
		});
	} else {
		res.send('hello non-xhr post!');
		next();
	}
	

};



