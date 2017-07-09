
class Logger {

	error( error ) {
		console.log( ".... [LOGGER->Error]: %s.", error.message );
	}

	warn( item ) {
		console.log( ".... [LOGGER->Warn]: %s.", item.message );
	}

}

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

module.exports = Logger;
