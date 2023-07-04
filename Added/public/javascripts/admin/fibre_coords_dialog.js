/*
 * DESCRIPTION: Implementation of the fibre line dialog. This dialog is used when
 *              editing the map based calibrations of the fibre line.
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


FibreLineDialog = function(el, userConfig, formId) {
    fotech.gui.ValidatingDialog.call(this, el, userConfig);
    this.form = $(formId);
    this.table = $('fibreCoordsFormTable');
    this.markers = [];
    this.redrawCallback = null;
    this.coordsRemovedCallback = null;
    this.coordsAddedCallback = null;
    this.allCoordsRemovedCallback = null;
    this.deleteImagePath = userConfig.deleteImagePath;
    this.changesExist = false;

    var me = this;
    Element.observe($('add_coord_id'), 'click', function() {
        me.coordsAddedCallback();
        me.focusOnLastMarker();
    });

    Element.observe(me.form, 'change', function() {
        me.changesExist = true;
    });
};

FibreLineDialog.prototype = new fotech.gui.ValidatingDialog;

FibreLineDialog.prototype.focusOnLastMarker = function() {
  $('lat_' + (this.markers.size() - 1) + '_raw').activate();
  this.focusOnMarkerCallback(this.markers.last());
};

FibreLineDialog.prototype.focusOnPreviousMarker = function(index) {
    var newIndex = index - 1;
    if (newIndex < 0 ) {
        /* we've removed the first element, loop round to the end */
        newIndex = this.markers.length - 1;
    }

    if (newIndex >= 0) {
        $('lat_' + (newIndex) + '_raw').activate();
    }

    this.focusOnMarkerCallback(this.markers[newIndex]);
};

FibreLineDialog.prototype.setMarkers = function(markers) {
  this.markers = markers;
  this._refreshDialog();
};

FibreLineDialog.prototype._refreshDialog = function() {
  this._removeAllCoords();

  for(var i = 0, len = this.markers.size(); i < len; i++) {
    latLng = this.markers[i].getPosition();
    this._addNewRow(i, this.markers[i], this.markers[i]['calibration']);
  }
};

FibreLineDialog.prototype._removeAllCoords = function() {
  $$('tr.lat_lng').each(function(item) {
      Element.remove(item);
  });
};

