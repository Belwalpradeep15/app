/*
 * FILENAME:    organizations.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-06-01
 * 
 * DESCRIPTION: Javascript specific to the organizations controller.
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


// Initialize the organizations class.
Organizations = function(authToken) {
    this.authenticityToken = authToken;
    var self = this;
    YAHOO.util.Event.onDOMReady( function() { self.init(); } );
}

Organizations.prototype.init = function() {
    var self = this;
    fotech.gui.initEditableFields( function(el, oldval, newval) { self.editableFieldChanged(el, oldval, newval); });
    this.entryForm = new Organizations.OrganizationDialog()
    this.entryForm.render(document.body);
}


// An editable field has changed. We reroute based on what element caused this to occur.
Organizations.prototype.editableFieldChanged = function(el, oldval, newval) {
    if(newval == '[removed]' || newval.strip() == '' ){
        el.innerHTML = oldval;
        alert(I18n.t('admin.helios_units.invalid_empty_value'));
        return;
    }
    
    var id = el.attributes['id'];
    if (id.value.substring(0, 5) == "name_"){
        this.renameOrganization(id.value.substring(5), newval);
    }
}


// Rename an organization.
Organizations.prototype.renameOrganization = function(id, name) {
    this._disableRow(id);
    new Ajax.Request('/admin/organizations/' + id, { method: 'put', parameters: { name: name, authenticity_token: this.authenticityToken } });
}

// Delete an organization.
Organizations.prototype.deleteOrganization = function(id) {
    this._disableRow(id);
    new Ajax.Request('/admin/organizations/' + id, { method: 'delete', parameters: { authenticity_token: this.authenticityToken } });
}


// Popup the form to enter a new organization.
Organizations.prototype.newOrganization = function() {
    this.entryForm.show();
}

// Give a row a disabled appearance.
Organizations.prototype._disableRow = function(id) {
    document.getElementById('row_' + id).addClassName('disabled');
}

/**
 * Dialog related to creating a new user.
 */
Organizations.OrganizationDialog = function() {
    var self = this;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.submit, handler: function() { self.submit(); } }
              ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'organization_dialog', cfg, 'organization_form');
    this.validateFields = function() {
        this.validateNotEmpty("name", I18n.t('common.headers.name'));
    }
}

Organizations.OrganizationDialog.prototype = new fotech.gui.ValidatingDialog();


/**
 * Validate and submit the form.
 */
Organizations.OrganizationDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/organizations', { method: 'post', parameters: Form.serialize(this.form) });
    }
}

