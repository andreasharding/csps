/*	useful references
 *	https://www.toptal.com/d3-js/towards-reusable-d3-js-charts
 *	https://bost.ocks.org/mike/chart/
 *	https://github.com/billautomata/d3js_design_patterns/blob/master/volume-1.md
 *	https://addyosmani.com/resources/essentialjsdesignpatterns/book/#revealingmodulepatternjavascript
 *
 *	About staged transitions in animated statistical charts
 *	http://vis.berkeley.edu/papers/animated_transitions/
 *	http://vis.berkeley.edu/papers/animated_transitions/2007-AnimatedTransitions-InfoVis.pdf
 *
*/


/*
 * Setup ================================================================================
*/

// user-convenience merits additional developer effort (from https://bost.ocks.org/mike/chart/)

// require.config({paths: {queue: "http://d3js.org/queue.v1.min"}});
// 
// require(["queue"], function(queue) {
//	 console.log(queue.version);
// });


var org_list, survey_info, viewModel;
var g_current_year = 2014;
var current_org = 'CS';
var organisation_root = 'Civil Service';
var csps_orgs = [];
var g_force_graph;

// console.log(screen.width);
// console.log(screen.height);
// console.log(devicePixelRatio);
// console.log(device-width);
// console.log(device-height);


$(function() {
	// Document is ready


	$(document).on('click','#suggest_link',function(e) {
		console.log('suggest_link clicked **********************');
		if( $(e.target).is('a') ) {
			//$(this).collapse('hide');
		}
	});




	viewModel = {
		self: this,
		// These are the initial options
		organisations: ko.observableArray([]),
		current_organisation: ko.observable('CS'),
		previous_organisation: ko.observable('CS'),
		organisation_clusters: ko.observableArray([]),
		current_cluster: ko.observableArray([]),
		current_cluster_id: ko.observable(0),
		previous_cluster: ko.observableArray([]),
		// current_organisation_obj: ko.computed(function() {
				// return this.current_organisation_obj['organisation_full_name'];
		// 	}, this),
		survey_years: ko.observableArray([]),
		current_year: ko.observable(g_current_year),
		current_algorithm: ko.observable('AffinityPropagation'),
		cluster_algorithms: ko.observableArray(['KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'AC_average_linkage', 'DBSCAN', 'Birch']),
		current_feature_set: ko.observable('questions'),
		feature_sets: ko.observableArray(['questions', 'themes', 'demographics', 'ew_questions']),
		visualisation_style: ko.observable('dendrogram'),
		visualisation_styles: ko.observableArray(['circle_packing', 'dendrogram']),
		visualisation_style_prev: 'dendrogram',
		num_clusters: ko.observable(6),
		cluster_count_prev: ko.observable(6),
		status_message: ko.observable(''),
		delivery_time: ko.observable(0),
		silhouette_score: ko.observable(0),
		// The silhouette score is bounded between -1 for incorrect clustering and +1 for highly dense clustering. 
		// Scores around zero indicate overlapping clusters.
		//num_clusters_sel: ko.observableArray(['KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'AC_average_linkage', 'DBSCAN', 'Birch']),


		set_delivery_time: function(dt) {
			this.delivery_time(dt);
		},

		set_silhouette_score: function(sil) {
			this.silhouette_score(d3.round(sil, 3));
		},
		
		set_current_organisation: function(org) {
			this.current_organisation(org);
		},

		get_current_organisation: function() {
			return this.current_organisation();
		},
		
		
		set_organisation_clusters: function(org_list) {
			// console.log('START set_organisation_clusters');
			var cluster_ids = [], clusters = [], e, current_c_id, curr_org = this.current_organisation();
			org_list.forEach(function (e) {cluster_ids.push(e[3]);});
			for (var i = 0; i < (1 + d3.max(cluster_ids)); i++) {clusters.push([]);}
			for (i = 0; i < org_list.length; i++) {
				e = org_list[i];
				//console.log(org_list[i][0] + ' ------- ' + curr_org);
				if (curr_org == e[0]) {
					//console.log(e[0] + ' ------- ' + curr_org + '    ******* MATCH');
					current_c_id = e[3];
				}
				clusters[e[3]].push({"org": e[0], "year": e[1], "headcount": e[2], "cluster": e[3], "org_ac": e[4], "par_ac": e[5], "EEI": e[6]});
			};
			// set info for list of all clusters, the current cluster and the cluster id - the current cluster is slightly redundant. TODO - maybe remove later... 
			for (i = 0; i < clusters.length; i++) {this.organisation_clusters.push(clusters[i]);}
			if (curr_org == organisation_root) {
				this.current_cluster_id(-1);
				this.current_cluster([{"org": organisation_root, "year": this.current_year(), "headcount": -1, "cluster": -1, "org_ac": current_org, "par_ac": null, "EEI": 50}]);
			} else {
				this.current_cluster_id(current_c_id);
				this.current_cluster(clusters[current_c_id]);
			}
			// console.log('FINISH set_organisation_clusters');
		},
		
		
		find_cluster_id: function(new_org) {
			//console.log('START find_cluster_id');
			var cluster_id = -1, curr_org = this.current_organisation();
			org_list = this.organisation_clusters();
			
			outer_loop: {
				for (var i = 0; i < org_list.length; i++) {
					for (var j = 0; j < org_list[i].length; j++) {
						e = org_list[i][j];
						//console.log(e);
						//console.log(e.org + ' ------- ' + new_org);
						if (new_org == e.org) {
							cluster_id = e.cluster;
							break outer_loop;
						}
					}
				};
			}
			//console.log('FINISH find_cluster_id');
			return cluster_id;
		},
		
		
		update_current_cluster_ref: function(cluster_id) {
			// console.log('START update_cluster_id');
			// set info for list of all clusters, the current cluster and the cluster id
			if (cluster_id == -1) {
				this.current_cluster_id(-1);
				this.current_cluster([{"org": organisation_root, "year": this.current_year(), "headcount": -1, "cluster": -1, "org_ac": current_org, "par_ac": null, "EEI": 50}]);
				this.previous_cluster(this.current_cluster());
				this.previous_organisation(organisation_root);
			} else {
				this.previous_cluster(this.current_cluster());
				this.previous_organisation(this.current_organisation());// TODO - this is doomed to fail: by now, current_organisation has already changed!
				this.current_cluster_id(cluster_id);
				//console.log(this.organisation_clusters()[cluster_id]);
				this.current_cluster(this.organisation_clusters()[cluster_id]);
			}
			// console.log('FINISH update_cluster_id');
		},


		get_organisation_clusters: function() {
			return this.organisation_clusters();
		},
		
		
		get_current_year: function() {
			return this.current_year();
		},



		forcify: function(cluster_array, current_cluster, cluster_id, current_organisation) {
			var nodes = [{"name":current_organisation, "year":this.current_year(), "headcount":-1, "cluster":cluster_id, "org_ac":"X", "par_ac":"Z", "EEI":50}], links = [];
						
			var force_graph = {"nodes":nodes, "links":[]};

			// console.log("in forcify.........");
			
			// console.log(this.current_organisation());
			// console.log(current_organisation);
			// console.log(current_cluster);
			// console.log(cluster_array);
			// 	var clusters = [{"org": "ALL_CS", "year": '', "headcount": '', "cluster": '', "org_ac": '', "par_ac": '', "EEI": -1}], i = 0;
			// 	while (i < n_clusters) {
			// 		clusters.push({"org": i++, "year": '', "headcount": '', "cluster": "ALL_CS", "org_ac": '', "par_ac": '', "EEI": -1});
			// 	}
			// 	cluster_array.forEach(function (e) {
			// 		clusters.push({"org": e[0], "year": e[1], "headcount": e[2], "cluster": e[3], "org_ac": e[4], "par_ac": e[5], "EEI": e[6]});
			// 	});
		
		if (current_organisation != organisation_root) {
// 			force_graph.nodes.push({"name":"Civil Service","group":1,"EEI":0});
// 		} else {
			var i, j = 1;
			for (i = 0; i < current_cluster.length; i++) {
				if (current_cluster[i].org != current_organisation) {
					force_graph.nodes.push({"name":current_cluster[i].org, "year":current_cluster[i].year, "headcount":current_cluster[i].headcount, "cluster":current_cluster[i].cluster, "org_ac":current_cluster[i].org_ac, "par_ac":current_cluster[i].par_ac, "EEI":current_cluster[i].EEI});
					force_graph.links.push({"source":j++,"target":0,"value":1});
				} else {
					//console.log(force_graph);
					force_graph.nodes[0].headcount = current_cluster[i].headcount;
					force_graph.nodes[0].org_ac = current_cluster[i].org_ac;
					force_graph.nodes[0].par_ac = current_cluster[i].par_ac;
					force_graph.nodes[0].EEI = current_cluster[i].EEI;
				}
			}
			//console.log(force_graph);
			//force_graph = {"nodes":[{"name":"Civil Service 1","group":1,"EEI":55}], "links":[]}
			/*
			force_graph = {
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
					*/
				}
		
			//return {"nodes":[{"name":"Civil Service 1","group":1,"EEI":55}], "links":[]};
			return force_graph;

		},



		organisation_changed: function(obj, event) {
			var cluster_id;
			if (event.originalEvent) { //user changed
				console.log("in organisation_changed......");
				//console.log(this.current_organisation());
				//"Civil Service"
				// TODO - update the cluster directly here - shouldn't need to do it using this.get_data anymore...
				//this.get_data({title: '----', year: g_current_year, measure: '__void', organisation: this.current_organisation(), action: 'update', type: 'force', width: 1100, height: 600, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['#eee'], target: "#comparison_similar_orgs"});
				
				cluster_id = this.find_cluster_id(this.current_organisation());
				//console.log('new cluster_id = ' + cluster_id);

				this.update_current_cluster_ref(cluster_id);
				//console.log('new cluster => ');
				//console.log(this.current_cluster());
				//console.log(g_force_graph);
				var temp = this.forcify(this.organisation_clusters(), this.current_cluster(), cluster_id, this.current_organisation());
				//console.log(JSON.stringify(temp));// TODO - remove temp, set g_force_graph.data directly
				//console.log(g_force_graph);
				g_force_graph.data(temp);
				
				
				/*
				{
								"nodes":[
									{"name":"Charity Commission (after org change)","group":2,"EEI":53},
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
				*/
				
			} else { // program changed
				//console.log('organisation_changed **************************');
			}
		},
		
		
		set_n_clusters: function() {
			this.status_message('number of clusters = ' + this.num_clusters());
		},

		update_clusters: function() {
			console.log('**************************** update_clusters');
// 			var u_cluster_options = {n_clusters: parseInt(this.num_clusters())};
// 			if (this.visualisation_style_prev == this.visualisation_style()) {
// 				console.log('=====================');
// 			} else {
// 				console.log('xxxxxxxxxxxxxxxxxxxxx');
// 			}
			var c_yr = g_current_year;
			if (typeof(this.current_year()) != 'undefined') {
				c_yr = this.current_year();
			} else {
				console.log('bad current_year');
			}
			var nc = parseInt(this.num_clusters());
			if (this.cluster_count_prev() == nc) {
				console.log('same n_clusters');
				
			} else {
				console.log('diff n_clusters');
			}
				//console.log();
			console.log(this.cluster_count_prev() != nc );
			
			//engine: 'scikit-learn'
			this.get_clusters({	title: 'Clusters', year: c_yr, organisation: current_org, action: 'cluster', 
							algorithm: this.current_algorithm(), mode: 'update', engine: 'memoized', 
							cluster_options: {n_clusters: nc}, 
							feature_set: this.current_feature_set(), 
							visualisation_style: this.visualisation_style(), 
							animate: (this.visualisation_style_prev == this.visualisation_style()), 
							nc_changes: (this.cluster_count_prev() != nc)
							});
			this.cluster_count_prev(nc);
			this.visualisation_style_prev = this.visualisation_style();
			},
		

		update_survey_years: function() {
			d3.xhr("/xhr/")
				.header("X-Requested-With", "XMLHttpRequest")
				.post(JSON.stringify({action: 'survey_years'}), function (err, data) {
					var raw_data = JSON.parse(data.response);
					if ((raw_data.payload != null) || (raw_data.payload.length > 0)) {
						var year_arr = raw_data.payload.map(function(a) {return a.year;});
						console.log(year_arr);
					}
				}
			);
		},
		
		
		
		get_clusters: function(params) {
			var cluster_svg;
			var diameter = 300;
			var duration = 2000;
			var links, nodes;
			var vm = this;
			// console.log('current_cluster_id = ' + vm.current_cluster_id());
	
			d3.xhr("/xhr/")
				.header("X-Requested-With", "XMLHttpRequest")
				.post(JSON.stringify(params), function (error, data) {
					if (error) throw error;
						
			
					var raw_data, all_data = [], all_params = [], n_clusters;
					raw_data = JSON.parse(data.response);
					all_params.push(raw_data.search_params);
					
					// console.log(raw_data.payload);
					
					//viewModel.set_current_organisation("test");
					//viewModel.organisation_clusters.push(raw_data.payload);
					vm.set_organisation_clusters(raw_data.payload);
					// console.log(vm.get_current_organisation());
					// console.log('current_cluster_id = ' + vm.current_cluster_id());
					// console.log(vm.current_cluster());
					// console.log(vm.organisation_clusters());
			
					switch(raw_data.search_params.algorithm){
						case 'AffinityPropagation':
						case 'MeanShift':
							n_clusters = d3.max(raw_data.payload, function(d) {return d[3];});
							n_clusters -= d3.min(raw_data.payload, function(d) {return d[3];});
							n_clusters++;
							//console.log(n_clusters);
						break;
				
						case 'DBSCAN':
							if( d3.min(raw_data.payload, function(d) {return d[3];}) == -1) {
								raw_data.payload.forEach(function (e) {
									if (e[3] == -1) e[3] = 0;
								});
							}
							n_clusters = (d3.max(raw_data.payload, function(d) {return d[3];}));
							n_clusters++;
						break;
				
						default:
							n_clusters = raw_data.search_params.cluster_options.n_clusters;
						break;
					}
					if (raw_data.search_params.algorithm == 'AffinityPropagation' || raw_data.search_params.algorithm == 'MeanShift') {
						n_clusters = d3.max(raw_data.payload, function(d) {return d[3];});
						n_clusters -= d3.min(raw_data.payload, function(d) {return d[3];});
						n_clusters++;
						//console.log(n_clusters);
					} else {
						n_clusters = raw_data.search_params.cluster_options.n_clusters;
					}
					//var draw_mode = raw_data.search_params.mode;
					//var visualisation_style = 'dendrogram'; // dendrogram circle_packing
					
// 					var cluster_data = [];//objectify(raw_data.payload, n_clusters);
// 					
// 					var cluster_id = 2;
// 					raw_data.payload.forEach(function(org) {
// 						if (org[3] == cluster_id) cluster_data.push({"name":org[0],"group":org[3], "EEI":org[6]});
// 					});
// 					
// 					console.log(JSON.stringify(cluster_data));
					
					
					// root is the main data structure used in d3 hierarchical visualisations.
					// It reads in the data and converts it internally to a hierarchical structure.
					var root = d3_hierarchy.stratify()
						.id(function(d) { return  d.org; })
						.parentId(function(d) { return d.cluster; })
						(objectify(raw_data.payload, n_clusters));
			
					var min_eei = d3.min(raw_data.payload, function(d) {return d[6];}), max_eei = d3.max(raw_data.payload, function(d) {return d[6];});
			
			
					// user feedback
					vm.set_delivery_time(raw_data.search_params.respond_time - raw_data.search_params.arrival_time);
					vm.set_silhouette_score(raw_data.search_params.silhouette_score);
			
					switch(raw_data.search_params.visualisation_style){
						case 'circle_packing':
							// Circle Packing - see http://bl.ocks.org/mbostock/4063530
							var diameter = 1400,
								format = d3.format(",d");

							var pack = d3.layout.pack()
								.size([diameter - 4, diameter - 4])
								.value(function(d) { return 100;/*d.headcount*/; });
					
							if (typeof(raw_data.search_params.mode) == 'undefined' || raw_data.search_params.mode == '' || raw_data.search_params.mode == 'init' || raw_data.search_params.animate == false){
									cluster_svg = d3.select("#cluster_test").append("svg")
									.attr("width", diameter)
									.attr("height", diameter)
									.append("g")
									.attr("transform", "translate(2,2)");
							} else {
									var comp_div = d3.select("#cluster_test");
									comp_div.selectAll('svg').remove();
									cluster_svg = d3.select("#cluster_test").append("svg")
									.attr("width", diameter)
									.attr("height", diameter)
									.append("g")
									.attr("transform", "translate(2,2)");
							}
					
					
							// DATA JOIN
							// Join new data with old elements, if any.
							console.log(root);
							var node = cluster_svg.datum(root).selectAll(".node")
								.data(pack.nodes)
							.enter().append("g")
								//.attr("class", function(d) { return d.children ? "node" : "leaf node"; })
								.attr("fill", function(d) { return d.children ? "none" : "#eee"; })
								.attr("stroke", function(d) { return d.children ? "#000" : "none" ; })
								//.attr("fill", "#eee")
								//.attr("fill-opacity", 0.25)
								//.attr("stroke", "#000")
								.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

							node.append("title")
								.text(function(d) { return d.id + (d.children ? "" : ": " + format(d.size)); });

							node.append("circle")
								.attr("r", function(d) { return d.r; });

							node.filter(function(d) { return !d.children; }).append("text")
								.attr("dy", function(d, i) { return (i % 2 == 0) ? "0.5em" : "-0.5em"; })
								.style("text-anchor", "middle")
								.attr("fill", "#000")
								.text(function(d) { return d.id; });
						break;
				
				
				
				

				
				
						case 'dendrogram':
							// Cluster Dendrogram
							var cluster_width = 1200, cluster_height = 1000;

							var cluster = d3.layout.cluster()
									.size([cluster_height, cluster_width - 360])
									.sort(function (a, b) {
										return d3.descending(a.data.EEI, b.data.EEI);
									});

							var diagonal = d3.svg.diagonal()
									.projection(function(d) { return [d.y, d.x]; });
					
							if (typeof(raw_data.search_params.mode) == 'undefined' || raw_data.search_params.mode == '' || raw_data.search_params.mode == 'init'){
								//console.log('initialising svg');

								//ENTER
								cluster_svg = d3.select("#cluster_test").append("svg")
								.attr("width", cluster_width)
								.attr("height", cluster_height)
								.append("g")
								.attr("transform", "translate(60,0)");
					
								nodes = cluster.nodes(root);
								links = cluster.links(nodes);

								dendro_link = cluster_svg.selectAll(".link")
										.data(links)
									.enter()
										.append("path")
										.attr("class", "link")
										.style("stroke", "#ccc")
										.attr("d", diagonal);

								dendro_node = cluster_svg.selectAll(".node")
										.data(nodes)
									.enter()
										.append("g")
										.attr("class", "node")
										.attr("transform", function (d) {
											return "translate(" + d.y + "," + d.x + ")";
										});

								dendro_node.append("circle")
									.attr("r", 4.5)
									.style("fill", function (d) {
											//console.log(d.data.EEI);
											return get_m_colour(d.data.EEI, min_eei, max_eei, 0);
											//return "#e41a1c";
										});
							
								dendro_node.append("text")
									.attr("dx", function(d) { return d.children ? -8 : 8; })
									.attr("dy", 3)
									.style("text-anchor", function(d) { return d.children ? "end" : "start"; })
									.text(function(d) { return d.id; });
					
							} else {
					
								//UPDATE
								if(raw_data.search_params.nc_changes == true){
									var cluster_div = d3.select("#cluster_test");
									cluster_svg = cluster_div.select("svg");
									cluster_svg.transition().duration(duration)
										.attr("transform", "translate(60,0)");

								} else {
									var cluster_div = d3.select("#cluster_test");
									cluster_svg = cluster_div.select("svg");
									cluster_svg.transition().duration(duration)
										.attr("transform", "translate(60,0)");
								}
					
								nodes = cluster.nodes(root);
								links = cluster.links(nodes);

								dendro_link = cluster_svg.selectAll(".link")
									.data(links)
									.transition()
									.duration(duration)
									.style("stroke", "#ccc")
									.attr("d", diagonal); //get the new cluster path

								dendro_node = cluster_svg.selectAll(".node");
						
								dendro_node.data(nodes)
									.transition()
									.duration(duration)
									.attr("transform", function (d) {
										return "translate(" + d.y + "," + d.x + ")";
									});
	
								dendro_node.select("circle")
									.transition()
									.duration(duration)
									.style("fill", function (d) {
											return get_m_colour(d.data.EEI, min_eei, max_eei, 0);
										});
						
								dendro_node.select("text")
									.attr("dx", function(d) { return d.children ? -8 : 8; })
									.attr("dy", 3)
									.style("text-anchor", function(d) { return d.children ? "end" : "start"; })
									.text(function(d) { return d.id; });
							}
					
					
						break;
				
				
				
				
				
				
				
						default:

							var lots_of_dots = cluster_svg.append("g").attr("id", "lots_of_dots");
	
							// DATA JOIN
							// Join new data with old elements, if any. .dotty
							var dots = lots_of_dots.selectAll("circle")
								.data(raw_data.payload);

							// UPDATE
							// Update old elements as needed.
							dots
								.transition()
									.duration(750)
									.attr("r", "15")
									.attr("cx", function(d, i) {return i * 12; })
									.attr("cy", function(d, i) {console.log(i); return Math.log(d[2]) * Math.log(d[2]) * 4 * d[3]; })

							// ENTER
							// Create new elements as needed.
							dots.enter().append("circle")
									.attr("r", "5")
									.attr("cx", function(d, i) {return i * 12; })
									.attr("cy", function(d, i) {console.log(d); return Math.log(d[2]) * Math.log(d[2]) * 4 * d[3]; })
									.attr("fill", "#f00")
									.style("fill-opacity", 1)
								.transition()
									.duration(750)
									.attr("fill", "#7f0")
									.style("fill-opacity", 0.5);

							dots.exit().remove();

						break;
					}
			
				});
		},




		
		
		
		
		
		// TODO - think about how to update - shouldn't need to rebuild as here, can now update the data...
		update: ko.computed(function() {
			var params = {
				title: 'Themes', year: g_current_year, measure: ['EEI', 'MW', 'OP', 'LM', 'MT', 'LD', 'IF', 'RW', 'PB', 'LC'], organisation: self.current_organisation, action: 'engagement_drivers', type: 'slopegraph', columns: 3,	x_axis: 0, y_axis: 0, value: 'score', target: "#engagement_drivers"
			};
			}, this),
		

		
		get_data: function(params) {
			if (params.measure != '__void') {
				d3.xhr("/xhr/")
					.header("X-Requested-With", "XMLHttpRequest")
					.post(JSON.stringify(params), process_data);// TODO - consider bringing external functions like process_data within viewModel???
			} else {
				//test case
				this.set_data(params, []);
// 				var thing = multichart(params).data([]);
// 				d3.select(params.target)
// 					.call(thing);
				
			}
		},
		
		set_data: function(params, data_to_set) {
			var thing = multichart(params).data(data_to_set);
			
			if (params.type == 'force') {
				// console.log(params.title);
				// console.log(data_to_set);
				g_force_graph = thing;
			}
					
			d3.select(params.target)
				.call(thing);
		},
				

		init: function () {
			// console.log(this.current_organisation());
			

// 			feature_set: questions | themes
// 			visualisation_style: circle_packing | dendrogram
// 			'KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'DBSCAN', 'Birch'
// 			var cluster_options = {n_clusters: this.num_clusters()};

			var c_yr = g_current_year;
			if (typeof(this.current_year()) != 'undefined') {
				c_yr = this.current_year();
			} else {
				//console.log('bad current_year');
			}
			
			//engine: 'scikit-learn'
			this.get_clusters({	title: 'Clusters', year: c_yr, organisation: current_org, action: 'cluster', 
							algorithm: this.current_algorithm(), mode: 'init', engine: 'memoized', 
							cluster_options: {n_clusters: parseInt(this.num_clusters())}, 
							feature_set: this.current_feature_set(), 
							visualisation_style: this.visualisation_style(),
							animate: false,
							nc_changes: false });
			
			var graph_options;
			
			
			this.get_data({title: 'Bullying & Harassment', year: g_current_year, measure: ['E01', 'E02'], organisation: current_org, action: 'bullying', type: 'histogram', colours: ['mediumvioletred', 'purple', 'cornflowerblue', 'orange', 'royalblue', 'magenta', 'limegreen', 'slategray', 'goldenrod', 'mediumaquamarine', 'palevioletred'], bg_colour: '#fff', width: 280, height: 280, columns: 3, x_axis: 0, y_axis: 0, value: 'score', target: "#bullying_harassment_chart", max_value: 40});
			this.get_data({title: 'Discrimination', year: g_current_year, measure: ['E03', 'E04'], organisation: current_org, action: 'discrimination', type: 'histogram', width: 280, height: 280, columns: 3, x_axis: 0, y_axis: 0, value: 'score', colours: ['cornflowerblue'], target: "#discrimination_chart", max_value: 40});
			this.get_data({title: 'Wellbeing', year: g_current_year, measure: ['W01', 'W02', 'W03', 'W04'], organisation: current_org, action: 'wellbeing', type: 'histogram', width: 280, height: 280, columns: 3, x_axis: 0, y_axis: 0, value: 'score', colours: ['cornflowerblue'], target: "#wellbeing_chart", max_value: 80});

			this.get_data({title: 'Explore demographics', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', width: 280, height: 200, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['cornflowerblue'], target: "#explore_demographics"});
			this.get_data({title: 'Gender', year: g_current_year, measure: 'Sex [J01]', organisation: '', action: 'demographic_summary', type: 'scatter', width: 140, height: 200, x_axis: 0, y_axis: 1, value: 'demographic_total', demographics: ['Male', 'Female'], colours: ['blue', 'red'], target: "#demographics_overview_gender"});
			this.get_data({title: 'Ethnicity', year: g_current_year, measure: 'Ethnicity - major group [J03]', organisation: '', action: 'demographic_summary', type: 'scatter', width: 140, height: 200, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['Black', 'Asian', 'Mixed', 'Other ethnic group'], colours: ['cornflowerblue', 'goldenrod', 'limegreen', 'royalblue', 'magenta'], target: "#demographics_overview_ethnicity"});
			this.get_data({title: 'Sexuality', year: g_current_year, measure: 'Sexual identity [J07]', organisation: '', action: 'demographic_summary', type: 'scatter', width: 140, height: 200, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['Gay, lesbian or bisexual', 'Other'], colours: ['slategray', 'mediumvioletred', 'purple'], target: "#demographics_overview_sexuality"});

			// Overview graphs (done individually - no need to moderate values)
			this.get_data({title: 'Themes', year: g_current_year, measure: ['EEI', 'MW', 'OP', 'LM', 'MT', 'LD', 'IF', 'RW', 'PB', 'LC'], organisation: current_org, action: 'engagement_drivers', type: 'slopegraph', width: 280, height: 200, columns: 3,	x_axis: 0, y_axis: 0, value: 'score', target: "#engagement_drivers"});
			this.get_data({title: 'Headcount change over time', year: g_current_year, measure: '', organisation: 'ALL', action: 'headcount_change', post_action: 'normalize', type: 'time', width: 280, height: 200, columns: 3, x_axis: 0, y_axis: 0, value: 'headcount_delta', target: "#headcount_change_chart"});

			// Comparison graphs
			this.get_data({title: 'EEI over time', year: g_current_year, measure: ['EEI'], organisation: current_org, action: 'comparison_self_time', type: 'time', columns: 3, x_axis: 0, y_axis: 0, value: 'score', colours: ['cornflowerblue'], target: "#comparison_self_time_EEI", max_value: 100});
			this.get_data({title: 'Themes over time', year: g_current_year, measure: ['MW', 'OP', 'LM', 'MT', 'LD', 'IF', 'RW', 'PB', 'LC'], organisation: current_org, action: 'comparison_self_time', type: 'time', colours: ['mediumvioletred', 'purple', 'cornflowerblue', 'orange', 'royalblue', 'magenta', 'limegreen', 'slategray', 'goldenrod', 'mediumaquamarine', 'palevioletred'], columns: 3, x_axis: 0, y_axis: 0, value: 'score', target: "#comparison_self_time_themes", max_value: 100});
			this.get_data({title: 'Response rate over time', year: g_current_year, measure: ['RR'], organisation: current_org, action: 'comparison_self_time', type: 'time', columns: 3, x_axis: 0, y_axis: 0, value: 'score', colours: ['palevioletred'], target: "#comparison_self_time_demographics", max_value: 100});

			
			var similar_orgs_graph = this.forcify(this.organisation_clusters(), this.current_cluster(), this.current_cluster_id(), organisation_root);
			// var similar_orgs_graph = {"nodes":[{"name":"Civil Service","group":1,"EEI":55}],"links":[]};
			// console.log(similar_orgs_graph);
			this.set_data({title: 'comparison against similar organisations', year: g_current_year, measure: 'similar', organisation: current_org, action: 'comparison_similar_orgs', type: 'force', width: 1100, height: 600, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['#eee'], target: "#comparison_similar_orgs"}, similar_orgs_graph);

			// profile graphs
			this.get_data({title: 'Themes', year: g_current_year, measure: ['EEI', 'MW', 'OP', 'LM', 'MT', 'LD', 'IF', 'RW', 'PB', 'LC'], organisation: current_org, action: 'engagement_drivers', type: 'slope_and_target', width: 800, height: 600, columns: 10,	x_axis: 0, y_axis: 0, value: 'score', target: "#engagement_drivers_detail"});

			//this.get_data({title: 'Discrimination etc.', year: g_current_year, measure: '', organisation: current_org, action: 'sentiment', type: 'multi_bar', split: ['E01', 'E02', 'E03', 'E04', 'W01'], columns: 6,	x_axis: 0, y_axis: 0, value: 'score', target: "#sentiment_chart"});





			// Demographics graphs

			// row 1, summary data
			graph_options = [	
				{title: 'Gender', year: g_current_year, measure: 'Sex [J01]', organisation: '', action: 'demographic_summary', type: 'scatter', columns: 2, x_axis: 0, y_axis: 1, value: 'demographic_total', demographics: ['Male', 'Female'], colours: ['blue', 'red'], target: "#demographics_charts_01"},
				{title: 'Ethnicity', year: g_current_year, measure: 'Ethnicity - major group [J03]', organisation: '', action: 'demographic_summary', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['White', 'Black', 'Asian', 'Mixed', 'Other ethnic group'], colours: ['cornflowerblue', 'goldenrod', 'limegreen', 'royalblue', 'magenta'], target: "#demographics_charts_02"},
				{title: 'Sexuality', year: g_current_year, measure: 'Sexual identity [J07]', organisation: '', action: 'demographic_summary', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['Heterosexual/straight', 'Gay, lesbian or bisexual', 'Other'], colours: ['slategray', 'mediumvioletred', 'purple'], target: "#demographics_charts_03"},
				{title: 'Health', year: g_current_year, measure: 'Long-term health [J04]', organisation: '', action: 'demographic_summary', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['No long-term limiting illness or condition', 'Long-term limiting illness or condition'], colours: ['mediumaquamarine', 'palevioletred'], target: "#demographics_charts_04"}
			];
			get_graph_data_async(graph_options);

			// row 2, by grade
			graph_options = [
				{title: 'Grade/gender', year: g_current_year, measure: 'Grade', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 1, value: 'demographic_total', demographics: ['male', 'female'], colours: ['blue', 'red'], colours: ['blue', 'red'], target: "#demographics_charts_06"},
				{title: 'Grade/ethnicity', year: g_current_year, measure: 'Grade', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['white', 'bme'], colours: ['cornflowerblue', 'goldenrod'], target: "#demographics_charts_07"},
				{title: 'Grade/sexuality', year: g_current_year, measure: 'Grade', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['heterosexual', 'LGB'], colours: ['slategray', 'mediumvioletred'], target: "#demographics_charts_08"},
				{title: 'Grade/health', year: g_current_year, measure: 'Grade', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['noLTLI', 'LTLI'], colours: ['mediumaquamarine', 'palevioletred'], target: "#demographics_charts_09"},
				{title: 'Grade', year: g_current_year, measure: 'Grade', organisation: '', action: 'demographics_by_total', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', target: "#demographics_charts_10"}
			];
			get_graph_data_async(graph_options);

			// row 3, by age
			graph_options = [
				{title: 'Age/gender', year: g_current_year, measure: 'Age [J02]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 1, value: 'demographic_total', demographics: ['male', 'female'], colours: ['blue', 'red'], target: "#demographics_charts_11"},
				{title: 'Age/ethnicity', year: g_current_year, measure: 'Age [J02]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['white', 'bme'], colours: ['cornflowerblue', 'goldenrod'], target: "#demographics_charts_12"},
				{title: 'Age/sexuality', year: g_current_year, measure: 'Age [J02]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['heterosexual', 'LGB'], colours: ['slategray', 'mediumvioletred'], target: "#demographics_charts_13"},
				{title: 'Age/health', year: g_current_year, measure: 'Age [J02]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['noLTLI', 'LTLI'], colours: ['mediumaquamarine', 'palevioletred'], target: "#demographics_charts_14"},
				{title: 'Age', year: g_current_year, measure: 'Age [J02]', organisation: '', action: 'demographics_by_total', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', target: "#demographics_charts_15"}
			];
			get_graph_data_async(graph_options);

			// row 4, by caring status
			graph_options = [
				{title: 'Caring/gender', year: g_current_year, measure: ['Caring status [J05]', 'Childcare status [J06]'], organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 1, value: 'demographic_total', demographics: ['male', 'female'], colours: ['blue', 'red'], target: "#demographics_charts_16"},
				{title: 'Caring/ethnicity', year: g_current_year, measure: ['Caring status [J05]', 'Childcare status [J06]'], organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['white', 'bme'], colours: ['cornflowerblue', 'goldenrod'], target: "#demographics_charts_17"},
				{title: 'Caring/sexuality', year: g_current_year, measure: ['Caring status [J05]', 'Childcare status [J06]'], organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['heterosexual', 'LGB'], colours: ['slategray', 'mediumvioletred'], target: "#demographics_charts_18"},
				{title: 'Caring/health', year: g_current_year, measure: ['Caring status [J05]', 'Childcare status [J06]'], organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['noLTLI', 'LTLI'], colours: ['mediumaquamarine', 'palevioletred'], target: "#demographics_charts_19"},
				{title: 'Caring', year: g_current_year, measure: ['Caring status [J05]', 'Childcare status [J06]'], organisation: '', action: 'demographics_by_total', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', target: "#demographics_charts_20"}
			];
			get_graph_data_async(graph_options);

			// row 5, by Religious identity
			graph_options = [
				{title: 'Religion/gender', year: g_current_year, measure: 'Religious identity [J08]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 1, value: 'demographic_total', demographics: ['male', 'female'], colours: ['blue', 'red'], target: "#demographics_charts_21"},
				{title: 'Religion/ethnicity', year: g_current_year, measure: 'Religious identity [J08]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['white', 'bme'], colours: ['cornflowerblue', 'goldenrod'], target: "#demographics_charts_22"},
				{title: 'Religion/sexuality', year: g_current_year, measure: 'Religious identity [J08]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['heterosexual', 'LGB'], colours: ['slategray', 'mediumvioletred'], target: "#demographics_charts_23"},
				{title: 'Religion/health', year: g_current_year, measure: 'Religious identity [J08]', organisation: '', action: 'demographics', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', demographics: ['noLTLI', 'LTLI'], colours: ['mediumaquamarine', 'palevioletred'], target: "#demographics_charts_24"},
				{title: 'Religion', year: g_current_year, measure: 'Religious identity [J08]', organisation: '', action: 'demographics_by_total', type: 'scatter', columns: 2, x_axis: 0, y_axis: 0, value: 'demographic_total', target: "#demographics_charts_25"}
			];
			get_graph_data_async(graph_options);
			
			
		
		}
	};
 
	// get knockout working, call d3.xhr to populate survey_years and organisations, and then call init function to get data
	ko.applyBindings(viewModel);

	ko.bindingHandlers.changeSelectValue = {

		init: function(element,valueAccessor){
			$(element).change(function(){
				var value = $(element).val();
				if($(element).is(":focus")){
					console.log('changeSelectValue ******************************');
					//Do whatever you want with the new value
				}
			});
		}

	};

	
	
	d3.xhr("/xhr/")
		.header("X-Requested-With", "XMLHttpRequest")
		.post(JSON.stringify({action: 'survey_years'}), function (err, data) {
			if (err == null) {
				if (typeof(data) != 'undefined') {
					var raw_data = JSON.parse(data.response);
					if ((raw_data.payload != null) || (raw_data.payload.length > 0)) {
						var year_arr = raw_data.payload.map(function(a) {return a.year;});
						viewModel.survey_years(year_arr);
						viewModel.current_year(g_current_year);
				
					}
				}
			} else {
				console.log(err);
			}
		});
	

// Attempt at getting multiple values into select - doesn't work
	
	// for jade template:
	// select(class="form-control" id="org_sel" data-bind="options: organisations, optionsValue: 'organisation_acronym', optionsText: 'organisation_full_name', value: current_organisation")										
	//										select(class="form-control" id="org_sel" data-bind="options: organisations, value: current_organisation")


	
	// Constructor for an object with two properties
    var Organisation = function(acronym, organisation) {
        this.organisation_acronym = acronym;
        this.organisation_full_name = organisation;
    };
	
	d3.xhr("/xhr/")
		.header("X-Requested-With", "XMLHttpRequest")
		.post(JSON.stringify({year: g_current_year, action: 'organisation_list', full_names: true}), function (err, data) {
			if (err == null) {
				if (typeof(data) != 'undefined') {
					var raw_data = JSON.parse(data.response);
					if ((raw_data.payload != null) || (raw_data.payload.length > 0)) {
						//var org_arr = raw_data.payload.map(function(a) {return new Organisation(a.acronym, a.organisation);});
						var org_arr = raw_data.payload.map(function(a) {return a.organisation;});
						viewModel.organisations(org_arr);
						viewModel.current_organisation(organisation_root);
					}
			
				}
			} else {
				console.log(err);
			}
		});
	
	
// 	viewModel.update_survey_years();
// 	viewModel.update_organisations();
	viewModel.init();
	

// end jQuery ready handler
});




var margin = {top: 140, right: 40, bottom: 120, left: 70},
	width = 8,
	height = 200,
	chart_sep = 120,
	horiz_sep = 60,
	day_width = width,
	day_chart_width = 7 * width,
	num_charts = 2,
	num_months = 3,
	total_height = num_charts * (height + chart_sep);//for container containing all charts

var chart_x, ga_chart_params, pubs_chart, show_statistics = true, show_ga = true, show_mc = true;


function get_date_months_ago(n) {
	return moment().subtract(n, 'months').startOf('month').format('YYYY-MM-DD');
}

var today = moment().format('YYYY-MM-DD');

var search_params = {	action: 'ga', 
						start_date: get_date_months_ago(num_months), 
						end_date: today,
						start_time: "00:00:00", 
						end_time: "23:59:59",
						rolling_avg_days: 14,
						organisation: '',
						position: 0,
						top: 0,
						left: 0
					};

var timespan = moment(search_params.end_date).diff(moment(search_params.start_date), 'days');


// goes through array of objects and splits this into array of arrays of objects by grouping on the values in a given fieldname
function split_by(arr, fieldname) {
	var out = [], temp = [], current_item = arr[0][fieldname];
	arr.forEach(function (e, i) {
		if (current_item == e[fieldname]) {
			temp.push(e);
		} else {
			out.push(temp);
			temp = [e];
			current_item = e[fieldname];
		}
	});
	out.push(temp);//need to make sure last element isn't missed! 
	return out;
}




function get_cluster_members(core) {
	// core becomes target:0
	return {
		"nodes":[
			{"name":core,"group":1, "EEI":65},
			{"name":"Org 10","group":1, "EEI":50},
			{"name":"Org 11","group":1, "EEI":56},
			{"name":"Org 12","group":1, "EEI":68},
			{"name":"Org 13","group":2, "EEI":74},
			{"name":"Org 14","group":2, "EEI":47},
			{"name":"Org 15","group":2, "EEI":51},
			{"name":"Org 16","group":2, "EEI":56},
			{"name":"Org 17","group":3, "EEI":71},
			{"name":"Org 18","group":3, "EEI":45}
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
			{"source":9,"target":0,"value":1}
		]
	}
}



// TODO - look at http://motioninsocial.com/tufte/ for ideas on API etc

function multichart(params) {

	// All options that should be accessible to caller
	var grid_columns = 12, grid_margin = 40, width, height;
	
	if (typeof (params.width) == 'undefined') {
		width = ((params.columns * screen.width) - ((grid_columns - 1) * grid_margin))/grid_columns; // default width
	} else { width = params.width; }
	
	if (typeof (params.height) == 'undefined') {
		height = width * 1.41; // default height
	} else { height = params.height; }
	
	
	var colours, bg_colour;
	if (typeof (params.colours) == 'undefined') {
		colours = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'brown', '#999'];
	} else {colours = params.colours;}
	
	if (typeof (params.bg_colour) == 'undefined') { bg_colour = '#fff';
	} else { bg_colour = params.bg_colour;}

	
	var title_zone_h = 20, 
		x_axis_zone_h = 20, 
		y_axis_zone_h = 30, 
		y_axis_zone_w = 45, 
		y_data_padding = 12,
		category_text_h,
		data_height,
		datapoint_offset_x = 4,
		padding = {top: 6, left: 6, bottom: 6, right: 20},category_text_h = 0,
		data_width = width - y_axis_zone_w - padding.left - padding.right;
	
	if ((params.type == 'scatter') || (params.type == 'histogram')) {
		category_text_h = Math.floor(height - width);
		data_height = height - x_axis_zone_h - padding.top - title_zone_h - y_data_padding - padding.bottom - category_text_h;
		if (params.type == 'histogram') {data_height -= 25;} //TODO - this is a hack
	} else {
		category_text_h = 0;
		data_height = height - x_axis_zone_h + padding.top - title_zone_h - y_data_padding + 3;//fudge-factor includes thickness of x-axis line etc.
	}
	
	
	var centroid = {x: (y_axis_zone_w - padding.left + data_width/2), 
					y: (title_zone_h + x_axis_zone_h + y_data_padding - padding.top + data_height/2)}
	
	
	var color = d3.scale.category20();
	
	
	var barPadding = 1;
	var fillColor = 'black';
	var data = [];

	var updateWidth;
	var updateHeight;
	var updateFillColor;
	var updateData;




			
			
	/////////////////////++++++++++++++++++++++++++++++++++++++++++++/////////////////////
	/////////////////////                    chart                   /////////////////////
	/////////////////////++++++++++++++++++++++++++++++++++++++++++++/////////////////////
	
	
	
	function chart(selection){
		selection.each(function (input_data) {
			if (typeof(input_data) != 'undefined') data = input_data;
			var barSpacing = height / data.length;
			var barHeight = barSpacing - barPadding;
			var maxValue, minValue, scores;
			
			if ((typeof (params.data_type) == 'undefined') || (params.data_type == 'complex')) {
				
				if ((typeof (params.max_value) == 'undefined') || (params.max_value == 0)) {
					// extract just the scores -- the useful stuff...
					scores = [];
					
					// horrible kludge TODO - fix this... (and below)
					if (params.type != 'force') {
						data.forEach(function(e, i){scores.push(e[params.value]);});
						maxValue = d3.max(scores);
					} else {
						maxValue = d3.max(data);
					}
					
				} else {
					maxValue = params.max_value
				}
				
			} else {
				maxValue = d3.max(data);// this is OK for simple data
			}

			
			if ((typeof (params.min_value) == 'undefined') || (params.min_value == 0)) {
				if (params.type != 'force') {
					var scores = [];
					data.forEach(function(e, i){scores.push(e[params.value]);});
					minValue = d3.min(scores);
				} else {
					minValue = d3.min(data);
				}
				if (minValue > 0) {minValue = 0}//minValue shouldn't stop the range being zero-based, unless it is less than zero, of course
			} else {
				minValue = params.min_value
			}


			var widthScale = width / maxValue;
			var force, cluster_force_nodes, cluster_force_links;
			var node, link;
			
			
			
			
			
			
			//////////////////////////////////////////////////////////////////////////////
			//////////////////////////////////// SVG /////////////////////////////////////
			//////////////////////////////////////////////////////////////////////////////


			var dom = d3.select(this);
			var chart_svg = dom.append('svg')
				.attr('id', 'chart_' + Math.floor(Math.random() * 10000))
				.attr('height', height)
				.attr('width', width)
				.style('fill', fillColor);
				
			var chart_group = chart_svg.append("g")
				.attr("id", "chart_group")
				.attr("transform", "translate(" + padding.left + "," + padding.top + ")");








			//////////////////////////////////////////////////////////////////////////////
			///////////////////////// AUXILLARY DRAWING ELEMENTS /////////////////////////
			//////////////////////////////////////////////////////////////////////////////


			function ticky() {
				link.selectAll("line")
					.attr("x1", function(d) {return d.source.x; })
					.attr("y1", function(d) { return d.source.y; })
					.attr("x2", function(d) { return d.target.x; })
					.attr("y2", function(d) { return d.target.y; });
				node.attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"; });
			}
			
			
						
			// set up scales
			// TODO should these both have the same domain?
			var x_data_scale = d3.scale.linear()
				.domain([minValue, maxValue])
				.range([0, data_width]);

			var y_data_scale = d3.scale.linear()
				.domain([minValue, maxValue])
				.rangeRound([data_height, 0]);

	
			
			var numberFormatter = d3.format(".0f");
			
			function fix_axis_numbers (d) {
				var denom = 1; var sufx = ''; 
					if (d >= 1000) {denom = 1000; sufx = 'k';}
					if (d >= 1000000) {denom = 1000000; sufx = 'm';}
					return numberFormatter(d/denom) + sufx;
				}
			
			var xAxis = d3.svg.axis()
				.scale(x_data_scale)
				.orient("bottom")
				.outerTickSize(1)
				.tickPadding(2)
				.tickFormat(function(d) {return fix_axis_numbers(d)})
				.ticks(5);

			var yAxis = d3.svg.axis()
				.scale(y_data_scale)
				.orient("left")
				.outerTickSize(1)
				.tickPadding(2)
				.tickFormat(function(d) {return fix_axis_numbers(d)})
				.ticks(5);
	
				
			
			



			//////////////////////////////////////////////////////////////////////////////
			//////////////////////// ENTER - main drawing process ////////////////////////
			//////////////////////////////////////////////////////////////////////////////

			
			switch (params.type) {
			
				case 'bars':
				
					//var bars = chart_svg.selectAll('rect.display-bar')
					
					chart_group.append("g")
						.attr("id", "data_region")
					.selectAll('rect')
						.data(data)
						.enter()
						.append('rect')
						.attr('class', 'display-bar')
						.attr('y', function (d, i) { return i * barSpacing;  })
						.attr('height', barHeight)
						.attr('x', 0)
						.attr('width', function (d) { return d * widthScale; });
				break;
				
				
				
				
				
				case 'bar':
				
					// add x-axis
					chart_group.append("g")
						.attr("id", "x-axis")
						.attr("transform", "translate(0," + title_zone_h + ")")
						.call(xAxis);
				
					var barPadding = 10,
						fillColor = colours[Math.floor(Math.random() * colours.length)];//'#999';//
					var barSpacing = data_height / data.length;
					var barHeight = d3.max([(barSpacing - barPadding), 1]);
					var widthScale = data_width / maxValue;
				
					chart_group.append("g")
						.attr("id", "data_region")
					.selectAll('rect')
						.data(data)
							.enter()
						.append('rect')
						.attr('y', function (dy, i) { return Math.abs(i * barSpacing) + title_zone_h + x_axis_zone_h})
						.attr('height', barHeight)
						.attr('x', 0)
						.attr('width', function (dw, i) { return dw[params.value] * widthScale})
						.style('fill', fillColor);
				
				break;
				
				
				
				
				
				
				
				
				case 'multi_bar':
				
					// {"organisation":"CS","measure":"E01","score":11}
					// params.split
					// console.log(params.split);
					
					// add x-axis
					chart_group.append("g")
						.attr("id", "x-axis")
						.attr("transform", "translate(0," + title_zone_h + ")")
						.call(xAxis);
				
					var barPadding = 10,
						fillColor = '#933';//colours[Math.floor(Math.random() * colours.length)];
					var barSpacing = data_height / data.length;
					var barHeight = d3.max([(barSpacing - barPadding), 1]);
					var widthScale = data_width / maxValue;
				
					chart_group.append("g")
						.attr("id", "data_region")
					.selectAll('rect')
						.data(data)
							.enter()
						.append('rect')
						.attr('y', function (dy, i) { return Math.abs(i * barSpacing) + title_zone_h + x_axis_zone_h})
						.attr('height', barHeight)
						.attr('x', 0)
						.attr('width', function (dw, i) { return dw[params.value] * widthScale})
						.style('fill', function (df, i) { 
							df.measure
							
						return '#933'});
				
				break;
				
				
				
				
				
				
				
				case 'force':
					cluster_force_nodes_bk = cluster_force_nodes;
					cluster_force_links_bk = cluster_force_links;
					cluster_force_nodes = data.nodes;
					cluster_force_links = data.links;
					
					force = d3.layout.force()
						.size([width, height])
						.nodes(cluster_force_nodes)
						.links(cluster_force_links)
						.charge(-1200)
						.linkDistance(220)
						.on("tick", ticky);
						
					force.start();

					link = chart_group.selectAll(".link")
							.data(cluster_force_links)
						.enter().append("g")
							.attr("class", "link");
					
					link.append("line")
						.attr("stroke", "#999")
						.attr("stroke-opacity", ".6")
						.style("stroke-width", function(d) { return Math.sqrt(d.value); });

					node = chart_group.selectAll(".node")
							.data(cluster_force_nodes)
						.enter().append("g")
							.attr("class", "node")
							.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
						.call(force.drag);

					node.append("circle")
						.attr("stroke", "#fff")
						.attr("stroke-width", "1.5px")
						.attr("r", 15)
						.style("fill", function(d) { return get_m_colour(d.EEI, 25, 90, 0); });

					node.append("text")
						.attr("dy", ".35em")
						.attr("dx", "16px")
						.attr("text-anchor", "middle")
						.attr("style", "font-size: 1.1em; font-family: Lato; text-anchor: start")
						.text(function(d) { return d.name; });
							
				break;
				
				
				
				
			
				case 'placeholder':
				
					chart_group.append("g")
						.attr("id", "background")
						.append('rect')
							.attr('x', 0)
							.attr('y', 0)
							.attr('width', width)
							.attr('height', height)
							.style('fill', colours[Math.floor(Math.random() * colours.length)]);
					

					chart_group.append('line')
							.attr("id", "line_test1")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", title_zone_h).attr("y2", title_zone_h)
							.attr("stroke-width", 2).attr("stroke", "pink");
				
					
					chart_group.append('line')
							.attr("id", "line_test2")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", title_zone_h + y_data_padding).attr("y2", title_zone_h + y_data_padding)
							.attr("stroke-width", 2).attr("stroke", "purple");
				
				
					// when subtracting from height, or from width, remember that entire chart_group has been shifted down and to right
					chart_group.append('line')
							.attr("id", "line_test3")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", height - padding.bottom - padding.top).attr("y2", height - padding.bottom - padding.top)
							.attr("stroke-width", 2).attr("stroke", "orange");
				
					
					chart_group.append('line')
							.attr("id", "line_test4")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", height - x_axis_zone_h - padding.bottom - padding.top).attr("y2", height - x_axis_zone_h - padding.bottom - padding.top)
							.attr("stroke-width", 2).attr("stroke", "red");
				
					chart_group.append('line')
							.attr("id", "line_test5")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w )
							.attr("y1", 0).attr("y2", height)
							.attr("stroke-width", 2).attr("stroke", "blue");
					
					chart_group.append('line')
							.attr("id", "line_test6")
							.attr("x1", width - padding.left - padding.right).attr("x2", width - padding.left - padding.right)
							.attr("y1", 0).attr("y2", height)
							.attr("stroke-width", 2).attr("stroke", "green");
					
				break;
				
				
				
				
				
				
				case 'slopegraph':

					// http://skedasis.com/d3/slopegraph/
				
				
					var barPadding = 10,
						fillColor = colours[Math.floor(Math.random() * colours.length)];//'#999';//
					var barSpacing = data_height / data.length;
					var barHeight = d3.max([(barSpacing - barPadding), 1]);
					var widthScale = data_width / maxValue;
					
					// these are copied from time-series TODO - rationalise scales (and other variables)
					var x = d3.scale.linear()
						.range([0, data_width])
						.domain(d3.extent(data, function (d) { return d.year; }));					
					
					var y = d3.scale.linear()
						.range([data_height, 0])
						.domain(d3.extent([0, 100]));

					var m_years = [];
					

					var lines;
					if (params.measure.length > 1) {
						lines = split_by(data, 'measure');
					} else {
						lines = [data];
					}
					
					//just cheat here and use first element of lines as typical example to get dates from
					lines[0].forEach(function(em){
						m_years.push(em.year);
					});
					
					
									
					chart_group.append("g")
						.attr("id", "background")
						.append('rect')
							.attr('x', 0)
							.attr('y', 0)
							.attr('width', width)
							.attr('height', height)
							.style('fill', '#e9f4fe');//colours[Math.floor(Math.random() * colours.length)]);
					
					
					
					// add x axis labels
					chart_group.append("g")
						.attr("id", "year_labels")
						.selectAll('text')
							.data(m_years)
								.enter()
							.append("text")
								.attr("x", function (d) { return x(d) + y_axis_zone_w - 10})
								.attr("y", function (d) { return data_height - title_zone_h	+ y_data_padding + padding.top;})
								.attr("dy", (title_zone_h - 3) + "px")
								.attr("style", "font-size: 0.7em; font-family: Lato; text-anchor: center")
								.text(function (d) {return d;});
				
					
					lines.forEach(function (e, i) {
						
						e.forEach(function (e2, i2) {
							chart_group.append("circle")
								.datum(e2)
									.attr('cx', function (d) { return x(d.year) + y_axis_zone_w;})
									.attr('cy', function (d) { return y(d[params.value]) + title_zone_h + x_axis_zone_h - x_axis_zone_h + y_data_padding; })
									.attr('r', 2.5)
									.attr("id", function (d) { return "circle_" + i + "_" + d.year;})
									.style('fill', function (d) { return "#333";});
						});

						var valueline = d3.svg.line()
							.x(function (d) { return x(d.year); })
							.y(function (d) { return y(d[params.value]); });
					
    
    
						chart_group.append("path")        // Add the valueline path
							.datum(e)
							.attr("stroke", function () { if (i < colours.length) {return colours[i];} else {return '#ccc';} })
							.attr("stroke-width", 1)
							.attr("fill", "none")
							.attr("transform", "translate(" + y_axis_zone_w + "," + (title_zone_h + x_axis_zone_h - x_axis_zone_h + y_data_padding) + ")")
							.attr("d", valueline);
							
						chart_group.append("text")
							.data(e)
							.attr("x", function (d) { return y_axis_zone_w;})
							.attr("y", function (d) {return y(d[params.value]) + title_zone_h + x_axis_zone_h - x_axis_zone_h + y_data_padding; })//console.log(d); 
							.attr("dx", -5 + "px")
							.attr("dy", 2 + "px")
							.attr("style", "font-size: 0.7em; font-family: Lato; text-anchor: end")
							.text(function (d) {return d.measure;});

					
					
					});
				
				
					
				break;

				
				
					
				
				case 'sparkline':
				case 'slope_and_target':
				
					var measures_LUT, high_scores_LUT, mean_scores_LUT;
					
					measures_LUT = {RR: 'Response rate',
										EEI: 'Employee engagement index',
										MW: 'My work',
										OP: 'Organisational objectives and purpose',
										LM: 'My manager',
										MT: 'My team',
										LD: 'Learning and development',
										IF: 'Inclusion and fair treatment',
										RW: 'Resources and workload',
										PB: 'Pay and benefits',
										LC: 'Leadership and managing change',
										TA: 'Taking action',
										OC: 'Organisational Culture'};
					

					if (viewModel.current_year() == 2015) {
						high_scores_LUT = {EEI: 63, MW: 78, OP: 87, LM: 71, MT: 83, LD: 55, IF: 78, RW: 77, PB: 36, LC: 52, TA: 0, OC: 0};
						mean_scores_LUT = {EEI: 59, MW: 74, OP: 83, LM: 68, MT: 79, LD: 49, IF: 74, RW: 73, PB: 30, LC: 43, TA: 0, OC: 0};
					} else {
						high_scores_LUT = {EEI: 63, MW: 78, OP: 88, LM: 71, MT: 83, LD: 55, IF: 78, RW: 77, PB: 36, LC: 52, TA: 0, OC: 0};
						mean_scores_LUT = {EEI: 59, MW: 75, OP: 83, LM: 67, MT: 80, LD: 50, IF: 75, RW: 74, PB: 28, LC: 44, TA: 0, OC: 0};
					}
				
					var barPadding = 10,
						fillColor = colours[Math.floor(Math.random() * colours.length)];//'#999';//
					var barSpacing = data_height / data.length;
					var barHeight = d3.max([(barSpacing - barPadding), 1]);
					data_width -= 300;// TODO - this is temporary hack for one chart only
					y_axis_zone_w = 250;// TODO - so is this
					
					var widthScale = data_width / maxValue;
					
					// these are copied from time-series TODO - rationalise scales (and other variables)
					var x = d3.scale.linear()
						.range([0, data_width])
						.domain(d3.extent(data, function (d) { return d.year; }));					
					
					var y = d3.scale.linear()
						.range([data_height, 0])
						.domain(d3.extent([0, 100]));



					var lines;
					if (params.measure.length > 1) {
						lines = split_by(data, 'measure');
					} else {
						lines = [data];
					}
										
					chart_group.append("g")
						.attr("id", "background")
						.append('rect')
							.attr('x', 0)
							.attr('y', 0)
							.attr('width', width)
							.attr('height', height)
							.style('fill', 'white');//#E8F2FC
						
					// add x-axis
					
					var m_years;
					
					// Take each individual measure in isolation...
					lines.forEach(function (e, i) {
						//console.log(e[0].measure);
						var m_scores = [], m_scores_norm = [];
						m_years = [];
						
						//console.log(e);
						
						e.forEach(function(em){
							m_scores.push(em[params.value]);
							m_years.push(em.year);
						});
						
						
						
						var m_gap, spark_height;
						// TODO - put in some sensible values that scale with drawing size
						var y_offset = 0;//title_zone_h + x_axis_zone_h - x_axis_zone_h + y_data_padding;
						if (params.type == 'slope_and_target') {
							m_gap = 24;
							spark_height = 30;
							m_scores.push(high_scores_LUT[e[0].measure]);//add in CS high score for scaling
							m_scores.push(mean_scores_LUT[e[0].measure]);//add in CS mean score for scaling
						} else {
							m_gap = 18;
							spark_height = 36;
						}
						
						
						var m_max = d3.max(m_scores);
						var m_min = d3.min(m_scores);
						var m_latest = d3.max(m_years);
						var m_earliest = d3.min(m_years);
		
						var m_range = m_max - m_min;
						var m_duration = m_latest - m_earliest;
						
						
						// normalise values
						e.forEach(function(en){
							et = en;
							et[params.value] = ((et[params.value] - m_min) / m_range) * spark_height;
							m_scores_norm.push(et);
						});

						var y_pos = title_zone_h + y_data_padding + m_gap + (i * (m_gap + spark_height));
						
						//divider line
						chart_group.append('line')
							.attr("id", "top")
							.attr("x1", 0).attr("x2", width)
							.attr("y1", y_pos - (m_gap / 2)).attr("y2", y_pos - (m_gap / 2))
							.attr("stroke-width", 2).attr("stroke", "#e9f4fe");//E8F2FC
						
						
						chart_group.append("g")
							.attr("id", "spark_background" + lines[i][0].measure)
							.append('rect')
								.attr('x', y_axis_zone_w)
								.attr('y', y_pos)
								.attr('width', data_width)
								.attr('height', spark_height)
								.style('fill', 'white');
						

						chart_group.append("g")
							.attr("id", "measure_labels")
								.append("text")
									.attr("x", function (d) { return 4;})//y_axis_zone_w - 2
									.attr("y", function (d) { return y_pos + (spark_height / 2);})
									//.attr("dx", "-5px")
									.attr("dy", "18px")
									.attr("style", "font-size: 0.85em; font-family: Lato; text-anchor: start")
									.text(function (d) { return measures_LUT[lines[i][0].measure];});
									
						
						// Put on the actual target widgets - two stage process, as bar must go behind line
						if (params.type == 'slope_and_target') {
							var last_value = m_scores_norm[m_scores_norm.length-1].score;
							var last_year = m_scores_norm[m_scores_norm.length-1].year;
							var high_score = ((high_scores_LUT[e[0].measure] - m_min) / m_range) * spark_height;
							var mean_score = ((mean_scores_LUT[e[0].measure] - m_min) / m_range) * spark_height;
							var target_width = 16;
							var target_bar_height = 4;
							
							var target_widget = chart_group.append("g")
								.attr("id", "target_widget" + lines[i][0].measure);
								
								// CS average
								target_widget.append('rect')
									.attr('x', function (d) { return x(last_year) + y_axis_zone_w - target_width/2;})
									.attr('y', function (d) {  return y_pos + spark_height - high_score; })
									.attr('width', target_width)
									.attr('height', target_bar_height)
									.style('fill', 'e1664a');
								
								// CS high
								target_widget.append('rect')
									.attr('x', function (d) { return x(last_year) + y_axis_zone_w - target_width/2;})
									.attr('y', function (d) {  return y_pos + spark_height - mean_score; })
									.attr('width', target_width)
									.attr('height', target_bar_height)
									.style('fill', '#65a3d6');
								
								// box bg
								target_widget.append('rect')
									.attr('x', function (d) { return x(last_year) + y_axis_zone_w - target_width/2;})
									.attr('y', function (d) {  return y_pos + spark_height - high_score + target_bar_height; })
									.attr('width', target_width)
									.attr('height', high_score - mean_score - target_bar_height)
									.style('fill', '#eee');
							
									
						}
						


						var valueline = d3.svg.line()
							.x(function (d) { return x(d.year); })
							.y(function (d) { return y(d[params.value]); });
					
						var valueline_normalized = d3.svg.line()
							.x(function (d) { return x(d.year); })
							.y(function (d) { return spark_height - d[params.value]; });
    					
    					
    					var use_coloured_lines = false;
    					// The actual sparkline
						chart_group.append("path")        // Add the valueline path
							.datum(e)
							.attr("stroke", function (d) {
								if (use_coloured_lines) {
									 if (i < colours.length) {return colours[i];} else {return '#666';} 
								} else {return '#666';}
							 })
							.attr("stroke-width", 2)
							.style('stroke-opacity', 0.5)
							.attr("fill", "none")
							.attr("transform", "translate(" + y_axis_zone_w + "," + y_pos + ")")
							.attr("d", valueline_normalized);
						
						
						// Put on the actual target widgets - two stage process, as bar must go behind line
						if (params.type == 'slope_and_target') {
							
							chart_group.append("circle")
									.attr('cx', function (d) { return x(last_year) + y_axis_zone_w;})
									.attr('cy', function (d) {  return y_pos + spark_height - last_value; })
									.attr('r', 6.5)
									.attr("id", function (d) { return "ring_" + i + "_" + last_year;})
									.style('stroke', function (d) { return "#666";})
									.style('stroke-width', 2)
									.style('stroke-opacity', 0.5)
									.style('fill-opacity', 0.5)
									.style('fill', function (d) { return "white";});
						}
						
						
						
						
						// Draw data dots on top of line and target widgets
						m_scores_norm.forEach(function (e2n) {
							chart_group.append("circle")
								.datum(e2n)
									.attr('cx', function (d) { return x(d.year) + y_axis_zone_w;})
									.attr('cy', function (d) {  return y_pos + spark_height - d[params.value] ; })
									.attr('r', 4.5)
									.attr("id", function (d) { return "circle_" + i + "_" + d.year;})
									.style('fill', function (d) { return "#414194";});
						});
						
						
						
						// Year labels
						// TODO - does this still do anything?
						/*
						m_years.forEach(function (e2t) {
							chart_group.append("text")
								.data(e2t)
								.attr("x", function (d) { return x(d) + y_axis_zone_w;})
								.attr("y", function (d) {return 33; })//console.log(d); 
								.attr("dx", -5 + "px")
								.attr("dy", 12 + "px")
								.attr("style", "font-size: 0.7em; font-family: Lato; text-anchor: centre")
								.text(function (d) {return d;});
						});
						*/
					});
					
					
					//just cheat here and use first element of lines as typical example to get dates from
					// (need to reset m_years, as otherwise you get multiple sets)

					
					// add x axis labels
					chart_group.append("g")
						.attr("id", "year_labels")
						.selectAll('text')
							.data(m_years)
								.enter()
							.append("text")
								.attr("x", function (d) { return x(d) + y_axis_zone_w - 10})
								.attr("y", function (d) { return data_height - title_zone_h	+ y_data_padding + padding.top;})
								.attr("dy", (title_zone_h + 18) + "px")
								.attr("style", "font-size: 0.7em; font-family: Lato; text-anchor: center")
								.text(function (d) {return d;});

				break;
				
			
				
				
				
				case 'time_test':
						console.log(data);
						console.log(params);
				case 'time':
					data_height = data_height - x_axis_zone_h;// need to correct for this in time series - why?
					var lines;
					
					if ( typeof(params.post_action) != 'undefined' && params.post_action == 'normalize') {

						// TODO - this code should be refactored, normalize code should be in function
						var m_scores = [], m_scores_norm = [];
						m_years = [];
						m_headcounts = [];
						m_years = [];
												
						data.forEach(function(e){
							m_scores.push(e[params.value]);
							m_headcounts.push(e.headcount);
							m_years.push(e.year);
						});

						var m_max = d3.max(m_headcounts);
						var m_min = d3.min(m_headcounts);
						var m_max_delta = d3.max(m_scores);
						var m_min_delta = d3.min(m_scores);
						var m_latest = d3.max(m_years);
						var m_earliest = d3.min(m_years);
		
						var m_range = m_max - m_min;
						var m_delta_range = m_max_delta - m_min_delta;
						var m_duration = m_latest - m_earliest;
						
						
						// normalise values
						data.forEach(function(en){
							et = en;
// 							if (et.headcount_delta >= 0) {
// 								et.headcount_delta = ((et.headcount_delta) / m_delta_range) * 100;
// 							} else {
// 								et.headcount_delta = ((et.headcount_delta - m_min_delta) / m_delta_range) * 100;
// 							}
							et.headcount_delta = (et.headcount_delta / m_delta_range) * data_height;
							et.headcount = ((et.headcount - m_min) / m_range) * data_height;
							m_scores_norm.push(et);
						});
						
						var zero_axis = (m_max_delta / m_delta_range) * data_height;
						
						
						if (params.measure.length > 1) {
							lines = split_by(m_scores_norm, 'measure');
						} else {
							lines = [m_scores_norm];
						}
						
						
						var x = d3.scale.linear()
							.range([0, data_width])
							.domain([m_earliest, m_latest]);					
						
						var y = d3.scale.linear()
							.range([0, data_height])
							.domain([m_min_delta / m_delta_range, m_max_delta / m_delta_range]);

						
						// Background colour
						chart_group.append("g")
							.attr("id", "background")
							.append('rect')
								.attr('x', 0)
								.attr('y', 0)
								.attr('width', width)
								.attr('height', height)
								.style('fill', '#e9f4fe');
						
							
							var time_block_width_scale = 28;
						
							// main data bars
							chart_group.append("g")
								.attr("id", "data_region")
							.selectAll('rect')
								.data(m_scores_norm)
									.enter()
								.append('rect')
									.attr('x', function (d) { return ((d.year - m_earliest) * time_block_width_scale) + y_axis_zone_w + datapoint_offset_x})
									.attr('y', function (d) { 
										if (d.headcount_delta >= 0) {
											return padding.top + title_zone_h + y_data_padding + zero_axis - d.headcount_delta;
										} else {
											return padding.top + title_zone_h + y_data_padding + zero_axis;
										}
									})
									.attr('width', time_block_width_scale - 1)
									.attr('height', function (d) { return Math.abs(d.headcount_delta);})
									.style('fill', function (d) { if (d.headcount_delta >= 0) {
																	return '#32000e';
																} else {
																	return ' #C70039 ';
																}
																});
							
							
						// add x axis labels
						chart_group.append("g")
							.attr("id", "year_labels")
							.selectAll('text')
								.data(m_scores_norm)
									.enter()
								.append("text")
									.attr("x", function (d) { return ((d.year - m_earliest) * time_block_width_scale) + y_axis_zone_w + datapoint_offset_x})
									.attr("y", function (d) { return data_height + title_zone_h	+ y_data_padding + padding.top;})
									.attr("dy", (title_zone_h - 3) + "px")
									.attr("style", "font-size: 0.7em; font-family: Lato; text-anchor: center")
									.text(function (d) {return d.year;});
						
						
					////////////////////////////////////////////////////////////////////////////
					} else {
						// regular line graph
						if (params.measure.length > 1) {
							lines = split_by(data, 'measure');
						} else {
							lines = [data];
						}

						var y = d3.scale.linear()
							.range([data_height, 0])
							.domain(d3.extent([0, 100]));

										
						var x = d3.scale.linear()
							.range([0, data_width])
							.domain(d3.extent(data, function (d) { return d.year; }));					
					
					
						time_axis = d3.svg.axis().scale(x)
							.orient("bottom")
							.ticks(d3.time.year, 10)
							.tickFormat(d3.time.format('%Y'))
							.tickSize(1)
							.tickPadding(8);
					
					
						yAxis = d3.svg.axis()
							.scale(y)
							.orient("left")
							.outerTickSize(1)
							.tickPadding(2)
							.tickFormat(function(d) {return fix_axis_numbers(d)})
							.ticks(5);
					
						// Background colour
						chart_group.append("g")
							.attr("id", "background")
							.append('rect')
								.attr('x', 0)
								.attr('y', 0)
								.attr('width', width)
								.attr('height', height)
								.style('fill', bg_colour);
					
					
						lines.forEach(function (e, i) {
						var valueline = d3.svg.line()
							.x(function (d) { return x(d.year); })
							.y(function (d) { return y(d[params.value]) + title_zone_h + x_axis_zone_h; });
					
						colours[Math.floor(Math.random() * colours.length)]

						chart_group.append("path")        // Add the valueline path
							.datum(e)
							.attr("stroke", function (e) { if (i < colours.length) {return colours[i];} else {return '#ccc';} })
							.attr("stroke-width", 1)
							.attr("fill", "none")
							.attr("transform", "translate(" + y_axis_zone_w + "," + (title_zone_h + x_axis_zone_h - x_axis_zone_h + y_data_padding) + ")")
							.attr("d", valueline);
					
						// Add dot for each data point too
	// 					console.log(e); 
	// 						chart_group.append("circle")
	// 							.data(e)
	// 								.attr('cx', function (d) { return x(d.year); })
	// 								.attr('cy', function (d) { return y(d[params.value]) + title_zone_h + x_axis_zone_h; })
	// 								.attr('r', 2.5)
	// 								.style('fill', function (d) {/*return colours[params.demographics.indexOf(d.demographic_category)];*/ return "red";});
					
					
						});
					
						// AXES
						chart_group.append("g")
							.attr("id", "x-axis")
							.attr("transform", "translate(" + y_axis_zone_w + "," + (height - y_data_padding - x_axis_zone_h) + ")")
							.call(time_axis);
						
						chart_group.append("g")
							.attr("id", "y-axis")
							.attr("transform", "translate(" + y_axis_zone_w + "," + (title_zone_h + y_data_padding) + ")")
							.call(yAxis);
				
					}
					
					
					
					
				break;
				
				
				
				
				
				
				case 'histogram':
				case 'scatter':
// 					if (params.type == 'histogram') {
// 						data_height = 100;
// 					}
					
					var box_height = 12, box_width = 12;
					var widthScale = data_width / maxValue;
					var barSpacing = data_height / data.length;
					var categories = [];
					
					
					// No point in checking for categories if none are returned
					if ((typeof params.measure != 'undefined') && (params.measure != '') && (params.action != 'demographic_summary'))	{
						
						// this gathers up elements, checking that no duplicates are added
						function check_and_Add(name) {
							var found = categories.some(function (el) {
								return el === name;
							});
							if (!found) { categories.push(name); }
						}
					
						if (params.type == 'scatter') {
							data.forEach(function(e, i){check_and_Add(e.response_category)});						
						} else {
							//histogram
							data.forEach(function(e, i){check_and_Add(e.measure)});						
						}
					
						var category_width_scale;
						categories.length > 0 ? category_width_scale = data_width / categories.length : category_width_scale = data_width / 2;
					
// This works - keep
/*
						chart_group.append("g")
							.attr("id", "categories")
						.selectAll('text')
							.data(categories)
								.enter()						
								.append('text')
									.attr('x', ( -title_zone_h - data_height - y_data_padding - padding.top))
									.attr('y', function (dy, i) { return Math.abs(i * category_width_scale) + y_axis_zone_w})
									.attr('dy', 2 + datapoint_offset_x + "px")
									.attr("transform", "rotate(-90)")
									.attr("style", "font-size: 0.55em; font-family: Lato; text-anchor: end")
									.text(function (cat) { return cat;});						
*/
// function (dy, i) { return Math.abs(i * category_width_scale) + y_axis_zone_w}

						if (params.type == 'scatter') {
						
							chart_group.append("g")
								.attr("id", "categories")
							.selectAll('text')
								.data(categories)
									.enter()
									.append("g")
										.attr("transform", function (dy, i) { 
											var xval = Math.abs(i * category_width_scale) + y_axis_zone_w;
											var yval = ( title_zone_h + data_height + y_data_padding + padding.top);
											return "translate(" + xval + "," + yval + ")";
										})
									.append('text')
										.attr('dy', 8 + datapoint_offset_x + "px")
										.attr("transform", "rotate(-45)")
										.attr("style", "font-size: 0.70em; font-family: Lato; text-anchor: end")
										.text(function (cat) { return cat;});						
						
							// main data dots
							chart_group.append("g")
								.attr("id", "data_region")
							.selectAll('circle')
								.data(data)
									.enter()
								.append('circle')
									.attr('cx', function (d) { return Math.abs(categories.indexOf(d.response_category) * category_width_scale) + y_axis_zone_w + datapoint_offset_x})
									.attr('cy', function (d) { return title_zone_h	+ y_data_padding + padding.top + y_data_scale(d.demographic_total);})
									.attr('r', 2.5)
									.style('fill', function (d) { if ((typeof params.demographics != 'undefined')) {
																	return colours[params.demographics.indexOf(d.demographic_category)];
																} else {
																	// e.g. demographics_by_total
																	return 'skyblue';
																}
																});
						} else {
							// histogram
							
// 							console.log(data);
// 							console.log(params);
// // 							var categories2;
// 							if (params.measure.length > 1) {
// 								categories2 = split_by(data, 'measure');
// 							} else {
// 								categories2 = [data];
// 							}
// 							console.log(categories);
// 							console.log(categories2);
							var m_earliest = d3.min(data, function(d) {return d.year;});
							var histogram_width_scale = 12;
							
// 							console.log(minValue);
// 							console.log(maxValue);
// 							console.log(data_height);
							//var data_height_hist = data_height - 10; //TODO - this is a hack
							var y_data_scale_hist = d3.scale.linear()
								.domain([minValue, maxValue])
								.rangeRound([0, data_height]);
							
							
							// main data bars
							chart_group.append("g")
								.attr("id", "data_region")
							.selectAll('rect')
								.data(data)
									.enter()
								.append('rect')
									.attr('x', function (d) { return Math.abs( categories.indexOf(d.measure) * histogram_width_scale) + y_axis_zone_w + datapoint_offset_x})//categories.indexOf(d.response_category)
									//.attr('y', function (d) { return title_zone_h + y_data_padding + padding.top + y_data_scale_hist(d.score);})
									.attr('y', function (d) { return padding.top + title_zone_h + y_data_padding + data_height - y_data_scale_hist(d.score);})//console.log('score = ' + d.score + ' => ' + (padding.top + title_zone_h + y_data_padding + data_height - y_data_scale_hist(d.score)));
									.attr('width', histogram_width_scale - 1)
									.attr('height', function (d) { return y_data_scale_hist(d.score);})
									.style('fill', function (d) { if ((typeof params.demographics != 'undefined')) {
																	return colours[params.demographics.indexOf(d.demographic_category)];
																} else {
																	// e.g. demographics_by_total
																	return 'skyblue';
																}
																});
							
							
							chart_group.append("g")
								.attr("id", "categories")
							.selectAll('text')
								.data(categories)
									.enter()
									.append("g")
										.attr("transform", function (dy, i) { 
											var xval = Math.abs(i * histogram_width_scale) + y_axis_zone_w + 5;
											var yval = ( title_zone_h + data_height + y_data_padding + padding.top);
											return "translate(" + xval + "," + yval + ")";
										})
									.append('text')
										.attr('dy', 8 + datapoint_offset_x + "px")
										.attr("transform", "rotate(-45)")
										.attr("style", "font-size: 0.60em; font-family: Lato; text-anchor: end")
										.style('fill', 'black')
										.text(function (cat) { return cat;});						
							
							
							
						}
						
						
						
						
						
					} else {
						
						chart_group.append("g")
							.attr("id", "data_region")
						.selectAll('circle')
							.data(data)
								.enter()
							.append('circle')
								.attr('cx', function (d) { return y_axis_zone_w + datapoint_offset_x})
								.attr('cy', function (d) { return title_zone_h	+ y_data_padding + padding.top + y_data_scale(d.demographic_total);})
								.attr('r', 2.5)
								.style('fill', function (d) {return colours[params.demographics.indexOf(d.demographic_category)];});
								
						chart_group.select("#data_region")
							.selectAll('line')
							.data(data)
								.enter()
							.append('line')
								.attr("x1", function (d) { return y_axis_zone_w + datapoint_offset_x})
								.attr("y1", function (d) { return title_zone_h	+ y_data_padding + padding.top + y_data_scale(d.demographic_total);})
								.attr("x2", function (d) { return y_axis_zone_w + datapoint_offset_x + 20})
								.attr("y2", function (d) { return title_zone_h	+ y_data_padding + padding.top + y_data_scale(d.demographic_total);})
								.attr("stroke-width", 2)
								.attr("stroke", function (d) {return colours[params.demographics.indexOf(d.demographic_category)];});
							
						chart_group.select("#data_region")
							.selectAll('text')
							.data(data)
								.enter()
							.append("text")
								.attr("x", function (d) { return y_axis_zone_w + datapoint_offset_x + 26})
								.attr("y", function (d) { return title_zone_h	+ y_data_padding + padding.top - 12 + y_data_scale(d.demographic_total);})
								.attr("dy", (title_zone_h - 3) + "px")
								.attr("style", "font-size: 0.7em; font-family: Lato; text-anchor: start")
								.text(function (d) {return d.demographic_category;});
							
					}
								
					// add x-axis	+ y_axis_zone_h
					chart_group.append("g")
						.attr("id", "y-axis")
						.attr("transform", "translate(" + y_axis_zone_w + "," + (title_zone_h + y_data_padding) + ")")
						.call(yAxis);
					
						
				break;
				
				
				
			}
			
			chart_group.append("g")
					.attr("id", "title")
				.append("text")
					.attr("x", y_axis_zone_w)
					.attr("y", title_zone_h)
					.attr("style", "font-size: 1em; font-family: Lato; text-anchor: start")
					.text(params.title);
			
			
			// update functions
			updateWidth = function() {
				widthScale = width / maxValue;
				bars.transition().duration(1000).attr('width', function(d) { return d * widthScale; });
				chart_svg.transition().duration(1000).attr('width', width);
			};

			updateHeight = function() {
				barSpacing = height / data.length;
				barHeight = barSpacing - barPadding;
				bars.transition().duration(1000).attr('y', function(d, i) { return i * barSpacing; })
					.attr('height', barHeight);
				chart_svg.transition().duration(1000).attr('height', height);

			};

			updateFillColor = function() {
				chart_svg.transition().duration(1000).style('fill', fillColor);
			};





			//////////////////////////////////////////////////////////////////////////////
			/////////////////////////////////// UPDATE ///////////////////////////////////
			//////////////////////////////////////////////////////////////////////////////



			updateData = function() {
			console.log('in updateData.....');
			switch (params.type) {
			
				case 'bars':
				
					barSpacing = height / data.length;
					barHeight = barSpacing - barPadding;
					maxValue = d3.max(data);
					widthScale = width / maxValue;
					console.log(data);

/*
					chart_group.append("g")
						.attr("id", "data_region")
					.selectAll('rect')
						.data(data)
						.enter()
						.append('rect')
						.attr('class', 'display-bar')
						.attr('y', function (d, i) { return i * barSpacing;  })
.select('#data_region')
*/



					var update = chart_svg.selectAll('rect')
						.data(data);

					update
						.transition()
						.duration(1000)
						.attr('y', function(d, i) { return i * barSpacing; })
						.attr('height', barHeight)
						.attr('x', 0)
						.attr('width', function(d) { return d * widthScale; });

					update.enter()
						.append('rect')
						.attr('class', 'display-bar')
						.attr('y', function(d, i) { return i * barSpacing; })
						.attr('height', barHeight)
						.attr('x', 0)
						.attr('width', 0)
						.style('opacity', 0)
						.transition()
						.duration(1000)
						.delay(function(d, i) { return (data.length - i) * 40; })
						.attr('width', function(d) { return d * widthScale; })
						.style('opacity', 1);

					update.exit()
						.transition()
						.duration(650)
						.delay(function(d, i) { return (data.length - i) * 20; })
						.style('opacity', 0)
						.attr('height', 0)
						.attr('x', 0)
						.attr('width', 0)
						.remove();
					break;
				
				
					case 'force':
						//force_graph
						// http://bl.ocks.org/mbostock/1095795
						// https://www.airpair.com/javascript/posts/d3-force-layout-internals
						
						//cluster_force_nodes = data.nodes;
						//cluster_force_links = data.links;

						function fstart() {
							link = link.data(force.links(), function(d) { return d.source.name + "-" + d.target.name; });
							link.enter().insert("line", ".node").attr("class", "link");
							link.exit().remove();

							node = node.data(force.nodes(), function(d) { return d.name;});
							node.enter().append("circle").attr("class", function(d) { return "node " + d.name; }).attr("r", 15);
							node.exit().remove();

							force.start();
						}
						
						
						function fstart2() {
							link = link.data(force.links(), function(d) { return d.source.org_ac + "-" + d.target.org_ac; });
							link.enter().insert("g").attr("class", "link").append("line").attr("stroke", "#999").attr("stroke-opacity", ".6").style("stroke-width", function(d) { return Math.sqrt(d.value); });
							link.exit().remove();

							xnode = chart_group.selectAll(".node");
// 							xnode = chart_group.selectAll(".node")
// 									.data(cluster_force_nodes)
// 								.enter().append("g")
// 									.attr("class", "node")
// 									.attr("transform", function(d) { console.log(d); return "translate(" + d.x + "," + d.y + ")"; });
							
							node = xnode.data(force.nodes(), function(d) { return d.org_ac;});
							node.enter().append("g").attr("class", "node");

							node.append("circle")
								.attr("stroke", function(d, i) {if (i == 0) {return "#000";} else {return "#fff";}})
								.attr("stroke-width", "1.5px")
								.attr("r", 15)
								.style("fill", function(d) { return get_m_colour(d.EEI, 25, 90, 0); });

							node.append("text")
								.attr("dy", ".35em")
								.attr("dx", "16px")
								.attr("text-anchor", "middle")
								.attr("style", "font-size: 1.1em; font-family: Lato; text-anchor: start")
								.text(function(d) { return d.name; });
							
							
							node.exit().remove();
							node.call(force.drag);
							force.start();
						}
						
						
						console.log('update force graph **********************');
						//console.log(JSON.stringify(data));
						/*
						var temp = {"nodes":[{"name":"Defence Support Group","group":1,"EEI":49, org_ac: "DSG"},{"name":"National Crime Agency","group":1,"EEI":49}],"links":[{"source":1,"target":0,"value":1}]};
						var k = data.nodes.length;
						var l = cluster_force_nodes.length;
						var n;
						
						
						if (k <= l) {
							for (n = 0; n < k; n++) { cluster_force_nodes[n].name = data.nodes[n].name; cluster_force_nodes[n].group = data.nodes[n].group;; cluster_force_nodes[n].EEI = data.nodes[n].EEI; }
							for (n = k; n < l; n++) { cluster_force_nodes.pop(); node.remove(); }
						}

						if (k > l) {
							for (n = 0; n < l; n++) { cluster_force_nodes[n].name = data.nodes[n].name; cluster_force_nodes[n].group = data.nodes[n].group;; cluster_force_nodes[n].EEI = data.nodes[n].EEI; }
							
							// also add x, y, px, py, index, weight
							for (n = l; n < (k - l); n++) { var new_flower = cluster_force_nodes.push(data.nodes[n]); new_flower.index = n; new_flower.weight = 1; new_flower.x = 1; new_flower.y = 1; new_flower.px = 0; new_flower.py = 0; }
						}
						*/
						
						/*
						1.	check if current org has changed (i.e. maybe year/cluster algorithm etc. has changed instead...)
							compare current org == data.nodes[0] - if not, then update
						*/
						var previous_cluster = viewModel.previous_cluster();
						var previous_organisation = previous_cluster[0].org;
						var previous_organisation_ac = previous_cluster[0].org_ac;
						console.log('PREVIOUS NODES');
						console.log(previous_cluster);
						
						console.log('PREVIOUS ORGANISATION');
						console.log(previous_organisation + ' = ' + previous_organisation_ac);
						
						//cluster_force_nodes_bk, cluster_force_links_bk;
						//viewModel.previous_cluster();
						//viewModel.previous_organisation();


						console.log('NEW NODES');
						console.log(data.nodes);
						
						console.log('NEW ORGANISATION');
						console.log(viewModel.current_organisation());
						
						
						if (data.nodes[0] != previous_organisation) {
							console.log('NEED TO UPDATE ROOT NODE');
							console.log(cluster_force_nodes);
							var temp_x = cluster_force_nodes[0].x;
							var temp_y = cluster_force_nodes[0].y;
							var temp_px = cluster_force_nodes[0].px;
							var temp_py = cluster_force_nodes[0].py;
							//console.log(temp_x);
							cluster_force_nodes.shift();// remove first item
							cluster_force_nodes.unshift(data.nodes[0]);// replace with new item
							cluster_force_nodes[0].x = temp_x;
							cluster_force_nodes[0].y = temp_y;
							cluster_force_nodes[0].px = temp_px;
							cluster_force_nodes[0].py = temp_py;
							// better to keep the graph stable by swapping item details
// 							cluster_force_nodes[0].name = data.nodes[0].name;
// 							cluster_force_nodes[0].year = data.nodes[0].year;
// 							cluster_force_nodes[0].headcount = data.nodes[0].headcount;
// 							cluster_force_nodes[0].cluster = data.nodes[0].cluster;
// 							cluster_force_nodes[0].org_ac = data.nodes[0].org_ac;
// 							cluster_force_nodes[0].par_ac = data.nodes[0].par_ac;
// 							cluster_force_nodes[0].EEI = data.nodes[0].EEI;

						}

						
						
						
						
						/*
						2.	search through both incoming data and cluster_force_nodes exhaustively to build up list of pairs of matching entries 
							and lists unique entries in both lists
						*/
						var intersection = _.intersectionBy(previous_cluster, data.nodes, 'org_ac');
						var diff = _.differenceBy(previous_cluster, data.nodes, 'org_ac');
						var diff2 = _.differenceBy(data.nodes, previous_cluster, 'org_ac');
						var xor = _.xorBy(previous_cluster, data.nodes, 'org_ac');
						console.log(JSON.stringify(previous_cluster));
						console.log(JSON.stringify(data.nodes));
						console.log(JSON.stringify(intersection));
						console.log(JSON.stringify(diff));
						console.log(JSON.stringify(diff2));
						console.log(JSON.stringify(xor));
						
						
						
						/*
						3.	remove exit items in reverse order from cluster_force_nodes and associated links from cluster_force_links
						*/
						
						
						
						
						
						/*
						4.	push enter items to cluster_force_nodes and cluster_force_links						
						*/
						
						for (var i = 1; i < data.nodes.length; i++) {
							cluster_force_nodes.push(data.nodes[i]);
							cluster_force_links.push({source: data.nodes[i], target: data.nodes[0]});
						}
						
						
						
						/*
						5.	restart the force directed graph
						*/
						
						fstart2();

						
						
						
						/*
						// This works - keep a copy
						cluster_force_nodes.shift();
						cluster_force_nodes.push(data.nodes[0]);
						for (var i = 1; i < data.nodes.length; i++) {
							cluster_force_nodes.push(data.nodes[i]);
							cluster_force_links.push({source: data.nodes[i], target: data.nodes[0]});
						}
						fstart2();
						*/
						
					break;
				
				}			
			}

		});
	}

	chart.width = function(value) {
		if (!arguments.length) return width;
		width = value;
		if (typeof updateWidth === 'function') updateWidth();
		return chart;
	};

	chart.height = function(value) {
		if (!arguments.length) return height;
		height = value;
		if (typeof updateHeight === 'function') updateHeight();
		return chart;
	};

	chart.fillColor = function(value) {
		if (!arguments.length) return fillColor;
		fillColor = value;
		if (typeof updateFillColor === 'function') updateFillColor();
		return chart;
	};

	chart.data = function(value) {
		//console.log('in chart.data (update) ' + value.length);
		//console.log(value);
		if (!arguments.length) return data;
		data = value;
		if (typeof updateData === 'function') updateData();
		return chart;
	};

	return chart;
}




function gradient(m1, m2, min_m, max_m, use_colour, angle) {
	var max_hue, min_hue, normalized_hue, m1_offset, m2_offset, m1_hue, m2_hue, max_colour, min_colour, max_colour_d3, min_colour_d3, SL;
// 	var H  = 360,        // Values 0-360 but we'll use red by default
// 		SB = {s:0, b:0}, // Values 0-1
// 		SL = {s:0, l:0};
		
	function sl2sb(SL) {
		var SB = {s:0, l:0};
		var t = SL.s * (SL.l<0.5 ? SL.l : 1-SL.l);
		SB.b = SL.l+t;
		SB.s = SL.l>0 ? 2*t/SB.b : SB.s ;
		return SB;
	}
	function sb2sl(SB) {
		var SL = {s:0, l:0};
		SL.l = (2 - SB.s) * SB.b / 2;
		SL.s = SL.l&&SL.l<1 ? SB.s*SB.b/(SL.l<0.5 ? SL.l*2 : 2-SL.l*2) : SL.s;
		return SL;
	}
	var colours = [	{max_hue: 60, min_hue: 260, angle: 360, h: 0, s: 0.8, b:0.75}, 
					{max_hue: 80, min_hue: 0, angle: 100, h: 0, s: 0, b:0}];
	var c = use_colour ? 0 : 1;
	normalized_hue = (colours[c].min_hue - colours[c].max_hue)/(max_m - min_m);
	m1_offset = (m1 - min_m) * normalized_hue;
	m2_offset = (m2 - min_m) * normalized_hue;
	m1_hue = (colours[c].max_hue + m1_offset)/colours[c].angle;
	m2_hue = (colours[c].max_hue + m2_offset)/colours[c].angle;
	if (use_colour) {
// 		SL.s = colours[c].s;
// 		SL.b = colours[c].b;
		SL = sb2sl(colours[c]);
		max_colour_d3 = d3.hsl(m1_hue, SL.s, SL.b).toString();
		min_colour_d3 = d3.hsl(m2_hue, SL.s, SL.b).toString();
		max_colour = Raphael.color('hsb(' + m1_hue + ', ' + colours[c].s + ', ' + colours[c].b + ')');
		min_colour = Raphael.color('hsb(' + m2_hue + ', ' + colours[c].s + ', ' + colours[c].b + ')');
	} else {
		max_colour = Raphael.color('hsb(' + colours[c].h + ', ' + colours[c].s + ', ' + m1_hue + ')');
		min_colour = Raphael.color('hsb(' + colours[c].h + ', ' + colours[c].s + ', ' + m2_hue + ')');
	}
	return '' + angle + '-' + max_colour['hex'] + '-' +  min_colour['hex'];
}




/**
* calculates correct gradient based on max and min values of all data and start and end values for the box
* @param m1 integer measure at time1
* @param min_m integer measure range minimum
* @param max_m integer measure range maximum
* @param angle integer the angle of the gradient (use 0 for now = horiz l->r)
* @dependency Raphael   NB consider switching to chroma.js -- not sure chroma's hsv colours look as good, though
* @return string hex-colour
*/
	
	
function get_m_colour(m1, min_m, max_m, angle) {
	var max_hue, min_hue, normalized_hue, m1_offset, m1_hue, max_colour;
	var colours = {max_hue: 60, min_hue: 260, angle: 360, h: 0, s: 0.8, b:0.75};
	normalized_hue = (colours.min_hue - colours.max_hue)/(max_m - min_m);
	//m1_offset = (m1 - min_m) * normalized_hue;
	//m1_hue = (colours.max_hue + m1_offset)/colours.angle;
	m1_offset = (max_m - m1) * normalized_hue;
	m1_hue = (colours.max_hue + m1_offset)/colours.angle;
	max_colour = Raphael.color('hsb(' + m1_hue + ', ' + colours.s + ', ' + colours.b + ')');
	//console.log('hsb(' + (m1_hue * 255) + ', ' + colours.s + ', ' + colours.b + ')');
	//console.log('hsb(' + (m1_hue * 255) + ', ' + (colours.s * 255) + ', ' + (colours.b * 255) + ')');
	var max_chroma = chroma.hsv((m1_hue * 255), colours.s, colours.b);
	//console.log("Raphael => " + max_colour['hex'] + "     " + max_chroma.hex() + " <= chroma");
	return max_colour['hex'];
	//return max_chroma.hex();
}









/*
 * process_data
 * do something with returned data...
 *	see http://learnjsdata.com/combine_data.html
 */

function process_data(err, data) {
	if (err == null) {
		if (typeof(data) != 'undefined') {
			var raw_data = JSON.parse(data.response);
			var db_data = raw_data.payload;
			var search_params = raw_data.search_params;

			if ((db_data != null) || (db_data.length > 0)) {
		
				var thing = multichart(search_params).data(db_data);
		
				if (search_params.type == 'force') {
					//console.log(search_params.title);
					g_force_graph = thing;
				}
		
				d3.select(search_params.target)
					.call(thing);
			}
		}
	} else {
		console.log(err);
	}
}


// This prepares the input to a dendrogram, which needs the root node and first-level cluster-group names defined first

function objectify(cluster_array, n_clusters) {
	return dendrify(cluster_array, n_clusters);
}

function dendrify(cluster_array, n_clusters) {
	var clusters = [{"org": "ALL_CS", "year": '', "headcount": '', "cluster": '', "org_ac": '', "par_ac": '', "EEI": -1}], i = 0;
	while (i < n_clusters) {
		clusters.push({"org": i++, "year": '', "headcount": '', "cluster": "ALL_CS", "org_ac": '', "par_ac": '', "EEI": -1});
	}
	cluster_array.forEach(function (e) {
		clusters.push({"org": e[0], "year": e[1], "headcount": e[2], "cluster": e[3], "org_ac": e[4], "par_ac": e[5], "EEI": e[6]});
	});
	return clusters;
}





var dendro_link, dendro_node;





/*
measure

Grade
Country usually work in [H01]
Region of England usually work in [H1A]
Time in current job [H02]
Time in organisation (or predecessor) [H03]
Time in Civil Service [H04]
Manager status [H05]
Working pattern [H06]
Employment status [H07]
Occupation of main role - major groups [H08]
Occupation of main role [H08]
Development scheme [H09]
Sex [J01]
Age [J02]
Ethnicity - binary [J03]
Ethnicity - major group [J03]
Ethnicity - detailed [J03]
Long-term health [J04]
Impact of long-term illness/condition [J04]
Long-term health [J04/J4A]
Caring status [J05]
Childcare status [J06]
Sexual identity [J07]
Religious identity [J08]
*/








function get_graph_data_async(graph_options) {
	var q = queue();
	
	graph_options.forEach(function (option) {
		q.defer(d3.xhr("/xhr/").header("X-Requested-With", "XMLHttpRequest").post, JSON.stringify(option))
	});
	
	q.awaitAll(function(error, results) {
		if (error) throw error;
	
		var raw_data, db_data, search_params, max_value = 0;
		var all_data = [], all_params = [];
		results.forEach(function (data) {
			raw_data = JSON.parse(data.response);
			all_data.push(raw_data.payload);
			all_params.push(raw_data.search_params);
			raw_data.payload.forEach(function (d) {
				if (d[raw_data.search_params.value] > max_value) {max_value = d[raw_data.search_params.value];}
			});
		});
		
		all_params.forEach(function (search_params) {
			search_params.max_value = max_value;
		});
		
		var things = [];
		for (var i = 0; i < all_data.length; i++) {
			if ((all_data[i] != null) || (all_data[i].length > 0)) {
			
				things.push( multichart(all_params[i]).data(all_data[i]) );
				d3.select(all_params[i].target)
					.call(things[i]);
				//console.log(all_params[i].title);
			}
		}
	});
}
	
