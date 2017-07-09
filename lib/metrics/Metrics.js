
// Require the application modules.
var Clock = require( "../clock/Clock" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var SIX_SECONDS = 6000;

// I provide a generic rolling metrics window that increments arbitrary properties. 
// The metrics window is an aggregation of smaller buckets that allows the window to 
// be cycled without completely resetting the current metric totals.
class Metrics {

	// I initialize the rolling metrics window using the given bucket configuration.
	constructor(
		bucketCount = 10,
		bucketDuration = SIX_SECONDS,
		clock = new Clock()
		) {

		this._bucketCount = bucketCount;
		this._bucketDuration = bucketDuration;
		this._clock = clock;

		this._totalMetrics = Object.create( null );
		this._windowMetrics = Object.create( null );
		this._zeroMetrics = Object.create( null );
		this._duration = ( this._bucketDuration * this._bucketCount );
		this._buckets = [];
		this._activeBucket = null;

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I get the given metric value in the current window.
	get( name ) {

		this._updateBuckets();

		return( this._windowMetrics[ name ] || 0 );

	}


	// I get the given metric value across all windows.
	getTotal( name ) {

		this._updateBuckets();

		return( this._totalMetrics[ name ] || 0 );

	}


	// I increment the given metric.
	increment( name ) {

		this._updateBuckets();

		// If we've never seen this property before, let's add it to all of the 
		// aggregates so that we can simplify subsequent incrementation.
		// --
		// CAUTION: You cannot use .hasOwnProperty() here because we are not inheriting
		// from the Object.prototype when we create the aggregates.
		if ( ! ( name in this._totalMetrics ) ) {

			this._totalMetrics[ name ] = 0;
			this._windowMetrics[ name ] = 0;
			this._zeroMetrics[ name ] = 0;
			this._activeBucket.metrics[ name ] = 0;

		}

		this._totalMetrics[ name ]++;
		this._windowMetrics[ name ]++;
		this._activeBucket.metrics[ name ]++;

	}


	// I reset all the rolling metrics, but keeps the overall totals in tact.
	reset() {

		this._buckets = [];
		this._activeBucket = null;
		this._windowMetrics = Object.assign( Object.create( null ), this._zeroMetrics );

	}


	// ---
	// PRIVATE METHODS.
	// ---


	// I update the buckets, cycling out buckets that have expired, ensuring that there
	// is an active bucket that can be safely consumed.
	_updateBuckets() {

		var now = this._clock.getTickCount();
		var rollingStartedAt = ( now - this._duration );

		// If there are no buckets, or the most recent one has expired, add a new bucket
		// to be used as the currently active bucket.
		if ( ! this._activeBucket || ( this._activeBucket.endedAt <= now ) ) {

			this._activeBucket = {
				startedAt: now,
				endedAt: ( now + this._bucketDuration ),
				metrics: Object.assign( Object.create( null ), this._zeroMetrics )
			};

			this._buckets.push( this._activeBucket );

		}

		// At this point, we may have too many buckets (thanks to the new one just 
		// added); or, we might have old buckets that have expired. Let's keep popping
		// buckets off the back of the window until we've removed outdated buckets and
		// brought the total number of buckets to an acceptable range.
		while ( 
			( this._buckets.length > this._bucketCount ) ||
			( this._buckets[ 0 ].startedAt <= rollingStartedAt )
			) {

			var expiredBucket = this._buckets.shift();

			// Remove the old bucket metrics from the rolling metrics.
			for ( var name of Object.keys( expiredBucket.metrics ) ) {

				this._windowMetrics[ name ] -= expiredBucket.metrics[ name ];

			}

		}

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = Metrics;
