
// I provide a Clock that returns the current UTC milliseconds.
class Clock {

	// I return the UTC milliseconds.
	getTickCount() {

		return( Date.now() );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = Clock;
