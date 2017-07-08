
// Require the application modules.
var OpenError = require( "./error/OpenError" );
var TimeoutError = require( "./error/TimeoutError" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

// I provide a managed execution context using a given State implementation.
class CircuitBreaker {

	// I initialize the circuit breaker with the given state implementation and global 
	// fallback. The global fallback can be overridden with each execution; but, it will
	// be used in any case where an execution-level fallback is not provided.
	constructor( state, globalFallback = undefined ) {

		this._state = state;
		this._globalFallback = globalFallback;

	}


	// ---
	// PUBLIC METHODS.
	// ---


	// I execute the given command.
	execute( command, fallback = this._globalFallback ) {

		return( this._tryExecution( null, command, [], fallback ) );

	}


	// I execute the given command in the given context.
	executeInContext( context, command, commandArguments = [], fallback = this._globalFallback ) {

		return( this._tryExecution( context, command, commandArguments, fallback ) );

	}


	// I execute the given method on the given context object.
	executeMethod( context, methodName, methodArguments = [], fallback = this._globalFallback ) {

		var command = context[ methodName ];
		var commandArguments = methodArguments;

		return( this._tryExecution( context, command, commandArguments, fallback ) );

	}


	// I determine if the circuit breaker is closed (and able to accept requests).
	isClosed() {

		return( this._state.isClosed() );

	}


	// I determine if the circuit breaker is open (and unable to accept requests).
	isOpened() {

		return( this._state.isOpened() );
		
	}


	// ---
	// PRIVATE METHODS.
	// ---


	// I move the execution request through the circuit breaker, using the underlying
	// state implementation for control-flow.
	_tryExecution( context, command, commandArguments, fallback ) {

		var startedAt = Date.now();

		this._state.trackEmit();

		// The first phase of execution is seeing if we can actually execute the 
		// underlying command.
		var promise = new Promise(
			( resolve, reject ) => {

				if ( this._state.isOpened() ) {

					// If the Circuit Breaker is open, the general idea is to "fail fast."
					// However, if the circuit has been open for some period of time, it 
					// might be ready to send a health check request to the target to see
					// if the target has become healthy.
					if ( ! this._state.canPerformHealthCheck() ) {

						throw( new OpenError( "Circuit breaker is open and not yet ready to perform a health check." ) );

					}

				}

				this._state.trackExecute();

				var timer = null;
				var timeout = this._state.getTimeout();

				// Only apply the timeout race to the execution if the timeout value is 
				// non-zero.
				if ( timeout ) {

					timer = setTimeout(
						function rejectAsTimeout() {

							reject( new TimeoutError( "Command invocation has timed-out." ) );

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

		// The second phase of execution is dealing with successful or failed executions.
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


	// I safely invoke the given command, ensuring that any synchronous errors result in
	// a reject promise and not a thrown error.
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
