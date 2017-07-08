
// Require the application modules.
var AbstractLoggingMonitor = require( "./AbstractLoggingMonitor" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

// I provide an in-memory monitor that queues all events and makes them available for
// subsequent inspection (for testing purposes).
class InMemoryMonitor extends AbstractLoggingMonitor {

	// I initialize the in-memory monitor.
	constructor() {

		super();
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


	// CONCRETE METHOD: I log the given event to the internal queue.
	logEvent( eventType, eventData ) {

		this._events.push({
			type: eventType,
			data: eventData
		});

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = InMemoryMonitor;
