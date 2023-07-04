/*
 * FILENAME:    dialog.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-10-27
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
 * @fileoverview Javascript related to the processing of dialogs.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});


/**
 * Get the selected options of the given select object and return them as a comma-delimited list.
 * @param sel The Select object.
 * @return The selected items.
 */
fotech.gui.getSelectedOptions = function(sel) {
    opts = ""
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].selected) {
            if (opts != "")
                opts = opts + ","
                opts = opts + sel.options[i].value;
        }
    }
    return opts;
}

/**
 * Determine if the given value is one of the selected options.
 * @param sel The Select object.
 * @param val The value we are searching for.
 * @return true if val is a selected item in sel and false otherwise.
 */
fotech.gui.isSelectedOption = function(sel, val) {
    for (var i = 0; i < sel.options.length; ++i) {
        if (sel.options[i].selected) {
            if (val == sel.options[i].value)
                return true;
        }
    }
    return false;
}


/**
 * Construct a new dialog.
 * @constructor
 * @param el The element ID representing the dialog or the element representing the dialog.
 * @param userConfig The configuration object literal (see YAHOO.widget.Dialog).
 *
 * @class
 * This extends the YAHOO Dialog class to provide methods specific to Fotech.
 */
fotech.gui.FotechDialog = function(el, userConfig) {
    YAHOO.widget.Dialog.call(this, el, userConfig);
}

fotech.gui.FotechDialog.prototype = new YAHOO.widget.Dialog();

fotech.gui.FotechDialog.prototype.isVisible = function(){
    return this.cfg.getProperty('visible');
}
/**
 * Sets the busy state of the dialog. This will provide the user with a busy symbol as well
 * as block any mouse events to the dialog. Call this method if you have a handle to the
 * dialog.
 */
fotech.gui.FotechDialog.prototype.setBusyState = function() {
    fotech.gui.FotechDialog.setBusyState(this.id, this.body);
}

/**
 * Sets the busy state of the dialog. Call this method if you do not have a handle to the
 * dialog, but you know the id of its containing div.
 * @param dialogId The id of the div containing the dialog.
 * @param bodyEl The element of the dialog body. (optional) If not specified the div
 *      of the dialogId will be used.
 */
fotech.gui.FotechDialog.setBusyState = function(dialogId, bodyEl, text) {
    text = text || I18n.t('common.dialog.busy');
    var div = new Element('div', {'id': dialogId + '_busy', 'class': 'busy'});
    var div2 = new Element('div');
    div2.appendChild(new Element('img', {src : '/images/fotech/common_gui/spin_indicator.gif'}));
    div2.appendChild(new Element('p').update(text));
    div.appendChild(div2);

    if (typeof(bodyEl) == 'undefined')
        $(dialogId).appendChild(div);
    else
        bodyEl.appendChild(div);

    var y = (div.getDimensions().height - div2.getDimensions().height) / 2;
    div2.setStyle({ marginTop: y + 'px' });
}

/**
 * Clears the busy state of the dialog. Call this method if you have a handle to the
 * dialog.
 */
fotech.gui.FotechDialog.prototype.clearBusyState = function() {
    fotech.gui.FotechDialog.clearBusyState(this.id);
}

/**
 * Clears the busy state of a dialog if it exists. Use this method if you do not have a handle
 * to the dialog but know its id.
 * @param dialogId The id given to the dialog when it was created.
 */
fotech.gui.FotechDialog.clearBusyState = function(dialogId) {
    var div = $(dialogId + '_busy');
    if (div)
        div.remove();
}

/**
 * Construct a new dialog.
 * @constructor
 * @param el The element ID representing the dialog or the element representing the dialog.
 * @param userConfig The configuration object literal (see YAHOO.widget.Dialog).
 * @param formId The id of the form to be validated.
 *
 * @class
 * This extends the FotechDialog class to provide methods for handling validation.
 */
