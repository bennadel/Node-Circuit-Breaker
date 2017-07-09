
// Require the core node modules.
var CircuitBreakerFactory = require( "../" ).CircuitBreakerFactory;

// Require the application modules.
var DangerousApi = require( "./helpers/DangerousApi" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var dangerousApi = new DangerousApi( 10 /* error rate */ );
var dangerousApiCircuit = CircuitBreakerFactory.create();

var chain = Promise.resolve();

for ( let i = 0 ; i < 20 ; i++ ) {

	// When we execute these requests, we're going to chain them in serial so that we 
	// don't just spawn N requests in parallel. This way, one goes after the other.
	chain = chain.then(
		() => {

			var promise = dangerousApiCircuit
				.executeMethod( dangerousApi, "getData", [ i ] )
				.then(
					( result ) => {

						console.log( "[%s] -> Success: %s", i, result );

					},
					( error ) => {

						console.log( "[%s] -> Error: %s", i, error );

					}
				)
			;
			
			return( promise );
			
		}
	);

}
