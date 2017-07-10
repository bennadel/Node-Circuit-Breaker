
// Require the application modules.
var Metrics = require( "../metrics/Metrics" );
var SharedMonitor = require( "../monitor/SharedMonitor" );
var StateError = require( "../error/StateError" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

var THREE_SECONDS = ( 3 * 1000 );
var FIFTY_PERCENT = 50;

function IS_FAILURE( error ) {

	return( true );

}

// I provide an implementation of the State logic that dictates the control-flow of a
// circuit breaker.
class State {

	// I initialize the state with the given settings:
	// --
	// * id - The unique identifier of this state instance (used for logging).
	// * requestTimeout - The time a pending request is allowed to hang before being timed-out.
	// * volumeThreshold - The number of requests that have to be executed (in the window) before failure percentages are calculated.
	// * failureThreshold - The percentage of failures that can occur in the window before the state switches to open.
	// * activeThreshold - The number of concurrent requests that can hang before the state switches to open.
	// * isFailure() - The function that determines if the given failure is a true error (or should be classified as a success).
	// * monitor - The Monitor instance for external logging.
	// * metrics - The Metrics instance for tracking activity.
	// --
	constructor( settings = {} ) {

		this._id = ( settings.id || "Default State Identifier" );
		this._requestTimeout = ( settings.requestTimeout || THREE_SECONDS );
		this._volumeThreshold = ( settings.volumeThreshold || 20 );
		this._failureThreshold = ( settings.failureThreshold || FIFTY_PERCENT );
		this._activeThreshold = ( settings.activeThreshold || 50 );
		this._isFailure = ( settings.isFailure || IS_FAILURE );
		this._monitor = ( settings.monitor || SharedMonitor );
		this._metrics = ( settings.metrics || new Metrics() );

		// I determine if the circuit is closed.
		this._closed = true;

		// I determine if the circuit is being held open for reasons of failure-based
		// health problems.
		this._healing = false;

		// I keep track of the pending executions. In addition to tracking errors, this
		// state implementation also tracks concurrent requests. If the number of 
		// concurrent requests exceeds the given threshold (activeThreshold), the circuit
		// will open until some of the pending requests have completed. This is 
		// independent from the rolling metrics window.
		this._activeRequestCount = 0;

		// I keep track of the pending failed count just to ensure proper state.
		this._activeFallbackCount = 0;

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I determine if the OPENED circuit can perform a health check (ie, allow a new 
	// request to pass through the circuit execution despite its unhealthy state).
	canPerformHealthCheck() {

		if ( this.isClosed() ) {

			return( false );

		}

		return( ! ( this._isOverCapacity() || this._isTakingTimeToHeal() ) );

	}


	// I get a snapshot of the current state (primarily for logging).
	getSnapshot() {

		return({
			id: this._id,
			closed: this.isClosed(),
			settings: {
				requestTimeout: this._requestTimeout,
				volumeThreshold: this._volumeThreshold,
				failureThreshold: this._failureThreshold,
				activeThreshold: this._activeThreshold
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

		return( ! this._closed );

	}


	// I determine if the circuit is closed (and able to accept requests).
	isClosed() {

		return( this._closed );

	}


	// I get the duration (in milliseconds) that a pending execution is allowed to hang
	// before it is forced into a rejected state.
	getTimeout() {
		
		return( this._requestTimeout );

	}


	// I track requests that will be executed (ie, not short-circuited).
	trackExecute() {

		if ( this.isOpened() ) {

			if ( this._isOverCapacity() ) {

				throw( new StateError( "You cannot execute while the circuit is over capacity." ) );

			}

			if ( this._isTakingTimeToHeal() ) {

				throw( new StateError( "You cannot execute while the circuit is taking time to heal." ) );

			}

		}

		// NOTE: We are not incrementing the active request count because it is already
		// being incremented by the "emit" event, immediately preceding this event.
		this._metrics.increment( "execute" );
		this._applyUpdates();
		this._monitor.logExecute( this.getSnapshot() );

	}
	

	// I track new requests being routed through the circuit breaker (though execution of
	// the underlying command is not yet guaranteed).
	trackEmit() {

		this._activeRequestCount++;
		this._metrics.increment( "emit" );
		this._applyUpdates();
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

		this._assertActiveRequestCount();

		this._activeRequestCount--;
		this._metrics.increment( "failure" );
		this._applyUpdates();
		this._monitor.logFailure( this.getSnapshot(), duration, error );

	}


	// I track rejected requests that are proceeding to the fallback workflow.
	trackFallbackEmit() {

		this._activeFallbackCount++;
		this._monitor.logFallbackEmit( this.getSnapshot() );

	}
	

	// I track rejected requests that have failed to resolve with an exiting fallback 
	// value (as opposed to a "fallback missing" event, which has no fallback).
	trackFallbackFailure( error ) {

		this._assertActiveFallbackCount();

		this._activeFallbackCount--;
		this._monitor.logFallbackFailure( this.getSnapshot(), error );

	}


	// I track requests that have been rejected without an existing fallback value.
	trackFallbackMissing() {

		this._assertActiveFallbackCount();

		this._activeFallbackCount--;
		this._monitor.logFallbackMissing( this.getSnapshot() );

	}


	// I track rejected requests that have successfully resolved with a fallback value.
	trackFallbackSuccess() {

		this._assertActiveFallbackCount();

		this._activeFallbackCount--;
		this._monitor.logFallbackSuccess( this.getSnapshot() );

	}


	// I track requests that have been summarily rejected due to an open circuit.
	trackShortCircuited( error ) {

		this._assertActiveRequestCount();

		this._activeRequestCount--;
		this._applyUpdates();
		this._monitor.logShortCircuited( this.getSnapshot(), error );

	}


	// I track requests that have successfully executed in the circuit breaker.
	trackSuccess( duration ) {

		this._assertActiveRequestCount();

		// If the circuit is currently being held open for reasons other than capacity,
		// then any successful response during this time of poor health may indicate that
		// the underlying resource has, indeed, recovered. As such, let's reset the
		// metrics for the current window (which will affect the application of the
		// updates to the current state).
		// --
		// NOTE: We want to reset the metrics so that a subsequent failure doesn't 
		// immediately flip the circuit back into an opened state. We want the metrics to
		// have to accumulate the volume threshold once again before flipping open.
		if ( this.isOpened() && ! this._isOverCapacity() ) {

			this._metrics.reset();

			// NOTE: Once this method is done executing, the only recorded metric will be
			// a single "success" event.

		}

		this._activeRequestCount--;
		this._metrics.increment( "success" );
		this._applyUpdates();
		this._monitor.logSuccess( this.getSnapshot(), duration );
	
	}


	// I track requests that have not returned in the allotted timeout period.
	trackTimeout( duration, error ) {

		this._assertActiveRequestCount();

		this._activeRequestCount--;
		this._metrics.increment( "timeout" );
		this._applyUpdates();
		this._monitor.logTimeout( this.getSnapshot(), duration, error );

	}


	// ---
	// PRIVATE METHODS.
	// ---


	// I apply the recent updates to the state of the circuit, moving the circuit from
	// opened-to-closed or closed-to-open as necessary.
	_applyUpdates() {

		// If the circuit is CLOSED, check to see if it needs to be opened.
		if ( this.isClosed() ) {

			if ( this._isFailing() ) {

				this._openAndHeal();

			} else if ( this._isOverCapacity() ) {

				this._open();

			}

		// If the circuit is OPENED, check to see if it needs to be closed.
		} else {

			if ( ! this._isOverCapacity() && this._isHealed() ) {

				this._close();
				
			}

		}

	}


	// I ensure that the active fallback count is positive before the calling context
	// attempts to decrement the count. 
	_assertActiveFallbackCount() {

		if ( this._activeFallbackCount <= 0 ) {

			throw( new StateError( "You cannot track the end of a fallback when you have no pending fallbacks." ) );

		}

	}


	// I ensure that the active request count is positive before the calling context
	// attempts to decrement the count. 
	_assertActiveRequestCount() {

		if ( this._activeRequestCount <= 0 ) {

			throw( new StateError( "You cannot track the end of an execution when you have no pending executions." ) );

		}

	}


	// I move the circuit to a closed state.
	_close() {

		if ( this.isClosed() ) {

			throw( new StateError( "State already closed." ) );

		}

		this._closed = true;
		this._healing = false;
		this._monitor.logClosed( this.getSnapshot() );

	}


	// I determine if the circuit is currently exceeding the failure threshold and should
	// be considered unhealthy.
	_isFailing() {

		var successCount = this._metrics.get( "success" );
		var failureCount = this._metrics.get( "failure" );
		var timeoutCount = this._metrics.get( "timeout" );
		var errorCount = ( failureCount + timeoutCount );
		var totalCount = ( successCount + failureCount + timeoutCount );

		// If we haven't recorded enough outcomes, we don't want to let the circuit fail.
		// Doing so could lead to a 100% failure rate (for example) if the first request
		// in each bucket results in a failure.
		if ( totalCount < this._volumeThreshold ) {

			return( false );

		}

		// CAUTION: Failure threshold is defined in whole numbers (ie, 5% not 0.05%).
		return( ( errorCount / totalCount * 100 ) >= this._failureThreshold );

	}


	// I check to see if a healing circuit has finally healed.
	_isHealed() {

		// If the circuit hasn't been flagged as healing, then we don't even need to 
		// check the metrics window.
		if ( ! this._healing ) {

			return( true );

		}

		var executeCount = this._metrics.get( "execute" );
		var successCount = this._metrics.get( "success" );
		var failureCount = this._metrics.get( "failure" );
		var timeoutCount = this._metrics.get( "timeout" );
		var totalCount = ( executeCount + successCount + failureCount + timeoutCount );

		// The circuit will be considered healed when the only inbound or outbound metric
		// is a single Success metric. We know this is true because a successful response 
		// during an open circuit will reset the metrics, recording only the subsequent
		// success event.
		return( ( totalCount === 1 ) && ( successCount === 1 ) );

	}


	// I determine if the circuit is currently over capacity for pending requests.
	_isOverCapacity() {

		return( this._activeRequestCount > this._activeThreshold );

	}


	// I determine if the circuit is currently being held open for "healing" reasons and
	// still needs to still needs to wait for the current metrics window to become quiet.
	_isTakingTimeToHeal() {

		// If the circuit hasn't been flagged as healing, then we don't even need to 
		// check the metrics window.
		if ( ! this._healing ) {

			return( false );

		}

		var executeCount = this._metrics.get( "execute" );
		var successCount = this._metrics.get( "success" );
		var failureCount = this._metrics.get( "failure" );
		var timeoutCount = this._metrics.get( "timeout" );

		// If the current metrics window no longer has any trace of outbound or inbound
		// activity, it means the full metrics window has had a chance to cycle through
		// while opened and is now in a quiet state. Once this is done, the circuit is 
		// no longer waiting to heal and can accept a health check.
		// --
		// NOTE: We are not including "emit" in this since emit doesn't directly relate
		// to outbound traffic.
		return( executeCount + successCount + failureCount + timeoutCount );

	}


	// I move the circuit to an opened state.
	_open() {

		if ( this.isOpened() ) {

			throw( new StateError( "Already opened." ) );

		}

		this._closed = false;
		this._monitor.logOpened( this.getSnapshot() );

	}


	// I move the circuit to an opened state and hold it open, giving the underlying
	// resource time to heal.
	_openAndHeal() {

		if ( this.isOpened() ) {

			throw( new StateError( "Already opened." ) );

		}

		this._closed = false;
		this._healing = true;
		this._monitor.logOpened( this.getSnapshot() );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = State;
