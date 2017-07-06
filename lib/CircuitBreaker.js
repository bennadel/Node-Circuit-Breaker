
var OpenError = require( "./error/OpenError" );
var TimeoutError = require( "./error/TimeoutError" );


class CircuitBreaker {

	constructor( state ) {

		this._state = state;

	}


	// ---
	// PUBLIC METHODS.
	// ---


	execute( command, fallback = undefined ) {

		return( this._tryExecution( null, command, [], fallback ) );

	}


	executeInContext( context, command, commandArguments, fallback = undefined ) {

		return( this._tryExecution( context, command, commandArguments, fallback ) );

	}


	executeMethod( context, methodName, methodArguments, fallback = undefined ) {

		var command = context[ methodName ];
		var commandArguments = methodArguments;

		return( this._tryExecution( context, command, commandArguments, fallback ) );

	}


	isClosed() {

		return( this._state.isClosed() );

	}


	isOpened() {

		return( this._state.isOpened() );
		
	}


	// ---
	// PRIVATE METHODS.
	// ---



	// Relevant events are taken from Hysterix docs - https://github.com/Netflix/Hystrix/wiki/Metrics-and-Monitoring#command-execution-event-types-comnetflixhystrixhystrixeventtype

	// Command Execution Event Types
	// --
	// * EMIT - value delivered (HystrixObservableCommand only)
	// * EXECUTE - emit accepted, execution of command will be attempted
	// * SUCCESS - execution complete with no errors
	// * FAILURE - execution threw an Exception
	// * TIMEOUT - execution started, but did not complete in the allowed time
	// * SHORT_CIRCUITED - circuit breaker OPEN, execution not attempted
	// --
	// Command Fallback Event Types
	// --
	// * FALLBACK_EMIT - fallback value delivered (HystrixObservableCommand only)
	// * FALLBACK_SUCCESS - fallback execution complete with no errors
	// * FALLBACK_FAILURE - fallback execution threw an error
	// * FALLBACK_MISSING - no fallback
	_tryExecution( context, command, commandArguments, fallback ) {

		var startedAt = Date.now();

		this._state.trackEmit();

		var promise = new Promise(
			( resolve, reject ) => {

				if ( this._state.isOpened() ) {

					// If the Circuit Breaker is open, the general idea is to "fail fast."
					// However, if the circuit has been open for some period of time, it 
					// might be ready to send a health check request to the target to see
					// if the target has become healthy.
					if ( ! this._state.canPerformHealthCheck() ) {

						throw( new OpenError( "Circuit break is open." ) );
						// TODO: Include summary with error?

					}

				}

				this._state.trackExecute();

				var timeout = this._state.getTimeout();
				var timer = null;

				if ( timeout ) {

					timer = setTimeout(
						function rejectAsTimeout() {

							reject( new TimeoutError( "Command invocation has timed-out." ) );
							// TODO: Include summary with error?

						},
						timeout
					);

				}

				this.
					_tryInvocation( context, command, commandArguments )
					.then(
						function handleAsyncResolve( result ) {

							clearTimeout( timer );
							resolve( result );

						},
						function handleAsyncReject( error ) {

							clearTimeout( timer );
							reject( error );

						}
					)
				;

			}
		);

		promise = promise.then(
			( result ) => {

				var duration = ( Date.now() - startedAt );

				this._state.trackSuccess( duration );

				return( result );

			},
			( error ) => {

				var duration = ( Date.now() - startedAt );

				if ( error instanceof OpenError ) {

					this._state.trackShortCircuited( duration );

				} else if ( error instanceof TimeoutError ) {

					this._state.trackTimeout( duration, error );

				} else {

					this._state.trackFailure( duration, error );

				}

				this._state.trackFallbackEmit();

				if ( fallback === undefined ) {

					this._state.trackFallbackMissing();

					return( Promise.reject( error ) );

				}

				var fallbackPromise = ( typeof( fallback ) === "function" )
					? this._tryInvocation( context, fallback, commandArguments )
					: Promise.resolve( fallback )
				;

				// We only want to tap into the result of the fallback - we don't want 
				// to transform the result in anyway. As such, we're not chaining this
				// promise.
				fallbackPromise.then(
					( fallbackResult ) => {
						this._state.trackFallbackSuccess();
					},
					( fallbackError ) => {
						this._state.trackFallbackFailure( fallbackError );
					}
				);

				return( fallbackPromise );

			}
		);

		return( promise );

	}


	_tryInvocation( context, command, commandArguments ) {

		var promise = new Promise(
			function( resolve, reject ) {

				Promise
					.resolve( command.apply( context, commandArguments ) )
					.then( resolve, reject )
				;

			}
		);

		return( promise );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = CircuitBreaker;
