
// Require the application modules.
var AbstractLoggingMonitor = require( "./monitor/AbstractLoggingMonitor" );
var CircuitBreaker = require( "./CircuitBreaker" );
var Metrics = require( "./metrics/Metrics" );
var State = require( "./state/State" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

// I provide a set of static methods used to facilitate the creation of Circuit 
// Breakers. For each of the methods that accepts a "settings" object, these are the
// options (though not all options will apply to all consuming contexts):
// --
// * id - The unique identifier of the state instance (used for logging).
// * requestTimeout - The time a pending request is allowed to hang before being timed-out.
// * volumeThreshold - The number of requests that have to be executed (in the window) before failure percentages are calculated.
// * failureThreshold - The percentage of failures that can occur in the window before the state switches to open.
// * activeThreshold - The number of concurrent requests that can hang before the state switches to open.
// * isFailure() - The function that determines if the given failure is a true error (or should be classified as a success).
// * fallback - The global fallback to be used for all executions in the circuit breaker (can be overridden locally).
// * monitor - The Monitor instance for external logging.
// * bucketCount - The number of buckets to be used to collect rolling stats window.
// * bucketDuration - The duration of each bucket of the rolling stats window.
// --
class CircuitBreakerFactory {

	// I initialize the circuit breaker factory that will generate circuit breakers 
	// using the given shared state object and fallback.
	constructor( state, globalFallback = undefined ) {

		this._state = state;
		this._globalFallback = globalFallback;

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I create new Circuit Breakers using the same underlying shared State object with
	// the optional global fallback override.
	create( localFallback = undefined ) {

		var circuitBreaker = new CircuitBreaker( this._state, ( localFallback || this._globalFallback ) );

		return( circuitBreaker );

	}


	// ---
	// STATIC METHODS.
	// ---


	// I create a new Circuit Breaker using the given settings.
	static create( settings = {} ) {

		var state = CircuitBreakerFactory.createState( settings );
		var circuitBreaker = new CircuitBreaker( state, settings.fallback );

		return( circuitBreaker );

	}


	// I create a new CircuitBreaker factory that can produce any number of 
	// Circuit Breakers that all share the same state.
	static createFactory( settings = {} ) {

		var state = CircuitBreakerFactory.createState( settings );
		var factory = new CircuitBreakerFactory( state, settings.fallback );

		return( factory );

	}


	// I create a new State using the given settings. This State can then be
	// used to create new Circuit Breakers.
	static createState( settings = {} ) {

		// If the provided monitor is a Function instance, use it to complete an 
		// implementation of the AbstractLoggingMonitor base class.
		var monitor = ( typeof( settings.monitor ) === "function" )
			? AbstractLoggingMonitor.usingFunction( settings.monitor )
			: settings.monitor
		;

		var metrics = new Metrics(
			settings.bucketCount,
			settings.bucketDuration
		);
		var state = new State({
			id: settings.id,
			requestTimeout: settings.requestTimeout,
			volumeThreshold: settings.volumeThreshold,
			failureThreshold: settings.failureThreshold,
			activeThreshold: settings.activeThreshold,
			isFailure: settings.isFailure,
			monitor: settings.monitor,
			metrics: metrics
		});

		return( state );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = CircuitBreakerFactory;
