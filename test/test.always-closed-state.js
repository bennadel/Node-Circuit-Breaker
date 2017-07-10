
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var InMemoryMonitor = require( "../lib/monitor/InMemoryMonitor" );
var AlwaysClosedState = require( "../lib/state/AlwaysClosedState" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var monitor = null;
var state = null;
var error = new Error( "testing" );
var nonErrorError = new Error( "this isn't really an error - it's a success." );

describe( "Testing lib.state.AlwaysClosedState", function() {
	beforeEach(
		function() {

			monitor = new InMemoryMonitor();
			state = new AlwaysClosedState({
				id: "testingState",
				isFailure: function( error ) {
					return( error !== nonErrorError );
				},
				monitor: monitor
			});

		}
	);

	it( "should report the correct statistics at the onset.", function() {

		expect( state.isClosed() ).to.be.true;
		expect( state.isOpened() ).to.be.false;
		expect( state.getTimeout() ).to.equal( 0 );

		var snapshot = state.getSnapshot();

		expect( snapshot.id ).to.equal( "testingState" );
		expect( snapshot.closed ).to.be.true;
		expect( snapshot.settings.requestTimeout ).to.equal( 0 );
		expect( snapshot.settings.volumeThreshold ).to.equal( 0 );
		expect( snapshot.settings.failureThreshold ).to.equal( 0 );
		expect( snapshot.settings.activeThreshold ).to.equal( 0 );
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
		state.trackExecute();
		state.trackSuccess( 1 );
		state.trackSuccess( 1 );
		state.trackSuccess( 1 );
		state.trackFailure( 1, error );
		state.trackFailure( 1, error );
		state.trackFailure( 1, error );
		state.trackFailure( 1, error );

		var snapshot = state.getSnapshot();

		expect( snapshot.metrics.emit ).to.equal( 1 );
		expect( snapshot.metrics.execute ).to.equal( 2 );
		expect( snapshot.metrics.success ).to.equal( 3 );
		expect( snapshot.metrics.failure ).to.equal( 4 );
		expect( snapshot.metrics.timeout ).to.equal( 0 );
		expect( snapshot.totalMetrics.emit ).to.equal( 1 );
		expect( snapshot.totalMetrics.execute ).to.equal( 2 );
		expect( snapshot.totalMetrics.success ).to.equal( 3 );
		expect( snapshot.totalMetrics.failure ).to.equal( 4 );
		expect( snapshot.totalMetrics.timeout ).to.equal( 0 );

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
		state.trackFailure( 1, error );
		state.trackFallbackEmit();
		state.trackFallbackSuccess();
		expectEvents([ "emit", "execute", "failure", "fallbackEmit", "fallbackSuccess" ]);

		state.trackEmit();
		state.trackExecute();
		state.trackFailure( 1, nonErrorError );
		expectEvents([ "emit", "execute", "success" ]);

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

	});

	it( "should remain closed with many concurrent requests.", function() {

		for ( var i = 0 ; i < 100 ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			expect( state.isClosed() ).to.be.true;
			expect( state.isOpened() ).to.be.false;
			
		}

	});

	it( "should remain closed with many failures.", function() {
		
		for ( var i = 0 ; i < 100 ; i++ ) {

			state.trackEmit();
			state.trackExecute();
			state.trackFailure( 1, error );
			expect( state.isClosed() ).to.be.true;
			expect( state.isOpened() ).to.be.false;

		}

	});

	it( "should not allow a health check to be performed.", function() {
		
		expect( state.canPerformHealthCheck() ).to.be.false;

	});

});