fotech.gui.ValidatingDialog = function(el, userConfig, formId) {
    fotech.gui.FotechDialog.call(this, el, userConfig);
    this.form = document.getElementById(formId);
	if(this.form){
		Event.observe(formId, 'keypress', this.checkForm.bind(this));
	}
    this.errors = [];
	this.errorMsg = "";
	this.allowSubmitOnEnter = true;
    this.resetOnCancel = true;
    this.state = null;

    if(this.cancelEvent){
        this.cancelEvent.subscribe(this._reset.bind(this));
    }


}

fotech.gui.ValidatingDialog.prototype = new fotech.gui.FotechDialog();

/**
 * Resets the form and clears all the error styling
 */
fotech.gui.ValidatingDialog.prototype._reset = function(){
    if(this.resetOnCancel){
        this.restoreState();
    }
}

/**
 * set the state to null which will trigger a reset back to the originally loaded form
 */
fotech.gui.ValidatingDialog.prototype.clearState = function(){
    this.state = null;
}

/**
 * capture the current values of every element on the form into a hash keyed by id
 */
fotech.gui.ValidatingDialog.prototype.storeState = function(){
	this.state = new Hash();
    this.form.getElements().each(function(el){
                            this.state[el.id] = el.getValue();
                            }.bind(this));

}

/**
 * restore form from saved state if the state is not null
 * if it is null just call the generic reset method on the form
 * in both cases the elements will be iterated through to trigger
 * and click or change events so that things like disabling based on
 * the value of the checkbox should also reset... theoretically
 * lastly, this clears all error messages as it assumes it is restoring it to a
 * valid state
 */
fotech.gui.ValidatingDialog.prototype.restoreState = function(){
    this._clear();
    if(!this.state){
        this.form.reset();
        this.form.getElements().each(function(el){
            if(el.onclick) el.onclick();
            if(el.onchange) el.onchange();
        }.bind(this));
        return;
    }

    this.form.getElements().each(function(el){
        switch (el.type) {
            case 'text' :
            case 'textarea' :
            case 'hidden' :
            case 'range' :
                el.value = this.state[el.id];
                break;
            case 'checkbox' :
            case 'radio' :
                el.checked = this.state[el.id];
                break;
            case 'select-one' :
                el.value = el.state[el.id]
                break;
            case 'select-multiple' :
                $A(el.options).each(function(opt){
                                opt.selected = this.state[el.id].include(opt.value);
                                }.bind(this));
                break;
        }
        if(el.onclick) el.onclick();
        if(el.onchange) el.onchange();
    }.bind(this));
}

/**
 * Captures enter key and validates since hitting enter will submit a form by default
 * This will stop the event from bubbling to the form and submitting the form.
 */
fotech.gui.ValidatingDialog.prototype.checkForm = function(event){
	if(event.keyCode == Event.KEY_RETURN){
		if(this.allowSubmitOnEnter){
			if(!this.validate()){
				Event.stop(event);
			}
		}
		else{
			Event.stop(event);
		}
	}
}

/**
 * Returns true if the dialog has one or more errors.
 * @return true if there is an error.
 */
fotech.gui.ValidatingDialog.prototype.hasError = function() {
    return this.errors.length > 0;
}


/**
 * Clear any validation errors in a dialog.
 */
fotech.gui.ValidatingDialog.clearAllErrors = function(form) {
    for (var i = 0; i < form.length; ++i) {
        form.elements[i].removeClassName('hiliteError');
    }
}

fotech.gui.ValidatingDialog.prototype._clear = function() {
    fotech.gui.ValidatingDialog.clearAllErrors(this.form);
    this.errors = [];
	this.errorMsg = "";
}

/**
 * Highlight a field in a dialog as having an error.
 */
fotech.gui.ValidatingDialog.hiliteError = function(field) {
    field.addClassName('hiliteError');
}

fotech.gui.ValidatingDialog._hilite = function(id, form) {
    var el = null;
    if(form){
        el = form[id];
    }
    if (el == null){
        //if it fails, attempt to get the element by name
        var el = $(id);
    }
    if (el != null) {
        if(el.length !== undefined){
            //this is a node list
            for(var i = 0; i < el.length; i++){
                el[i].addClassName('hiliteError');
            }
        }
        else {
            el.addClassName('hiliteError');
        }
    }

}

