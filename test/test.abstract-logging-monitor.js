
// Require the core node modules.
var expect = require( "chai" ).expect;

// Require the application modules.
var AbstractLoggingMonitor = require( "../lib/monitor/AbstractLoggingMonitor" );

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

describe( "Testing lib.monitor.AbstractLoggingMonitor", function() {
	it( "should complete the implementation with the given function.", function() {

		var events = [];
		var monitor = AbstractLoggingMonitor.usingFunction(
			function logItem( eventType, eventData ) {

				events.push({
					type: eventType,
					data: eventData
				});

			}
		);
		
		var snapshot = {};
		monitor.logEmit( snapshot );
		monitor.logExecute( snapshot );
		monitor.logSuccess( snapshot );

		expect( events[ 0 ].type ).to.equal( "emit" );
		expect( events[ 0 ].data ).to.exist;
		expect( events[ 1 ].type ).to.equal( "execute" );
		expect( events[ 2 ].type ).to.equal( "success" );

	});
});
