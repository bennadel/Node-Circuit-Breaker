
# Node Circuit Breaker

by [Ben Nadel][bennadel] (on [Google+][googleplus])

This is a **Node.js** implementation of the **Circuit Breaker** pattern as popularized 
in [Michael T. Nygard's book - Release It!][release-it]. The Circuit Breaker is intended 
to proxy the consumption of upstream resources such that failures in the upstream resource
propagate to the current system in a predictable manner. To be clear, the Circuit Breaker
doesn't prevent failures; rather, it helps your application manage failures proactively, 
failing fast and / or providing fallback values when applicable.

The Circuit Breaker proxies the consumption of upstream resources; but, it does not have
intimate knowledge of the upstream resource. As such, the scope of the Circuit Breaker 
can be as course or as granular as you think is appropriate. For example, you can have 
one Circuit Breaker that represents an entire upstream resource. Or, you can create an
individual Circuit Breaker _for each method_ in an upstream resource. The more granular
your Circuit Breakers, the less likely you are to get false positives.

## Default Usage

Each Circuit Breaker is a composition of several objects that work together to provide 
the tracking and the fail-fast functionality. Fortunately, you don't have to know about 
this unless you are building custom implementations. All you have to do is ask the 
Circuit Breaker Factory for an instance with the given settings.

The easiest way to create a Circuit Breaker is to create one with no settings at all. 
Doing so will create a Circuit Breaker with "good" defaults:

```js
var circuitBreaker = CircuitBreakerFactory.create();

// Invoke as closure.
circuitBreaker.execute(
    function() {
        return( upstreamResource.load() );
    }
);

// Invoke as closure with context and arguments.
circuitBreaker.executeInContext(
    { /* Context object. */ },
    function( param1, param2 ) {
        return( this.load( param1, param2 ) );
    },
    [ "arg1", "arg2" ]
);

// Invoke as method on an object.
circuitBreaker.executeMethod( upstreamResource, "load", [ "arg1", "arg2" ] );
```

As you can see, there are three ways to run commands through a Circuit Breaker:

* `execute( command [, fallback ] )`
* `executeInContext( context, command [, args [, fallback ] ] )`
* `executeMethod( context, methodName [, args [, fallback ] ] )`

Each `execute*` method returns a Promise that will be fulfilled in resolution if the 
execution was successful; or, fulfilled in rejection if the execution threw an error (or 
was bypassed based on the state of the Circuit Breaker). The underlying method / function
that is being invoked should return a Promise or a synchronous value. Or, it can omit a 
return if none is needed.

## Configuration Usage

The `.create()` method of the Circuit Breaker Factory works without any arguments; but, 
you can provide a hash of settings that will be used to generate the Circuit Breaker. 
Every one of the following settings is _optional_:

* `id` - The unique identifier of the underlying state instance, which is used for 
  logging.
* `requestTimeout` - The time (in milliseconds) that a pending request is allowed to hang
  (ie, not complete) before being timed-out in error.
* `volumeThreshold` - The number of requests that have to be completed (within the 
  rolling metrics window) before failure percentages can be calculated.
* `failureThreshold` - The percent (in whole numbers) of failures that can occur in the
  rolling metrics window before the state of the Circuit Breaker switches to _opened_.
* `activeThreshold` - The number of concurrent requests that can hang (ie, not complete) 
  before the state of the Circuit Breaker switches to _opened_.
* `isFailure` - The function that determines if the given failure is an error; or, if 
  it should be classified as a success (such as a 404 response).
* `fallback` - The global fallback to be used for all executions in the Circuit Breaker 
  (which can be overridden locally with each execution).
* `monitor` - The monitor -- Function or instance -- for external logging (ex, StatsD logging).
* `bucketCount` - The number of buckets to be used to collect rolling stats in the 
  rolling metrics window.
* `bucketDuration` - The duration (in milliseconds) of each bucket within the rolling
  metrics window.

_**NOTE**: The duration of the rolling metrics window will be `bucketCount * bucketDuration`.
This is also the amount of time that the Circuit Breaker will **remain opened** after 
failing before allowing a "health check" request to execute._

```js
var circuitBreaker = CircuitBreakerFactory.create({
    id: "Remote API",
    requestTimeout: 5000,
    volumeThreshold: 10,
    failureThreshold: 10, // Percent (as in 1 failure in 10 responses trips the circuit).
    activeThreshold: 50,
    isFailure: function( error ) {
        return( ! is404( error ) );
    },
    fallback: { /* Fallback value. */ },
    monitor: function( eventType, eventData ) {
        console.log( eventType, eventData );
    },
    bucketCount: 30,
    bucketDuration: 1000
});
```

## Fallback Values

The primary goal of the Circuit Breaker is to "fail fast" if the upstream resource 
appears to be unhealthy. However, the secondary goal of the Circuit Breaker is to provide
a better user experience. That means that if a meaningful fallback value can be provided
in the case of error, the Circuit Breaker will facilitate this approach.

The fallback value can be a Function, a Promise, or any static value. If it's a Function,
it should return either a Promise or a static value. Fallback values can be defined when
the Circuit Breaker is created:

```js
var circuitBreaker = CircuitBreakerFactory.create({
    id: "Remote API",
    fallback: { /* Fallback value. */ }
});
```

But, they can also be provided at the time of execution (regardless of whether or not a
global fallback value was provided):

```js
var circuitBreaker = CircuitBreakerFactory.create({
    id: "Remote API",
    fallback: { /* Fallback value. */ }
});

circuitBreaker
    .execute(
        function() {
            throw( new Error( "Network Error" ) );
        },
        { /* Local fallback value. */ }
    )
    .then(
        function( result ) {
            console.log( result ); // Will be LOCAL fallback value.
        }
    )
;
```

## Logging And Monitoring

By default, the Circuit Breaker quietly discards all internal events. However, you will
probably want to log Errors and record StatsD metrics in your application. To do this, 
you can provide a logging Function as the `monitor` argument:

```js
var circuitBreaker = CircuitBreakerFactory.create({
    id: "Remote API",
    monitor: function logEvent( eventType, eventData ) {
        console.log( eventType, eventData );
    }
});
```

This logging Function will be called with the following `eventType`values:

* `closed` passing `eventData` properties `{ stateSnapshot }`
* `execute` passing `eventData` properties `{ stateSnapshot }`
* `emit` passing `eventData` properties `{ stateSnapshot }`
* `failure` passing `eventData` properties `{ stateSnapshot, duration, error }`
* `fallbackEmit` passing `eventData` properties `{ stateSnapshot }`
* `fallbackFailure` passing `eventData` properties `{ stateSnapshot, error }`
* `fallbackMissing` passing `eventData` properties `{ stateSnapshot }`
* `fallbackSuccess` passing `eventData` properties `{ stateSnapshot }`
* `opened` passing `eventData` properties `{ stateSnapshot }`
* `shortCircuited` passing `eventData` properties `{ stateSnapshot, error }`
* `success` passing `eventData` properties `{ stateSnapshot, duration }`
* `timeout` passing `eventData` properties `{ stateSnapshot, duration, error }`

Under the hood, this is actually using your `logEvent()` Function to complete a concrete
implementation of the `AbstractLoggingMonitor`. If you don't provide a Function, you can 
provide a Class that extends either the `Monitor` class or the `AbstractLoggingMonitor`
class. If you extend the `AbstractLoggingMonitor` base class, you only have to override 
the `logEvent()` method:

```js
class MyMonitor extends AbstractLoggingMonitor {

    constructor( statsD ) {

        super();
        this._statsD = statsD;

    }

    logEvent( eventType, eventData ) {

        stats.increment( `circuit-breaker.${ eventType }` );

    }

}

// ....

var circuitBreaker = CircuitBreakerFactory.create({
    id: "Remote API",
    monitor: new MyMonitor( stats )
});
```

However, if you extend the `Monitor` class, you can override any of the `log*` methods:

```js
class MyMonitor extends Monitor {
    
    logClosed( stateSnapshot ) {
        /* ... */
    }

    logOpened( stateSnapshot ) {
        /* ... */
    }

}

// ....

var circuitBreaker = CircuitBreakerFactory.create({
    id: "Remote API",
    monitor: new MyMonitor()
});
```

The `Monitor` class provides the following default, no-op (No Operation) methods, which
means you only have to override the ones that are meaningful to your application:

* `logClosed( stateSnapshot )`
* `logExecute( stateSnapshot )`
* `logEmit( stateSnapshot )`
* `logFailure( stateSnapshot, duration, error )`
* `logFallbackEmit( stateSnapshot )`
* `logFallbackFailure( stateSnapshot, error )`
* `logFallbackMissing( stateSnapshot )`
* `logFallbackSuccess( stateSnapshot )`
* `logOpened( stateSnapshot )`
* `logShortCircuited( stateSnapshot, error )`
* `logSuccess( stateSnapshot, duration )`
* `logTimeout( stateSnapshot, duration, error )`

## Package Exports

This Circuit Breaker package exports the following public members:

* `OpenError`
* `StateError`
* `TimeoutError`
* `AbstractLoggingMonitor`
* `Monitor`
* `State`
* `CircuitBreaker`
* `CircuitBreakerFactory`

[bennadel]: http://www.bennadel.com
[googleplus]: https://plus.google.com/108976367067760160494?rel=author
[release-it]: https://www.bennadel.com/blog/3162-release-it-design-and-deploy-production-ready-software-by-michael-t-nygard.htm
