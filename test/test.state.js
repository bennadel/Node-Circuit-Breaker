
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var InMemoryMonitor = require( "../lib/monitor/InMemoryMonitor" );
var Metrics = require( "../lib/metrics/Metrics" );
var State = require( "../lib/state/State" );
var StaticClock = require( "../lib/clock/StaticClock" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var bucketCount = 2;
var bucketDuration = 1000;
var clock = new StaticClock();
var metrics = null;
var monitor = null
var state = null;
var error = new Error( "testing" );
var invalidBranchError = new Error( "test should not reach this branch." );
var nonErrorError = new Error( "this isn't really an error - it's a success." );
var entireWindow = ( bucketCount * bucketDuration );
var almostEntireWindow = ( entireWindow - 1 );

describe( "Testing lib.state.State", function() {
	var requestTimeout = 30;
	var volumeThreshold = 10;
	var failureThreshold = 5; // 5 percent.
	var activeThreshold = 20;

	beforeEach(
		function() {

			clock.setTickCount( 0 );
			monitor = new InMemoryMonitor();
			metrics = new Metrics( bucketCount, bucketDuration, clock );
			state = new State({
				id: "testingState",
				requestTimeout: requestTimeout,
				volumeThreshold: volumeThreshold,
				failureThreshold: failureThreshold,
				activeThreshold: activeThreshold,
				isFailure: function( error ) {
					return( error !== nonErrorError );
				},
				monitor: monitor,
				metrics: metrics
			});

		}
	);

	it( "should report the correct statistics at the onset.", function() {

		expect( state.isClosed() ).to.be.true;
		expect( state.isOpened() ).to.be.false;
		expect( state.getTimeout() ).to.equal( requestTimeout );

		var snapshot = state.getSnapshot();

		expect( snapshot.id ).to.equal( "testingState" );
		expect( snapshot.closed ).to.be.true;
		expect( snapshot.settings.requestTimeout ).to.equal( requestTimeout );
		expect( snapshot.settings.volumeThreshold ).to.equal( volumeThreshold );
		expect( snapshot.settings.failureThreshold ).to.equal( failureThreshold );
		expect( snapshot.settings.activeThreshold ).to.equal( activeThreshold );
		expect( snapshot.metrics.emit ).to.equal( 0 );
		expect( snapshot.metrics.execute ).to.equal( 0 );
		expect( snapshot.metrics.success ).to.equal( 0 );
		expect( snapshot.metrics.failure ).to.equal( 0 );
		expect( snapshot.metrics.timeout ).to.equal( 0 );
		expect( snapshot.totalMetrics.emit ).to.equal( 0 );
		expect( snapshot.totalMetrics.execute ).to.equal( 0 );
		expect( snapshot.totalMetrics.success ).to.equal( 0 );
		expect( snapshot.totalMetrics.failure ).to.equal( 0 );
		expect( snapshot.totalMetrics.timeout ).to.equal( 0 );
		expect( snapshot.current.activeRequestCount ).to.equal( 0 );

	});

	it( "should report the correct statistics after interaction.", function() {

		state.trackEmit();
		state.trackExecute();
		state.trackEmit();
		state.trackExecute();
		state.trackSuccess( 1 );
		state.trackFailure( 1, error );
		state.trackEmit();
		state.trackExecute();
		state.trackFailure( 1, error );
		state.trackEmit();
		state.trackExecute();
		state.trackTimeout( 1, error );
		state.trackEmit();
		state.trackExecute();
		state.trackTimeout( 1, error );
		state.trackEmit();
		state.trackExecute();
		state.trackTimeout( 1, error );

		var snapshot = state.getSnapshot();

		expect( snapshot.metrics.emit ).to.equal( 6 );
		expect( snapshot.metrics.execute ).to.equal( 6 );
		expect( snapshot.metrics.success ).to.equal( 1 );
		expect( snapshot.metrics.failure ).to.equal( 2 );
		expect( snapshot.metrics.timeout ).to.equal( 3 );
		expect( snapshot.totalMetrics.emit ).to.equal( 6 );
		expect( snapshot.totalMetrics.execute ).to.equal( 6 );
		expect( snapshot.totalMetrics.success ).to.equal( 1 );
		expect( snapshot.totalMetrics.failure ).to.equal( 2 );
		expect( snapshot.totalMetrics.timeout ).to.equal( 3 );

		// Move past the current window to make sure the local window metrics reset.
		clock.incrementTickCount( entireWindow );

		var snapshot = state.getSnapshot();

		expect( snapshot.metrics.emit ).to.equal( 0 );
		expect( snapshot.metrics.execute ).to.equal( 0 );
		expect( snapshot.metrics.success ).to.equal( 0 );
		expect( snapshot.metrics.failure ).to.equal( 0 );
		expect( snapshot.metrics.timeout ).to.equal( 0 );
		expect( snapshot.totalMetrics.emit ).to.equal( 6 );
		expect( snapshot.totalMetrics.execute ).to.equal( 6 );
		expect( snapshot.totalMetrics.success ).to.equal( 1 );
		expect( snapshot.totalMetrics.failure ).to.equal( 2 );
		expect( snapshot.totalMetrics.timeout ).to.equal( 3 );

	});

	it( "should log all events to the monitor.", function() {

		state.trackEmit();
		state.trackExecute();
		state.trackSuccess( 1 );
		expectEvents([ "emit", "execute", "success" ]);

		state.trackEmit();
		state.trackExecute();
		state.trackFailure( 1, error );
		state.trackFallbackEmit();
		state.trackFallbackMissing();
		expectEvents([ "emit", "execute", "failure", "fallbackEmit", "fallbackMissing" ]);

		state.trackEmit();
		state.trackExecute();
		state.trackShortCircuited( 1 );
		state.trackFallbackEmit();
		state.trackFallbackSuccess();
		expectEvents([ "emit", "execute", "shortCircuited", "fallbackEmit", "fallbackSuccess" ]);

		state.trackEmit();
		state.trackExecute();
		state.trackShortCircuited( 1 );
		state.trackFallbackEmit();
		state.trackFallbackFailure();
		expectEvents([ "emit", "execute", "shortCircuited", "fallbackEmit", "fallbackFailure" ]);

		state.trackEmit();
		state.trackExecute();
		state.trackTimeout( 1, error );
		state.trackFallbackEmit();
		state.trackFallbackMissing();
		expectEvents([ "emit", "execute", "timeout", "fallbackEmit", "fallbackMissing" ]);

		state.trackEmit();
		state.trackExecute();
		state.trackFailure( 1, nonErrorError );
		expectEvents([ "emit", "execute", "success" ]);

		// Get to active threshold.
		for ( var i = 0 ; i < activeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();

		}

		monitor.clearEvents();
		state.trackEmit();
		state.trackSuccess( 1 );
		expectEvents([ "opened", "emit", "closed", "success" ]);


		// Utility method to check events and then reset the event log.
		function expectEvents( names ) {

			var events = monitor.getEvents();
			var i = 0;

			for ( var name of names ) {

				expect( events[ i++ ].type ).to.equal( name );

			}

			expect( events.length ).to.equal( i );
			monitor.clearEvents();

		}

	});

	it( "should adjust the active request count.", function() {

		state.trackEmit();
		state.trackExecute();
		expect( state.getSnapshot().current.activeRequestCount ).to.equal( 1 );
		state.trackEmit();
		state.trackExecute();
		expect( state.getSnapshot().current.activeRequestCount ).to.equal( 2 );
		state.trackSuccess( 1 );
		expect( state.getSnapshot().current.activeRequestCount ).to.equal( 1 );
		state.trackFailure( 1, error );
		expect( state.getSnapshot().current.activeRequestCount ).to.equal( 0 );
		state.trackEmit();
		state.trackExecute();
		state.trackEmit();
		state.trackExecute();
		expect( state.getSnapshot().current.activeRequestCount ).to.equal( 2 );
		state.trackTimeout( 1, error );
		expect( state.getSnapshot().current.activeRequestCount ).to.equal( 1 );
		state.trackShortCircuited( error );
		expect( state.getSnapshot().current.activeRequestCount ).to.equal( 0 );

	});

	it( "should open after active request threshold is reached.", function() {

		for ( var i = 0 ; i < activeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			expect( state.isClosed() ).to.be.true;
			
		}

		state.trackEmit();
		expect( state.isOpened() ).to.be.true;
		
		state.trackSuccess( 1 );
		expect( state.isClosed() ).to.be.true;

		for ( var i = 0 ; i < activeThreshold ; i++ ) {

			state.trackSuccess( 1 );
			expect( state.isClosed() ).to.be.true;
			
		}

	});

	it( "should open after the failure (error) threshold is reached.", function() {
		
		// Get past the volume threshold so the failure can be applied.
		for ( var i = 0 ; i < volumeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackSuccess( 1 );

		}

		var failCountToReachPercent = Math.floor( volumeThreshold * failureThreshold / 100 );

		for ( var i = 0 ; i < failCountToReachPercent ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackFailure( 1, error );
			expect( state.isClosed() ).to.be.true;

		}

		state.trackEmit();
		state.trackExecute();
		state.trackFailure( 1, error );
		expect( state.isOpened() ).to.be.true;

	});

	it( "should open after the failure (timeout) threshold is reached.", function() {
		
		// Get past the volume threshold so the failure can be applied.
		for ( var i = 0 ; i < volumeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackSuccess( 1 );

		}

		var failCountToReachPercent = Math.floor( volumeThreshold * failureThreshold / 100 );

		for ( var i = 0 ; i < failCountToReachPercent ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackTimeout( 1, error );
			expect( state.isClosed() ).to.be.true;

		}

		state.trackEmit();
		state.trackExecute();
		state.trackTimeout( 1, error );
		expect( state.isOpened() ).to.be.true;

	});

	it( "should wait some time until a health check can be performed.", function() {
		
		// Get past the volume threshold so the failure can be applied.
		for ( var i = 0 ; i < volumeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackFailure( 1, error );

		}

		expect( state.isOpened() ).to.be.true;
		expect( state.canPerformHealthCheck() ).to.be.false;

		clock.incrementTickCount( almostEntireWindow );
		expect( state.canPerformHealthCheck() ).to.be.false;

		clock.incrementTickCount( 2 );
		expect( state.canPerformHealthCheck() ).to.be.true;

	});

	it( "should deny health check if at capacity.", function() {
		
		for ( var i = 0 ; i < activeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();

		}

		// Take it from AT capacity to OVER capacity.
		state.trackEmit();
		expect( state.isOpened() ).to.be.true;
		expect( state.canPerformHealthCheck() ).to.be.false;

		clock.incrementTickCount( almostEntireWindow )
		expect( state.canPerformHealthCheck() ).to.be.false;

		clock.incrementTickCount( 2 )
		expect( state.canPerformHealthCheck() ).to.be.false;

	});

	it( "shouldn't fail (on error) until volume threshold is met.", function() {

		// Get just up to the volume threshold so the failure can be applied after.
		for ( var i = 0 ; i < ( volumeThreshold - 1 ) ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackFailure( 1, error );
			expect( state.isOpened() ).to.be.false;

		}

		state.trackEmit();
		state.trackExecute();
		state.trackFailure( 1, error );
		expect( state.isOpened() ).to.be.true;
		
	});

	it( "shouldn't fail (on timeout) until volume threshold is met.", function() {

		// Get just up to the volume threshold so the failure can be applied after.
		for ( var i = 0 ; i < ( volumeThreshold - 1 ) ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackTimeout( 1, error );
			expect( state.isOpened() ).to.be.false;

		}

		state.trackEmit();
		state.trackExecute();
		state.trackTimeout( 1, error );
		expect( state.isOpened() ).to.be.true;
		
	});

	it( "should wait until success to close unhealthy circuit.", function() {

		for ( var i = 0 ; i < volumeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackTimeout( 1, error );

		}
		
		expect( state.isOpened() ).to.be.true;
		expect( state.canPerformHealthCheck() ).to.be.false;

		clock.incrementTickCount( entireWindow );
		expect( state.canPerformHealthCheck() ).to.be.true;

		state.trackEmit();
		state.trackExecute();
		state.trackFailure( 1, error );
		expect( state.isOpened() ).to.be.true;

		expect( state.canPerformHealthCheck() ).to.be.false;
		clock.incrementTickCount( entireWindow );
		expect( state.canPerformHealthCheck() ).to.be.true;

		state.trackEmit();
		state.trackExecute();

		// We are not allowed to have more than once health check running at a time. As
		// such, this second emit / execute should throw.
		try {
			state.trackEmit();
			state.trackExecute();
			throw( invalidBranchError );
		} catch ( error ) {
			// We expect this to happen... ignore.
		}

		expect( state.isOpened() ).to.be.true;

		expect( state.canPerformHealthCheck() ).to.be.false;
		clock.incrementTickCount( entireWindow );
		expect( state.canPerformHealthCheck() ).to.be.true;

		state.trackTimeout( 1, error );
		expect( state.isOpened() ).to.be.true;

		expect( state.canPerformHealthCheck() ).to.be.false;
		clock.incrementTickCount( entireWindow );
		expect( state.canPerformHealthCheck() ).to.be.true;

		state.trackEmit();
		state.trackExecute();
		state.trackSuccess( 1 );
		expect( state.isClosed() ).to.be.true;

	});

	it( "should not fail with non-error errors.", function() {

		for ( var i = 0 ; i < volumeThreshold ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackFailure( 1, nonErrorError );

		}
		
		expect( state.isClosed() ).to.be.true;

	});
});
