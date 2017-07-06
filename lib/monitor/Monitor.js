
// I provide a no-op (No operation) monitor. This is a class that other monitor 
// implementations can extend if they don't want to implement the entire monitor API.
class Monitor {

	logClosed( stateSnapshot ) {
		/* No-op monitor. Override this function to log data. */
	}


	logExecute( stateSnapshot ) {
		/* No-op monitor. Override this function to log data. */
	}


	logEmit( stateSnapshot ) {
		/* No-op monitor. Override this function to log data. */
	}


	logFailure( stateSnapshot, duration, error ) {
		/* No-op monitor. Override this function to log data. */
	}


	logFallbackEmit( stateSnapshot ) {
		/* No-op monitor. Override this function to log data. */
	}


	logFallbackFailure( stateSnapshot, error ) {
		/* No-op monitor. Override this function to log data. */
	}


	logFallbackMissing( stateSnapshot ) {
		/* No-op monitor. Override this function to log data. */
	}


	logFallbackSuccess( stateSnapshot ) {
		/* No-op monitor. Override this function to log data. */
	}


	logOpened( stateSnapshot ) {
		/* No-op monitor. Override this function to log data. */
	}


	logShortCircuited( stateSnapshot, error ) {
		/* No-op monitor. Override this function to log data. */
	}


	logSuccess( stateSnapshot, duration ) {
		/* No-op monitor. Override this function to log data. */
	}


	logTimeout( stateSnapshot, duration, error ) {
		/* No-op monitor. Override this function to log data. */
	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = Monitor;