/**
 * Perform any validations for this dialog and highlite any errors that occur. This
 * depends on the subclass having the validateFields method written. Note that fields are
 * hilited by setting their class name to 'hiliteError'.
 * @return true if one or more errors were reported.
 */
fotech.gui.ValidatingDialog.prototype.validate = function(showPopup) {
	showPopup = showPopup == null ? true : showPopup;
	this._clear();
    this.formData = this.getData();  //refresh the form data
    this.validateFields();
    if (this.hasError()) {
        for (var i = 0; i < this.errors.length; ++i) {
            var error = this.errors[i];
            this.errorMsg += String.sprintf(error.msg, error.label, error.param) + '\n';
            fotech.gui.ValidatingDialog._hilite(error.id, this.form);
        }
		if(showPopup){
			alert(I18n.t('common.validations.errors_to_correct') + this.errorMsg);
        }
        return false;
    }
    return true;
}

fotech.gui.ValidatingDialog.prototype._addError = function(fieldName, fieldLabel, msgFormat, msgParam) {
    this.errors[this.errors.length] = {
        field: fieldName,
        id: fieldName,
        label: fieldLabel,
        msg: msgFormat,
        param: msgParam
    };
}

fotech.gui.ValidatingDialog.prototype.data = function(){
   if(this.formData)
       return this.formData;
   else return this.getData();
}

/**
 * Validate that a field has something set in it.
 * @param fieldName The name of the field.
 * @param fieldLabel The label as you want reported in any error messages.
 * @return true if the field contains something.
 */
fotech.gui.ValidatingDialog.prototype.validateNotEmpty = function(fieldName, fieldLabel) {
    var val = this.data()[fieldName];
    if (val == null || val == "") {
        this._addError(fieldName, fieldLabel, I18n.t('common.validations.not_empty'));
        return false;
    }
    return true;
}

/**
 * Valiate a field against a given regex.  If the validation fails a suitable error is added.
 * @param fieldName The name of the field. The field must also have an id set to the fieldName.
 * @param fieldLabel the label of the field as you want it reported in any error messages.
 * @return true if the field tests positive against the regex
 */
fotech.gui.ValidatingDialog.prototype.validateFormat = function(fieldName, fieldLabel, regex){
    var value = this.data()[fieldName];
    if(value == null || value == "")
        return true;

    if(!regex.test(value)){
        this._addError(fieldName, fieldLabel, I18n.t('common.validations.format'));
        return false;
    }
    return true;
}


/**
 * Comparing two datetimes.
 */
fotech.gui.ValidatingDialog.prototype.validateStartAndEndDateTimes = function(startDateField, startDateLabel,
                                                                              startTimeField, startTimeLabel,
                                                                              endDateField, endDateLabel,
                                                                              endTimeField, endTimeLabel,
                                                                              startDateTimeLabel, endDateTimeLabel)
{
    var haveStartDate = this.validateDateOnly(startDateField, startDateLabel, false);
    var haveStartTime = this.validate24HourTime(startTimeField, startTimeLabel, false);
    var haveEndDate = this.validateDateOnly(endDateField, endDateLabel, false);
    var haveEndTime = this.validate24HourTime(endTimeField, endTimeLabel, false);
    if (!haveStartDate || !haveStartTime || !haveEndDate || !haveEndTime) {
        return false;
    }

    var start_date = this.data()[startDateField];
    var start_time = this.data()[startTimeField];
    var end_date = this.data()[endDateField];
    var end_time = this.data()[endTimeField];
    var stDate = new Date(start_date + "T" + start_time);
    var enDate = new Date(end_date + "T" + end_time);
    if (Date.parse(enDate) <= Date.parse(stDate)) {
        this._addError(startDateField, startDateTimeLabel, I18n.t('common.validations.must_be_less_than'), endDateTimeLabel);
        return false;
    }

	return true;
}

