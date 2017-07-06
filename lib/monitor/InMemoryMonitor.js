
// I provide an in-memory monitor that queues all events and makes them available for
// subsequent inspection (for testing purposes).
class InMemoryMonitor {

	// I initialize the in-memory monitor.
	constructor() {

		this._events = [];

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I clear the internally-queued events.
	clearEvents() {

		this._events = [];

	}


	// I get the internally-queued events.
	getEvents() {

		return( this._events );

	}


	logClosed( stateSnapshot ) {
		
		this._events.push({
			type: "closed",
			data: {
				stateSnapshot
			}
		});

	}


	logExecute( stateSnapshot ) {
		
		this._events.push({
			type: "execute",
			data: {
				stateSnapshot
			}
		});

	}


	logEmit( stateSnapshot ) {
		
		this._events.push({
			type: "emit",
			data: {
				stateSnapshot
			}
		});

	}


	logFailure( stateSnapshot, duration, error ) {
		
		this._events.push({
			type: "failure",
			data: {
				stateSnapshot,
				duration,
				error
			}
		});

	}


	logFallbackEmit( stateSnapshot ) {
		
		this._events.push({
			type: "fallbackEmit",
			data: {
				stateSnapshot
			}
		});

	}


	logFallbackFailure( stateSnapshot, error ) {
		
		this._events.push({
			type: "fallbackFailure",
			data: {
				stateSnapshot,
				error
			}
		});

	}


	logFallbackMissing( stateSnapshot ) {
		
		this._events.push({
			type: "fallbackMissing",
			data: {
				stateSnapshot
			}
		});

	}


	logFallbackSuccess( stateSnapshot ) {
		
		this._events.push({
			type: "fallbackSuccess",
			data: {
				stateSnapshot
			}
		});

	}


	logOpened( stateSnapshot ) {
		
		this._events.push({
			type: "opened",
			data: {
				stateSnapshot
			}
		});

	}


	logShortCircuited( stateSnapshot, error ) {
		
		this._events.push({
			type: "shortCircuited",
			data: {
				stateSnapshot,
				error
			}
		});

	}


	logSuccess( stateSnapshot, duration ) {
		
		this._events.push({
			type: "success",
			data: {
				stateSnapshot,
				duration
			}
		});

	}


	logTimeout( stateSnapshot, duration, error ) {
		
		this._events.push({
			type: "timeout",
			data: {
				stateSnapshot,
				duration,
				error
			}
		});

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = InMemoryMonitor;
