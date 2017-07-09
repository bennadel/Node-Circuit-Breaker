
// I provide a "remote API" that throws "Network Error" errors with the given 
class DangerousApi {

	constructor( errorRate = 50 ) {

		this._errorRate = errorRate;

	}

	
	// ---
	// PUBLIC METHODS.
	// ---


	getData( value ) {

		var promise = new Promise(
			( resolve, reject ) => {

				if ( ( Math.random() * 100 ) < this._errorRate ) {

					throw( new Error( "Network Error" ) );

				}

				resolve( `[data payload for value ${ value }]` );
								
			}
		);

		return( promise );

	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = DangerousApi;
