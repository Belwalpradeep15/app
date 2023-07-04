/*
 * FILENAME:    event_dialog.js
 * AUTHOR:      Aaron Rustad <arustad@anassina.com>
 * CREATED ON:  Sat 23 May 10:19:39 2009
 *
 * DESCRIPTION: This is the backing 'bean' for the event_dialog.
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

/**
 * @fileoverview ...add brief description of the file...
 */
EventDialog = function(dialogId) {
  this.dialogId = dialogId;
  this.dialog = new YAHOO.widget.Dialog(dialogId, {visible:false,constraintoviewport:true});
  this.dialog.center();
  this.templates = [];
}

EventDialog.prototype.isVisible = function(){
    return this.dialog.cfg.getProperty('visible');
}

EventDialog.prototype.show = function(fibre_event) {
  this._registerFibreEvent(fibre_event);
  this._hideButtons();
  this._setContent(fibre_event);

  this.dialog.render();
  $(this.dialogId).style.display = 'block';
  this.dialog.show();
}

EventDialog.prototype._registerFibreEvent = function(fibre_event) {
  this.current_fibre_event = fibre_event;
}


EventDialog.prototype.hide = function() {
  this.dialog.hide();
}

EventDialog.prototype._setContent = function(fibre_event) {
    // Adjust the distance to the first calibration point.
    var fibreLine;

    if (typeof(getFibreLineById) == 'function' || typeof(getFibreLineById) == 'object')
        fibreLine = getFibreLineById(fibre_event.routeId);
    else
        fibreLine = window.opener.getFibreLineById(fibre_event.routeId);

    var prefs = fotech.gui.rootOpener().user.preferences;
    var dist = fibre_event.distance;
    var distanceUnits = I18n.t("prefs.section.units.units-short." + prefs['units-distance']);
    var isCalibrated = false;
    if (fibreLine && fibreLine.activeRegion) {
        dist = dist - fibreLine.activeRegion.startingPosition;
        isCalibrated = true;
    }
    dist = fotech.util.convert(dist, 'm', prefs['units-distance'], prefs['precision-distance']);
    dist = "" + dist + (isCalibrated ? "" : "(not calibrated)") + distanceUnits;

    var width = "" + fotech.util.convert(fibre_event.width, 'm', prefs['units-distance'], prefs['precision-distance']) + distanceUnits;
    var velocityUnits = I18n.t("prefs.section.units.units-short." + prefs['units-velocity']);
    var velocity = "" + fotech.util.convert(fibre_event.velocity, 'm_s', prefs['units-velocity'], prefs['precision-velocity']) + velocityUnits;
    var accelerationUnits = I18n.t("prefs.section.units.units-short." + prefs['units-acceleration']);
    var acceleration = "" + fotech.util.convert(fibre_event.acceleration, 'm_s2', prefs['units-acceleration'], prefs['precision-acceleration']) + accelerationUnits;

    /* Update the dialog content. */
    var et = fibre_event.getType();
    this._replaceContent('eventTitle', {0: fibre_event.time.format("HH:MM:ss"), 1: "(" + fibre_event.id + ")"});
    this._replaceContent('eventType', {0: et.desc});
    this._replaceContent('eventTime', {0: fibre_event.time.format(Date.format.longWithTZ)});
    this._replaceContent('mag_and_width', {0: (Math.round(fibre_event.magnitude * 1000) / 1000), 1: width});
    this._replaceContent('eventDistance', {0: dist});
    this._replaceContent('eventPosition', {0: this._createPositionString(fibre_event)});
    this._replaceContent('velocity_and_accel', {0: velocity, 1: acceleration});
    this._replaceContent('onRouteInfo', {0: this._createOnRouteString(fibre_event)});
    this._replaceContent('eventTags', {0: fibre_event.tagInfoString({preferences:prefs})});
    $('eventImage').setAttribute('src', et.largeImageURL);

    this._showButtons(fibre_event);
}

EventDialog.prototype._showButtons = function(fibre_event) {
  var buttonIds = this._determineButtonIdsToShow(fibre_event);
  if (buttonIds.length > 0) {
      if ($('eventControls'))
          $('eventControls').show();
    buttonIds.each( function(buttonId) {
      if ($(buttonId)) {
        var param = (buttonId == 'displayButton') ? fibre_event.routeId : fibre_event.id;
        this._replaceAttributeContent(buttonId, 'onClick', {0: param});
        $(buttonId).show();
      }
    }.bind(this));
  }
}

