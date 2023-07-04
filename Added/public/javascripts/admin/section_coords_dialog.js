/*
 * DESCRIPTION: Implementation of the fibre line dialog. This dialog is used when
 *              editing the map based calibrations of the fibre line.
 *
 * LAST CHANGE:
 * $Author: ksimard $
 *   $Date: 2013-09-04 11:16:50 -0600 (Wed, 04 Sep 2013) $
 *    $Rev: 8587 $
 *    $URL: https://repos.fotechsolutions.com/svn/system/panoptes/trunk/modules/panoptes-rails/public/javascripts/admin/fibre_coords_dialog.js $
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */


SectionCalibrationDialog = function(el, userConfig, formId) {
    fotech.gui.ValidatingDialog.call(this, el, userConfig);
    this.form = $(formId);
    this.table = $('sectionCoordsFormTable');
    this.markers = [];
    this.redrawCallback = null;
    this.coordsRemovedCallback = null;
    this.coordsAddedCallback = null;
    this.allCoordsRemovedCallback = null;
    this.deleteImagePath = userConfig.deleteImagePath;
    this.changesExist = false;
    this.diagram = userConfig.diagram;
   
    this.form.observe('change', function() {
        this.changesExist = true;
    }.bind(this));
}

SectionCalibrationDialog.prototype = new fotech.gui.ValidatingDialog;

SectionCalibrationDialog.prototype.focusOnLastMarker = function() {
  $('cal_' + (this.markers.size() - 1) + '_raw').activate();
  this.focusOnMarkerCallback(this.markers.last());
}

SectionCalibrationDialog.prototype.focusOnPreviousMarker = function(index) {
  if (index != 0) {
    $('cal_' + (index - 1) + '_raw').activate();
    this.focusOnMarkerCallback(this.markers[index - 1]);
  }
}

SectionCalibrationDialog.prototype.setMarkers = function(markers) {
  this.markers = markers;
  this._refreshDialog();
}

SectionCalibrationDialog.prototype._refreshDialog = function() {
  this._removeAllCoords();

  for(var i = 0, len = this.markers.size(); i < len; i++) {
    this._addNewRow(i, this.markers[i], this.markers[i]['calibration']);
  }
}

SectionCalibrationDialog.prototype._removeAllCoords = function() {
  $$('tr.coord_row').each(function(item) {
      Element.remove(item);
  });
}

SectionCalibrationDialog.prototype._addNewRow = function(row, marker, calibrationDistance) {
  var rowTemplate = new Template("<tr id='coord_row_#{row_number}' class='coord_row'> \
                                    <td >#{display_row}</td> \
                                    <td> <input type='text' id='cal_#{row_number}_raw' value='#{raw_cal_dist}' size='5'/> \
                                    <input type='hidden' value='#{cal_dist}' id='cal_#{row_number}' name='calibrations[distances][]' /></td> \
                                    <td ><img id='delete_#{row_number}' src='/images/delete-16x16.png' border='0'/></td> \
                                  </tr>" );

  var preferences = fotech.gui.rootOpener().user.preferences;
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
            cal_dist: calibrationDistance, raw_cal_dist: rawCalibrationDistance,
            delete_image_path: this.deleteImagePath};
  Element.insert($('coord_values'), { bottom: rowTemplate.evaluate(values)});

  var me = this;

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
      me.markers.splice(row, 1);
      me.changesExist = true;
      me.coordsRemovedCallback(marker);
      me._refreshDialog();
      me.focusOnPreviousMarker(row);
  }.bind(this));

  Element.observe($('cal_' + row), 'change', function(event) {
      this.markers[row]['calibration'] = this.value 
  }.bind(this));
  Element.observe($('cal_' + row + '_raw'), 'focus', function(event) {
      this.focusOnMarkerCallback(marker);
  }.bind(this));
  marker.input = cal;
  
}

SectionCalibrationDialog.prototype.highlight = function(marker) {
  for(var i = 0; i < this.markers.size(); i++) {
    if (this.markers[i] == marker) {
      $('cal_' + i + '_raw').activate();
      break;
    }
  }
}

SectionCalibrationDialog.prototype.registerCallback = function(callType, callback) {
  switch (callType) {
    case 'redraw': this.redrawCallback = callback; break;
    case 'removecoords': this.coordsRemovedCallback = callback; break;
    case 'removeallcoords': this.allCoordsRemovedCallback = callback; break;
    case 'addcoords': this.coordsAddedCallback = callback; break;
    case 'focusmarker':this.focusOnMarkerCallback = callback; break;
  }
}

SectionCalibrationDialog.editDialog = function(options) {
  var config = {
    visible: false,
    constraintoviewport: true,
    hideaftersubmit: false,
    postmethod: "form",
    close: false,
    diagram: options.diagram,
    xy: [10,375],
    buttons: [ {text: fotech.gui.labels.dismiss, handler: this.cancelAndClear},
              {text: fotech.gui.labels.save, handler: this.saveHandler, isDefault: true}
             ],
    deleteImagePath: '/images/delete-16x16.png',
    addImagePath: '/images.add-16x16.png'
  }

  var fibreDialog = new SectionCalibrationDialog("sectionCoordDialog", config, "sectionCoordsForm");
  
  fibreDialog.validateFields = function() {
    this.validateMarkers();
    this.validateCalibrations();
  }
  return fibreDialog;
}

SectionCalibrationDialog.prototype.validateMarkers = function() {
  if (this.markers.length < 2) {
    this._addError('no_field_name', 'no_field_label', I18n.t('admin.fibre_lines.map_cal.error_one_point'), null);
    return false;
  } 
  return true;
}

SectionCalibrationDialog.prototype.validateCalibrations = function() {
    for (var i = 0; i < this.markers.length; i++) {

        var cal_id = 'cal_' + i;

        //this is where the conversion takes place.
        var calib = $F(cal_id + '_raw');
        if (isNaN(parseFloat(calib))) {
            this._addError(cal_id + '_raw', 'no_field_label', I18n.t('admin.fibre_lines.map_cal.error_non_calibrated_point'), null);
            return false;
        }

        //populate the cal hidden fields since they are all good
        var preferences = fotech.gui.rootOpener().user.preferences;
        var distance_units = preferences['units-distance'];
        $(cal_id).value = fotech.util.convert(calib, distance_units, 'm');
    }
    return true;
}

// Submit the form.
SectionCalibrationDialog.saveHandler = function() {
  if(this.validate()){
    var calibrations = {'calibrations[x_offsets][]':[], 'calibrations[y_offsets][]':[]};
    this.markers.each(function(m){
        var offsets = m.getPosition();
        calibrations['calibrations[x_offsets][]'].push(offsets.lon());
        calibrations['calibrations[y_offsets][]'].push(offsets.lat());
    });
     console.log(calibrations);
    this.form.request({
      parameters: calibrations,
      onSuccess: function(){window.location.reload();}
    });
  }
}

SectionCalibrationDialog.cancelAndClear = function() {
  window.close();
};