/**
 * Comparing two times.
 */
fotech.gui.ValidatingDialog.prototype.validateStartAndEndTimes = function(startTimeField, startTimeLabel,
                                                                          endTimeField, endTimeLabel)
{
    var haveStartTime = this.validate24HourTime(startTimeField, startTimeLabel, false);
    var haveEndTime = this.validate24HourTime(endTimeField, endTimeLabel, false);
    if (!haveStartTime || !haveEndTime) {
        return false;
    }

    var start_time = this.data()[startTimeField];
    var end_time = this.data()[endTimeField];
    var start_time_arr = start_time.split(":");
	var end_time_arr = end_time.split(":");
	var start_time_in_MIN = (parseInt(start_time_arr[0]) * 60 + parseInt(start_time_arr[1]));
	var end_time_in_MIN = (parseInt(end_time_arr[0]) * 60 + parseInt(end_time_arr[1]));
	if (start_time_in_MIN >= end_time_in_MIN) {
		this._addError(startTimeField, startTimeLabel, I18n.t('common.validations.must_be_less_than'), endTimeLabel);
		return false;
    }

	return true;
}

/**
 * Comparing two dates.
 * @return true if start date lessthan end date
 */
fotech.gui.ValidatingDialog.prototype.validateStartAndEndDates = function(startDateField, startDateLabel,
                                                                          endDateField, endDateLabel)
{
    var haveStartDate = this.validateDateOnly(startDateField, startDateLabel, false);
    var haveEndDate = this.validateDateOnly(endDateField, endDateLabel, false);
    if (!haveStartDate || !haveEndDate) {
        return false;
    }

    var start_date = Date.parse(this.data()[startDateField]);
    var end_date = Date.parse(this.data()[endDateField]);
    if (start_date >= end_date) {
        this._addError(startDateField, startDateLabel, I18n.t('common.validations.must_be_less_than'), endDateLabel);
	    return false;
    }
    return true;
}

/**
 * Validate that a field is a valid date. If the validation fields a suitable error is added.
 * @param fieldName The name of the field. The field must also have an id set to the fieldName.
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @param allowEmpty If true then an empty date field is acceptable, otherwise it is not.
 * @return true if the field is a valid date.
 */
fotech.gui.ValidatingDialog.prototype.validateDate = function(fieldName, fieldLabel, allowEmpty) {
    allowEmpty = (allowEmpty !== false);

    if (!allowEmpty) {
        if (!this.validateNotEmpty(fieldName, fieldLabel)) {
            return false;
        }
    }

    var time = this.data()[fieldName];
    if (time == null || time == "") {
        return true;
    }

    if (time.search(/^[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9] [0-2][0-9]:[0-5][0-9]$/) == -1) {
        this._addError(fieldName, fieldLabel, I18n.t('common.validations.date'));
        return false;
    }
    return true;
}

/**
 * Validate that a field is a valid date where *time is optional*. If the validation fields a suitable error is added.
 * @param fieldName The name of the field. The field must also have an id set to the fieldName.
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @return true if the field is a valid date.
 */
fotech.gui.ValidatingDialog.prototype.validateDateOptionalTime = function(fieldName, fieldLabel) {
    var time = this.data()[fieldName];
    if (time == null || time == "")
        return true;
    if (time.search(/^[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]( [0-2][0-9]:[0-5][0-9])?$/) == -1) {
        this._addError(fieldName, fieldLabel, I18n.t('common.validations.optional_date_time'));
        return false;
    }
    return true;
}

/**
 * Validate that a field is a valid date only. If the validation fields a suitable error is added.
 * @param fieldName The name of the field. The field must also have an id set to the fieldName.
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @param allowEmpty If true then an empty date field is allowed.
 * @return true if the field is a valid date (no time portion).
 */
