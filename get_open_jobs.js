
'use strict';
let jobtracking = require('./jobtracking_common.js')();

jobtracking.init().then( function( { config, logger, model } ) {
  model.do( 'listjobs', { state: 'OPEN' } )
    .then ( function( modelres ) {
      logger.info( modelres );
    });
});

