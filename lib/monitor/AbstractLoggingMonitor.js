
// I provide an abstract logging monitor that pipes all logging through to a single 
// method that your concrete class can override. This should make logging data and
// metrics fairly easy for applications to consume without having to override each
// log method.
class AbstractLoggingMonitor {

	// ---
	// ABSTRACT METHODS.
	// ---

	
	// I log the given Circuit Breaker state event.
	logEvent( eventType, eventData ) {

		throw( new Error( "logEvent() is an abstract method and must be overridden by a concrete class." ) );

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I log the point at which the Circuit Breaker state moves from opened to closed.
	logClosed( stateSnapshot ) {
		
		this.logEvent( "closed", { stateSnapshot } );

	}


	// I log the point at which the execution is accepted by the state of the Circuit 
	// Breaker and the underlying command is about to be invoked.
	logExecute( stateSnapshot ) {
		
		this.logEvent( "execute", { stateSnapshot } );

	}


	// I log the point at which the request has entered the Circuit Breaker but has not
	// yet been approved for execution.
	logEmit( stateSnapshot ) {
		
		this.logEvent( "emit", { stateSnapshot } );

	}


	// I log the point at which the execution has ended in error. This only accounts for
	// non-Circuit Breaker errors (see, logTimeout() and logShortCircuited() events).
	logFailure( stateSnapshot, duration, error ) {
		
		this.logEvent( "failure", { stateSnapshot, duration, error } );

	}


	// I log the point at which a non-successful execution (due to error, timeout, or
	// short-circuiting) is being evaluated for a fallback response.
	logFallbackEmit( stateSnapshot ) {
		
		this.logEvent( "fallbackEmit", { stateSnapshot } );

	}


	// I log the point at which an existing fallback function resolved in error.
	logFallbackFailure( stateSnapshot, error ) {
		
		this.logEvent( "fallbackFailure", { stateSnapshot, error } );

	}


	// I log the point at which a failed execution has no fallback defined.
	logFallbackMissing( stateSnapshot ) {
		
		this.logEvent( "fallbackMissing", { stateSnapshot } );

	}


	// I log the point at which a fallback value has successfully stood-in for a failed 
	// or bypassed execution.
	logFallbackSuccess( stateSnapshot ) {
		
		this.logEvent( "fallbackSuccess", { stateSnapshot } );

	}


	// I log the point at which the Circuit Breaker state moves from closed to opened.
	logOpened( stateSnapshot ) {
		
		this.logEvent( "opened", { stateSnapshot } );

	}


	// I log the point at which an execution is bypassed because the Circuit Breaker is
	// currently in an opened state.
	logShortCircuited( stateSnapshot, error ) {
		
		this.logEvent( "shortCircuited", { stateSnapshot, error } );

	}


	// I log the point at which an execution has resolved successfully.
	logSuccess( stateSnapshot, duration ) {
		
		this.logEvent( "success", { stateSnapshot, duration } );

	}


	// I log the point at which a long-running execution has been explicitly timed-out
	// in error.
	logTimeout( stateSnapshot, duration, error ) {
		
		this.logEvent( "timeout", { stateSnapshot, duration, error } );

	}

	
	// ---
	// STATIC METHODS.
	// ---


	// I create a concrete implementation of the Abstract Logging Monitor, using the 
	// given Function as the logEvent() override.
	static usingFunction( logEvent ) {

		var monitor = new AbstractLoggingMonitor();

		// Override the abstract method, completing the implementation.
		monitor.logEvent = logEvent;

		return( monitor );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = AbstractLoggingMonitor;
