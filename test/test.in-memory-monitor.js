
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var InMemoryMonitor = require( "../lib/monitor/InMemoryMonitor" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

describe( "Testing lib.monitor.InMemoryMonitor", function() {
	it( "should record each event in order.", function() {

		var monitor = new InMemoryMonitor();

		var emitError = new Error( "emit failure" );
		var fallbackError = new Error( "fallback failure" );
		var duration = 100;
		var snapshot = {};

		monitor.logClosed( snapshot );
		monitor.logEmit( snapshot );
		monitor.logExecute( snapshot );
		monitor.logFailure( snapshot, duration, emitError );
		monitor.logFallbackEmit( snapshot );
		monitor.logFallbackFailure( snapshot, fallbackError );
		monitor.logFallbackMissing( snapshot );
		monitor.logFallbackSuccess( snapshot );
		monitor.logOpened( snapshot );
		monitor.logShortCircuited( snapshot, emitError );
		monitor.logSuccess( snapshot );
		monitor.logTimeout( snapshot, duration, emitError );

		var events = monitor.getEvents();
		var i = 0;

		expect( events.length ).to.equal( 12 );
		expect( events[ i++ ].type ).to.equal( "closed" );
		expect( events[ i++ ].type ).to.equal( "emit" );
		expect( events[ i++ ].type ).to.equal( "execute" );
		expect( events[ i++ ].type ).to.equal( "failure" );
		expect( events[ i++ ].type ).to.equal( "fallbackEmit" );
		expect( events[ i++ ].type ).to.equal( "fallbackFailure" );
		expect( events[ i++ ].type ).to.equal( "fallbackMissing" );
		expect( events[ i++ ].type ).to.equal( "fallbackSuccess" );
		expect( events[ i++ ].type ).to.equal( "opened" );
		expect( events[ i++ ].type ).to.equal( "shortCircuited" );
		expect( events[ i++ ].type ).to.equal( "success" );
		expect( events[ i++ ].type ).to.equal( "timeout" );

	});
});
