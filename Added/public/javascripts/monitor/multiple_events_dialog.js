/*
 * FILENAME:    multiple_events_dialog.js
 * 
 * DESCRIPTION: Javascript specific to the multiple events dialog. This is used both for
 *   the popup when multiple events are in the same area as well as for the recent
 *   events list.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */


MultipleEventsDialog = function(dialogId, stickToElement, options) {
    this.stickToElement = stickToElement; // Defines which element should this dialog be restricted to.
    options = options || {};
    this.isFixed = options.isFixed || false;
    
    this.dialogId = dialogId;
    if(options.isFixed){
        //this.dialog = new YAHOO.widget.Panel(dialogId, {visible: true});
    }
    else{
        this.dialog = new YAHOO.widget.Panel(dialogId, {visible: false, constraintoviewport: true});
        if (stickToElement) {
          this.dialog.render(stickToElement);
        } else {
          this.dialog.render(document.body);
        }    
        if(typeof overlayManager != 'undefined')
            overlayManager.register(this.dialog);
        this._setupResize(dialogId);
        this.dialog.hideEvent.subscribe(this.stopPlayEvents.bind(this));
    }

    this._setupKeyListener(dialogId);
    this._fibreEventCount = 0;
    this._activeElement = null;
    this._events = new Hash();  //here to stash the events
    this._eventsArray = new Array();  //here to stash an ordered list of the events (sorted by time asc)
    this.showPlayButton = false;
    
}

MultipleEventsDialog.prototype.showPlayButton = function(bool){
    this.showPlayButton = bool;
}

MultipleEventsDialog.prototype._setupKeyListener = function(dialogId) {
  var me = this;
  var handler = function(type, args, obj) {
    me._handleKeyPressed(type, args, obj);
  };

  this.keyListener = new YAHOO.util.KeyListener($(dialogId), { keys: [38,40] },
                                                          { fn: handler,
                                                            scope: this.dialog,
                                                            correctScope: true });
}

MultipleEventsDialog.prototype._handleKeyPressed = function(type, args, obj) {
  switch(args[0]) {
      case Event.KEY_UP:
          this._selectNextEvent(1);
          break;
      case Event.KEY_DOWN:
          this._selectNextEvent(-1);
          break;
  }
}

MultipleEventsDialog.prototype._selectNextEvent = function(direction) {
    var activeAnchor = this._activeElement;
    if (activeAnchor == null) {
        return;
    }
    
  var index = activeAnchor.attributes['tabindex'].value;
  var selectedAnchor = null;
  var nextIndex = parseInt(index, 10) + direction;

  if (nextIndex <= this._fibreEventCount && nextIndex >= 1) {
    selectedAnchor = $(this.dialog.id).getElementsBySelector('a[tabindex=' + nextIndex + ']');
    selectedAnchor[0].focus();
    fireEvent(selectedAnchor[0], 'click');
  } 
}

MultipleEventsDialog.prototype.show = function(fibre_events, x, y, elementId_or_element, options) {
    options = options || {showMoreLink: false};
    this.clearFibreEvents();
    this._addFibreEvents(fibre_events);
    this._showButtons();
    this._showMoreLink(options.showMoreLink);

    this.keyListener.enable();

    if(!this.isFixed){
        if (x === undefined || y === undefined || elementId_or_element === undefined)  {
          this.dialog.show();
        }
        else {
          this._show(x, y, elementId_or_element);
        }
    }
}

MultipleEventsDialog.prototype._showButtons = function(){
    if(!this.showPlayButton)
        return;
    
    $('multipleEventControls', 'multipleEventsPlayButton').compact().invoke('show');
}

MultipleEventsDialog.prototype._showMoreLink = function(showMore){
    this.showMoreLink = showMore;
    if(this.showMoreLink)
      $('showMoreLink').show();
    else
      $('showMoreLink').hide();
}

MultipleEventsDialog.prototype._show = function(x, y, elementId_or_element) {
  var width = this.dialog.body.clientWidth;
  if (x - (width) < 0)
    x = x + width;

  var height = this.dialog.body.clientHeight;
  var element = (typeof elementId_or_element == 'string') ? $(elementId_or_element) : elementId_or_element;
  if (y + (height) > element.height)
    y = y - height;

  this.dialog.moveTo(x - (this.dialog.body.clientWidth), y);
  this.dialog.show();
}

// Hide Dialog. Convenience function to give .show() a matching .hide()
MultipleEventsDialog.prototype.hide = function(){
	this.dialog.hide();
}


// Clear all the events from the dialog.
MultipleEventsDialog.prototype.clearFibreEvents = function() {
    $(this.dialogId).getElementsBySelector('ul#eventList')[0].update('');
    this._events = new Hash();
    this._eventsArray = new Array();
}

MultipleEventsDialog.prototype._addFibreEvents = function(fibreEvents) {
  if (fibreEvents instanceof Array) {
    fibreEvents.each( function(ev, index) {
          this.addFibreEvent(ev);
        }.bind(this));
  } else {
    this.addFibreEvent(fibreEvents);
  }
}

