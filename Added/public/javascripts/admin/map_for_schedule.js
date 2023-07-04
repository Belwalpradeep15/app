var jsmap = null;

var boundsList = [null];  //so the front end appears 1 based

function initialize(options) {
    jsmap = new fotech.map.Map('map', fotech.map.Map.mapProvider, fotech.gui.rootOpener().user.preferences, options.layers, options.initialLayer);
    fibre_route_layer =  new fotech.map.FibreRouteLayer(jsmap, fotech.gui.rootOpener().globalAlertManager,
        new fotech.map.TrackStyle(fotech.gui.rootOpener().user.preferences['fibre-line-colour'],
            5, .5, false));
    jsmap.render();
    jsmap.addControl(new fotech.map.SelectRegionControl(mapRegionSelected, mapRegionDeselected), 'tl', 105, 7);
    
};

// TODO:  this is an exact duplicate of what's in Monitor/map.js
function highlightFibreRoutes(map, latLngBnds)
{
    return map.getLayer(fotech.map.FibreRouteLayer.layer_name).selectWithin(latLngBnds, {"weight" : 10, "colour" : "#00FF00", "opacity" :0.45});
};

function mapRegionSelected(map, latLngBnds) {
    // Determine if the selection includes any fibre lines and highlight them.
    boundsList.push(latLngBnds);
    if (!highlightFibreRoutes(map, boundsList.compact())) {
        alert(I18n.t('monitor.helios.zone_list_dialog.no_intersecting_lines'));
        return false;
    }
    //create a new line for the newly added bound
    var row_template_el = $('region_row_template');
    if(row_template_el){
        var row_template = new Template(row_template_el.innerHTML);
        var newRow = row_template.evaluate({id: boundsList.length-1, display_id: boundsList.length-1,
                                            swLat: latLngBnds.southwest.lat(),
                                            swLng: latLngBnds.southwest.lon(),
                                            neLat: latLngBnds.northeast.lat(),
                                            neLng: latLngBnds.northeast.lon()
                                            }); 
        row_template_el.insert({before:newRow});
        var objDiv = row_template_el.up('div');
        objDiv.scrollTop = objDiv.scrollHeight;
    }
}

function removeSelectedRegion(index){
    if(boundsList[parseInt(index)]){
        var onSuccess = function(){
            boundsList[parseInt(index)] = null;
            highlightFibreRoutes(jsmap, boundsList.compact());
            var row = $(index + '_region_row');
            if(row)
                row.remove();
        };

        if(index.toString().endsWith('_new'))
            onSuccess();
        else{
            new Ajax.Request(document.URL.match(/\/admin\/schedule\/\d+/).first(), {method: 'delete',
                             parameters: {schedule_region_id: index,authenticity_token:$('schedule_form').authenticity_token.value},
                             onSuccess: onSuccess,
                             onFailure: function(){alert('Region could not be deleted')},
                             });
        }
    }
}

function regionRowMouseOver(el){
    var regionIndex = parseInt(el.id);

    highlightFibreRoutes(jsmap, boundsList[regionIndex]);
}
function regionRowMouseOut(el){
    highlightFibreRoutes(jsmap, boundsList.compact());
}

function mapRegionDeselected(map,latLngBnds){
}

var scheduleExceptionLineNumber = 0;
function newScheduleExceptionLine(){
    var row_template_el = $('schedule_exception_row_template');
    if(row_template_el){
        var id = scheduleExceptionLineNumber++ + "_new";
        var row_template = new Template(row_template_el.innerHTML);
        var newRow = row_template.evaluate({id: id}); 
        row_template_el.insert({before:newRow});
        var objDiv = row_template_el.up('div');
        objDiv.scrollTop = objDiv.scrollHeight;

        _fotechSetupCalendar(id+"scheduleExceptionStart",{"inputFieldName":id+'_schedule_exception_start'}); 
        _fotechSetupCalendar(id+"scheduleExceptionEnd",{"inputFieldName":id+'_schedule_exception_end'}); 
            
    }
}

function removeExceptionLine(index){
    var onSuccess = function(){
        $$('.' + index + '_schedule_exception_row').invoke('remove');

    };

    if(index.toString().endsWith('_new'))
        onSuccess();
    else{
        new Ajax.Request(document.URL.match(/\/admin\/schedule\/\d+/).first(), {method: 'delete',
                         parameters: {schedule_exception_id: index,authenticity_token:$('schedule_form').authenticity_token.value},
                         onSuccess: onSuccess,
                         onFailure: function(){alert('Region could not be deleted')},
                         });
    }

}

//return true if valid
function validateSchedule() {
    //validate name
    this.validateNotEmpty('schedule[name]', I18n.t('common.headers.name'));

    if (!this.form['schedule[is_repeating]'][1].checked) {
        // comparing start datetime and end datetime
        this.validateStartAndEndDateTimes('schedule[start_date]', I18n.t('admin.schedule.start_date'),
                                          'schedule[start_time]', I18n.t('admin.schedule.start_time'),
                                          'schedule[end_date]', I18n.t('admin.schedule.end_date'),
                                          'schedule[end_time]', I18n.t('admin.schedule.end_time'),
                                          I18n.t('admin.schedule.start_date_and_time'),
                                          I18n.t('admin.schedule.end_date_and_time'));
}

    else
    {
        this.validateStartAndEndTimes('schedule[start_time]', I18n.t('admin.schedule.start_time'),
                                      'schedule[end_time]', I18n.t('admin.schedule.end_time'));
        this.validateChecked('repeating_days_', I18n.t('admin.schedule.repeats_on'), 1);

        // comparing start and repeat ends on date
        var repeat_ends_on = this.data()['schedule[repeat_ends_on]']
        if (repeat_ends_on != "") {
            console.log("!!! has repeat_end_on");
            this.validateStartAndEndDates('schedule[start_date]', I18n.t('admin.schedule.start_date'),
                                          'schedule[repeat_ends_on]', I18n.t('admin.schedule.repeat_end_date'));
        }
        else {
            this.validateDateOnly('schedule[start_date]', I18n.t('admin.schedule.start_date'), false);
        }
    }
    
    //validate at least one region (don't need to validate lats and lngs since those are inserted programatically)
    if ($$('.region_row').length == 0) {
        this.addValidationFailure('','',I18n.t('admin.schedule.must_select_region'));
    }
    
    //validate at least one alert to suppress
    this.validateChecked('suppress_alerts_', I18n.t('admin.schedule.alerts_to_suppress'), 1);

    //validate all exception windows
    $$('#schedule_exception_table input[name$=_name]').each(function(el) {
        var fieldname = el.name;
        var label = I18n.t('common.headers.name');
        var start = null;
        var end = null;

        this.validateNotEmpty(fieldname, label);

        fieldname = el.name.gsub('_name','_start');
        label = I18n.t('admin.schedule.exception.from');
        
        if (this.validateNotEmpty(fieldname, label) && this.validateDate(fieldname, label)) {
            start = new Date(this.form[fieldname].value.gsub(' ','T'));
        }
        
        fieldname = el.name.gsub('_name','_end');
        label = I18n.t('admin.schedule.exception.to');

        if(this.validateNotEmpty(fieldname, label) && this.validateDate(fieldname, label)){
            end = new Date(this.form[fieldname].value.gsub(' ','T'));
        }

        if (start && end && start >= end) {
            this.addValidationFailure(fieldname,'','End date must be greater than start date');
        }

 
    }.bind(this));  
}
