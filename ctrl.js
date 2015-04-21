'use strict';

module.exports = ( function() {
  var model;
  var config;
  var app; 

  var log4js = require('log4js');
  var logger = log4js.getLogger();

  var trace_req = function( req ) {
    logger.trace( req.method + ':' + req.url );
  };
  
  return {
    config : function( a_model, a_config, a_app ) {
      model = a_model;
      config = a_config;
      app = a_app;
      return;
    },
    add_controllers : function( ) {

      app.get('/', function( req, res ) {
        trace_req ( req );
        res.redirect('/open');
      });

      app.get('/open', function(req, res) {
        trace_req ( req );
        model.do( 'listjobs', { state: 'OPEN' }, function( modelres ) {
          res.render('joblist', { 
            title: 'Open jobs',   
            showstate: 0,
           jobs: modelres.jobs
         });
        });
      });

      app.get('/all', function(req, res) {
        trace_req ( req );
        model.do( 'listjobs', { }, function( modelres ) {
          res.render('joblist', { 
            title: 'All jobs',   
            showstate: 1,
            jobs: modelres.jobs
          });
        });
      });

      app.get('/create', function(req, res) {
        trace_req( req ) ;
        res.render( 'create', { } );
      });

      app.get('/show/:id', function(req, res){
        trace_req ( req );
        var id = req.params.id;
        logger.info("Showing job " + id );

        model.do( 'getjobinfo', { id: id }, function( getjobinfo ) {
          model.do( 'getentriesforjob', { job_id: id }, function(getentries) {
            res.render('show', { 
              jobinfo: getjobinfo.jobinfo, 
              entries: getentries.entries });
            model.do( 'updateaccess', { job_id: id }, function() {} );
          });
        });
      });

      app.post('/addentry/:id', function( req, res ) {
        trace_req ( req );
        var id = req.params.id;
        var entry = req.body.entry;
        model.do( 'addentry', { job_id: id, entry: entry }, function( addentry ) {
          res.redirect('/show/' + id + '#end');
        });
      });
      
      app.post('/addjob', function( req, res ) {
        trace_req( req );
        model.do( 'addjob', {
          title: req.body.title,
          keywords: req.body.keywords,
          description: req.body.description
        }, function( addjobres ) {
          res.redirect('/show/' + addjobres.created_id );
        });
      });
    },
  };
});




