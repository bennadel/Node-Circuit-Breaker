
// Require the application modules.
var Metrics = require( "../metrics/Metrics" );
var SharedMonitor = require( "../monitor/SharedMonitor" );
var StateError = require( "../error/StateError" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

function IS_FAILURE( error ) {

	return( true );

}

// I provide an implementation of the State logic that keeps the Circuit Breaker in an
// always-closed state (regardless of the health of the underlying resource). This 
// allows an application to get a base-line for traffic flowing through the Circuit 
// Breaker before trying to pick threshold values that make sense.
class AlwaysClosedState {

	// I initialize the state with the given settings:
	// --
	// * id - The unique identifier of this state instance (used for logging).
	// * isFailure() - The function that determines if the given failure is a true error (or should be classified as a success).
	// * monitor - The Monitor instance for external logging.
	// * metrics - The Metrics instance for tracking activity.
	// --
	constructor( settings = {} ) {

		this._id = ( settings.id || "Default State Identifier" );
		this._isFailure = ( settings.isFailure || IS_FAILURE );
		this._monitor = ( settings.monitor || SharedMonitor );
		this._metrics = ( settings.metrics || new Metrics() );

		// I keep track of the pending executions.
		this._activeRequestCount = 0;

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I determine if the OPENED circuit can perform a health check (ie, allow a new 
	// request to pass through the circuit execution despite its unhealthy state).
	canPerformHealthCheck() {

		return( false );

	}


	// I get a snapshot of the current state (primarily for logging).
	getSnapshot() {

		return({
			id: this._id,
			closed: true,
			settings: {
				requestTimeout: 0,
				volumeThreshold: 0,
				failureThreshold: 0,
				activeThreshold: 0
			},
			metrics: {
				emit: this._metrics.get( "emit" ),
				execute: this._metrics.get( "execute" ),
				success: this._metrics.get( "success" ),
				failure: this._metrics.get( "failure" ),
				timeout: this._metrics.get( "timeout" )
			},
			totalMetrics: {
				emit: this._metrics.getTotal( "emit" ),
				execute: this._metrics.getTotal( "execute" ),
				success: this._metrics.getTotal( "success" ),
				failure: this._metrics.getTotal( "failure" ),
				timeout: this._metrics.getTotal( "timeout" )
			},
			current: {
				activeRequestCount: this._activeRequestCount
			}
		});

	}


	// I determine if the circuit is opened (and unable to accept requests).
	isOpened() {

		return( false );

	}


	// I determine if the circuit is closed (and able to accept requests).
	isClosed() {

		return( true );

	}


	// I get the duration (in milliseconds) that a pending execution is allowed to hang
	// before it is forced into a rejected state.
	getTimeout() {
		
		// NOTE: Zero will indicate no timeout.
		return( 0 );

	}


	// I track requests that will be executed (ie, not short-circuited).
	trackExecute() {

		// NOTE: We are not incrementing the active request count because it is already
		// being incremented by the "emit" event, immediately preceding this event.
		this._metrics.increment( "execute" );
		this._monitor.logExecute( this.getSnapshot() );

	}
	

	// I track new requests being routed through the circuit breaker (though execution of
	// the underlying command is not yet guaranteed).
	trackEmit() {

		this._activeRequestCount++;
		this._metrics.increment( "emit" );
		this._monitor.logEmit( this.getSnapshot() );

	}


	// I track requests that have failed to execute in the circuit breaker due to non-
	// circuit breaker logic (ie, this does not include Timeout or Open errors).
	trackFailure( duration, error ) {

		// Not all errors actually indicate an unhealthy resource. For example, a 
		// "Not Found" error, returned from an API, relates only to the content of the 
		// request and not to the actual health of the API. As such, some errors should
		// be classified as a "success" metric.
		if ( ! this._isFailure( error ) ) {

			return( this.trackSuccess( duration ) );

		}

		this._activeRequestCount--;
		this._metrics.increment( "failure" );
		this._monitor.logFailure( this.getSnapshot(), duration, error );

	}


	// I track rejected requests that are proceeding to the fallback workflow.
	trackFallbackEmit() {

		this._monitor.logFallbackEmit( this.getSnapshot() );

	}
	

	// I track rejected requests that have failed to resolve with an exiting fallback 
	// value (as opposed to a "fallback missing" event, which has no fallback).
	trackFallbackFailure( error ) {

		this._monitor.logFallbackFailure( this.getSnapshot(), error );

	}


	// I track requests that have been rejected without an existing fallback value.
	trackFallbackMissing() {

		this._monitor.logFallbackMissing( this.getSnapshot() );

	}


	// I track rejected requests that have successfully resolved with a fallback value.
	trackFallbackSuccess() {

		this._monitor.logFallbackSuccess( this.getSnapshot() );

	}


	// I track requests that have been summarily rejected due to an open circuit.
	trackShortCircuited( error ) {

		// NOTE: This state implementation never moves to the opened state and will,
		// therefore, never short-circuit a request.

	}


	// I track requests that have successfully executed in the circuit breaker.
	trackSuccess( duration ) {

		this._activeRequestCount--;
		this._metrics.increment( "success" );
		this._monitor.logSuccess( this.getSnapshot(), duration );
	
	}


	// I track requests that have not returned in the allotted timeout period.
	trackTimeout( duration, error ) {

		// NOTE: This state implementation doesn't use a timeout.

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = AlwaysClosedState;
