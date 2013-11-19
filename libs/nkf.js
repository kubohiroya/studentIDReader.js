var spawn = require('child_process').spawn;
var fs = require('fs');
var sream = require('stream');
var Deferred = require('/usr/local/lib/node_modules/jsdeferred/jsdeferred.js').Deferred;
Deferred.define();

/*
* Node nkf
* This modules provides convert character encodings 
*/
var Nkf = function(stream, options) {
  var self = this;
  this.stream = stream;
  options = options || {};
  self.options = {
    encoding: options.encoding || '-w',
    timeout: options.timeout || 0,
    killSignal: options.killSignsl || 'SIGKILL'
  }
  self.nkf = spawn('nkf', [self.options.encoding]);
};

Nkf.stream = function(stream, options) {
  return new Nkf(stream, options);
};


Nkf.prototype.toString = function stream(callback) {
  var self = this;
  var nkf = this.nkf;
  var text = ''; 
  var killed = false;

  var deferred = new Deferred();


  if(this.stream.pipe){
      this.stream.pipe(self.nkf.stdin);
  }

  nkf.stdout.on('data', function(chunk) {
    text += chunk;
  });
  nkf.stdout.on('end', function() {
    killed = true;
    if(callback){
        callback(null, text.toString());
    }else{
        deferred.call(text);
    }
  });
  nkf.stderr.on('data', function(err) {
    nkf.kill('SIGKILL');
    killed = true;
    if(callback){
        callback(err.toString());
    }
  })

  if (self.options.timeout > 0) {
    setTimeout( function() {
      if (!killed) {
        nkf.kill(options.killSignal);
        timedOut = true;
        killed = true;
      }
    }, self.options.timeout);
  }

  if(! this.stream.pipe){
      self.nkf.stdin.write(new Buffer(this.stream));
      self.nkf.stdin.end();
  }

  var ret =  deferred.next(function(value){return value;});

  return text;
}
module.exports = Nkf;