FibreLineDialog.prototype._addNewRow = function(row, marker, calibrationDistance) {
  var rowTemplate = new Template("<tr id='coord_row_#{row_number}' class='lat_lng'> \
                                    <td >#{display_row}</td> \
                                    <td ><input type='text' id='lat_#{row_number}_raw' value='#{raw_lat_value}' size='13'/> <input type='hidden' value='#{lat_value}' id='lat_#{row_number}' name='fibre_line[lats][]'/> </td> \
                                    <td ><input type='text' id='lng_#{row_number}_raw' value='#{raw_long_value}' size='13'/> <input type='hidden' value='#{long_value}' id='lng_#{row_number}' name='fibre_line[lngs][]' /></td> \
                                    <td> <input type='text' id='cal_#{row_number}_raw' value='#{raw_cal_dist}' size='5'/><input type='hidden' value='#{cal_dist}' id='cal_#{row_number}' name='fibre_line[cals][]' /></td> \
                                    <td ><img id='delete_#{row_number}' src='/images/delete-16x16.png' border='0'/></td> \
                                  </tr>" );

  var latLng = marker.getPosition();
  var latValue = latLng.lat();
  var lngValue = latLng.lon();
  var displayLatValue = latValue;
  var displayLngValue = lngValue;
  var preferences = fotech.gui.rootOpener().user.preferences;
  var latlng_format = preferences['units-latlng'];
  var latlng_precision = preferences['precision-latlng'];
  if(latlng_format == 'dms'){
    var latlngString = latLng.toString('dms',latlng_precision).split(',');
    var displayLatValue = latlngString[0];
    var displayLngValue = latlngString[1];
  }
  var units_distance = preferences['units-distance'];
  var precision_distance = preferences['precision-distance'];
  var rawCalibrationDistance = marker.raw_calibration;
  if(!rawCalibrationDistance){
      rawCalibrationDistance = fotech.util.convert(parseFloat(calibrationDistance), 'm', units_distance,precision_distance);
      if(isNaN(rawCalibrationDistance)){
          rawCalibrationDistance = '';
      }
  }
  values = {display_row: row + 1, row_number: row, 
            lat_value: latValue , raw_lat_value: displayLatValue, 
            long_value: lngValue, raw_long_value: displayLngValue,
            cal_dist: calibrationDistance, raw_cal_dist: rawCalibrationDistance,
            delete_image_path: this.deleteImagePath};
  Element.insert($('lat_lng_values'), { bottom: rowTemplate.evaluate(values)});

  var me = this;
  var lng = $('lng_'+row+'_raw');
  lng.observe('change', function(event) {
      marker.setPosition(new LatLon($('lat_' + row + '_raw').value, this.value));
      me.changesExist = true;
      me.redrawCallback(); 
  });
  lng.observe('focus', function(event){
      this.focusOnMarkerCallback(marker);
  }.bind(this));

  var lat = $('lat_' + row + '_raw');
  lat.observe('change', function(event) {
      element = $('lng_' + row + '_raw')
      marker.setPosition(new LatLon(this.value, element.value));
      me.changesExist = true;
      me.redrawCallback(); 
  });
  lat.observe('focus', function(event){
      this.focusOnMarkerCallback(marker);
  }.bind(this));

  var cal = $('cal_'+row+'_raw');
  cal.observe('blur', function(event){
      var element = Event.element(event);
      var row = parseInt(element.id.match(/\d+/)[0]);
      if(element.value == ''){
          this.markers[row].raw_calibration = null;
      } else {
          this.markers[row].raw_calibration = element.value;
      }
  }.bind(this));

  Element.observe($('delete_' + row), 'click', function(event) {
      var removed = me.markers.splice(row, 1);
      console.log( "Removed marker", removed);
      me.changesExist = true;
      me.coordsRemovedCallback(marker);
      me._refreshDialog();
      me.focusOnPreviousMarker(row);
  });

  Element.observe($('cal_' + row), 'change', function(event) {
      me.markers[row]['calibration'] = this.value 
  });
  Element.observe($('cal_' + row + '_raw'), 'focus', function(event) {
      this.focusOnMarkerCallback(marker);
  }.bind(this));
  
};

FibreLineDialog.prototype.highlight = function(marker) {
  for(var i = 0; i < this.markers.size(); i++) {
    if (this.markers[i] == marker) {
      $('lat_' + i + '_raw').activate();
      break;
    }
  }
};

FibreLineDialog.prototype.registerCallback = function(callType, callback) {
  switch (callType) {
    case 'redraw': this.redrawCallback = callback; break;
    case 'removecoords': this.coordsRemovedCallback = callback; break;
    case 'removeallcoords': this.allCoordsRemovedCallback = callback; break;
    case 'addcoords': this.coordsAddedCallback = callback; break;
    case 'focusmarker':this.focusOnMarkerCallback = callback; break;
  }
};

FibreLineDialog.prototype.validateShortFibres = function() {
  var previousLat = {};
  var previousLng = {};

  /* We have problems with fibres that only contain two points where
  the start and stop coordinates are identical, this should be prevented */

  /* basically lines have to go somewhere, so we need to be very upset 
  if all of the points end up at the same place */

  for (var i = 0, len = this.markers.size(); i < len; i++) {
    var lat = document.getElementById( 'lat_' + i + '_raw' );
    var lng = document.getElementById( 'lng_' + i + '_raw' );

    previousLat[ lat.value ] = true;
    previousLng[ lng.value ] = true;
  }

  if ( Object.keys( previousLat ).length == 1 && Object.keys( previousLng ).length == 1 ) {
    this.addValidationFailure( 'lat_' + i + '_raw', 'Lat. ', 'Fibrelines cannot contain only points with the same coordinates.')
  }
}

