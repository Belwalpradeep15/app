/* A simple debounce script, prevents the supplied function being called repeatedly within
 * a given time window
 * this means, that when a call is made an XXX (wait) ms delay is introduced.
 * if immediate is true then the function is called immediately and any calls made within
 * wait ms afterwards are ignored.
 * if immediate is false, then the call is delayed by XXX (wait) ms and any subsequent calls
 * within the time period are supressed with ony the final execution happening (at the end
 * of the delay interval)
 */

 /** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech dom namespace. */
fotech.debounce = function(func, wait, loptions) {
    var timeout;
    var options = loptions ? loptions : {};
    var retries = 0;

    var debounced = function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!options.immediate) func.apply(context, args);
            retries = 0;
        };

        retries++;
        var callNow = options.immediate && !timeout;

        if ( options.maxretries && options.maxretries < retries ){
        } else {
            /* cancel the next timeout */
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        }

        if (callNow){
            func.apply(context, args);
            retries = 0;
        }
    };

    debounced.cancel = function(){
        clearTimeout( timeout );
    };

    return debounced;

};

fotech.debounceAnimation = function(func, options) {
    var timeout;
    options = options ? options : {};
    var retries = 0;

    return function() {
        var context = this, args = arguments;

        var later = function() {
            timeout = null;
            if (!options.immediate) func.apply(context, args);
            retries = 0;
        };

        retries++;
        var callNow = options.immediate && !timeout;

        if ( options.maxretries && options.maxretries < retries ){
        } else {
            /* cancel the next timeout */
            window.cancelAnimationFrame(timeout);
            timeout = window.requestAnimationFrame(later);
        }

        if (callNow){
            func.apply(context, args);
            retries = 0;
        }
    };
};

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
fotech.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : Date.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = Date.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };
