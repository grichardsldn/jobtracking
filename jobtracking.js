'use strict';


var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('new.cert.key', 'utf8');
var certificate = fs.readFileSync('new.cert.cert', 'utf8');

var credentials = {key: privateKey, cert: certificate};


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

let jobtracking = require('./jobtracking_common.js')();
jobtracking.init().then( function( { config, logger, model } ) {
  logger.info( config );
  logger.info("Config ok");
  model.connect( config );

  var ctrl = require('./ctrl.js')();
  ctrl.config( model, config, app );
  ctrl.add_controllers();

  var httpServer = http.createServer(app);
  var httpsServer = https.createServer(credentials, app);
  //httpServer.listen(3000);
  httpsServer.listen(3000);
});



