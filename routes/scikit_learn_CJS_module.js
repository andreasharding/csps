(function() {
	var PythonShell = require('python-shell');

	function scikit_learn(options) {

		if (!options) options = {
			mode: 'text',
			args: ['value1', 'value2', 'value3']
		};
		
		var pyshell = new PythonShell('./bin/ML.py', options);
		
		pyshell.on('message', function (message) {
		  // received a message sent from the Python script (a simple "print" statement)
		  console.log('Python sent: ' + message);
		});

		// end the input stream and allow the process to exit
		pyshell.end(function (err) {
		  if (err) throw err;
		  console.log('finished');
		});
		

		function callback(i) {
			return function(e, r) {
			};
		}


		return skl = {
			send: function(msg) {
				pyshell.send(msg);
				return skl;
			},
			await: function(f) {
				return skl;
			},
			awaitAll: function(f) {
				return skl;
			}
		};
	}


	scikit_learn.version = "0.0.1";
	if (typeof define === "function" && define.amd) define(function() { return scikit_learn; });
	else if (typeof module === "object" && module.exports) module.exports = scikit_learn;
	else this.scikit_learn = scikit_learn;
})();

