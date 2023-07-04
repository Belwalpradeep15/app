/*
 * FILENAME:    admin.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-30
 *
 * DESCRIPTION: Items common to multiple admin pages.
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

/** Admin namespace. */
var admin = (admin ? admin : {});

/**
 * Change a single field in an object. Note that this requires the existance of a form
 * with the id 'update_form' and that the row being modified have an id of "row_" plus
 * the object id.
 *
 * @param url The url prefix defining the object type.
 * @param id The object id.
 * @param field The field name.
 * @param newval The new field value.
 */
admin.changeField = function(url, id, field, newval, options) {
    options = options || {};
    var form = $('update_form');
    form.field.value = field;
    form.value.value = newval;
    disableRow("row_" + id);
    var submit_url = url + '/' + id;
    if(options.urlSuffix)
        submit_url += "/"+options.urlSuffix;
    var ajaxOptions = options.ajaxOptions || {};
    new Ajax.Request(submit_url, $H({ method: 'put',
                                    parameters: Form.serialize(form)}).merge(ajaxOptions).toObject());
}

/**
 * Validate given field to make sure it has an integer value
 *
 * @param el The input element to be validated
 */
admin.validIntegerPrefField = function(el) {
    var is_valid = true;
    var value = el.value;

    if(/^-?[0-9]+$/.test(value))
        return true;

    alert("Invalid integer");
    el.value = el.defaultValue;
}
/**
 * Validate given field to make sure it has an rational value
 *
 * @param el The input element to be validated
 */
admin.validFloatPrefField = function(el) {
    var is_valid = true;
    var value = el.value;

    if(/^-?[.0-9e]+$/.test(value) && !isNaN(parseFloat(value)))
        return true;

    alert("Invalid number");
    el.value = el.defaultValue;
}

/**
 * Delete a record. Note that this requires the existance of a form
 * with the id 'update_form' and that the row being modified have an id of "row_" plus
 * the object id.
 *
 * @param url The url prefix defining the object type.
 * @param id The object id.
 */
admin.deleteRecord = function(url, id) {
    try {
        vueApp.$store.dispatch( 'panels/removeAll', {} );
    } catch ( e ) {

    }

    var form = $('update_form');
    form.field.value = "";
    form.value.value = "";
    disableRow("row_" + id);
    new Ajax.Request(url + '/' + id, { method: 'delete', parameters: Form.serialize(form) });
}
admin.onErrorDeletePath = function(id) {
    enableRow('path_' + id);
};
admin.deletePath = function(base_url, id, params) {
    var form = $('update_form');

    disableRow("path_" + id);
    params = params || {};
    params.authenticity_token = form.authenticity_token.value;

    new Ajax.Request(
        base_url + '/' + id,
        {
            method: 'delete',
            parameters: params,
            onSuccess: function(klass) {
                var error = "Error";
                if (klass.hasOwnProperty('responseJSON')) {
                    if (klass.responseJSON.status == "success") {
                        $("path_" + id).remove();
                        return;
                    }
                    error = klass.responseJSON.error || "Error";
                }
                alert(error);
                enableRow("path_" + id);
            },
            onFailure: function() { enableRow("path_" + id); }
        }
    );
};
admin.deleteAllPaths = function(base_url, org_id){
    var form = $('update_form'),
        params = {
            organization: org_id,
            authenticity_token: form.authenticity_token.value
        };

    var error = I18n.t('common.errors.five_hundred.header');
    new Ajax.Request(
        base_url,
        {
            method: 'delete',
            parameters: params,
            onSuccess: function(klass) {
                if (klass.hasOwnProperty('responseJSON')) {
                    if (klass.responseJSON.status == "success") {
                        window.location.reload();
                        return;
                    }
                    error = klass.responseJSON.error || error;
                }
                alert(error);
            },
            onFailure: function() {
                alert(error);
            }
        }
    );
};
/**
 * Edit a record. This calls the edit method of the appropriate controller.
 *
 * @param url The url prefix defining the object type.
 * @param id The object id.
 */
admin.editRecord = function(url, id) {
    new Ajax.Request(url + '/' + id + "/edit", { method: 'get' });
}


/**
 * Show the admin window. Since we are already in the admin window all this method does is
 * to change our current url.
 */
function showAdminWindow(url) {
    window.location.href = url;
}

// Display a new page in the admin window along with tz_offset only for alarm suppression schedule
function showAdminWindowForAlarmSchedule(url) {
        window.location.href = url+ '/?tz_offset=' + (new Date().getTimezoneOffset() * 60);

}
