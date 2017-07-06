
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var Clock = require( "../lib/clock/Clock" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

describe( "Testing lib.clock.Clock", function() {
	it( "should return the current time.", function() {

		var clock = new Clock();
		var now = Date.now();

		expect( clock.getTickCount() ).to.be.within( now, ( now + 100 ) );

	});
});
