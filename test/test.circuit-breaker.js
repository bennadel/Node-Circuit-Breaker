
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var CircuitBreaker = require( "../lib/CircuitBreaker" );
var InMemoryMonitor = require( "../lib/monitor/InMemoryMonitor" );
var Metrics = require( "../lib/metrics/Metrics" );
var OpenError = require( "../lib/error/OpenError" );
var State = require( "../lib/state/State" );
var TimeoutError = require( "../lib/error/TimeoutError" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var bucketCount = 2;
var bucketDuration = 100;
var metrics = null;
var monitor = new InMemoryMonitor();
var state = null;
var circuitBreaker = null;
var error = new Error( "testing" );
var invalidBranchError = new Error( "test should not reach this branch." );
var entireWindow = ( bucketCount * bucketDuration );
var almostEntireWindow = ( entireWindow - 30 );
var context = {
	value: Date.now(),
	valueMethod: function() {
		return( this.value );
	},
	echoMethod: function( value ) {
		return( value );
	},
	throwMethod: function() {
		throw( error );
	},
	rejectMethod: function() {
		return( Promise.reject( error ) );
	}
};

describe( "Testing lib.CircuitBreaker", function() {
	describe( "with no global fallback", function() {
		var requestTimeout = 30;
		var volumeThreshold = 10;
		var failureThreshold = 5; // 5 percent.
		var activeThreshold = 20;

		beforeEach(
			function() {

				monitor.clearEvents();
				metrics = new Metrics( bucketCount, bucketDuration );
				state = new State({
					id: "testingState",
					requestTimeout: requestTimeout,
					volumeThreshold: volumeThreshold,
					failureThreshold: failureThreshold,
					activeThreshold: activeThreshold,
					monitor: monitor,
					metrics: metrics
				});
				circuitBreaker = new CircuitBreaker( state );

			}
		);

		it( "should execute a function reference.", function( done ) {

			circuitBreaker
				.execute( 
					function() {
						
						return( 1 );

					}
				)
				.then(
					function( result ) {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should execute a function reference in a given context.", function( done ) {

			circuitBreaker
				.executeInContext( context, context.valueMethod )
				.then(
					function( result ) {

						expect( result ).to.equal( context.value );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should execute a method.", function( done ) {

			circuitBreaker
				.executeMethod( context, "valueMethod", [] )
				.then(
					( result ) => {

						expect( result ).to.equal( context.value );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use a fallback when executing a function reference.", function( done ) {

			var fallbackValue = "fallbackValue";

			circuitBreaker
				.execute( context.throwMethod, fallbackValue )
				.then(
					function( result ) {

						expect( result ).to.equal( fallbackValue );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use a fallback when executing a function reference in a given context.", function( done ) {

			var fallbackValue = "fallbackValue";

			circuitBreaker
				.executeInContext( context, context.throwMethod, [], fallbackValue )
				.then(
					function( result ) {

						expect( result ).to.equal( fallbackValue );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use a fallback when executing a method.", function( done ) {

			var fallbackValue = "fallbackValue";

			circuitBreaker
				.executeMethod( context, "throwMethod", [], fallbackValue )
				.then(
					( result ) => {

						expect( result ).to.equal( fallbackValue );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should allow returning a promise value.", function( done ) {

			circuitBreaker
				.execute(
					function() {

						return( Promise.resolve( 1 ) );

					}
				)
				.then(
					( result ) => {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should parle rejected promise value into error.", function( done ) {

			circuitBreaker
				.execute(
					function() {

						return( Promise.reject( error ) );

					}
				)
				.then(
					function( result ) {

						throw( invalidBranchError );

					},
					function( result ) {

						expect( result ).to.equal( error );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should allow returning a promise fallback value.", function( done ) {

			circuitBreaker
				.execute(
					context.throwMethod,
					function() {

						return( Promise.resolve( 1 ) );

					}
				)
				.then(
					( result ) => {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should allow using a promise fallback value.", function( done ) {

			var fallback = Promise.resolve( 1 );

			circuitBreaker
				.execute( context.throwMethod, fallback )
				.then(
					( result ) => {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should pass arguments to function.", function( done ) {

			circuitBreaker
				.executeInContext( null, context.echoMethod, [ 1 ] )
				.then(
					( result ) => {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should pass arguments to method.", function( done ) {

			circuitBreaker
				.executeMethod( context, "echoMethod", [ 1 ] )
				.then(
					( result ) => {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should pass arguments to function fallback.", function( done ) {

			circuitBreaker
				.executeInContext( null, context.throwMethod, [ 1 ], context.echoMethod )
				.then(
					( result ) => {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should pass arguments to method fallback.", function( done ) {

			circuitBreaker
				.executeMethod( context, "throwMethod", [ 1 ], context.echoMethod )
				.then(
					( result ) => {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should short-circuit when failing.", function( done ) {

			var promise = Promise.resolve();

			// Get to just under the volume threshold of errors.
			for ( var i = 0 ; i < ( volumeThreshold - 1 ) ; i++ ) {

				promise = promise.then(
					function() {

						var executePromise = circuitBreaker.execute( context.throwMethod, 1 );

						return( executePromise );

					}
				);

			}

			promise
				.then(
					function() {

						expect( circuitBreaker.isClosed() ).to.be.true;

					},
					function() {

						throw( invalidBranchError );

					}
				)
				.then(
					function() {

						// Reach the failure threshold and the volume threshold.
						var executePromise = circuitBreaker.execute( context.throwMethod, 1 );

						return( executePromise );

					}
				)
				.then(
					function() {

						expect( circuitBreaker.isOpened() ).to.be.true;

						var executePromise = circuitBreaker.execute(
							function() {

								return( 1 );

							}
						);

						return( executePromise );

					}
				)
				.then(
					function() {

						throw( invalidBranchError );

					},
					function( resultError ) {

						expect( resultError instanceof OpenError ).to.be.true;

					}
				)
				.then( nullify( done ), done )
			;

		});

		// ------------------------------------------------------------------------------- //
		// ------------------------------------------------------------------------------- //
		// CAUTION: The following tests use requests that have to hang for some period of 
		// time in order to test capacity and timeout restrictions.
		// ------------------------------------------------------------------------------- //
		// ------------------------------------------------------------------------------- //

		it( "should log events to the monitor.", function( done ) {

			Promise
				.all([
					circuitBreaker.executeMethod( context, "valueMethod" ),
					circuitBreaker.executeMethod( context, "rejectMethod", [], "fallback value" ),
					circuitBreaker.executeInContext( null, timer, [ requestTimeout + 10 ] ).catch( context.echoMethod )
				])
				.then(
					function() {

						var events = monitor.getEvents();
						var i = 0;

						expect( events[ i++ ].type ).to.equal( "emit" );
						expect( events[ i++ ].type ).to.equal( "execute" );
						expect( events[ i++ ].type ).to.equal( "emit" );
						expect( events[ i++ ].type ).to.equal( "execute" );
						expect( events[ i++ ].type ).to.equal( "emit" );
						expect( events[ i++ ].type ).to.equal( "execute" );

						expect( events[ i++ ].type ).to.equal( "success" );

						expect( events[ i++ ].type ).to.equal( "failure" );
						expect( events[ i++ ].type ).to.equal( "fallbackEmit" );
						expect( events[ i++ ].type ).to.equal( "fallbackSuccess" );

						expect( events[ i++ ].type ).to.equal( "timeout" );
						expect( events[ i++ ].type ).to.equal( "fallbackEmit" );
						expect( events[ i++ ].type ).to.equal( "fallbackMissing" );

						expect( events.length ).to.equal( i );

					}
				)
				.then(
					function() {

						var promise = timer( requestTimeout - 10 );
						var promises = [];

						// Exhaust AND EXCEED active threshold by one.
						for ( var i = 0 ; i <= activeThreshold ; i++ ) {

							monitor.clearEvents();
							promises.push( circuitBreaker.executeMethod( context, "echoMethod", [ promise ], "fallback value" ) );

						}

						return( Promise.all( promises ) );

					}
				)
				.then(
					function() {

						var events = monitor.getEvents();
						var i = 0;

						expect( events[ i++ ].type ).to.equal( "opened" );
						expect( events[ i++ ].type ).to.equal( "emit" );
						expect( events[ i++ ].type ).to.equal( "closed" );
						expect( events[ i++ ].type ).to.equal( "shortCircuited" );
						expect( events[ i++ ].type ).to.equal( "fallbackEmit" );
						expect( events[ i++ ].type ).to.equal( "fallbackSuccess" );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should timeout request.", function( done ) {

			circuitBreaker
				.execute(
					function() {

						return( timer( requestTimeout + 30 ) );

					}
				)
				.then(
					function() {

						throw( invalidBranchError );

					},
					function( resultError ) {

						expect( resultError instanceof TimeoutError ).to.be.true;

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should short-circuit when at capacity.", function( done ) {

			var promise = timer( requestTimeout - 1 );
			var promises = [];

			// Exhaust active threshold.
			for ( var i = 0 ; i < activeThreshold ; i++ ) {

				promises.push(
					circuitBreaker
						.execute(
							function() {

								return( promise );

							}
						)
						.then(
							function( result ) {

								expect( result ).to.equal( undefined );

							}
						)	
				);

			}

			// Push to over-capacity.
			promises.push(
				circuitBreaker
						.execute(
							function() {

								return( promise );

							}
						)
						.then(
							function( result ) {

								throw( invalidBranchError );

							},
							function( resultError ) {

								expect( resultError instanceof OpenError ).to.be.true;

							}
						)	
			);

			Promise
				.all(promises)
				.then( nullify( done ), done )
			;

		});

		it( "should wait until a health check request can be sent.", function( done ) {

			var promises = [];

			// Exhaust the error threshold.
			for ( var i = 0 ; i < volumeThreshold ; i++ ) {

				promises.push(
					circuitBreaker.execute(
						function() {

							throw( error );

						},
						1 // Fallback so it doesn't "reject" later down.
					)
				);
				
			}

			Promise
				.all( promises )
				.then(
					function() {

						expect( circuitBreaker.isClosed() ).to.be.false;
						expect( circuitBreaker.isOpened() ).to.be.true;

						return( timer( almostEntireWindow ) );

					}
				)
				.then(
					function() {

						// We should still be in the failure window, so this should error.
						var promise = circuitBreaker.execute(
							function() {

								return( 1 );

							},
							2 // Fallback so it doesn't "reject" later down.
						);

						return( promise );

					}
				)
				.then(
					function( result ) {

						expect( result ).to.equal( 2 );

						return( timer( entireWindow + 10 ) );

					}
				)
				.then(
					function() {

						// We should be beyond the failure window, so this should work.
						var promise = circuitBreaker.execute(
							function() {

								return( 1 );

							}
						);

						return( promise );

					}
				)
				.then(
					function( result ) {

						expect( result ).to.equal( 1 );

					}
				)
				.then( nullify( done ), done )
			;

		});
	});
	
	describe( "with a global fallback", function() {
		var requestTimeout = 30;
		var volumeThreshold = 10;
		var failureThreshold = 5; // 5 percent.
		var activeThreshold = 20;
		var globalFallback = "global fallback";
		var fallbackOverride = "local fallback";

		beforeEach(
			function() {

				monitor.clearEvents();
				metrics = new Metrics( bucketCount, bucketDuration );
				state = new State({
					id: "testingState",
					requestTimeout: requestTimeout,
					volumeThreshold: volumeThreshold,
					failureThreshold: failureThreshold,
					activeThreshold: activeThreshold,
					monitor: monitor,
					metrics: metrics
				});
				circuitBreaker = new CircuitBreaker( state, globalFallback );

			}
		);

		it( "should use global fallback when executing a function reference.", function( done ) {

			circuitBreaker
				.execute( context.throwMethod )
				.then(
					function( result ) {

						expect( result ).to.equal( globalFallback );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use global fallback when executing a function reference in a given context.", function( done ) {

			circuitBreaker
				.executeInContext( context, context.throwMethod, [] )
				.then(
					function( result ) {

						expect( result ).to.equal( globalFallback );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use global fallback when executing a method.", function( done ) {

			circuitBreaker
				.executeMethod( context, "throwMethod", [] )
				.then(
					( result ) => {

						expect( result ).to.equal( globalFallback );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use local fallback override when executing a function reference.", function( done ) {

			circuitBreaker
				.execute( context.throwMethod, fallbackOverride )
				.then(
					function( result ) {

						expect( result ).to.equal( fallbackOverride );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use local fallback override when executing a function reference in a given context.", function( done ) {

			circuitBreaker
				.executeInContext( context, context.throwMethod, [], fallbackOverride )
				.then(
					function( result ) {

						expect( result ).to.equal( fallbackOverride );

					}
				)
				.then( nullify( done ), done )
			;

		});

		it( "should use local fallback override when executing a method.", function( done ) {

			circuitBreaker
				.executeMethod( context, "throwMethod", [], fallbackOverride )
				.then(
					( result ) => {

						expect( result ).to.equal( fallbackOverride );

					}
				)
				.then( nullify( done ), done )
			;

		});
	});
});


function nullify( done ) {

	return(
		function doneProxy() {
			done();
		}
	);

}


function timer( timeout ) {

	var promise = new Promise(
		function( resolve, reject ) {

			setTimeout( resolve, timeout );

		}
	);

	return( promise );

}
