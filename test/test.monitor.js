
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var Monitor = require( "../lib/monitor/Monitor" );
var SharedMonitor = require( "../lib/monitor/SharedMonitor" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

describe( "Testing lib.monitor.Monitor", function() {
	it( "should successfully return undefined on each call.", function() {

		var monitor = new Monitor();
		var snapshot = {};

		// Testing to make sure that none of the calls throw an error.
		expect( monitor.logClosed( snapshot ) ).to.not.exist;
		expect( monitor.logEmit( snapshot ) ).to.not.exist;
		expect( monitor.logFailure( snapshot ) ).to.not.exist;
		expect( monitor.logFallbackEmit( snapshot ) ).to.not.exist;
		expect( monitor.logFallbackFailure( snapshot ) ).to.not.exist;
		expect( monitor.logFallbackMissing( snapshot ) ).to.not.exist;
		expect( monitor.logFallbackSuccess( snapshot ) ).to.not.exist;
		expect( monitor.logOpened( snapshot ) ).to.not.exist;
		expect( monitor.logShortCircuited( snapshot ) ).to.not.exist;
		expect( monitor.logSuccess( snapshot ) ).to.not.exist;
		expect( monitor.logTimeout( snapshot ) ).to.not.exist;

	});

	it( "should be shared globally.", function() {

		expect( SharedMonitor instanceof Monitor ).to.be.true;

	});
});
