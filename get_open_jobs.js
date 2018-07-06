
'use strict';
let jobtracking = require('./jobtracking_common.js')();

jobtracking.init().then( function( { config, logger, model } ) {
  model.do( 'listjobs', { state: 'OPEN' }, function( modelres ) {
    logger.info( modelres );
  });

});

