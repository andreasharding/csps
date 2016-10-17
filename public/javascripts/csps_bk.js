
function test_chart(dataset, category, value){
	var update_selectors = [];
	var parent_selectors = [];

	// setup //////////////////////////////////////////////////////
	function create_tallies(data) {
		// create an empty object
		var return_counts = {};
		
		// iterate over each element in the array
		data.forEach(function(element) {
			var category_string = element[category];
//			 console.log(category_string);
			if (return_counts[category_string] === undefined) {
				return_counts[category_string] = 0;
			}
			return_counts[category_string] += element[value];
		})
		return return_counts;
	}

	// run the function to generate the category counts
	var counts = create_tallies(dataset)
	console.log(counts);





	// draw ////////////////////////////////////////////////////////
	function create_graphs(counts) {
		var body = d3.select('body')

		Object.keys(counts).forEach(function(key_name) {
			var div_parent = body.append('div');
			div_parent.datum({ key: key_name });

			var span_label = div_parent.append('span').html(key_name + ': ');
			var span_count = div_parent.append('span').html(-1);

			span_count.datum({ key: key_name });

			parent_selectors.push(div_parent);
			update_selectors.push(span_count);

		})

	}
	var graph = create_graphs(counts);




	// updates //////////////////////////////////////////////////////
	function update_elements(data) {
		var new_counts = create_tallies(data);

		update_selectors.forEach(function(selector) {
			var data = selector.datum();
			if (new_counts[data.key] !== undefined) {
				selector.html(new_counts[data.key]);
			} else {
				selector.html(0);
			}
		})

	}
	
	update_elements(dataset);

	return {
		graph: graph,
		update: update_elements
	}

}


function chart() {
	var width = 200, // default width
		height = 200; // default height
	

	function my(selection) {
		

		selection.each(function(d) {
			// generate chart here; `d` is the data and `this` is the element
			
			// extract just the scores -- the useful stuff...
			var scores = [];
			d.forEach(function(e, i){scores.push(e.score);});
			
			var colours = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'brown', '#999'];
			
			var barPadding = 10,
				fillColor = colours[Math.floor(Math.random() * colours.length)];
			var barSpacing = height / d.length;
			var barHeight = barSpacing - barPadding;
			var maxValue = d3.max(scores);
			var widthScale = width / maxValue;
			console.log(barSpacing);
			console.log(barHeight);

			d3.select(this).append('svg')
				.attr('height', height)
				.attr('width', width)
				.attr('id', 'chart_' + Math.floor(Math.random() * 1000))
				.selectAll('rect')
				.data(d)
					.enter()
				.append('rect')
				.attr('y', function (dy, i) { return Math.abs(i * barSpacing) })
// 				.attr('height', barHeight)
				.attr('height', 2)
				.attr('x', 0)
				.attr('width', function (dw, i) { return dw.score * widthScale})
				.style('fill', fillColor);
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



// a failed attempt to have the chart itself call the xhr for data

function weird_chart(params) {
	var width = 200, // default width
		height = 200; // default height
	
		search_params.action = 'db';
		search_params.type = 'publications';
		search_params.organisation = params.org;
		search_params.position = params.pos;
		search_params.top = margin.top;
		search_params.left = margin.left;
		search_params.year = params.year;
		search_params.measure = params.measure;
		
	
		d3.xhr("/xhr/")
			.header("X-Requested-With", "XMLHttpRequest")
			.post(JSON.stringify(search_params), chart_process_data);

	
function chart_process_data(err, data) {
 	// raw data is made up of: {'payload': Array, 'search_params': user_search_params originally sent , 'error': null or some message}
	// console.log(data);

 	var raw_data = JSON.parse(data.response);
 	var db_data = raw_data.payload;
	console.log(db_data);

 	if ((db_data != null) || (db_data.length > 0)) {
		var selection = d3.select("#demographics_charts_01")
			.datum(db_data)
			.call(this.my);
	}
}
	
	

	function my() {
	console.log('my ---------------------!');


		selection.each(function(d) {
			// generate chart here; `d` is the data and `this` is the element
			
			// extract just the scores -- the useful stuff...
			var scores = [];
			d.forEach(function(e, i){scores.push(e.score);});
			
			var colours = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'brown', '#999'];
			
			var barPadding = 10,
				fillColor = colours[Math.floor(Math.random() * colours.length)];
			var barSpacing = height / d.length;
			var barHeight = barSpacing - barPadding;
			var maxValue = d3.max(scores);
			var widthScale = width / maxValue;
			console.log(barSpacing);
			console.log(barHeight);

			d3.select(this).append('svg')
				.attr('height', height)
				.attr('width', width)
				.attr('id', 'chart_' + Math.floor(Math.random() * 1000))
				.selectAll('rect')
				.data(d)
					.enter()
				.append('rect')
				.attr('y', function (dy, i) { return Math.abs(i * barSpacing) })
// 				.attr('height', barHeight)
				.attr('height', 2)
				.attr('x', 0)
				.attr('width', function (dw, i) { return dw.score * widthScale})
				.style('fill', fillColor);
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

