/*
 * FILENAME:    menu.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-11-18
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
 * @fileoverview Utilities for dealing with menus.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});

/**
 * Locate a menu item given its id. This will search through the menu and any submenus
 * to try to find the item. Note that if you use this method you will need to have loaded
 * the YUI menu item code, "menu-min.js". In addition, if the menu was created with
 * the "lazyload: true" attribute then only those menu items that have actually been
 * loaded (i.e. displayed) will be searched.
 * @param menu The menu or menubar to start the search.
 * @param itemId The id of the item you are looking for.
 * @return the item or null if no such item could be found.
 */
fotech.gui.getMenuItemById = function(menu, itemId) {
    var ar = menu.getItems();
    if (ar != null) {
        for (var i = 0; i < ar.length; ++i) {
            if (ar[i] != null && ar[i].id == itemId)
                return ar[i];
        }
    }
    
    ar = menu.getSubmenus();
    if (ar != null) {
        for (var i = 0; i < ar.length; ++i) {
            var item = fotech.gui.getMenuItemById(ar[i], itemId);
            if (item != null)
                return item;
        }
    }
    return null;
}


/**
 * Callback used for toggling menu check buttons.
 * @param type the type of event.
 * @param event the event.
 * @param item the button that caused the event.
 */
fotech.gui.toggleCheckCallback = function(type, event, item) {
    if (item.cfg.getProperty('checked'))
        item.cfg.setProperty('checked', false);
    else
        item.cfg.setProperty('checked', true);
}

/**
 * Set the checked status of a menu item.
 * @param menubar the menu bar to search.
 * @param name the menu item name.
 * @param checked true if the item is to be checked, false if it should be unchecked.
 */
fotech.gui.checkMenuItem = function(menubar, name, checked) {
    var item = fotech.gui.getMenuItemById(menubar, name);
    if (item != null) {
        item.cfg.setProperty('checked', checked);
    }
}

/**
 * Enable or disable a menu item.
 * @param menubar the menu bar to search.
 * @param name the menu item name.
 * @param enabled true if the item is to be enabled, false if it should be disabled.
 */
fotech.gui.enableMenuItem = function(mbar, name, enabled) {
    var item = fotech.gui.getMenuItemById(mbar, name);
    if (item != null)
        item.cfg.setProperty('disabled', !enabled);
}

