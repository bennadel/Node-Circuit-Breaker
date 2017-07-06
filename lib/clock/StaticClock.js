
// I provide a Clock that will return arbitrary time (for testing purposes).
class StaticClock {

	// I initialize the static clock with the given UTC milliseconds.
	constructor( newNow = 0 ) {

		this.setTickCount( newNow );

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I return the UTC milliseconds.
	getTickCount() {

		return( this._now );

	}


	// I increment the UTC milliseconds using the given millisecond delta.
	incrementTickCount( delta ) {

		this._now += delta;

	}


	// I set the UTC milliseconds.
	setTickCount( newNow ) {

		this._now = newNow;

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = StaticClock;
