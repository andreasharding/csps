// from http://jsfiddle.net/armensg/8Agje/3/
// see also http://www.verisi.com/resources/d3-tutorial-basic-charts.htm

var lastUpdateTime = + new Date();

var GenData = function(N, lastTime){
    var output = [];
    for (var i=0; i<N; i++){
        output.push({value:Math.random()*100, timestamp:lastTime});
        lastTime = lastTime + 1000;    
    }
    return output;
}

var globalData;
var dataIntervals = 1;

// plot the original data by retrieving everything from time 0
data = GenData(100, lastUpdateTime);
lastUpdateTime = data[data.length-1].timestamp;

globalData = data;

var margin = {top: 30, right: 20, bottom: 30, left: 50},
    width = 600 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);


x.domain(d3.extent(globalData, function (d) { return d.timestamp; }));
y.domain(d3.extent(globalData, function (d) { return d.value;}));


var xAxis = d3.svg.axis().scale(x)
    .orient("bottom")
    .ticks(d3.time.seconds, 20)
    .tickFormat(d3.time.format('%X'))
    .tickSize(1)
    .tickPadding(8);

var xAxisTop = d3.svg.axis().scale(x)
    .orient("bottom").tickFormat("").tickSize(0);

var yAxis = d3.svg.axis().scale(y)
    .orient("left").ticks(5);

var yAxisRight = d3.svg.axis().scale(y)
    .orient("right").tickFormat("").tickSize(0);

var valueline = d3.svg.line()
    .x(function (d) { return x(d.timestamp); })
    .y(function (d) { return y(d.value); });

var zoom = d3.behavior.zoom()
    .x(x)
    .y(y)
    .scaleExtent([1, 4])
    .on("zoom", zoomed);

var svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .call(zoom);

svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "plot"); // ????

var clip = svg.append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height);

var chartBody = svg.append("g")
    .attr("clip-path", "url(#clip)");

chartBody.append("path")        // Add the valueline path
    .datum(globalData)
    .attr("class", "line")
    .attr("d", valueline);

svg.append("g")         // Add the X Axis
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

svg.append("g")         // Add the Y Axis
    .attr("class", "y axis")
    .call(yAxis);

svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate("+ width +",0)")
    .call(yAxisRight);

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + String(0) + ")")
    .call(xAxisTop);

svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", (0 - (height / 2)))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Return (%)");

var inter = setInterval(function () {
   updateData();
}, 2000);

var panMeasure = 0;
var oldScale = 1;
function zoomed() {

    d3.event.translate[1] = 0;
    svg.select(".x.axis").call(xAxis);
    
    if (Math.abs(oldScale - d3.event.scale) > 1e-5) {
        oldScale = d3.event.scale;
        svg.select(".y.axis").call(yAxis);
    }

    svg.select("path.line").attr("transform", "translate(" +                     d3.event.translate[0] + ",0)scale(" + d3.event.scale + ", 1)");
    
    panMeasure = d3.event.translate[0];
    console.log(panMeasure);
}


//////////////////////////////////////////////////////////////

var N = 10;
var dx = 0;
function updateData() {
    
    var newData = GenData(N,lastUpdateTime);
    lastUpdateTime = newData[newData.length-1].timestamp;
    
    for (var i=0; i<newData.length; i++){
        globalData.push(newData[i]);
    }
    
    if (panMeasure <= 0) { // add the new data and pan
        
        x1 = newData[0].timestamp;
        x2 = newData[newData.length - 1].timestamp;
        dx = dx + (x(x1) - x(x2)); // dx needs to be cummulative
        
        d3.select("path")
            .datum(globalData)
            .attr("class", "line")
            .attr("d", valueline(globalData))
            .transition()
            .ease("linear")
            .attr("transform", "translate(" + String(dx) + ")");
    }
    
    else { // otherwise - just add the new data 
        d3.select("path")
            .datum(globalData)
            .attr("class", "line")
            .attr("d", valueline(globalData));
    }
    
    svg.select(".x.axis").call(xAxis);
}