FibreLineDialog.prototype.validateLatLngs = function() {
  for (var i = 0, len = this.markers.size(); i < len; i++) {
    var lat_id = 'lat_' + i;
    var lng_id = 'lng_' + i;

    //this is where the conversion takes place.
    var latlng = new LatLon($F(lat_id + "_raw"), $F(lng_id + "_raw"));

    if(isNaN(latlng._lat)){
        this.addValidationFailure(lat_id, "", "Lat. " + (i + 1) + " is invalid");
    }
    if (isNaN(latlng._lon)){
        this.addValidationFailure(lng_id, "", "Long. " + (i + 1) + " is invalid");
    }

    if(latlng.isValid()){
        //populate the latlng fields since they are all good
        $(lat_id).value = latlng.lat();
        $(lng_id).value = latlng.lon();
    } else {
        if (!latlng.isValid('latitude')) this.addValidationFailure(lat_id, "", "Lat. " + (i+1) + " is invalid");
        if (!latlng.isValid('longitude')) this.addValidationFailure(lng_id, "", "Long. " + (i+1) + " is invalid");
    }
  }
}

FibreLineDialog.prototype.validateMarkers = function() {
  if (this.markers.length < 2) {
    this._addError('no_field_name', 'no_field_label', I18n.t('admin.fibre_lines.map_cal.error_one_point'), null);
    return false;
  } 
  return true;
};

FibreLineDialog.prototype.validateCalibrations = function() {
    for (var i = 0; i < this.markers.length; i++) {

        var cal_id = 'cal_' + i;

        //this is where the conversion takes place.
        var calib = $F(cal_id + '_raw');
        if(calib === undefined || calib == '')
            continue;
        if (isNaN(parseFloat(calib))) {
            this._addError('no_field_name', 'no_field_label', I18n.t('admin.fibre_lines.map_cal.error_non_calibrated_point'), null);
            return false;
        }

        //populate the cal hidden fields since they are all good
        var preferences = fotech.gui.rootOpener().user.preferences;
        var distance_units = preferences['units-distance'];
        $(cal_id).value = fotech.util.convert(calib, distance_units, 'm');
    }
    return true;
};


FibreLineDialog.editDialog = function(options) {
    var config = {
        visible: false,
        constraintoviewport: true,
        hideaftersubmit: false,
        postmethod: "form",
        close: false,
        xy: [10,375],

        buttons: [ {text: fotech.gui.labels.dismiss, handler: FibreLineDialog.cancelAndClear},
            {text: fotech.gui.labels.save, handler: FibreLineDialog.saveHandler, isDefault: true}
        ],
        deleteImagePath: options.deleteImagePath,
        addImagePath: options.addImagePath
    }

    var fibreDialog = new FibreLineDialog("fibreCoordDialog", config, "fibreCoordsForm");
    fibreDialog.callback.success = fibreDialog._saveCompleted;
    fibreDialog.callback.failure = fibreDialog._saveCompleted;

    fibreDialog.validateFields = function() {
        this.validateShortFibres();
        this.validateLatLngs();
        this.validateMarkers();
        this.validateCalibrations();
    };
    return fibreDialog;
};


// Submit the form.
FibreLineDialog.saveHandler = function() {
    this.submit();
}

FibreLineDialog.cancelAndClear = function() {
  if (this.changesExist) {
    var answer = confirm(I18n.t('admin.fibre_lines.map_cal.confirm_cancel'));
    if (answer) { 
      this.allCoordsRemovedCallback();
      this.changesExist = false;
    }
  } else {
    this.allCoordsRemovedCallback();
    this.changesExist = false;
  }
};

