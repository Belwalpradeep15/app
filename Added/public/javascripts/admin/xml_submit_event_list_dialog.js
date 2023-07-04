/*
 * FILENAME:    xml_submit_event_list_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  2016-01-08
 * 
 * DESCRIPTION: Javascript related to the xml_submit_event_list dialog.
 *
 * COPYRIGHT:
 * This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.
 */

/** Admin namespace. */
var admin = (admin ? admin : {}); 

/**
 * Dialog related to creating a new new_alert_config.
 */
admin.XmlSubmitEventListDialog = function() {
    var cfg = {
        visible: false,
        constraintoviewport: true,
        xy: [200,200],
        width:'200px',
        buttons: [{ text: fotech.gui.labels.dismiss, handler: this.cancel.bind(this) },
                    { text: fotech.gui.labels.submit, handler: this.submit.bind(this) }
                    ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'xml_event_list_dialog', cfg, 'xml_event_list_form');
    this.validateFields = function(){};
    this.form.getInputs().each(function(el){
        if(el.name == 'xml_selected_events'){
            el.observe('click', this.handleEventSelected)
        }
    }.bind(this));
    this.render();
}

admin.XmlSubmitEventListDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.XmlSubmitEventListDialog.prototype.submit = function() {
    if (this.validate()) {
        var ids = []
        this.form.getInputs().each(function(el){
            if(el.name == 'xml_selected_events' && el.checked){
                ids.push(el.value);
            }
        })
        this.linked_form.xml_included_events.value = ids.join(',');
        span = this.linked_form.down('span.selected_event_count');
        span.innerHTML = ids.length;
    }
    this.hide();
}

admin.XmlSubmitEventListDialog.prototype.setLinkedForm = function(form_id){
    this.linked_form = $(form_id);
    this.form.reset();
    var ids = this.linked_form.xml_included_events.value.split(',');
    this.form.getInputs().each(function(el){
        if(el.name == 'xml_selected_events' && ids.indexOf(el.value) > -1){
            el.checked = true;
            if(el.parentNode == $('inactive_event_types_list')){
                this.showInactiveList(true)
            }
        }
    }, this);
}

admin.XmlSubmitEventListDialog.prototype.selectAll = function(selectAll){
    if(selectAll){
        this.showInactiveList(true);
    }
    this.form.getInputs().each(function(el){
        if(el.name == 'xml_selected_events'){
            el.checked = selectAll;
        }
    });
}

admin.XmlSubmitEventListDialog.prototype.showInactiveList = function(show){
    if(show){
        $('show_inactive_event_types_list').hide()
        $('hide_inactive_event_types_list').show()
        $('inactive_event_types_list').show()
    }
    else{
        $('show_inactive_event_types_list').show()
        $('hide_inactive_event_types_list').hide()
        $('inactive_event_types_list').hide()
    }
}

admin.XmlSubmitEventListDialog.prototype.handleEventSelected = function(){
    var theForm = this.form;
    theForm.getInputs().each(function(el){
        if(el.name == 'xml_selected_events' && !el.checked){
            theForm.select_all_checkbox.checked = false;
        }
    });
}

admin.XmlSubmitEventListDialog.prototype.showByButton = function(b){
    eventListSelectDialog.cfg.setProperty("context", [b, 'tl', 'tr']);
    eventListSelectDialog.show()
}
