/*
 * FILENAME:    user_edit_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  2009-11-27
 *
 * DESCRIPTION: Javascript related to the user dialog.
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
 * Dialog related to creating a new user.
 */
admin.UserEditDialog = function() {
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

    fotech.gui.ValidatingDialog.call(this, 'user_edit_dialog', cfg, 'user_edit_form');
    this.validateFields = function() {
        this.validateNotEmpty("fullname", I18n.t('admin.users.full_name'));
        this.validateNotEmpty("loginname",  I18n.t('admin.users.update_dialog.login'));
		this.validateChecked("roles_",  I18n.t('admin.users.update_dialog.roles'), 1);
		var resetPassword = $('reset_password');
        if (resetPassword && resetPassword.checked) {
            this.validateNotEmpty("new_password", I18n.t('admin.users.new_password'));
            this.validateMatchingValues("new_password",  I18n.t('admin.users.new_password'),
                                        "confirm_password",  I18n.t('admin.users.confirm_password'));
        }
    }
}

admin.UserEditDialog.prototype = new fotech.gui.ValidatingDialog();
admin.UserEditDialog.prototype._userId = null;


/**
 * Validate and submit the form.
 */
admin.UserEditDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/users/edit', { method: 'post', parameters: Form.serialize(this.form) });
    }
}
admin.UserEditDialog.prototype.enablePasswordFields = function(form, enable) {
    if (enable) {
        enableRow('reset_password_table');
    }
    else {
        disableRow('reset_password_table');
    }
    form.new_password.disabled = !enable;
    form.confirm_password.disabled = !enable;
}

admin.UserController = function(authToken) {
    this.authenticityToken = authToken;
};

admin.UserController.prototype.newUser = function() {
    new Ajax.Updater('user_edit_dialog', '/admin/users/new', {
        method: 'get',
        parameters: { authenticity_token: this.authenticityToken },
        onComplete: function(request) {
            _user_dialog = new admin.UserEditDialog();
            _user_dialog.render(document.body);
            _user_dialog.show();
        }
    });
};

admin.UserController.prototype.editUser = function(id) {
    new Ajax.Updater('user_edit_dialog', '/admin/users/' + id + '/edit', {
        method: 'get',
        parameters: { authenticity_token: this.authenticityToken },
        onComplete: function(request) {
            _user_dialog = new admin.UserEditDialog();
            _user_dialog.render(document.body);
            _user_dialog.show();
        }
    });
};