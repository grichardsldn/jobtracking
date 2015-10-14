'use strict';


var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('new.cert.key', 'utf8');
var certificate = fs.readFileSync('new.cert.cert', 'utf8');

var credentials = {key: privateKey, cert: certificate};


var log4js = require('log4js');

log4js.loadAppender('file');
//log4js.addAppender(log4js.appenders.console()); 
log4js.addAppender(log4js.appenders.file('logs/jobtracking.log'));

log4js.setGlobalLogLevel('TRACE');

var logger = log4js.getLogger();

logger.info("Starting jobtracking");

var express = require('express');
var app= express();
var bodyParser = require('body-parser');

var cookieParser = require('cookie-parser');
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended: true }) );

var fs = require('fs');
var config_filename = 'config.json';

fs.readFile( config_filename, 'utf8', function( err, data ) {
  if( err) {
    logger.fatal( config_filename + ': ' + err );
    process.exit(1);
  }
  var config;
  try {
    config = JSON.parse( data );
  } catch (err ) {
    logger.fatal( config_filename + ": " + err );
    process.exit(1);
  }

  if( config ) {
    logger.info( config );
    logger.info("Config ok");
    var model = require('./model.js')();
    model.connect( config );

    var ctrl = require('./ctrl.js')();
    ctrl.config( model, config, app );
    ctrl.add_controllers();

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);
httpServer.listen(3000);
//httpsServer.listen(8765);

   // app.listen(3000);
  }
});



