
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var StaticClock = require( "../lib/clock/StaticClock" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

describe( "Testing lib.clock.StaticClock", function() {
	it( "should return the set time.", function() {

		var clock = new StaticClock();
		var now = Date.now();

		clock.setTickCount( 0 );
		expect( clock.getTickCount() ).to.be.equal( 0 );

		clock.setTickCount( 100 );
		expect( clock.getTickCount() ).to.be.equal( 100 );

		clock.setTickCount( now );
		expect( clock.getTickCount() ).to.be.equal( now );

	});
});
