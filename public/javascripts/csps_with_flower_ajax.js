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
var csps_orgs = [];

// console.log(screen.width);
// console.log(screen.height);
// console.log(devicePixelRatio);
// console.log(device-width);
// console.log(device-height);


$(function() {
	// Document is ready

// $('.nav-collapse .nav > li > a').click(function(){
// 	$('.collapse.in').removeClass('in').css('height', '0');
// });

// $('#suggest_link').click(function(){
// 	//$('.collapse.in').removeClass('in').css('height', '0');
// 	console.log('suggest_link clicked **********************');
// });


$(document).on('click','#suggest_link',function(e) {
	console.log('suggest_link clicked **********************');
    if( $(e.target).is('a') ) {
        //$(this).collapse('hide');
    }
});



/*
var BetterListModel = function () {
		this.itemToAdd = ko.observable("");
		this.allItems = ko.observableArray(["Fries", "Eggs Benedict", "Ham", "Cheese"]); // Initial items
		this.selectedItems = ko.observableArray(["Ham"]);																// Initial selection
 
		this.addItem = function () {
				if ((this.itemToAdd() != "") && (this.allItems.indexOf(this.itemToAdd()) < 0)) // Prevent blanks and duplicates
						this.allItems.push(this.itemToAdd());
				this.itemToAdd(""); // Clear the text box
		};
 
		this.removeSelected = function () {
				this.allItems.removeAll(this.selectedItems());
				this.selectedItems([]); // Clear selection
		};
 
		this.sortItems = function() {
				this.allItems.sort();
		};
};
 
ko.applyBindings(new BetterListModel());
*/


	viewModel = {
		self: this,
		// These are the initial options
		organisations: ko.observableArray([]),
		current_organisation: ko.observable('CS'),
		// current_organisation_obj: ko.computed(function() {
				// return this.current_organisation_obj['organisation_full_name'];
		// 	}, this),
		survey_years: ko.observableArray([]),
		current_year: ko.observable(2014),
		current_algorithm: ko.observable('KMeans'),
		cluster_algorithms: ko.observableArray(['KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'SpectralClustering', 'AgglomerativeClustering', 'AC_average_linkage', 'Birch']),
		current_feature_set: ko.observable('questions'),
		feature_sets: ko.observableArray(['questions', 'themes', 'demographics']),
		visualisation_style: ko.observable('dendrogram'),
		visualisation_styles: ko.observableArray(['circle_packing', 'dendrogram']),
		visualisation_style_prev: 'dendrogram',
		num_clusters: ko.observable(5),
		cluster_count_prev: ko.observable(5),
		status_message: ko.observable(''),
		delivery_time: ko.observable(0),
		silhouette_score: ko.observable(0),
		// The silhouette score is bounded between -1 for incorrect clustering and +1 for highly dense clustering. 
		// Scores around zero indicate overlapping clusters.
		//num_clusters_sel: ko.observableArray(['KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'AC_average_linkage', 'DBSCAN', 'Birch']),

/*		update_organisations: function () {
			d3.xhr("/xhr/")
				.header("X-Requested-With", "XMLHttpRequest")
				.post(JSON.stringify({year: self.current_year, action: 'organisation_list', full_names: true}), function (err, data) {
					var raw_data = JSON.parse(data.response);
					if ((raw_data.payload != null) || (raw_data.payload.length > 0)) {
						var org_arr = raw_data.payload.map(function(a) {return a.organisation;});
						console.log(org_arr);
						//self.organisations = org_arr;
						//self.organisations(org_arr);
					}
				}		
			);
		}, 
		
*/
		set_delivery_time: function(dt) {
			this.delivery_time(dt);
		},

		set_silhouette_score: function(sil) {
			this.silhouette_score(d3.round(sil, 3));
		},

		get_current_year: function() {
			return this.current_year();
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
			var c_yr = 2014;
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

			get_clusters({	title: 'Clusters', year: c_yr, organisation: current_org, action: 'cluster', 
							algorithm: this.current_algorithm(), mode: 'update', engine: 'scikit-learn', 
							cluster_options: {n_clusters: nc}, 
							feature_set: this.current_feature_set(), 
							visualisation_style: this.visualisation_style(), 
							animate: (this.visualisation_style_prev == this.visualisation_style()), 
							nc_changes: (this.cluster_count_prev() != nc)
							});
			this.cluster_count_prev(nc);
			this.visualisation_style_prev = this.visualisation_style();
			},
		

		update_survey_years: function () {
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
		
		update: ko.computed(function() {
			var params = {
				title: 'EEI', year: g_current_year, measure: 'EEI', organisation: self.current_organisation, action: 'scores_all', type: 'bar', columns: 3,	x_axis: 0, y_axis: 0, value: 'score', target: "#eei_all_chart"
			};
			}, this),
		

		init: function () {
			
			/*
				Clustering Algorithms
					KMeans
						n_clusters : int, optional, default: 8 The number of clusters to form as well as the number of centroids to generate.
						max_iter : int, default: 300 Maximum number of iterations of the k-means algorithm for a single run.
						n_init : int, default: 10 Number of time the k-means algorithm will be run with different centroid seeds. The final results will be the best output of n_init consecutive runs in terms of inertia.
						init : {‘k-means++’, ‘random’ or an ndarray} Method for initialization, defaults to ‘k-means++’:
						precompute_distances : {‘auto’, True, False} Precompute distances (faster but takes more memory). ‘auto’ : do not precompute distances if n_samples * n_clusters > 12 million./ True : always precompute distances/False : never precompute distances
						tol : float, default: 1e-4 Relative tolerance with regards to inertia to declare convergence
						n_jobs : int The number of jobs to use for the computation. This works by computing each of the n_init runs in parallel.
						random_state : integer or numpy.RandomState, optional The generator used to initialize the centers. If an integer is given, it fixes the seed. Defaults to the global numpy random number generator.
						verbose : int, default 0 Verbosity mode.
						copy_x : boolean, default True When pre-computing distances it is more numerically accurate to center the data first. If copy_x is True, then the original data is not modified. If False, the original data is modified, and put back before the function returns, but small numerical differences may be introduced by subtracting and then adding the data mean.

					MiniBatchKMeans
						n_clusters : int, optional, default: 8
						max_iter : int, optional
						max_no_improvement : int, default: 10
						tol : float, default: 0.0
						batch_size : int, optional, default: 100
						init_size : int, optional, default: 3 * batch_size
						init : {‘k-means++’, ‘random’ or an ndarray}, default: ‘k-means++’
						n_init : int, default=3
						compute_labels : boolean, default=True
						random_state : integer or numpy.RandomState, optional
						reassignment_ratio : float, default: 0.01
						verbose : boolean, optional
					
					AffinityPropagation
						damping : float, optional, default: 0.5 Damping factor between 0.5 and 1.
						convergence_iter : int, optional, default: 15  Number of iterations with no change in the number of estimated clusters that stops the convergence.
						max_iter : int, optional, default: 200  Maximum number of iterations.
						copy : boolean, optional, default: True Make a copy of input data.
						preference : array-like, shape (n_samples,) or float, optional
						affinity : string, optional, default=``euclidean``
						verbose : boolean, optional, default: False
					
					MeanShift
						bandwidth : float, optional Bandwidth used in the RBF kernel.
						seeds : array, shape=[n_samples, n_features], optional
						bin_seeding : boolean, optional
						min_bin_freq : int, optional
						cluster_all : boolean, default True
						n_jobs : int
						
					SpectralClustering
						n_clusters : integer, optional The dimension of the projection subspace.
						affinity : string, array-like or callable, default ‘rbf’ If a string, this may be one of ‘nearest_neighbors’, ‘precomputed’, ‘rbf’ or one of the kernels supported by sklearn.metrics.pairwise_kernels.
    					gamma : float
    					degree : float, default=3
    					coef0 : float, default=1
    					n_neighbors : integer
    					eigen_solver : {None, ‘arpack’, ‘lobpcg’, or ‘amg’}
    					random_state : int seed, RandomState instance, or None (default)
    					n_init : int, optional, default: 10
    					eigen_tol : float, optional, default: 0.0
    					assign_labels : {‘kmeans’, ‘discretize’}, default: ‘kmeans’
    					kernel_params : dictionary of string to any, optional
					
					AgglomerativeClustering
						n_clusters : int, default=2 The number of clusters to find.
						connectivity : array-like or callable, optional
						affinity : string or callable, default: “euclidean”  Metric used to compute the linkage. Can be “euclidean”, “l1”, “l2”, “manhattan”, “cosine”, or ‘precomputed’. If linkage is “ward”, only “euclidean” is accepted.
						memory : Instance of joblib.Memory or string (optional)
						n_components : int (optional) Number of connected components. 
						compute_full_tree : bool or ‘auto’ (optional) Stop early the construction of the tree at n_clusters.
						linkage : {“ward”, “complete”, “average”}, optional, default: “ward”
						pooling_func : callable, default=np.mean This combines the values of agglomerated features into a single value, and should accept an array of shape [M, N] and the keyword argument axis=1, and reduce it to an array of size [M].

					DBSCAN
						eps : float, optional The maximum distance between two samples for them to be considered as in the same neighborhood.
						min_samples : int, optional The number of samples (or total weight) in a neighborhood for a point to be considered as a core point. This includes the point itself.
						algorithm : {‘auto’, ‘ball_tree’, ‘kd_tree’, ‘brute’}, optional
					
					Birch
						threshold : float, default 0.5 The radius of the subcluster obtained by merging a new sample and the closest subcluster should be lesser than the threshold. Otherwise a new subcluster is started.
						branching_factor : int, default 50 Maximum number of CF subclusters in each node. If a new samples enters such that the number of subclusters exceed the branching_factor then the node has to be split. The corresponding parent also has to be split and if the number of subclusters in the parent is greater than the branching factor, then it has to be split recursively.
						n_clusters : int, instance of sklearn.cluster model, default None  Number of clusters after the final clustering step, which treats the subclusters from the leaves as new samples. By default, this final clustering step is not performed and the subclusters are returned as they are. If a model is provided, the model is fit treating the subclusters as new samples and the initial data is mapped to the label of the closest subcluster. If an int is provided, the model fit is AgglomerativeClustering with n_clusters set to the int.
						compute_labels : bool, default True Whether or not to compute labels for each fit.
						copy : bool, default True Whether or not to make a copy of the given data. If set to False, the initial data will be overwritten.
					
					


				Input data
					One important thing to note is that the algorithms implemented in this 
					module take different kinds of matrix as input. On one hand, MeanShift 
					and KMeans take data matrices of shape [n_samples, n_features]. 
					These can be obtained from the classes in the sklearn.feature_extraction module. 
					On the other hand, AffinityPropagation and SpectralClustering take 
					similarity matrices of shape [n_samples, n_samples]. These can be obtained 
					from the functions in the sklearn.metrics.pairwise module. In other words, 
					MeanShift and KMeans work with points in a vector space, whereas 
					AffinityPropagation and SpectralClustering can work with arbitrary objects, 
					as long as a similarity measure exists for such objects.
			*/
// 			feature_set: questions | themes
// 			visualisation_style: circle_packing | dendrogram
// 			'KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'DBSCAN', 'Birch'
// 			var cluster_options = {n_clusters: this.num_clusters()};

			var c_yr = 2014;
			if (typeof(this.current_year()) != 'undefined') {
				c_yr = this.current_year();
			} else {
				console.log('bad current_year');
			}

			get_clusters({	title: 'Clusters', year: c_yr, organisation: current_org, action: 'cluster', 
							algorithm: this.current_algorithm(), mode: 'init', engine: 'scikit-learn', 
							cluster_options: {n_clusters: parseInt(this.num_clusters())}, 
							feature_set: this.current_feature_set(), 
							visualisation_style: this.visualisation_style(),
							animate: false,
							nc_changes: false });
			
			var graph_options;
			
			
			get_data({title: 'blank 1', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', columns: 3, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['cornflowerblue'], target: "#blank_chart_01"});
			get_data({title: 'blank 2', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', columns: 3, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['cornflowerblue'], target: "#blank_chart_02"});
			get_data({title: 'blank 3', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', columns: 3, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['cornflowerblue'], target: "#blank_chart_03"});

			get_data({title: 'Explore themes', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', width: 280, height: 200, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['cornflowerblue'], target: "#explore_themes"});
			get_data({title: 'Explore demographics', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', width: 280, height: 200, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['cornflowerblue'], target: "#explore_demographics"});
			get_data({title: 'Explore top indicators', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', width: 280, height: 200, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['cornflowerblue'], target: "#explore_top_indicators"});

			get_data({title: 'comparison against own choice or organisations', year: g_current_year, measure: '__void', organisation: current_org, action: 'noop', type: 'placeholder', width: 800, height: 600, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['goldenrod'], target: "#comparison_own_choice_orgs"});


			// Overview graphs (done individually - no need to moderate values)

			get_data({title: 'EEI', year: g_current_year, measure: 'EEI', organisation: current_org, action: 'scores_all', type: 'bar', columns: 3,	x_axis: 0, y_axis: 0, value: 'score', target: "#eei_all_chart"});
			get_data({title: 'Headcount', year: g_current_year, measure: '', organisation: current_org, action: 'headcount_total', type: 'bar', columns: 3, x_axis: 0, y_axis: 0, value: 'headcount', target: "#headcount_total_chart"});
			get_data({title: 'Average scores', year: g_current_year, measure: '', organisation: current_org, action: 'scores_average', type: 'bar', columns: 3, x_axis: 0, y_axis: 0, value: 'mean', target: "#scores_average_chart"});



			// Comparison graphs
			get_data({title: 'EEI time series', year: g_current_year, measure: ['EEI'], organisation: current_org, action: 'comparison_self_time', type: 'time', columns: 3, x_axis: 0, y_axis: 0, value: 'score', colours: ['cornflowerblue'], target: "#comparison_self_time_EEI", max_value: 100});
			get_data({title: 'Themes time series', year: g_current_year, measure: ['MW', 'OP', 'LM', 'MT', 'LD', 'IF', 'RW', 'PB', 'LC'], organisation: current_org, action: 'comparison_self_time', type: 'time', colours: ['cornflowerblue'], columns: 3, x_axis: 0, y_axis: 0, value: 'score', target: "#comparison_self_time_themes", max_value: 100});
			get_data({title: 'Demographics time series', year: g_current_year, measure: ['RR'], organisation: current_org, action: 'comparison_self_time', type: 'time', columns: 3, x_axis: 0, y_axis: 0, value: 'score', colours: ['cornflowerblue'], target: "#comparison_self_time_demographics", max_value: 100});
			make_force_graph({title: 'comparison against similar organisations', year: g_current_year, measure: ['EEI'], organisation: current_org, action: 'noop', type: 'force', width: 1100, height: 600, columns: 2, x_axis: 0, y_axis: 0, value: 'nothing', colours: ['#eee'], target: "#comparison_similar_orgs"});

			

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
	
	
	/**/
	d3.xhr("/xhr/")
		.header("X-Requested-With", "XMLHttpRequest")
		.post(JSON.stringify({action: 'survey_years'}), function (err, data) {
			var raw_data = JSON.parse(data.response);
			if ((raw_data.payload != null) || (raw_data.payload.length > 0)) {
				var year_arr = raw_data.payload.map(function(a) {return a.year;});
				viewModel.survey_years(year_arr);
				viewModel.current_year(2014);
				
			}
		}
	);
	
/*
	// this version works
	d3.xhr("/xhr/")
		.header("X-Requested-With", "XMLHttpRequest")
		.post(JSON.stringify({year: g_current_year, action: 'organisation_list', full_names: true}), function (err, data) {
			var raw_data = JSON.parse(data.response);
			if ((raw_data.payload != null) || (raw_data.payload.length > 0)) {
				var org_arr = raw_data.payload.map(function(a) {return a.organisation;});
				viewModel.organisations(org_arr);
				viewModel.current_organisation('Civil Service');
			}
		}		
	);
*/	
	
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
			var raw_data = JSON.parse(data.response);
			if ((raw_data.payload != null) || (raw_data.payload.length > 0)) {
				var org_arr = raw_data.payload.map(function(a) {return new Organisation(a.acronym, a.organisation);});
				viewModel.organisations(org_arr);
				viewModel.current_organisation('Civil Service');
			}
		}		
	);
	
	
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
			temp = [];
			current_item = e[fieldname];
		}
	});
	return out;
}

function chart(params) {
	var grid_columns = 12, grid_margin = 40, width, height;
	
	if (typeof (params.width) == 'undefined') {
		width = ((params.columns * screen.width) - ((grid_columns - 1) * grid_margin))/grid_columns; // default width
	} else {
		width = params.width;
	}
	
	if (typeof (params.height) == 'undefined') {
		height = width * 1.41; // default height
	} else {
		height = params.height;
	}


	function my(selection) {
		

		selection.each(function(my_d) {
			// generate chart here; `my_d` is the data and `this` is the element
			
			if ((typeof (params.max_value) == 'undefined') || (params.max_value == 0)) {
				// extract just the scores -- the useful stuff...
				var scores = [];
				my_d.forEach(function(e, i){scores.push(e[params.value]);});
				var maxValue = d3.max(scores);
			} else {
				maxValue = params.max_value
			}
			
			
			
			var colours;
			if (typeof (params.colours) == 'undefined') {
				colours = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'brown', '#999'];
			} else {
				colours = params.colours;
			}
			
			var title_zone_h = 20, 
				x_axis_zone_h = 20, 
				y_axis_zone_h = 30, 
				y_axis_zone_w = 45, 
				y_data_padding = 12,
				category_text_h,
				data_height,
				datapoint_offset_x = 4,
				padding = {top: 6, left: 6, bottom: 6, right: 20};
				
// 			category_text_h = (params.type == 'scatter') ? Math.floor(height - width) : 0;
			if (params.type == 'scatter') {
				category_text_h = Math.floor(height - width);
				data_height = height - x_axis_zone_h - padding.top - title_zone_h - y_data_padding - padding.bottom - category_text_h;
			} else {
				category_text_h = 0;
				data_height = height - x_axis_zone_h + padding.top - title_zone_h - y_data_padding + 3;//fudge-factor includes thickness of x-axis line etc.
			}
			
// 			var data_height = height - x_axis_zone_h - padding.top - title_zone_h - y_data_padding - padding.bottom - category_text_h
			
			var data_width = width - y_axis_zone_w - padding.left - padding.right;
			
			
			var minichart = d3.select(this).append('svg')
					.attr('height', height)
					.attr('width', width)
					.attr('id', 'chart_' + Math.floor(Math.random() * 10000))
				.append("g")
					.attr("id", "minichart")
					.attr("transform", "translate(" + padding.left + "," + padding.top + ")");
			
						
			// set up scales
			var x_data_scale = d3.scale.linear()
				.domain([0, maxValue])
				.range([0, data_width]);

			var y_data_scale = d3.scale.linear()
				.domain([0, maxValue])
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
	
				

			
			switch (params.type) {
			
				case 'placeholder':
				
					minichart.append("g")
						.attr("id", "background")
						.append('rect')
							.attr('x', 0)
							.attr('y', 0)
							.attr('width', width)
							.attr('height', height)
							.style('fill', colours[Math.floor(Math.random() * colours.length)]);
					

					minichart.append('line')
							.attr("id", "line_test1")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", title_zone_h).attr("y2", title_zone_h)
							.attr("stroke-width", 2).attr("stroke", "pink");
				
					
					minichart.append('line')
							.attr("id", "line_test2")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", title_zone_h + y_data_padding).attr("y2", title_zone_h + y_data_padding)
							.attr("stroke-width", 2).attr("stroke", "purple");
				
				
					// when subtracting from height, or from width, remember that entire minichart has been shifted down and to right
					minichart.append('line')
							.attr("id", "line_test3")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", height - padding.bottom - padding.top).attr("y2", height - padding.bottom - padding.top)
							.attr("stroke-width", 2).attr("stroke", "orange");
				
					
					minichart.append('line')
							.attr("id", "line_test4")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
							.attr("y1", height - x_axis_zone_h - padding.bottom - padding.top).attr("y2", height - x_axis_zone_h - padding.bottom - padding.top)
							.attr("stroke-width", 2).attr("stroke", "red");
				
					minichart.append('line')
							.attr("id", "line_test5")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w )
							.attr("y1", 0).attr("y2", height)
							.attr("stroke-width", 2).attr("stroke", "blue");
					
					minichart.append('line')
							.attr("id", "line_test6")
							.attr("x1", width - padding.left - padding.right).attr("x2", width - padding.left - padding.right)
							.attr("y1", 0).attr("y2", height)
							.attr("stroke-width", 2).attr("stroke", "green");
				
					
					
				break;
				
				
				
				
				
				
				case 'slopegraph':

					// http://skedasis.com/d3/slopegraph/
				
					minichart.append("g")
						.attr("id", "background")
						.append('rect')
							.attr('x', 0)
							.attr('y', 0)
							.attr('width', width)
							.attr('height', height)
							.style('fill', colours[Math.floor(Math.random() * colours.length)]);
					
					minichart.append('line')
							.attr("id", "line_test5")
							.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w )
							.attr("y1", 0).attr("y2", height)
							.attr("stroke-width", 2).attr("stroke", "blue");
					
					minichart.append('line')
							.attr("id", "line_test6")
							.attr("x1", width - padding.left - padding.right).attr("x2", width - padding.left - padding.right)
							.attr("y1", 0).attr("y2", height)
							.attr("stroke-width", 2).attr("stroke", "green");
				
					
				break;

				
				
				
				
				
				
				case 'time':
					data_height = data_height - x_axis_zone_h;// need to correct for this in time series - why?
					var lines;
					if (params.measure.length > 1) {
						console.log(my_d);
// 						console.log(params);
						lines = split_by(my_d, 'measure');
					} else {
						lines = [my_d];
					}
										
					console.log(lines);
					
// 					var x = d3.time.scale()
// 						.range([0, data_width])
// 						.domain(d3.extent(my_d, function (d) { return d.year; }));
					var x = d3.scale.linear()
						.range([0, data_width])
						.domain(d3.extent(my_d, function (d) { return d.year; }));
						//width - y_axis_zone_w
// 					var y = d3.scale.linear()
// 						.range([height - title_zone_h - x_axis_zone_h - y_data_padding, 0])
// 						.domain(d3.extent(my_d, function (d) { return d[params.value];}));
					
					
					var y = d3.scale.linear()
						.range([data_height, 0])
						.domain(d3.extent([0, 100]));

					
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
					minichart.append("g")
						.attr("id", "background")
						.append('rect')
							.attr('x', 0)
							.attr('y', 0)
							.attr('width', width)
							.attr('height', height)
							.style('fill', colours[Math.floor(Math.random() * colours.length)]);
					
					
					
					lines.forEach(function (e, i) {
					var valueline = d3.svg.line()
						.x(function (d) { return x(d.year); })
						.y(function (d) { return y(d[params.value]) + title_zone_h + x_axis_zone_h; });
					
					minichart.append("path")        // Add the valueline path
						.datum(e)
						.attr("stroke", "white")
						.attr("stroke-width", 1)
						.attr("fill", "none")
						.attr("transform", "translate(" + y_axis_zone_w + "," + (title_zone_h + x_axis_zone_h - x_axis_zone_h + y_data_padding) + ")")
						.attr("d", valueline);
					});
					
					// AXES
					minichart.append("g")
						.attr("id", "x-axis")
						.attr("transform", "translate(" + y_axis_zone_w + "," + (height - y_data_padding - x_axis_zone_h) + ")")
						.call(time_axis);
						
					minichart.append("g")
						.attr("id", "y-axis")
						.attr("transform", "translate(" + y_axis_zone_w + "," + (title_zone_h + y_data_padding) + ")")
						.call(yAxis);
					
					
					
						//height - title_zone_h - x_axis_zone_h - y_data_padding
						
					/*
					var barPadding = 10,
						fillColor = '#999';//colours[Math.floor(Math.random() * colours.length)];
					var barSpacing = data_height / my_d.length;
					var barHeight = d3.max([(barSpacing - barPadding), 1]);
					var widthScale = data_width / maxValue;
					
					
					minichart.append("g")
						.attr("id", "data_region")
					.selectAll('rect')
						.data(my_d)
							.enter()
						.append('rect')
						.attr('y', function (dy, i) { return Math.abs(i * barSpacing) + title_zone_h + x_axis_zone_h})
						.attr('height', barHeight)
						.attr('x', 0)
						.attr('width', function (dw, i) { return dw[params.value] * widthScale})
						.style('fill', fillColor);
					*/
				break;
				
				case 'bar':
				
					// add x-axis
					minichart.append("g")
						.attr("id", "x-axis")
						.attr("transform", "translate(0," + title_zone_h + ")")
						.call(xAxis);
				
					var barPadding = 10,
						fillColor = '#999';//colours[Math.floor(Math.random() * colours.length)];
					var barSpacing = data_height / my_d.length;
					var barHeight = d3.max([(barSpacing - barPadding), 1]);
					var widthScale = data_width / maxValue;
				
					minichart.append("g")
						.attr("id", "data_region")
					.selectAll('rect')
						.data(my_d)
							.enter()
						.append('rect')
						.attr('y', function (dy, i) { return Math.abs(i * barSpacing) + title_zone_h + x_axis_zone_h})
						.attr('height', barHeight)
						.attr('x', 0)
						.attr('width', function (dw, i) { return dw[params.value] * widthScale})
						.style('fill', fillColor);
				
				break;
				
				
				
				case 'scatter':
				
					var box_height = 12, box_width = 12;
					var widthScale = data_width / maxValue;
					var barSpacing = data_height / my_d.length;
					var categories = [];
					
					
					// No point in checking for categories if none are returned
					if ((typeof params.measure != 'undefined') && (params.measure != '') && (params.action != 'demographic_summary'))	{
					
						function check_and_Add(name) {
							var found = categories.some(function (el) {
								return el === name;
							});
							if (!found) { categories.push(name); }
						}
					
						my_d.forEach(function(e, i){check_and_Add(e.response_category)});
					
					
						var category_width_scale;
						categories.length > 0 ? category_width_scale = data_width / categories.length : category_width_scale = data_width / 2;
					
// This works - keep
/*
						minichart.append("g")
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

						minichart.append("g")
							.attr("id", "categories")
						.selectAll('text')
							.data(categories)
								.enter()
								.append("g")
									.attr("transform", function (dy, i) { 
										//var xval = ( -title_zone_h - data_height - y_data_padding - padding.top);
										var xval = Math.abs(i * category_width_scale) + y_axis_zone_w;
										var yval = ( title_zone_h + data_height + y_data_padding + padding.top);
										return "translate(" + xval + "," + yval + ")";
									})
								.append('text')
									.attr('dy', 8 + datapoint_offset_x + "px")
									.attr("transform", "rotate(-45)")
									.attr("style", "font-size: 0.70em; font-family: Lato; text-anchor: end")
									.text(function (cat) { return cat;});						
						
						minichart.append("g")
							.attr("id", "data_region")
						.selectAll('circle')
							.data(my_d)
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
						
						minichart.append("g")
							.attr("id", "data_region")
						.selectAll('circle')
							.data(my_d)
								.enter()
							.append('circle')
								.attr('cx', function (d) { return y_axis_zone_w + datapoint_offset_x})
								.attr('cy', function (d) { return title_zone_h	+ y_data_padding + padding.top + y_data_scale(d.demographic_total);})
								.attr('r', 2.5)
								.style('fill', function (d) {return colours[params.demographics.indexOf(d.demographic_category)];});
								
						minichart.select("#data_region")
							.selectAll('line')
							.data(my_d)
								.enter()
							.append('line')
								.attr("x1", function (d) { return y_axis_zone_w + datapoint_offset_x})
								.attr("y1", function (d) { return title_zone_h	+ y_data_padding + padding.top + y_data_scale(d.demographic_total);})
								.attr("x2", function (d) { return y_axis_zone_w + datapoint_offset_x + 20})
								.attr("y2", function (d) { return title_zone_h	+ y_data_padding + padding.top + y_data_scale(d.demographic_total);})
								.attr("stroke-width", 2)
								.attr("stroke", function (d) {return colours[params.demographics.indexOf(d.demographic_category)];});
							
						minichart.select("#data_region")
							.selectAll('text')
							.data(my_d)
								.enter()
							.append("text")
								.attr("x", function (d) { return y_axis_zone_w + datapoint_offset_x + 26})
								.attr("y", function (d) { return title_zone_h	+ y_data_padding + padding.top - 12 + y_data_scale(d.demographic_total);})
								.attr("dy", (title_zone_h - 3) + "px")
								.attr("style", "font-size: 0.7em; font-family: Lato; text-anchor: start")
								.text(function (d) {return d.demographic_category;});
							
					}
								
					// add x-axis	+ y_axis_zone_h
					minichart.append("g")
						.attr("id", "y-axis")
						.attr("transform", "translate(" + y_axis_zone_w + "," + (title_zone_h + y_data_padding) + ")")
						.call(yAxis);
					
						
				break;
			}
				
			minichart.append("g")
					.attr("id", "title")
				.append("text")
					.attr("x", y_axis_zone_w)
					.attr("y", title_zone_h)
// 					.attr("dy", (title_zone_h - 3) + "px")
					.attr("style", "font-size: 1em; font-family: Lato; text-anchor: start")
					.text(params.title);
				
		});		
	}
	
	
	my.width = function(value) {
		if (!arguments.length) return width;
		width = value;
		return my;
	};

	my.height = function(value) {
		if (!arguments.length) return height;
		height = value;
		return my;
	};

	return my;
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
	* @dependency Raphael
	* @return string hex-colour
	*/
	
	
	function get_m_colour(m1, min_m, max_m, angle) {
		var max_hue, min_hue, normalized_hue, m1_offset, m1_hue, max_colour;
		var colours = {max_hue: 60, min_hue: 260, angle: 360, h: 0, s: 0.8, b:0.75};
		normalized_hue = (colours.min_hue - colours.max_hue)/(max_m - min_m);
		m1_offset = (m1 - min_m) * normalized_hue;
		m1_hue = (colours.max_hue + m1_offset)/colours.angle;
		max_colour = Raphael.color('hsb(' + m1_hue + ', ' + colours.s + ', ' + colours.b + ')');
		return max_colour['hex'];
	}



function flower(params) {
	var grid_columns = 12, grid_margin = 40, width, height;
	
	if (typeof (params.width) == 'undefined') {
		width = ((params.columns * screen.width) - ((grid_columns - 1) * grid_margin))/grid_columns; // default width
	} else {
		width = params.width;
	}

	
	if (typeof (params.height) == 'undefined') {
		height = width * 1.41; // default height
	} else {
		height = params.height;
	}


	function my(selection) {
		
/*
		selection.each(function(my_d) {
			// generate chart here; `my_d` is the data and `this` is the element
			
			if ((typeof (params.max_value) == 'undefined') || (params.max_value == 0)) {
				// extract just the scores -- the useful stuff...
				var scores = [];
				my_d.forEach(function(e, i){scores.push(e[params.value]);});
				var maxValue = d3.max(scores);
			} else {
				maxValue = params.max_value
			}
		});		
*/			
			
			
		var colours;
		if (typeof (params.colours) == 'undefined') {
			colours = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'brown', '#999'];
		} else {
			colours = params.colours;
		}
		
		var title_zone_h = 20, 
			x_axis_zone_h = 20, 
			y_axis_zone_h = 30, 
			y_axis_zone_w = 45, 
			y_data_padding = 12,
			category_text_h,
			data_height,
			datapoint_offset_x = 4,
			padding = {top: 6, left: 6, bottom: 6, right: 20},category_text_h = 0,
			data_height = height - x_axis_zone_h + padding.top - title_zone_h - y_data_padding + 3,
			data_width = width - y_axis_zone_w - padding.left - padding.right;
		
		var centroid = {x: (y_axis_zone_w - padding.left + data_width/2), 
						y: (title_zone_h + x_axis_zone_h + y_data_padding - padding.top + data_height/2)}
		
		
		var color = d3.scale.category20();
		var graph = {
				"nodes":[
					{"name":"Myriel","group":1, "EEI":65},
					{"name":"Napoleon","group":1, "EEI":50},
					{"name":"Mlle.Baptistine","group":1, "EEI":56},
					{"name":"Mme.Magloire","group":1, "EEI":68},
					{"name":"CountessdeLo","group":2, "EEI":74},
					{"name":"Geborand","group":2, "EEI":47},
					{"name":"Champtercier","group":2, "EEI":51},
					{"name":"Cravatte","group":2, "EEI":56},
					{"name":"Count","group":3, "EEI":71},
					{"name":"OldMan","group":3, "EEI":45}
				],
				"links":[
					{"source":1,"target":0,"value":1},
					{"source":2,"target":0,"value":1},
					{"source":3,"target":0,"value":1},
// 						{"source":3,"target":2,"value":1},
					{"source":4,"target":0,"value":1},
					{"source":5,"target":0,"value":1},
					{"source":6,"target":0,"value":1},
					{"source":7,"target":0,"value":1},
					{"source":8,"target":0,"value":1},
					{"source":9,"target":0,"value":1}
				]
			}
		
		
		var flowerchart = d3.select(this).append('svg')
				.attr('height', height)
				.attr('width', width)
				.attr('id', 'chart_' + Math.floor(Math.random() * 10000))
			.append("g")
				.attr("id", "flowerchart")
				.attr("transform", "translate(" + padding.left + "," + padding.top + ")");
		
		
		switch (params.type) {
		
			case 'force':
			
				var force = d3.layout.force()
					.charge(-520)
					.linkDistance(120)
					.size([width, height]);

				force
					.nodes(graph.nodes)
					.links(graph.links)
					.start();

				var link = flowerchart.selectAll(".link")
						.data(graph.links)
					.enter().append("line")
						.attr("class", "link")
						.attr("stroke", "#999")
						.attr("stroke-opacity", ".6")
						.style("stroke-width", function(d) { return Math.sqrt(d.value); });


				var node = flowerchart.selectAll(".node")
						.data(graph.nodes)
					.enter().append("circle")
						.attr("class", "node")
						.attr("stroke", "#fff")
						.attr("stroke-width", "1.5px")
						.attr("r", 15)
						.style("fill", function(d) { console.log(d); return get_m_colour(d.EEI, 25, 90, 0) })
						.call(force.drag);
					
						
/*					var node = flowerchart.selectAll(".node")
						.data(graph.nodes)
					.enter().append("g")
					.append("circle")
						.attr("class", "node")
						.attr("stroke", "#fff")
						.attr("stroke-width", "1.5px")
						.attr("r", 15)
						.style("fill", function(d) { console.log(d); return get_m_colour(d.EEI, 25, 90, 0) })
						.append("text")
							.attr("x", 0)
							.attr("y", 0)
							.attr("style", "font-size: 1em; font-family: Lato; text-anchor: start")
							.text('xxx')
						.call(force.drag);							
*/
				node.append("title")
					.text(function(d) { return d.name; });
				
				force.on("tick", function() {
					link.attr("x1", function(d) { return d.source.x; })
						.attr("y1", function(d) { return d.source.y; })
						.attr("x2", function(d) { return d.target.x; })
						.attr("y2", function(d) { return d.target.y; });

					node.attr("cx", function(d) { return d.x; })
						.attr("cy", function(d) { return d.y; });
				});
				
				/*
				flowerchart.append("g")
					.attr("id", "background")
					.append('rect')
						.attr('x', 0)
						.attr('y', 0)
						.attr('width', width)
						.attr('height', height)
						.style('fill', colours[Math.floor(Math.random() * colours.length)]);
				

				flowerchart.append('line')
						.attr("id", "line_test1")
						.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
						.attr("y1", title_zone_h).attr("y2", title_zone_h)
						.attr("stroke-width", 2).attr("stroke", "pink");
			
				
				flowerchart.append('line')
						.attr("id", "line_test2")
						.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
						.attr("y1", title_zone_h + y_data_padding).attr("y2", title_zone_h + y_data_padding)
						.attr("stroke-width", 2).attr("stroke", "purple");
			
			
				// when subtracting from height, or from width, remember that entire flowerchart has been shifted down and to right
				flowerchart.append('line')
						.attr("id", "line_test3")
						.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
						.attr("y1", height - padding.bottom - padding.top).attr("y2", height - padding.bottom - padding.top)
						.attr("stroke-width", 2).attr("stroke", "orange");
			
				
				flowerchart.append('line')
						.attr("id", "line_test4")
						.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w + data_width)
						.attr("y1", height - x_axis_zone_h - padding.bottom - padding.top).attr("y2", height - x_axis_zone_h - padding.bottom - padding.top)
						.attr("stroke-width", 2).attr("stroke", "red");
			
				flowerchart.append('line')
						.attr("id", "line_test5")
						.attr("x1", y_axis_zone_w).attr("x2", y_axis_zone_w )
						.attr("y1", 0).attr("y2", height)
						.attr("stroke-width", 2).attr("stroke", "blue");
				
				flowerchart.append('line')
						.attr("id", "line_test6")
						.attr("x1", width - padding.left - padding.right).attr("x2", width - padding.left - padding.right)
						.attr("y1", 0).attr("y2", height)
						.attr("stroke-width", 2).attr("stroke", "green");
			*/
				
				
			break;
			
			
							
			
		}
			
		flowerchart.append("g")
				.attr("id", "title")
			.append("text")
				.attr("x", y_axis_zone_w)
				.attr("y", title_zone_h)
				.attr("style", "font-size: 1em; font-family: Lato; text-anchor: start")
				.text(params.title);
				
	}
	
	
	my.width = function(value) {
		if (!arguments.length) return width;
		width = value;
		return my;
	};

	my.height = function(value) {
		if (!arguments.length) return height;
		height = value;
		return my;
	};

	return my;
}







/*
 * get_data
 * Generic query via ajax
 *
 */

function get_data (params) {
	//console.log(params);
	if (params.measure != '__void') {
		d3.xhr("/xhr/")
			.header("X-Requested-With", "XMLHttpRequest")
			.post(JSON.stringify(params), process_data);
	} else {
		//test case
		d3.select(params.target)
			.datum([])
			.call(chart(params));
	}
}


function make_force_graph (params) {
	if (params.action != 'noop') {
		d3.xhr("/xhr/")
			.header("X-Requested-With", "XMLHttpRequest")
			.post(JSON.stringify(params), process_force_data);
	} else {
		d3.select(params.target)
			.datum([])
			.call(flower(params));
	}
}


/*
 * process_data
 * do something with returned data...
 *	see http://learnjsdata.com/combine_data.html
 */

function process_data(err, data) {
 	var raw_data = JSON.parse(data.response);
 	var db_data = raw_data.payload;
 	var search_params = raw_data.search_params;

 	if ((db_data != null) || (db_data.length > 0)) {
		d3.select(search_params.target)
			.datum(db_data)
			.call(chart(search_params));
	}
}


// TODO - incorporate this into process_data using something in params?
function process_force_data(err, data) {
 	var raw_data = JSON.parse(data.response);
 	var db_data = raw_data.payload;
 	var search_params = raw_data.search_params;

 	if ((db_data != null) || (db_data.length > 0)) {
		d3.select(search_params.target)
			.datum(db_data)
			.call(flower(search_params));
	}
}



function objectify(cluster_array, n_clusters) {
	var clusters = [{"org": "ALL_CS", year: '', headcount: '', "cluster": '', "org_ac": '', "par_ac": ''}], i = 0;
	while (i < n_clusters) {
		clusters.push({"org": i++, year: '', headcount: '', "cluster": "ALL_CS", "org_ac": '', "par_ac": ''});
	}
	cluster_array.forEach(function (e) {
		clusters.push({"org": e[0], year: e[1], headcount: e[2], "cluster": e[3], "org_ac": e[4], "par_ac": e[5]});
	});
	return clusters;
}


var dendro_link, dendro_node;

function get_clusters(params) {
	var cluster_svg;
	var diameter = 300;
	var duration = 2000;
	var links, nodes;
	
	d3.xhr("/xhr/")
		.header("X-Requested-With", "XMLHttpRequest")
		.post(JSON.stringify(params), function (error, data) {
			if (error) throw error;
			
			var raw_data, all_data = [], all_params = [];
			raw_data = JSON.parse(data.response);
			all_params.push(raw_data.search_params);
			
			//console.log (raw_data);
			
			console.log (raw_data.search_params);
			var n_clusters = raw_data.search_params.cluster_options.n_clusters;
			//var draw_mode = raw_data.search_params.mode;
			//var visualisation_style = 'dendrogram'; // dendrogram circle_packing
			
			var root = d3_hierarchy.stratify()
				.id(function(d) { return  d.org; })
				.parentId(function(d) { return d.cluster; })
				(objectify(raw_data.payload, n_clusters));			

			// user feedback
			
			viewModel.set_delivery_time(raw_data.search_params.respond_time - raw_data.search_params.arrival_time);
			viewModel.set_silhouette_score(raw_data.search_params.silhouette_score);
			
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

					var node = cluster_svg.datum(root).selectAll(".node")
						.data(pack.nodes)
					.enter().append("g")
						.attr("class", function(d) { return d.children ? "node" : "leaf node"; })
						.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

					node.append("title")
						.text(function(d) { return d.id + (d.children ? "" : ": " + format(d.size)); });

					node.append("circle")
						.attr("r", function(d) { return d.r; });

					node.filter(function(d) { return !d.children; }).append("text")
						.attr("dy", ".3em")
						.style("text-anchor", "middle")
						.text(function(d) { return d.id; });
				break;
				
				
				
				

				
				
				case 'dendrogram':
					// Cluster Dendrogram
					var cluster_width = 1200, cluster_height = 1000;

					var cluster = d3.layout.cluster()
							.size([cluster_height, cluster_width - 360]);

					var diagonal = d3.svg.diagonal()
							.projection(function(d) { return [d.y, d.x]; });
					
					if (typeof(raw_data.search_params.mode) == 'undefined' || raw_data.search_params.mode == '' || raw_data.search_params.mode == 'init'){
						console.log('initialising svg');

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
							.style("stroke", "#8da0cb")
							.attr("d", diagonal);

						dendro_node = cluster_svg.selectAll(".node")
							.data(nodes)
						   .enter()
							.append("g")
							.attr("class", "node")
							.attr("transform", function (d) {
							return "translate(" + d.y + "," + d.x + ")";
						})

						dendro_node.append("circle")
							.attr("r", 4.5)
							.style("stroke", "#e41a1c");
							
						dendro_node.append("text")
							.attr("dx", function(d) { return d.children ? -8 : 8; })
							.attr("dy", 3)
							.style("text-anchor", function(d) { return d.children ? "end" : "start"; })
							.text(function(d) { return d.id; });
					
					} else {
					
						//UPDATE
						nodes = cluster.nodes(root);
						links = cluster.links(nodes);

						if(raw_data.search_params.nc_changes == true){
// 							var comp_div = d3.select("#cluster_test");
// 							comp_div.selectAll('svg').remove();
// 							console.log('removing/recreating svg');
// 							cluster_svg = comp_div.append("svg")
							
// 							cluster_svg = d3.select("#cluster_test").append("svg")
// 								.attr("width", cluster_width)
// 								.attr("height", cluster_height)
// 								.append("g")
// 								.attr("transform", "translate(60,0)");
							// Just repeating same code for the moment as code above doesn't really work
							var cluster_div = d3.select("#cluster_test");
							cluster_svg = cluster_div.select("svg");
							cluster_svg.transition().duration(duration)
								.attr("transform", "translate(60,0)");

						} else {
// 							console.log('keep svg for transition');
							var cluster_div = d3.select("#cluster_test");
							cluster_svg = cluster_div.select("svg");
							cluster_svg.transition().duration(duration)
								.attr("transform", "translate(60,0)");
						}
					

  
						dendro_link = cluster_svg.selectAll(".link");

						dendro_link.data(links)
							.transition()
							.duration(duration)
							.style("stroke", "#8da0cb")
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
							.style("stroke", "#e41a1c");
						
						dendro_node.select("text")
							.attr("dx", function(d) { return d.children ? -8 : 8; })
							.attr("dy", 3)
							.style("text-anchor", function(d) { return d.children ? "end" : "start"; })
							.text(function(d) { return d.id; });
					}
					
					
				break;
				
				
				
				
				
				
				
				case 'xdendrogram':
				default:
					// Cluster Dendrogram
					var cluster_width = 1200, cluster_height = 1400;

					var cluster = d3.layout.cluster()
							.size([cluster_height, cluster_width - 360]);

					var diagonal = d3.svg.diagonal()
							.projection(function(d) { return [d.y, d.x]; });


					if (typeof(raw_data.search_params.mode) == 'undefined' || raw_data.search_params.mode == '' || raw_data.search_params.mode == 'init'){
						console.log('************************ mode i');
						console.log(raw_data.search_params.mode)
							cluster_svg = d3.select("#cluster_test").append("svg")
								.attr("width", cluster_width)
								.attr("height", cluster_height)
							.append("g")
								.attr("transform", "translate(60,0)");
					} else {
						console.log('************************ mode u');
						console.log(raw_data.search_params.mode)
							cluster_svg = d3.select("#cluster_test");
// 							cluster_svg = d3.select("#cluster_test").append("svg")
// 								.attr("width", cluster_width)
// 								.attr("height", cluster_height)
// 							.append("g")
// 								.attr("transform", "translate(60,0)");
					}

					// DATA JOIN (1)
					// Join new data with old elements, if any. For both nodes and links.

					var nodes = cluster.nodes(root),
						links = cluster.links(nodes);


					// DATA JOIN (2)
					// Data is actually joined here + followed by ENTER

					var link = cluster_svg.selectAll(".link")
							.data(links)
						.enter().append("path")
							.attr("class", "link")
							.attr("d", diagonal);
										
					var node = cluster_svg.selectAll(".node")
							.data(nodes)
						.enter().append("g")
							.attr("class", "node")
							.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

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



					node.append("circle")
							.attr("r", 4.5);

					node.append("text")
							.attr("dx", function(d) { return d.children ? -8 : 8; })
							.attr("dy", 3)
							.style("text-anchor", function(d) { return d.children ? "end" : "start"; })
							.text(function(d) { return d.id; });
					
				break;
			}
			
		});
}








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
	
		for (var i = 0; i < all_data.length; i++) {
			if ((all_data[i] != null) || (all_data[i].length > 0)) {
				d3.select(all_params[i].target)
					.datum(all_data[i])
					.call(chart(all_params[i]));
			}
		}
	});
}
	





