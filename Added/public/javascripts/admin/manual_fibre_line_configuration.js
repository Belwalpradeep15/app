/*
 * FILENAME:    manual_fibre_line_configuration.js
 * AUTHOR:      Aaron Rustad
 * CREATED ON:  2010-10-07
 * 
 * DESCRIPTION: functional support for manual fibre line configuration
 *
 * LAST CHANGE:
 * $Author: $
 *   $Date: $
 *    $Rev: $
 *    $URL: $
 *
 * COPYRIGHT:
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
 */
function swapValues(origRow, swapRow) {
    ['latitude','latitude_raw', 'longitude','longitude_raw', 'distance', 'distance_raw'].each( function(item) {
        var origValue = $('fibre_line_calibration_' + origRow + '_' + item);
        var swapValue = $('fibre_line_calibration_' + swapRow + '_' + item);

        var tmp = origValue.getValue();
        origValue.value = swapValue.getValue();
        swapValue.value = tmp;
    });
};

function adjustRowImages() {
    var upArrows = $$('img[name="move_up"]');
    var dnArrows = $$('img[name="move_down"]');
    var delButtons = $$('img[name="delete_button"]');

    upArrows.each (function(image) { image.style.visibility = 'visible'; })
    dnArrows.each (function(image) { image.style.visibility = 'visible'; })

	if(upArrows.size() > 0){
		upArrows.first().style.visibility = 'hidden';
	}
	
	if(dnArrows.size() > 0){
		dnArrows.last().style.visibility = 'hidden';
	}
};


function addNewRow() {
    var rowTemplate = new Template("<tr id='row_#{index}' row_id='#{index}' name='cal_row'> \
                                    <td><input type='text' size='30' id='fibre_line_calibration_#{index}_latitude_raw'><input type='hidden' size='30' name='fibre_line[calibration][#{index}][latitude]' id='fibre_line_calibration_#{index}_latitude'></td> \
                                    <td><input type='text' size='30' id='fibre_line_calibration_#{index}_longitude_raw'><input type='hidden' size='30' name='fibre_line[calibration][#{index}][longitude]' id='fibre_line_calibration_#{index}_longitude'></td> \
                                    <td> \
                                        <input type='text' size='30' id='fibre_line_calibration_#{index}_distance_raw'> \
                                        <input type='hidden' size='30' name='fibre_line[calibration][#{index}][distance]' id='fibre_line_calibration_#{index}_distance'> \
                                   </td> \
                                    <td style='text-align: center;'> \
                                        <table> \
                                            <tbody><tr> \
                                                <td style='border: 0px none; width: 33%;'> \
                                                    <img src='/images/arrow_down_blue.gif' row_id='#{index}' name='move_down' class='image_link' alt='Arrow_down_blue'> \
                                                </td> \
                                                <td style='border: 0px none; width: 33%;'> \
                                                    <img title='Delete ' src='/images/fotech/common_gui/delete-16x16.png' row_id='#{index}' name='delete_button' class='image_link' alt='Delete '> \
                                                </td> \
                                                <td style='border: 0px none; width: 33%;'> \
                                                    <img src='/images/arrow_up_blue.gif?' row_id='#{index}' name='move_up' class='image_link' alt='Arrow_up_blue'> \
                                                </td> \
                                            </tr></tbody> \
                                        </table> \
                                    </td>");
    var lastRow = $$('tr[name="cal_row"]').last()
    if (lastRow) {
        Element.insert(lastRow, { after: rowTemplate.evaluate({index: 1 + parseInt(lastRow.readAttribute('row_id'))})});
    } else {
        var lastRow = $('cal_header')
        Element.insert(lastRow, { after: rowTemplate.evaluate({index: 0})});
    }
    adjustRowImages(); 
    setupEvents();
};

function setupEvents() {
    $$('img[name="delete_button"]').each (function(item) {
        item.stopObserving('click');
        item.observe('click', function(event) {
            if($$('img[name="delete_button"]').size() == 2) {
                alert(I18n.t('admin.fibre_lines.man_cal.delete_minimum'));
            } else {
                $('row_' + this.readAttribute('row_id')).remove();
                adjustRowImages();
                setupEvents();
            }
        });
    });

    $('add_calibration').stopObserving('click');
    $('add_calibration').observe('click', function(event) {
        addNewRow(); 
    });

    $$('img[name="move_down"]').each (function(item) {
        item.stopObserving('click');
        item.observe('click', function(event) {
            var id = parseInt(this.readAttribute('row_id'));
            swapValues(id, id + 1);
        });
    });

    $$('img[name="move_up"]').each (function(item) {
        item.stopObserving('click');
        item.observe('click', function(event) {
            var id = parseInt(this.readAttribute('row_id'));
            swapValues(id, id - 1);
        });
    });
    };