EventDialog.prototype._hideButtons = function() {
  ['displayButton', 'zoomButton', 'trackButton'].each( function(buttonId) {
      if ($(buttonId))
        $(buttonId).hide();
  });
    if ($('eventControls'))
        $('eventControls').hide();
}

EventDialog.prototype.hideDisplayButton = function() {
    $('displayButton').hide();
}

EventDialog.prototype._determineButtonIdsToShow = function(fibre_event) {
    var buttonIds = [];
    if (fibre_event.eventTrackId != null && $('trackButton'))
        buttonIds[buttonIds.length] = 'trackButton';

    if (typeof(displayedFibreLineId) != 'undefined' && fibre_event.routeId != displayedFibreLineId && $('displayButton'))
        buttonIds[buttonIds.length] = 'displayButton';

    if (typeof(displayedFibreLineId) != 'undefined' && $('audioButton'))
        buttonIds[buttonIds.length] = 'audioButton';

    var isFibreDisplayed = typeof(displayedFibreLineIds) != 'undefined' && displayedFibreLineIds.indexOf(fibre_event.routeId) > -1;
    var isMainView = (typeof(mainViewType) != 'undefined');
    var viewType = isMainView ? mainViewType : 'soundfield';
    if(['list'].indexOf(viewType) == -1  && isFibreDisplayed && $('zoomButton'))
      buttonIds[buttonIds.length] = 'zoomButton';

    return buttonIds;
}

// Replaces the content of an element defined by id.
// eg, <p>#{0}</p>
EventDialog.prototype._replaceContent = function(id, args) {
    var template = this._getTemplate(id);
    $(id).update(template.evaluate(args));
}

// Replaces the content of an attribute of a specific element defined by id.
// eg. <img src='#{0}' .../>
EventDialog.prototype._replaceAttributeContent = function(id, attribute, args) {
  var template = this._getTemplate(id, attribute);
  $(id).setAttribute(attribute, template.evaluate(args));
}

EventDialog.prototype._getTemplate = function(id, attribute) {
  var template = this.templates[id];
  if (template == null) {
    if (attribute == null) {
      template = new Template($(id).innerHTML);
    } else {
      template = new Template($(id).readAttribute(attribute));
    }

    this.templates[id] = template;
  }
  return template;
}

EventDialog.prototype._createPositionString = function(ev) {
    var prefs = fotech.gui.rootOpener().user.preferences;
    var str = "";
    if(prefs['units-latlng'] == 'dms'){
        var latlng = new LatLon(ev.latitude,ev.longitude);
        str += latlng.toString('dms',prefs['precision-latlng']);
    }
    else{
        str += ev.latitude + ',' + ev.longitude;
    }
    return str;
}

EventDialog.prototype._createOnRouteString = function(ev) {
    var distance = ev.getTag("path_distance");
    var marker = ev.getTag("path_marker_name");
    var route = ev.getTag("path_path_name");

    if (distance != null && marker != null && route != null) {
        var prefs = fotech.gui.rootOpener().user.preferences;
        distance = fotech.util.convert(distance, 'm', prefs['units-distance'], prefs['precision-distance']);
        var distanceUnits = I18n.t("prefs.section.units.units-short." + prefs['units-distance']);

        var direction = ev.getTag("path_direction_of_travel");
        var velocity = ev.getTag("path_velocity");

        if (direction != null && velocity != null) {
            velocity = fotech.util.convert(velocity, 'm_s', prefs['units-velocity'], prefs['precision-velocity']);
            if (Math.abs(velocity) > 0) {
                // At this point we know we have a moving event.
                var velocityUnits = I18n.t("prefs.section.units.units-short." + prefs['units-velocity']);
                return I18n.t("admin.paths.moving_summary",
                              {
                                  distance: distance,
                                  distanceUnits: distanceUnits,
                                  marker: marker,
                                  route: route,
                                  direction: direction,
                                  velocity: velocity,
                                  velocityUnits: velocityUnits
                              }) + "<br/><br/>";
            }
        }

        // At this point we know we have a stationary event.
        return I18n.t("admin.paths.stationary_summary",
                      {
                        distance: distance,
                        distanceUnits: distanceUnits,
                        marker: marker,
                        route: route
                      }) + "<br/>";
    }
    else {
        return "";
    }
}