fotech.gui.ValidatingDialog.prototype.validateDateOnly = function(fieldName, fieldLabel, allowEmpty) {
    allowEmpty = (allowEmpty !== false);
    if (!allowEmpty) {
        if (!this.validateNotEmpty(fieldName, fieldLabel)) {
            return false;
        }
    }

    var time = this.data()[fieldName];
    if (time == null || time == "") {
        return true;
    }

    if (time.search(/^[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]$/) == -1) {
        this._addError(fieldName, fieldLabel, I18n.t('common.validations.date_only'));
        return false;
    }
    return true;
}

/**
 * Validate that a field is a valid 24 hour clock string. If the validation fields a suitable error is added.
 * @param fieldName The name of the field. The field must also have an id set to the fieldName.
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @param allowEmpty If true then an empty time is considered valid.
 * @return true if the field is a valid date (no time portion).
 */
fotech.gui.ValidatingDialog.prototype.validate24HourTime = function(fieldName, fieldLabel, allowEmpty) {
    allowEmpty = (allowEmpty !== false);
    if (!allowEmpty) {
        if (!this.validateNotEmpty(fieldName, fieldLabel)) {
            return false;
        }
    }

    var time = this.data()[fieldName];
    if (time == null || time == "") {
        return true;
    }

    if (time.search(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/) == -1) {
        this._addError(fieldName, fieldLabel, I18n.t('common.validations.24_hour_time'));
        return false;
    }
    return true;
}

/**
 * Validates that the field contains a string that is at least minimum chars long and at most maximum chars
 * long.
 */
fotech.gui.ValidatingDialog.prototype.validateStringLength = function(fieldName, fieldLabel, minimum, maximum) {
   var value = this.data()[fieldName];
   this.validateStringLengthValue(fieldName, fieldLabel, value, minimum, maximum);
}

fotech.gui.ValidatingDialog.prototype.validateStringLengthValue = function(fieldName, fieldLabel, value, minimum, maximum) {
   var length = 0;

   if (value != null)
     length = value.length;

   if (minimum > 0 && length == 0) {
     this._addError(fieldName, fieldLabel, I18n.t('common.validations.string_present'), minimum);
     return false;
   }

   if (length < minimum) {
     this._addError(fieldName, fieldLabel, I18n.t('common.validations.string_minimum'), minimum);
     return false;
   }

   if (length > maximum) {
      this._addError(fieldName, fieldLabel, I18n.t('common.validations.string_maximum'), maximum);
      return false;
   }
}

fotech.gui.ValidatingDialog.prototype.validateSelect = function(fieldId, fieldLabel, minimum) {
  var options = $(fieldId).options;
  var selectCount = 0;
  for (var i = 0; i < options.length; i++) {
    if (options[i].selected) {
      selectCount += 1;
    }
  }
  if (selectCount < minimum) {
    this._addError(fieldId, fieldLabel, I18n.t('common.validations.select'), minimum);
    return false;
  }
}


/**
 * Validate a collection of inputs with the same id to have at least one selected
 * @param fieldName The id attribute of the field.  Note that if using the Rails helper and you have specified
 *					a field name of fname[] the id will be fname_.  this function will accept fname or fname_
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @param minimum (optional) If specified at least these many options must be selected.
 * @return true if the field passes the validation.
 */
fotech.gui.ValidatingDialog.prototype.validateChecked = function(fieldId, fieldLabel, minimum) {
	var inputs = $$('input[id='+fieldId+']');
	var selectCount = 0;
	for (var i = 0; i < inputs.length; i++) {
		if (inputs[i].type == 'checkbox' && inputs[i].checked) {
			selectCount += 1;
		}
		else if (inputs[i].type == 'radio' && inputs[i].checked){
			selectCount += 1;
		}
		else if (inputs[i].type == 'select') {
			for (var j = 0; j < inputs[i].options.length; j++) {
				if (inputs[i].options[j].selected) {
					selectCount += 1;
					break;
				}
			}
		}
	}
	if (selectCount < minimum) {
		this._addError(fieldId, fieldLabel, I18n.t('common.validations.checked'), minimum);
		return false;
	}
	return true;
}

