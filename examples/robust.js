
// Require the core node modules.
var AbstractLoggingMonitor = require( "../" ).AbstractLoggingMonitor;
var CircuitBreakerFactory = require( "../" ).CircuitBreakerFactory;

// Require the application modules.
var DangerousApi = require( "./helpers/DangerousApi" );
var Logger = require( "./helpers/Logger" );
var StatsD = require( "./helpers/StatsD" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

// Create a custom logger for all of the Circuit Breakers in the app.
class MyMonitor extends AbstractLoggingMonitor {

	constructor( logger, statsd ) {

		super();
		this._logger = logger;
		this._statsd = statsd;

	}

	logEvent( eventType, eventData ) {

		var snapshot = eventData.stateSnapshot;

		if ( eventType === "failure" ) {

			this._logger.error( eventData.error );

		} else if ( eventType === "opened" ) {

			this._logger.warn({
				message: `Circuit breaker ${ snapshot.id } has opened <---------- OH SNAP`
			});

		}

		this._statsd.increment( `circuit-breaker.${ snapshot.id }.${ eventType }` );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var dangerousApi = new DangerousApi( 10 /* error rate */ );
var dangerousApiCircuit = CircuitBreakerFactory.create({
	id: "dangerous-api",
	volumeThreshold: 50,
	failureThreshold: 10, // Percent (once VOLUME_THRESHOLD is reached).
	fallback: "[fallback data payload]", // Optional global fallback for all executions.
	monitor: new MyMonitor( new Logger(), new StatsD() )
});

var chain = Promise.resolve();

for ( let i = 0 ; i < 100 ; i++ ) {

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

chain.catch(
	function( error ) {

		console.log( "We should NEVER GET HERE because we are using fallbacks for the failed API calls." );
		console.log( error );

	}
);
