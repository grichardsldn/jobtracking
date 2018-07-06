'use strict';

module.exports = ( function() {
  const configure_logger = function() {
    var log4js = require('log4js');
    let config_filename = 'config.json';


    log4js.configure({
      appenders: { 
        logfile: { type: 'file', filename: 'logs/jobtracking.log' },
        stdout: { type: 'stdout'},
      },
      categories: { default: { appenders: ['stdout'], level: 'trace' } }
    });
    return log4js.getLogger();
  };

  // promise of config
  const get_config = function() {
    let config_filename = 'config.json';
    var fs = require('fs');

    return new Promise( function( resolve, reject ) {
      fs.readFile( config_filename, 'utf8', function( err, data ) {
        if( err) {
          logger.fatal( config_filename + ': ' + err );
          process.exit(1);
        }
        let config;
        try {
          resolve( JSON.parse( data ) );
        } catch (err ) {
          logger.fatal( config_filename + ": " + err );
          reject( err );
        }
      } ); 
    });
  };

  const get_model = function( config ) {
    var model = require('./model.js')();
    model.connect( config );
    return model;
  };
  
  let logger;
  let config;
  let wibble = 10;
  let model;

  return {
    init: function() {
      logger = configure_logger();
      logger.debug("boilerplate: configured logger");
      return new Promise( function( resolve, reject ) {
        get_config().then( function( config ) {
          logger.debug("boilerplate: got config");
          model = get_model( config );
          logger.debug("boilerplate: got model");
          resolve( {config: config, logger: logger, model: model } );
        } );
      } );
    },
  };
} );

