
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var Metrics = require( "../lib/metrics/Metrics" );
var StaticClock = require( "../lib/clock/StaticClock" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

describe( "Testing lib.metrics.Metrics", function() {
	it( "should aggregate metrics within the given rolling window.", function() {

		var bucketCount = 2;
		var bucketDuration = 1000;
		var clock = new StaticClock();
		var metrics = new Metrics( bucketCount, bucketDuration, clock );

		// Should write to the first bucket.
		metrics.increment( "a" );
		metrics.increment( "a" );
		metrics.increment( "z" );
		expect( metrics.get( "a" ) ).to.equal( 2 );
		expect( metrics.getTotal( "a" ) ).to.equal( 2 );
		expect( metrics.get( "z" ) ).to.equal( 1 );
		expect( metrics.getTotal( "z" ) ).to.equal( 1 );

		clock.incrementTickCount( bucketDuration );

		// Should write to the second bucket.
		metrics.increment( "a" );
		metrics.increment( "a" );
		metrics.increment( "z" );
		expect( metrics.get( "a" ) ).to.equal( 4 );
		expect( metrics.getTotal( "a" ) ).to.equal( 4 );
		expect( metrics.get( "z" ) ).to.equal( 2 );
		expect( metrics.getTotal( "z" ) ).to.equal( 2 );

		clock.incrementTickCount( bucketDuration );

		// Should write to the third bucket -- but first bucket should be expunged.
		metrics.increment( "a" );
		metrics.increment( "a" );
		metrics.increment( "z" );
		expect( metrics.get( "a" ) ).to.equal( 4 );
		expect( metrics.getTotal( "a" ) ).to.equal( 6 );
		expect( metrics.get( "z" ) ).to.equal( 2 );
		expect( metrics.getTotal( "z" ) ).to.equal( 3 );

		clock.incrementTickCount( bucketDuration );

		// Only one bucket should be active.
		expect( metrics.get( "a" ) ).to.equal( 2 );
		expect( metrics.getTotal( "a" ) ).to.equal( 6 );
		expect( metrics.get( "z" ) ).to.equal( 1 );
		expect( metrics.getTotal( "z" ) ).to.equal( 3 );

		clock.incrementTickCount( bucketDuration );

		// No buckets should be active, only totals should carry a value.
		expect( metrics.get( "a" ) ).to.equal( 0 );
		expect( metrics.getTotal( "a" ) ).to.equal( 6 );
		expect( metrics.get( "z" ) ).to.equal( 0 );
		expect( metrics.getTotal( "z" ) ).to.equal( 3 );

	});

	it( "should phase metrics out due to inactivity.", function() {

		var bucketCount = 5;
		var bucketDuration = 1000;
		var clock = new StaticClock();
		var metrics = new Metrics( bucketCount, bucketDuration, clock );

		metrics.increment( "a" );
		expect( metrics.get( "a" ) ).to.equal( 1 );
		expect( metrics.getTotal( "a" ) ).to.equal( 1 );

		clock.incrementTickCount( bucketDuration * bucketCount );

		// All metrics should be moved out of the rolling window at this point.
		expect( metrics.get( "a" ) ).to.equal( 0 );
		expect( metrics.getTotal( "a" ) ).to.equal( 1 );

	});

	it( "should return zero for unknown metrics.", function() {

		var bucketCount = 2;
		var bucketDuration = 1000;
		var metrics = new Metrics( bucketCount, bucketDuration );

		expect( metrics.get( "missing" ) ).to.equal( 0 );

	});

	it( "should reset metrics.", function() {

		var bucketCount = 5;
		var bucketDuration = 1000;
		var clock = new StaticClock();
		var metrics = new Metrics( bucketCount, bucketDuration, clock );

		metrics.increment( "a" );
		expect( metrics.get( "a" ) ).to.equal( 1 );

		metrics.reset();
		expect( metrics.get( "a" ) ).to.equal( 0 );

	});
});
