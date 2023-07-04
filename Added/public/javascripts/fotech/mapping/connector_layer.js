/**
 * Created by arunas on 05/10/16.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});


///////////////////////////////////////////////////////////
//
//  fotech.map.ConnectorLayer
//
//  - handles drawing and manipulating a line between a latLon and
//    a YUI dialog (and possibly other YUI objects that support the same interface
//
//  A connector line is a coloured line running with a bend between a point and a dialog
//  We can connect a latlon to a dialog, bascially drawing the line to the closest edge of the dialog
//  We react to movements of the dialog, and movements of the map.
//  if the dialog hides, we remove the line
//  if the dialog appears, we reinstate the line
//  if either the map or dialog move, we rebuild the line to match the new location.
//  There can be multiple connector layers on a map, so we generate sequential unique name/ids

fotech.map.ConnectorLayer = function (map, fromDialog, toLatLon) {
    fotech.map.layer.call(this, fotech.map.ConnectorLayer._nextUniqueName() , map);

    this._lines = null;
    this._fromDialog = null;
    this._toLatLon = null;
    this.setBounds();  // sets no bounds

    this._onMapMoveHander = this.onMapMove.bind(this);
    this._onDialogHideHandler = this.onDialogHide.bind(this);
    this._onDialogMoveHandler = this.onDialogMove.bind(this);

    if (typeof fromDialog != "undefined" && fromDialog)
        this.setFromDialog(fromDialog);

    if (typeof toLatLon != "undefined" && toLatLon)
        this.setToLatLon(toLatLon);


    Event.observe(window, 'fotech:mapChanged', this._onMapMoveHander);

};

fotech.map.ConnectorLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.ConnectorLayer.prototype.constructor = fotech.map.ConnectorLayer;

fotech.map.ConnectorLayer.prototype.setToLatLon = function (toLatLon) {
    this._toLatLon = toLatLon;
    this._updateConnector();
};

fotech.map.ConnectorLayer.prototype._unsubscribe = function() {
    if (this._fromDialog) {
        if (typeof this._fromDialog.dialog != 'undefined') {
            this._fromDialog.dialog.hideEvent.unsubscribe(this._onDialogHideHandler);
            this._fromDialog.dialog.dragEvent.unsubscribe(this._onDialogMoveHandler);
        }
        else{
            this._fromDialog.hideEvent.unsubscribe(this._onDialogHideHandler);
            this._fromDialog.dragEvent.unsubscribe(this._onDialogMoveHandler);
        }

    }
    Event.stopObserving(window, 'fotech:mapChanged', this._onMapMoveHander);
}


fotech.map.ConnectorLayer.prototype.setFromDialog = function (fromDialog) {
    if (this._fromDialog != fromDialog) {
        if (this._fromDialog) {
            this._unsubscribe();
        }
        this._fromDialog = fromDialog;

        if (typeof fromDialog.dialog != 'undefined') {
            this._fromDialog.dialog.hideEvent.subscribe(this._onDialogHideHandler);
            this._fromDialog.dialog.dragEvent.subscribe(this._onDialogMoveHandler);
        }
        else {
            this._fromDialog.hideEvent.subscribe(this._onDialogHideHandler);
            this._fromDialog.dragEvent.subscribe(this._onDialogMoveHandler);
        }
    }
    this._updateConnector();
};

fotech.map.ConnectorLayer.prototype.unload = function () {
    // TODO:  well.  This just looks awkward - is there a better way to call the parent class?
    Object.getPrototypeOf(Object.getPrototypeOf(this)).unload.bind(this)();
    this._unsubscribe();
};
////////////////////
// Event Handlers
fotech.map.ConnectorLayer.prototype.onDialogMove = function () {
    this._updateConnector();
};

fotech.map.ConnectorLayer.prototype.onDialogHide = function () {
    this._removeConnector();
};

fotech.map.ConnectorLayer.prototype.onMapMove = function () {
    this._updateConnector();
};

/////////////////////
// Private Methods

fotech.map.ConnectorLayer.prototype._updateConnector = function () {
    // TODO:  would be nicer just to move the ends - depends a bit on the underlying map API
    this._removeConnector();
    this._addConnector();
};

fotech.map.ConnectorLayer.prototype._addConnector = function () {
    if ((this._lines == null)
            && this._fromDialog && this._fromDialog.isVisible()
            && this._toLatLon) {
        var popup = document.getElementById(this._fromDialog.dialogId || this._fromDialog.id);

        var dialog_centre_x = fotech.gui.getX(popup)
            + popup.offsetWidth / 2;
        var dialog_centre_y = fotech.gui.getY(popup)
            + popup.offsetHeight / 2;

        var div_loc = this.map.mapDivPointFromViewPort(dialog_centre_x, dialog_centre_y);
        var fromLocation = this.map.getPositionFromPixel(new fotech.geom.Point(div_loc.x, div_loc.y));

        /* determine which edge of our popup is closest to the point we are connecting to */

        /* determine the top left of box */
        var top = fotech.gui.getX(popup);

        var options = { colour: '#0099ff', weight: 3, opacity: 1.0 };

        this._lines = [
            this.addPolyLine([fromLocation, this._toLatLon], options ),
        ];

    }
};


fotech.map.ConnectorLayer.prototype._removeConnector = function () {

    if ( this._lines != null ){
        for ( var i = 0; i < this._lines.length; ++i ){
            try {
                this.removePolyLine( this._lines[i]);
            } catch ( e ){
                console.log( "Unable to remove connector line: ", e );
            }
        }
    }
    this._lines = null;

};

fotech.map.ConnectorLayer._nextUniqueName = (function () {
    var counter = 0;
    return function () {return "connector_layer_" + (++counter) ;};
})();


