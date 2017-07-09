
// Require the application modules.
var AbstractLoggingMonitor = require( "./AbstractLoggingMonitor" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

// I provide a no-op (No operation) monitor (primarily for when no Monitor is explicitly
// provided to a Circuit Breaker state implementation).
class Monitor {
	
	// I log the point at which the Circuit Breaker state moves from opened to closed.
	logClosed( stateSnapshot ) {
		/* No-operation. */
	}

	// I log the point at which the execution is accepted by the state of the Circuit 
	// Breaker and the underlying command is about to be invoked.
	logExecute( stateSnapshot ) {
		/* No-operation. */
	}

	// I log the point at which the request has entered the Circuit Breaker but has not
	// yet been approved for execution.
	logEmit( stateSnapshot ) {
		/* No-operation. */
	}

	// I log the point at which the execution has ended in error. This only accounts for
	// non-Circuit Breaker errors (see, logTimeout() and logShortCircuited() events).
	logFailure( stateSnapshot, duration, error ) {
		/* No-operation. */
	}

	// I log the point at which a non-successful execution (due to error, timeout, or
	// short-circuiting) is being evaluated for a fallback response.
	logFallbackEmit( stateSnapshot ) {
		/* No-operation. */
	}

	// I log the point at which an existing fallback function resolved in error.
	logFallbackFailure( stateSnapshot, error ) {
		/* No-operation. */
	}

	// I log the point at which a failed execution has no fallback defined.
	logFallbackMissing( stateSnapshot ) {
		/* No-operation. */
	}

	// I log the point at which a fallback value has successfully stood-in for a failed 
	// or bypassed execution.
	logFallbackSuccess( stateSnapshot ) {
		/* No-operation. */
	}

	// I log the point at which the Circuit Breaker state moves from closed to opened.
	logOpened( stateSnapshot ) {
		/* No-operation. */
	}

	// I log the point at which an execution is bypassed because the Circuit Breaker is
	// currently in an opened state.
	logShortCircuited( stateSnapshot, error ) {
		/* No-operation. */
	}

	// I log the point at which an execution has resolved successfully.
	logSuccess( stateSnapshot, duration ) {
		/* No-operation. */
	}

	// I log the point at which a long-running execution has been explicitly timed-out
	// in error.
	logTimeout( stateSnapshot, duration, error ) {
		/* No-operation. */
	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = Monitor;