/**
 * Validate that a field is a floating point value. If specified this will also validate
 * that the field is within given values.
 * @param fieldName The name of the field. The field must also have an id set to the fieldName
 *    with the "Id" suffix.
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @param minimum (optional) If specified the field value must be at least this.
 * @param maximum (optional) If specified the field value must be at most this.
 * @return true if the field passes the validation.
 */
fotech.gui.ValidatingDialog.prototype.validateFloat = function(fieldName, fieldLabel, minimum, maximum) {
    var value = this.data()[fieldName];
    return this.validateFloatValue(fieldName, fieldLabel, value, minimum, maximum, true);
}

fotech.gui.ValidatingDialog.prototype.validateFloatExclusive = function(fieldName, fieldLabel, minimum, maximum) {
    var value = this.data()[fieldName];
    return this.validateFloatValue(fieldName, fieldLabel, value, minimum, maximum, false);
}

fotech.gui.ValidatingDialog.prototype.validateFloatValue = function(fieldName, fieldLabel, value, minimum, maximum, inclusive) {
    if (value === null || value === "")
        return true;
    if (inclusive === undefined)
        inclusive = true;
    //value = parseFloat(value);
    //if (isNaN(value)) {
	if(/^[+-]?((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?$/.test(value) == false) {
        this._addError(fieldName, fieldLabel, I18n.t('common.validations.invalid_float'));
        return false;
    }
    if(inclusive){
        if (minimum != null && value < minimum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.minimum_float'), minimum);
            return false;
        }
        if (maximum != null && value > maximum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.maximum_float'), maximum);
            return false;
        }
    } else {
        if (minimum != null && value <= minimum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.minimum_float_exclusive'), minimum);
            return false;
        }
        if (maximum != null && value >= maximum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.maximum_float_exclusive'), maximum);
            return false;
        }
    }
    return true;
}

/**
 * Validate that the values of 2 fields match.  Most commonly would be used for a password and password confirmation field
 * @param fieldName The name of the field. The field must also have an id set to the fieldName
 *    with the "Id" suffix.
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @param secondFieldName The name of the second field whose value must match that of the first field.
 * @param secondFieldLabel the label of the confirmation field as you want it reported in any error messages.
 * @return true if the field passes the validation.
 */
fotech.gui.ValidatingDialog.prototype.validateMatchingValues = function(fieldName, fieldLabel, secondFieldName, secondFieldLabel) {
    var value1 = this.data()[fieldName];
	var value2 = this.data()[secondFieldName];

	if (value1 != value2){
		this._addError(fieldName, fieldLabel, "%s must match %s", secondFieldLabel);
		return false;
	}

    return true;
}

/**
 * Validate that a field is an integer value. If specified this will also validate
 * that the field is within given values.
 * @param fieldName The name of the field. The field must also have an id set to the fieldName
 *    with the "Id" suffix.
 * @param fieldLabel The label of the field as you want it reported in any error messages.
 * @param minimum (optional) If specified the field value must be at least this.
 * @param maximum (optional) If specified the field value must be at most this.
 * @return true if the field passes the validation.
 */
fotech.gui.ValidatingDialog.prototype.validateInteger = function(fieldName, fieldLabel, minimum, maximum) {
    var value = this.data()[fieldName];
    return this.validateIntegerValue(fieldName, fieldLabel, value, minimum, maximum, true);
}
fotech.gui.ValidatingDialog.prototype.validateIntegerExclusive = function(fieldName, fieldLabel, minimum, maximum) {
    var value = this.data()[fieldName];
    return this.validateIntegerValue(fieldName, fieldLabel, value, minimum, maximum, false);
}

fotech.gui.ValidatingDialog.prototype.validateIntegerValue = function(fieldName, fieldLabel, value, minimum, maximum, inclusive) {
    if (value === null || value === "")
        return true;
    if (inclusive === undefined)
        inclusive = true;

    //value = parseInt(value);
    //if (isNaN(value)) {
    if (/^-?[0-9]+$/.test(value) == false) {
		this._addError(fieldName, fieldLabel, I18n.t('common.validations.invalid_int'));
        return false;
    }

    if(inclusive){
        if (minimum != null && value < minimum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.minimum_int'), minimum);
            return false;
        }
        if (maximum != null && value > maximum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.maximum_int'), maximum);
            return false;
        }
    } else {
        if (minimum != null && value <= minimum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.minimum_int_exclusive'), minimum);
            return false;
        }
        if (maximum != null && value >= maximum) {
            this._addError(fieldName, fieldLabel, I18n.t('common.validations.maximum_int_exclusive'), maximum);
            return false;
        }
    }
    return true;
}

/**
 * Add a validation error to the dialog. Note that the validation is done elsewhere, this simply adds the error
 * to the list of errors to display.
 */
fotech.gui.ValidatingDialog.prototype.addValidationFailure = function(fieldName, fieldLabel, message) {
    this._addError(fieldName, fieldLabel, message);
}

/**
 * Enable or disable a number of items in the dialog based on their id.
 * @param ids An array of the ids of the items to be enabled.
 * @enable If true the items will be enabled. If false they will be disabled.
 */
fotech.gui.ValidatingDialog.prototype.enableItems = function(ids, enable) {
    var el;
    for (var i = 0; i < ids.length; ++i) {
        el = document.getElementById(ids[i]);
        if (el != null) {
            if (enable)
                el.className = '';
            else
                el.className = 'disabled';
        }
    }
}

/**
 * Enable or disable a number of fields in the dialog.
 * @param fields An array of the field objects (not just names) to be enabled.
 * @enable If true the items will be enabled. If false they will be disabled.
 */
fotech.gui.ValidatingDialog.prototype.enableFields = function(fields, enable) {
    for (var i = 0; i < fields.length; ++i)
        fields[i].disabled = !enable;
}

/**
 * Check to see if the form is dirty
 * generic function that will check all the values to see if they are dirty
 * will validate number values as numbers because 200.0 should equal 200
 */
fotech.gui.ValidatingDialog.prototype.isFieldDirty = function(el){
	var opt, hasDefault, i = 0, j;
	switch (el.type) {
		case 'text' :
		case 'textarea' :
		case 'hidden' :
		case 'range' :
			if( /^[+-]?((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?$/.test(el.value) && /^[+-]?((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?$/.test(el.defaultValue)){
				if(parseFloat(el.value) != parseFloat(el.defaultValue)){
					return true;
				}
			}
			else if(el.value != el.defaultValue){
				return true;
			}
			break;
		case 'checkbox' :
		case 'radio' :
			if (el.checked != el.defaultChecked) return true;
			break;
		case 'select-one' :
		case 'select-multiple' :
			j = 0, hasDefault = false;
			while (opt = el.options[j++])
				if (opt.defaultSelected) hasDefault = true;
			j = hasDefault ? 0 : 1;
			while (opt = el.options[j++])
				if (opt.selected != opt.defaultSelected) return true;
			break;
	}
	return false;
}

fotech.gui.ValidatingDialog.prototype.isFormDirty = function(){
	var el, i=0;
	var dirty = false;
	while (el = this.form.elements[i++]) {
		if(this.isFieldDirty(el))
			return true;
	}
	return false;
}

fotech.gui.ValidatingDialog.prototype.attachDirtyActionToForm = function(dirtyAction){
	var el, i=0;
	while (el = this.form.elements[i++]) {
		switch (el.type) {
			case 'text' :
			case 'textarea' :
				el.observe('keyup', dirtyAction);
				el.observe('keydown', dirtyAction);
				el.observe('control:changed', dirtyAction);
				break;
			case 'hidden' :
				el.observe('control:changed', dirtyAction);
				break;
			case 'range' :
			case 'checkbox' :
			case 'radio' :
			case 'select-one' :
			case 'select-multiple' :
				el.observe('change', dirtyAction);
				break;
			case 'reset':
				//gotcha: there is a chance that this will be called before the
				//form is actually reset, so it will still be dirty.  so you need to
				//include a .reset() call in the onclick of your reset button.
				el.observe('click', dirtyAction);
		}
	}
	return false;
}
