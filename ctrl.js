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

  var sessions = {}; // { token: { user, timestamp } }

  var new_session = function( user ) {
    var token = 'a' + Math.floor(Math.random() * 1000000000);
    sessions[token] = { 
      user: user,
      timestamp: new Date().getTime() 
    };
    return token;
  };

  // see if time given has expired based on config.session_timeout_mins
  var is_expired = function( timestamp ) {
    var expire_time = timestamp + config.session_timeout_mins * 60 * 1000;
    var time_now = new Date().getTime();
    return ( expire_time < time_now );
  };

  var auth = function( req, res, next ) {
    logger.trace("auth:");
    var ok = false;
    var token = req.cookies.jtsession;
    if( token ) {
      logger.trace("jtsession was " + token );
      if( token in sessions && !is_expired( sessions[token].timestamp) ) {
        var user = sessions[token].user;
        sessions[token].timestamp = new Date().getTime();
        logger.trace("session token was for user " + user );
        ok = true;
      } else {
        logger.trace("session token was bad");
      }
    } else {
      logger.trace("no jtsession token");
    }
    if( ok ) {
      // reset the cookie and pass to the next contoller
      set_cookie( res, token );
      next();
    } else {
      res.redirect('/login');
    }
  };

  var set_cookie = function( res, token ) {
    logger.trace("set_cookie: token=" + token );
    //res.cookie( 'jtsession', token, { maxAge: 60 * 1000 } );
    res.cookie( 'jtsession', token );
  };

  var login_ok = function( username, password ) {
    var ok_flag = false;
    if ( username in config.users ) {
      logger.trace("username " + username + " exists");
      if( password === config.users[username] ) {
        logger.trace("password matches");
        ok_flag = true;
      } else {
        logger.trace("password didnt match");
      }
    } else {
      logger.trace("username " + username + " doesnt exist");
    }
    return ok_flag;
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

      app.get('/open', auth, function(req, res) {
        trace_req ( req );
        model.do( 'listjobs', { state: 'OPEN' } )
          .then( function( modelres ) {
          res.render('joblist', { 
            title: 'Open jobs',   
            showstate: 0,
           jobs: modelres.jobs
         });
        });
      });

      app.get('/all', auth, function(req, res) {
        trace_req ( req );
        model.do( 'listjobs', { })
          .then( function( modelres ) {
          res.render('joblist', { 
            title: 'All jobs',   
            showstate: 1,
            jobs: modelres.jobs
          });
        });
      });

      app.get('/create', auth, function(req, res) {
        trace_req( req ) ;
        res.render( 'create', { } );
      });

      app.get('/show/:id', auth, function(req, res){
        trace_req ( req );
        var id = req.params.id;
        logger.info("Showing job " + id );

        Promise.all( [
          model.do( 'getjobinfo', { id: id }),
          model.do( 'getentriesforjob', { job_id: id } )
        ] )
          .then( function( [ getjobinfo, getentries ] ) {
            var next_state = (getjobinfo.jobinfo.state == 'OPEN') ? 'CLOSED' : 'OPEN';
            res.render('show', {
              jobinfo: getjobinfo.jobinfo,
              next_state: next_state,
              entries: getentries.entries });
            return model.do( 'updateaccess', { job_id: id });
          } )
          .then( function() { logger.info("updated access"); } );
      });

      app.get('/command/setstate/:id/:oldstate/:newstate', auth, function( req, res ) {
        trace_req ( req );
        var id = req.params.id;
        var oldstate = req.params.oldstate;
        var newstate = req.params.newstate;
        model.do( 'setstate', { id: id, oldstate: oldstate, newstate: newstate })
          .then( function( ok ) {
          // ingore whether it worked
          res.redirect( '/show/' + id  );
        });
      });

      app.post('/addentry/:id', auth, function( req, res ) {
        trace_req ( req );
        var id = req.params.id;
        var entry = req.body.entry;
        model.do( 'addentry', { job_id: id, entry: entry })
          .then( function( addentry ) {
          res.redirect('/show/' + id + '#end');
        });
      });

      app.post('/addjob', auth, function( req, res ) {
        trace_req( req );
        model.do( 'addjob', {
          title: req.body.title,
          keywords: req.body.keywords,
          description: req.body.description
        })
        .then( function( addjobres ) {
          res.redirect('/show/' + addjobres.created_id );
        });
      });

      app.get('/login', function( req, res ) {
        trace_req( req );
        res.render('login', { message: 'please log in' } );
      });

      app.post('/login', function( req, res ) {
        trace_req ( req );
        var username = req.body.username;
        var password = req.body.password;
        logger.trace( 'username='+username );
        if( login_ok( username, password ) ) {
          // create and set a new cookie
          logger.trace("creating new session");
          set_cookie( res, new_session( username ) );
          res.redirect('/');
        } else {
          logger.trace( 'bad login, waiting 2 seconds' );
          setTimeout( function() {
            res.render('login', { message: 'wrong, try again' } );
          }, 2000 );
        }
      });

    },
  };
});




