
// Require the application modules.
var AbstractLoggingMonitor = require( "./monitor/AbstractLoggingMonitor" );
var AlwaysClosedState = require( "./state/AlwaysClosedState" );
var CircuitBreaker = require( "./CircuitBreaker" );
var Metrics = require( "./metrics/Metrics" );
var State = require( "./state/State" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

// I provide static methods used to facilitate the creation of Circuit Breakers.
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
	static create( settings = {} ) {

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
			monitor: monitor,
			metrics: metrics
		});
		var circuitBreaker = new CircuitBreaker( state, settings.fallback );

		return( circuitBreaker );

	}


	// I create a new CircuitBreaker factory that can produce any number of 
	// Circuit Breakers that all share the same state.
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
	static createFactory( settings = {} ) {

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
			monitor: monitor,
			metrics: metrics
		});
		var factory = new CircuitBreakerFactory( state, settings.fallback );

		return( factory );

	}


	// I create a new Circuit Breaker using an "ALWAYS CLOSED" State strategy so that
	// metrics can be logged without having an active impact on the execution.
	// --
	// * id - The unique identifier of the state instance (used for logging).
	// * isFailure() - The function that determines if the given failure is a true error (or should be classified as a success).
	// * monitor - The Monitor instance for external logging.
	// --
	static createPassive( settings = {} ) {

		var monitor = ( typeof( settings.monitor ) === "function" )
			? AbstractLoggingMonitor.usingFunction( settings.monitor )
			: settings.monitor
		;
		var metrics = new Metrics();
		var state = new AlwaysClosedState({
			id: settings.id,
			isFailure: settings.isFailure,
			monitor: monitor,
			metrics: metrics
		});
		var circuitBreaker = new CircuitBreaker( state, settings.fallback );

		return( circuitBreaker );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = CircuitBreakerFactory;
