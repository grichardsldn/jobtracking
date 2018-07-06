var log4js = require('log4js');
let config_filename = 'config.json';


log4js.configure({
  appenders: { 
    logfile: { type: 'file', filename: 'logs/jobtracking.log' },
    stdout: { type: 'stdout'},
   },
  categories: { default: { appenders: ['stdout'], level: 'trace' } }
});

var logger = log4js.getLogger();

logger.info("Starting");

var fs = require('fs');

fs.readFile( config_filename, 'utf8', function( err, data ) {
  if( err) {
    logger.fatal( config_filename + ': ' + err );
    process.exit(1);
  }
  let config;
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
  }
  logger.info("Started usemodel.js");

  model.do( 'getentriesforjob', { job_id: '542' }, function( modelres ) {
    logger.info( modelres );
  });
});


