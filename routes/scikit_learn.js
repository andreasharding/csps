var PythonShell = require('python-shell');
 
var options = {
  mode: 'text',
  args: ['value1', 'value2', 'value3']
};

var pyshell = new PythonShell('./bin/ML.py', options);

// sends a message to the Python script via stdin
pyshell.send('hello');

pyshell.on('message', function (message) {
  // received a message sent from the Python script (a simple "print" statement)
  console.log('Python sent: ' + message);
});

// end the input stream and allow the process to exit
pyshell.end(function (err) {
  if (err) throw err;
  console.log('finished');
});