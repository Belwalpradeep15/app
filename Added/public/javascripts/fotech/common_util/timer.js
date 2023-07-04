/*
 * FILENAME:    timer.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-09-15
 * 
 * DESCRIPTION:  
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2008 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview Generic timer class.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech util namespace. */
fotech.util = (fotech.util ? fotech.util : {});


/**
 * Construct a new Timer instance.
 * @constructor
 *
 * @class
 * The Timer class is used to setup events that will occur at a fixed rate. Note that
 * the time interval should not be considered too accurate. Specifically events may
 * not necessarily occur at exactly that interval, but should occur shortly after
 * the interval. In addition the interval does not take into account the time required
 * to run the callback that is actually performed by the timer. For example, if the
 * timer interval is 5 seconds and it takes about 2 seconds to run the callback, the
 * second time the callback is called will be about 5 seconds after the first one
 * has completed, or about 7 seconds after the first one was called.
 */
fotech.util.Timer = function() {
    this.interval = -1;
    this.activeId = null;
}

/**
 * Start the timer. The interval should have been set before this call is made. 
 * @throws Error if the interval has not been set.
 */
fotech.util.Timer.prototype.start = function() {
    if (this.interval <= 0)
        throw new Error("The interval, " + this.interval + ", is not valid.");
    
    if (this.activeId != null)
        this.stop();
    if (this.callback()) {
        var self = this;
        this.activeId = setInterval(function() { self._doCallback(); }, this.interval*1000);
    } 
}

/**
 * Stop the timer. This will not stop the iteration that is currently in progress, but
 * it will stop any future calls. You can restart the timer by calling the start
 * method.
 */
fotech.util.Timer.prototype.stop = function() {
    if (this.activeId != null) {
        clearInterval(this.activeId);
        this.activeId = null;
    }
}

/**
 * Returns true if the timer is currently active.
 * @return true if the timer is active.
 */
fotech.util.Timer.prototype.isActive = function() {
    return (this.activeId != null);
}

/**
 * Set the timer interval. This sets the interval in seconds. Fractions are allowed. If
 * the interval is 0 or less, then the timer will never be run. If you cange the interval
 * to a positive value and it was previously 0 or less, you will need to call the
 * start method in order to start the timer.
 * @param interval The timer interval in seconds.
 */
fotech.util.Timer.prototype.setInterval = function(interval) {
    this.interval = interval;
    if (this.activeId != null) {
        this.start();   // forces a restart
    }
}

/**
 * The timer callback method. The default implementation simply returns false, meaning
 * that nothing is done and the timer should not be called again. To be useful this
 * method should be replaced or the Timer class subclassed to override this.
 * @return Always returns false.
 */
fotech.util.Timer.prototype.callback = function() {
    return false;
}

// Internal method that actually runs the callback. If the callback returns true then
// this will reset the timer for another round.
fotech.util.Timer.prototype._doCallback = function() {
    if (!this.callback())
        this.stop();
}