function checkUpload(event) {
    var fileName = $('kml');
    if (fileName && fileName.getValue().substr(-3).toLowerCase() != 'kml') {
        event.stop();
        alert(fileName.readAttribute('file_type_error'));
    }
};
function checkCSVUpload(event) {
    var fileName = $('csv');
    if (fileName && fileName.getValue().substr(-3).toLowerCase() != 'csv') {
        event.stop();
        alert(fileName.readAttribute('file_type_error'));
    }
};
function isInvalidNumber(value) {
    return !value.empty() && (isNaN(Number(value)) || Number(value) <= 0)
};

function checkForm(event) {
    $$('input.hiliteError').each(function(input) { input.removeClassName('hiliteError') });
    var alertMessages = [];
    var shouldSubmit = true;
    $$('#calibrationsForm input[name*=latitude][type=text]').each(function(textField) {
        var lat = textField.value;
        var lng = $(textField.id.gsub(/latitude/,'longitude')).value;
        var latlng = new LatLon(lat,lng);
        if (!latlng.isValid()) {
            textField.addClassName('hiliteError');
            alertMessages.push(I18n.t('admin.fibre_lines.man_cal.lat_long_req'));
            shouldSubmit = false;
        }
    });
    
    var distances = $$('#calibrationsForm input[name*="distance"][type=text]');
    
    if (distances.first().getValue().blank()) {
        distances.first().addClassName('hiliteError');
        alertMessages.push(I18n.t('admin.fibre_lines.man_cal.starting_dist'));
        shouldSubmit = false;
    }

    if (distances.last().getValue().blank()) {
        distances.last().addClassName('hiliteError');
        alertMessages.push(I18n.t('admin.fibre_lines.man_cal.ending_dist'));
        shouldSubmit = false;
    }

    for(var i = 1; i < distances.length; i++) { 
        if (i == 1)
            var previousDistance = Number(distances[i-1].getValue());

        if (! distances[i].getValue().blank() && Number(distances[i].getValue()) > 0) {
            if (Number(distances[i].getValue()) <= previousDistance) {
                distances[i].addClassName('hiliteError');
                alertMessages.push(I18n.t('admin.fibre_lines.man_cal.distance_size'));
                shouldSubmit = false;
                break;
            }
            previousDistance = Number(distances[i].getValue());
        }
    }

    distances.shift();
    distances.each(function(textField) {
        var value = textField.getValue();
        if (isInvalidNumber(value)) {
            textField.addClassName('hiliteError');
            alertMessages.push(I18n.t('admin.fibre_lines.man_cal.valid_distance'));
            shouldSubmit = false;
        }
    });

    
    if (! shouldSubmit) {
        Event.stop(event);
        alert(alertMessages.join("\n"));
        return;
    } 
    
    //everything is good, convert the values to m and put them in the hidden fields
    var mDistances = $$('#calibrationsForm input[name*="distance"][type=hidden]');
    var prefs = fotech.gui.rootOpener().user.preferences;
    var distanceUnits = prefs['units-distance'];
    var distancePrecision = prefs['precision-distance'];
    mDistances.each(function(field){
                   var rawField = $(field.id + '_raw');
                    if(rawField.value == ''){
                        field.value = '';
                    } else {
                        field.value = fotech.util.convert(rawField.value, distanceUnits, 'm');
                    }
                   });

    //everything is good, convert the latlngs
    var latlng_precision = prefs['precision-latlng'];
    //this will find fields that are latitude and longitude
    var latLngEls = $$('#calibrationsForm input[name*=tude][type=hidden]');
    latLngEls.each(function(field){
        var rawField = $(field.id + '_raw');
        field.value = Geo.parseDMS(rawField.value, latlng_precision);
    });
}

function validateDistances() {
};

function setupFormSubmit() {
    $('calibrationsForm').observe('submit', checkForm);
    new Form.Observer('calibrationsForm', 0.3, function(form, value) {
        $('submitCalibrations').enable();            
    });
    $('uploadForm').observe('submit', checkUpload);
    $('uploadCSVForm').observe('submit', checkCSVUpload)

    $('csv').observe('change', function(event){
        $('csvFileUpload').enable();
    });
    $('kml').observe('change', function(event) {
        $('fileUpload').enable();            
    });
};

document.observe("dom:loaded", function() {
    adjustRowImages();
    setupEvents();
    setupFormSubmit();
});
