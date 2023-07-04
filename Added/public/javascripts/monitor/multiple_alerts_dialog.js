/*
 * FILENAME:    multiple_alerts_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-11-16
 * 
 * DESCRIPTION:  
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview ...add brief description of the file...
 */
 
MultipleAlertsDialog = function(dialogId) {
    this.dialogId = dialogId;
    this.dialog = new YAHOO.widget.Panel(dialogId, {visible: false, constraintoviewport: true, xy: [5000,60]});
    this.dialog.render(document.body);
    if(typeof overlayManager != 'undefined')
        overlayManager.register(this.dialog);
    
    this._setupResize(dialogId);
    this._setupEventListeners();
    if(typeof(showAlert) == 'function')
        this.setItemClickedCallback(function(alert){ showAlert(alert);});
}

MultipleAlertsDialog.prototype._setupEventListeners = function(){
    var g = fotech.gui.rootOpener().globalAlertManager;

    var callback = fotech.throttle( this.refresh.bind(this), 1000 );

    g.observe('alert:add', callback);
    g.observe('alert:update', callback);
    g.observe('alert:remove', callback);
    g.observe('alert:removeMultiple', callback);
}

MultipleAlertsDialog.prototype.show = function() {
    this.dialog.show();
}

MultipleAlertsDialog.prototype.hide = function(){
	this.dialog.hide();
}

// requery the globalAlertManager to see what alerts to list
MultipleAlertsDialog.prototype.refresh = function(){
    //clear the list
    //$(this.dialogId).getElementsBySelector('ul#alertList')[0].innerHTML = "";

    var list = $(this.dialogId).getElementsBySelector('ul#alertList')[0];
    while( list.firstChild ){
        list.removeChild(list.firstChild);
    }

    //add them all back again
    var g = fotech.gui.rootOpener().globalAlertManager;
    var alertList = g.asArray().sort(function(a, b) { return Date.parseXMLDateTime(b.time) - Date.parseXMLDateTime(a.time);});
    if(alertList.length == 0)
        return;
    
    var date = Date.parseXMLDateTime(alertList[0].time).format("mmm dd, yyyy");
    this._createDateSeparator(date);
    alertList.each(function(alert){
                    var alertDateString = Date.parseXMLDateTime(alert.time).format("mmm dd, yyyy");
                    if(date != alertDateString){
                        this._createDateSeparator(alertDateString);
                        date = alertDateString;
                    }
                    this._createAlertElement(alert);
                   }, this);
}

MultipleAlertsDialog.prototype._createDateSeparator = function(dateString){
    Element.insert($(this.dialogId).getElementsBySelector('ul#alertList')[0],
                   {bottom: new Element('li', 
                                        {'class':'recent_date_separator',
                                        }).update(dateString)
                   });
}

MultipleAlertsDialog.prototype._createAlertElement = function(a){
    var listElement = new Element('li', {
                                    'class': 'recent threat_level_' + a.threat_level,
                                    'style': 'list-style-image: url("' + a.tinyIcon + '");border:none;'
                                });
    var linkElement = new Element('a', {
                                    'class': 'recent',
                                    href: "javascript:void(0)",
                                    id: this._getDomId(a.id),
                                });

    listElement.appendChild( linkElement );

    Element.insert(
                    $(this.dialogId).getElementsBySelector('ul#alertList')[0],
                    {
                        bottom: listElement
                    }
                );

    var d = Date.parseXMLDateTime(a.time);

    var msg = a['name'] || "";
    if (a.details['name']) {
        msg = a.details['name'];
    }

    var tag = a.details['failed_coils'];
    if (!tag)
        tag = a.details['tag'];
    if (tag)
        msg = msg + " " + tag;

    linkElement.textContent = d.format( "HH:MM:ss" ) + ' ' + msg;
    linkElement.addEventListener( 'click', function(ev){ this._onItemClicked(ev.element(), a) }.bind(this));
}

// Create a dom id from an alert id.
MultipleAlertsDialog.prototype._getDomId = function(id) {
    return this.dialogId + '_item_' + id;
}

MultipleAlertsDialog.prototype._onItemClicked = function(element, alert) {
    if (this.itemClickedCallback)
        this.itemClickedCallback(alert);
}

MultipleAlertsDialog.prototype._setupResize = function(dialogId) {
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


MultipleAlertsDialog.prototype.setItemClickedCallback = function(callback) {
    this.itemClickedCallback = callback;
}

MultipleAlertsDialog.prototype.addDialogClosedCallback = function(callback) {
    this.dialog.hideEvent.subscribe(callback);
}
