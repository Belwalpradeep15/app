map_for_calibration = function (map_options, fibreLineColour) {


    this._map = new fotech.map.Map('map', fotech.map.Map.mapProvider,
        fotech.gui.rootOpener().user.preferences, map_options.layers, map_options.initialLayer);
    this._map.render();

    this._routeEditor = null;

    this.addPolygonEditorControl(map_options, fibreLineColour);
}

map_for_calibration.prototype = {
    addPolygonEditorControl: function (options, fibreLineColour) {
        this._routeEditor = new fotech.map.DrawPolygonControl(options, fibreLineColour, FibreLineDialog.editDialog.bind(FibreLineDialog));

        this._map.addControl(this._routeEditor);
    },

    displayEditableRoute: function (fibre_line_id, route, calibrations) {

        // TODO:  messy, same problem in _fibre_lines.html.erb
        cals = [];
        calibrations.each(function (c) {
            // return cals[c.calibration.parent_point] = c.calibration.distance;
            return cals[c.parent_point] = c.distance;
        });

        this._routeEditor.load(fibre_line_id, route, cals);
    }
};