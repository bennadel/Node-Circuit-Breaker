
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


	logClosed( stateSnapshot ) {
		
		this.logEvent( "closed", { stateSnapshot } );

	}


	logExecute( stateSnapshot ) {
		
		this.logEvent( "execute", { stateSnapshot } );

	}


	logEmit( stateSnapshot ) {
		
		this.logEvent( "emit", { stateSnapshot } );

	}


	logFailure( stateSnapshot, duration, error ) {
		
		this.logEvent( "failure", { stateSnapshot, duration, error } );

	}


	logFallbackEmit( stateSnapshot ) {
		
		this.logEvent( "fallbackEmit", { stateSnapshot } );

	}


	logFallbackFailure( stateSnapshot, error ) {
		
		this.logEvent( "fallbackFailure", { stateSnapshot, error } );

	}


	logFallbackMissing( stateSnapshot ) {
		
		this.logEvent( "fallbackMissing", { stateSnapshot } );

	}


	logFallbackSuccess( stateSnapshot ) {
		
		this.logEvent( "fallbackSuccess", { stateSnapshot } );

	}


	logOpened( stateSnapshot ) {
		
		this.logEvent( "opened", { stateSnapshot } );

	}


	logShortCircuited( stateSnapshot, error ) {
		
		this.logEvent( "shortCircuited", { stateSnapshot, error } );

	}


	logSuccess( stateSnapshot, duration ) {
		
		this.logEvent( "success", { stateSnapshot, duration } );

	}


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
