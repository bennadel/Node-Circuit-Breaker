
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var CircuitBreakerFactory = require( "../lib/CircuitBreakerFactory" );
var InMemoryMonitor = require( "../lib/monitor/InMemoryMonitor" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

describe( "Testing lib.CircuitBreakerFactory", function() {
	it( "should create a circuit breaker with minimal settings.", function() {

		var circuitBreaker = CircuitBreakerFactory.create();

		expect( circuitBreaker ).to.exist;

	});

	it( "should create a circuit breaker with maximal settings.", function() {

		var monitor = new InMemoryMonitor();
		var circuitBreaker = CircuitBreakerFactory.create({
			id: "Tester",
			requestTimeout: 5000,
			volumeThreshold: 10,
			failureThreshold: 10, // Percent.
			activeThreshold: 50,
			isFailure: function( error ) {
				return( false );
			},
			fallback: "global fallback",
			monitor: monitor,
			bucketCount: 30,
			bucketDuration: 1000
		});

		expect( circuitBreaker ).to.exist;

	});

	it( "should create a circuit breaker factory with shared state.", function() {

		var monitor = new InMemoryMonitor();
		var factory = CircuitBreakerFactory.createFactory();

		var circuitBreakerA = factory.create();
		var circuitBreakerB = factory.create();

		expect( circuitBreakerA ).to.exist;
		expect( circuitBreakerB ).to.exist;
		expect( circuitBreakerA ).to.not.equal( circuitBreakerB );

	});

	it( "should create a passive circuit breaker.", function() {

		var monitor = new InMemoryMonitor();
		var circuitBreaker = CircuitBreakerFactory.createPassive({
			monitor: monitor
		});

		expect( circuitBreaker.isClosed() ).to.be.true;

	});

	it( "should create instances with local fallback overrides.", function( done ) {

		var globalFallback = "global fallback";
		var localFallback = "local fallback";

		var monitor = new InMemoryMonitor();
		var factory = CircuitBreakerFactory.createFactory({
			fallback: globalFallback
		});

		var circuitBreakerA = factory.create();
		var circuitBreakerB = factory.create( localFallback );

		function throwError() {

			throw( new Error( "testing" ) );

		}

		Promise
			.all([
				circuitBreakerA.execute( throwError ),
				circuitBreakerB.execute( throwError )
			])
			.then(
				function( results ) {

					expect( results[ 0 ] ).to.equal( globalFallback );
					expect( results[ 1 ] ).to.equal( localFallback );

				}
			)
			.then( nullify( done ), done )
		;

	});

	it( "should log events to the given monitor.", function( done ) {

		var id = "Tester";
		var requestTimeout = 5000;
		var volumeThreshold = 21;
		var failureThreshold = 22;
		var activeThreshold = 23;

		var monitor = new InMemoryMonitor();
		var circuitBreaker = CircuitBreakerFactory.create({
			id: id,
			requestTimeout: requestTimeout,
			volumeThreshold: volumeThreshold,
			failureThreshold: failureThreshold,
			activeThreshold: activeThreshold,
			monitor: monitor
		});

		circuitBreaker
			.execute(
				function() {
					return( "Hello world" );
				}
			)
			.then(
				function() {

					var event = monitor.getEvents().shift();
					expect( event.type ).to.equal( "emit" );
					expect( event.data.stateSnapshot.id ).to.equal( id );
					expect( event.data.stateSnapshot.settings.requestTimeout ).to.equal( requestTimeout );
					expect( event.data.stateSnapshot.settings.volumeThreshold ).to.equal( volumeThreshold );
					expect( event.data.stateSnapshot.settings.failureThreshold ).to.equal( failureThreshold );
					expect( event.data.stateSnapshot.settings.activeThreshold ).to.equal( activeThreshold );
					done();

				},
				done
			)
		;

	});

	it( "should log events to the given monitor function.", function( done ) {

		var id = "Tester";
		var events = [];
		var circuitBreaker = CircuitBreakerFactory.create({
			id: id,
			monitor: function logItem( eventType, eventData ) {

				events.push({
					type: eventType,
					data: eventData
				});

			}
		});

		circuitBreaker
			.execute(
				function() {
					return( "Hello world" );
				}
			)
			.then(
				function() {

					expect( events[ 0 ].type ).to.equal( "emit" );
					expect( events[ 0 ].data.stateSnapshot.id ).to.equal( id );
					done();
					
				},
				done
			)
		;

	});
});


function nullify( done ) {

	return(
		function doneProxy() {
			done();
		}
	);

}
