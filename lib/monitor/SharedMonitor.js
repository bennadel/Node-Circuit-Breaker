
// Require the application modules.
var Monitor = require( "./Monitor" );

// I provide access to shared basic monitor. This can be used as the safe default for
// the injectable monitor behavior since it contains no state and provides nothing but
// no-op methods.
// --
// CAUTION: This isn't providing a "newable" Class - this is providing an instance.
module.exports = new Monitor();
