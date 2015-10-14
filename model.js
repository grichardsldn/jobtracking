'use strict';

module.exports = ( function() {
  var connection;
  var mysql = require('mysql');
  var db_params;

  var log4js = require('log4js');
  var logger = log4js.getLogger();
 
  // the table definitions 
  var sql = require('sql');

  var jobtable = sql.define( {
    name: 'job',
    columns: [ 'id', 'state', 'keywords', 'title', 'description' ]
  }); 

  var entrytable = sql.define( {
    name: 'entry',
    columns: [ 'job_ref', 'timestamp', 'entry' ]
  });

  var lastaccesstable = sql.define( {
    name: 'last_access',
    columns: [ 'job_ref', 'last_access' ]
  });

  // misc

  var log_query = function( query ) {
    //console.log(query.toQuery('mysql').text );   
    //console.log(query.toQuery('mysql').values );   
  };

  // The API calls:

  var listjobs = function( params, callback ) {
    var query = jobtable
      .select( 
        jobtable.star(), lastaccesstable.last_access )
      .from( 
        jobtable.leftJoin( lastaccesstable )
          .on( jobtable.id.equals( lastaccesstable.job_ref) ));

    if( params.state !== undefined ) {
      query = query.where( jobtable.state.equals(params.state));
    };
    query = query.order( jobtable.id.descending );
  
    log_query( query ); 

    connection.query( query.toQuery('mysql').text, query.toQuery().values, 
      function( err, rows, fields)  {
      if (err) {
        logger.error( err );
        throw err;
      }

      // hmm, no nice date manipulation I can find.  Also, this is 
      // comparing db clock with local clock, so possibly innacurate, but
      // that is ok.
      for( var i= 0; i < rows.length ; i++ ) {
        var recent = false;
        if( rows[i].last_access !== null ) {
          var access_tick = rows[i].last_access.getTime();
          var lastweek_tick = Date.now() - ( 3600 * 25 * 7 * 1000);
          recent = (access_tick > lastweek_tick)?true:false;
        }
        rows[i].recent = recent;
      }
      callback( { 
        params: params,
        jobs: rows,
        } );
    } );
  };

  // id: <job id>
  var getjobinfo = function( params, callback ) {
    var query = jobtable
      .select( jobtable.star() )
      .from( jobtable )
      .where( jobtable.id.equals( params.id ));
    log_query( query ); 

    connection.query( query.toQuery('mysql').text, query.toQuery().values, 
      function( err, rows, fields)  {
      if (err) {
        logger.error( err );
        throw err;
      }
      callback( { 
        params: params, 
        jobinfo: rows[0],
      } );
    } );
  };

  // job_id: <job id>
  var getentriesforjob = function( params, callback ) {
    var query = jobtable
      .select( entrytable.star() )
      .from( entrytable )
      .where( entrytable.job_ref.equals( params.job_id ));
    log_query( query );

    connection.query( query.toQuery('mysql').text, query.toQuery().values, 
      function( err, rows, fields)  {
      if (err) {
        logger.error( err );
        throw err;
      }
      callback( { params: params, entries: rows } );
    } );
  };

  // title
  // keywords
  // description 
  var addjob = function( params, callback ) {
    logger.info( "Creating job: " + params.title );

    var iquery = jobtable.insert( 
        jobtable.title.value(params.title),
        jobtable.keywords.value(params.keywords),
        jobtable.description.value(params.description),
        jobtable.state.value( 'OPEN' ) );
    log_query( iquery );

    connection.query( iquery.toQuery('mysql').text, iquery.toQuery().values, 
      function( err, rows, fields)  {
      if (err) {
        logger.error( err );
        throw err;
      }
      logger.info( "Created id:" + rows.insertId );
      callback( { params: params, status: 'ok', created_id: rows.insertId } );
    } );
  };

  
  // job_id: <job id>
  // entry: <entry text>
  var addentry = function( params, callback ) {
    logger.info( "Adding entry to job " + params.job_id );

    var query = entrytable.insert( 
        entrytable.job_ref.value(params.job_id),
        entrytable.entry.value( params.entry ) );
    log_query( query );

    connection.query( query.toQuery('mysql').text, query.toQuery().values, 
      function( err, rows, fields)  {
      if (err) {
        logger.error( err );
        throw err;
      }
      callback( { params: params, status: 'ok' } );
    } );
  };

  // job_id: <job id>
  var updateaccess = function( params, callback ) {
    var job_id = params['job_id'];
    var dquery = lastaccesstable.delete()
      .where( lastaccesstable.job_ref.equals( job_id ));
    log_query( dquery );
    connection.query( dquery.toQuery('mysql').text, dquery.toQuery().values, 
      function( err, rows, fields)  {
      if (err) {
        logger.error( err );
        throw err;
      }

      var iquery = lastaccesstable.insert( 
        lastaccesstable.job_ref.value(job_id));
      log_query( iquery );

      connection.query( iquery.toQuery('mysql').text, iquery.toQuery().values, 
        function( err, rows, fields)  {
        if (err) {
          logger.error( err );
          throw err;
        }

        callback( { params: params, status: 'ok' } );
      } );
    } );
  };

  return {
    status : function() {
      return 'ok';
    },

    connect : function( params ) {
      logger.trace( "connect()" );
      var me = this;
      db_params = params;  
      connection = mysql.createConnection( db_params );
      connection.connect( function( err )   {
        if( err ) {
          logger.fatal("Connection failed, aborting: " + err );
          process.exit(1);
        }
        logger.info("db connected");
      });
      connection.on("error", function ( err ) {
        console.info("db error: " + err );
        console.info( err );
        if( !err.fatal ) {
          logger.info("non-fatal - ignoring ");
          return;
        }
        if( err.code !== "PROTOCOL_CONNECTION_LOST" ) {
          logger.error("Throwing error: " + err );
          throw err;
        }
        // try and reconnect again.
        logger.debug("calling connect()");
        me.connect( db_params );
      });
    },
 
    // countjobs countentries 
    do : function( command, params, callback ) {
      var cmds = { 
        listjobs: listjobs,
        getjobinfo: getjobinfo,
        getentriesforjob: getentriesforjob,
        addentry: addentry,
        updateaccess: updateaccess,
        addjob: addjob,
      };
      return cmds[command]( params, callback );
    },
  };
});