MultipleEventsDialog.prototype.addFibreEvent = function(fibreEvent, index) {
    // Update the distance to account for the first calibration point.
    this._events.set(fibreEvent.id, fibreEvent);
    this._eventsArray = this.getEventsInOrder();
    var fibreLine;
    if (typeof(getFibreLineById) == 'function' || typeof(getFibreLineById) == 'object')
        fibreLine = getFibreLineById(fibreEvent.routeId);
    else
        fibreLine = window.opener.getFibreLineById(fibreEvent.routeId);
    
    // Determine the necessary unit conversions.
    var prefs = fotech.gui.rootOpener().user.preferences;
    var dist = fibreEvent.distance;
    var isCalibrated = false;
    if (fibreLine && fibreLine.activeRegion) {
        dist = dist - fibreLine.activeRegion.startingPosition;
        isCalibrated = true;
    }
    dist = fotech.util.convert(dist, 'm', prefs['units-distance'], prefs['precision-distance']);
    dist = "" + dist + (isCalibrated ? "" : "(not calibrated)") + prefs['units-distance'];

    // Update the display.
    var listItem = new Element('li',{
                                        'class': 'recent',
                                        'style': 'list-style-image: url("' + fibreEvent.getType().smallImageURL + '");'
                                    });

    var linkItem = new Element('a', {
                                        'class': 'recent',
                                        href: "javascript:void(0)",
                                        id: this._getDomId(fibreEvent.id),
                                        tabindex: ++this._fibreEventCount
                                    });

    linkItem.textContent = fibreEvent.time.format("HH:MM:ss") + ' ' + dist;

    listItem.appendChild( linkItem );

    Element.insert(
                    $(this.dialogId).getElementsBySelector('ul#eventList')[0],
                    {
                        top: listItem
                    }
                );

    linkItem.addEventListener( 'click', function(ev){ this._onEventClicked(ev.element(), fibreEvent ); }.bind(this) );
}

// Create a dom id from an event id.
MultipleEventsDialog.prototype._getDomId = function(fibreEventId) {
    return this.dialogId + '_event_item_' + fibreEventId;
}

// Remove an event from the dialog if it exists. Does nothing if the event is not in
// this dialog.
MultipleEventsDialog.prototype.removeFibreEvent = function(fibreEvent) {
    var el = $(this._getDomId(fibreEvent.id));
    if (el){
        el.parentNode.remove();
        this._events.unset(fibreEvent.id);
        this._eventsArray.splice(this._eventsArray.indexOf(fibreEvent), 1);
    }
}

// When an event is clicked we call the event clicked callback, if there is one, set the focus to
// the object that caused the event, and record the object as having the focus.
// Takes in element of interest rather than click event so this method can be called programmatically
MultipleEventsDialog.prototype._onEventClicked = function(element, fibreEvent) {
    if (this.eventClickedCallback)
        this.eventClickedCallback(fibreEvent);
    element.focus();
    this._activeElement = element;
    this.eventPlayerCurrentEventIndex = this._eventsArray.indexOf(fibreEvent);
}

MultipleEventsDialog.prototype._setupResize = function(dialogId) {
  var resize = new YAHOO.util.Resize(dialogId, {
    handles: ['b'],
    autoRatio: false,
    status: false
  });

  resize.on('resize', function(args) {
      var panelHeight = args.height;
      this.cfg.setProperty("height", panelHeight + "px");
  }, this.dialog, true);
}


MultipleEventsDialog.prototype.setEventClickedCallback = function(callback) {
  this.eventClickedCallback = callback;
}

MultipleEventsDialog.prototype.addDialogClosedCallback = function(callback) {
  if(this.dialog)
    this.dialog.hideEvent.subscribe(callback);
}

MultipleEventsDialog.prototype.getEventsInOrder = function(order){
    if(!order)
        order = "ASC";
        
    var events = new Array();
    if(order == "ASC")
        events = this._events.values().sort(function(a, b) { return a.time - b.time;});
    else
        events = this._events.values().sort(function(a, b) { return b.time - a.time;});
    
    return events;
}

/**
 * Method which will start a timer and attempt to play each event track every second
 */
MultipleEventsDialog.prototype.playEvents = function(){
    if(this.eventPlayer && this.eventPlayer.isActive())
        this.eventPlayer.stop();
    this.eventPlayer = new fotech.util.Timer();
    if(this.eventPlayerCurrentEventIndex == null || this.eventPlayerCurrentEventIndex == this._events.size()-1){ 
        this.eventPlayerCurrentEventIndex = -1;
    }
    this.eventPlayer.setInterval(0.5);
    this.eventPlayer.callback = function() {
        this.eventPlayerCurrentEventIndex++;
        var eventToPlay = this._eventsArray[this.eventPlayerCurrentEventIndex];
        if(eventToPlay === undefined){
            this.eventPlayerCurrentEventIndex = null;
            return false;   //this will kill the timer
        }        
        this._onEventClicked($(this.dialogId + '_event_item_' + eventToPlay.id), eventToPlay);

        return true;
    }.bind(this);
    this.eventPlayer.start();
}

/** 
 * Method to stop the playback
 */
MultipleEventsDialog.prototype.stopPlayEvents = function(){
    if(this.eventPlayer && this.eventPlayer.isActive())
        this.eventPlayer.stop();
    this.eventPlayerCurrentEventIndex = null;
}


function fireEvent(element,event) {
   if (document.createEventObject) {
       // dispatch for IE
       var evt = document.createEventObject();
       return element.fireEvent('on'+event,evt)
   } else {
       // dispatch for firefox + others
       var evt = document.createEvent("HTMLEvents");
       evt.initEvent(event, true, true ); // event type,bubbling,cancelable
       return !element.dispatchEvent(evt);
   }
}

