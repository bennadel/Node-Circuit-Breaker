
// Require the core node modules.
var CircuitBreakerFactory = require( "../" ).CircuitBreakerFactory;
var Monitor = require( "../" ).Monitor;

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

class RemoteAPI {

	getData( value ) {

		if ( Math.random() > 0.5 ) {

			throw( new Error( "Network Error" ) );

		}

		return( `[data payload for value ${ value }]` );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

class AppMonitor extends Monitor {

	logOpened( stateSnapshot ) {

		console.log( "******************************************" );
		console.log( "**** Circuit Breaker has failed open. ****" );
		console.log( "******************************************" );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var remoteApi = new RemoteAPI();

var remoteApiCircuit = CircuitBreakerFactory.create({
	id: "Remote API Circuit Breaker",
	volumeThreshold: 30,
	failureThreshold: 10, // Percent (once VOLUME_THRESHOLD is reached).
	fallback: "[fallback data payload]", // Optional global fallback for all executions.
	monitor: new AppMonitor()
});


var chain = Promise.resolve();

// Let's run the experiment in a serial fashion so Math.random() doesn't have a streak
// of like-values.
for ( let i = 0 ; i < 100 ; i++ ) {

	chain = chain.then(
		function() {

			var promise = remoteApiCircuit
				.executeMethod( remoteApi, "getData", [ i ] )
				.then(
					function handleSuccess( result ) {

						console.log( "Success:", result );

					}
				)
			;

			return( promise );

		}
	);
	
}

chain.catch(
	function( error ) {

		console.log( "We should NEVER GET HERE because we are using fallbacks for the failed API calls." );
		console.log( error );

	}
);
