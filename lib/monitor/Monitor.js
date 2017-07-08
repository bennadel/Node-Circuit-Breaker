
// Require the application modules.
var AbstractLoggingMonitor = require( "./AbstractLoggingMonitor" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

// I provide a no-op (No operation) monitor (primarily for when no Monitor is explicitly
// provided to a Circuit Breaker state implementation).
class Monitor extends AbstractLoggingMonitor {

	// CONCRETE METHOD: I log the given event.
	logEvent( eventType, eventData ) {
		/* No-op monitor. */
	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = Monitor;
