/* Fotech Core JS file
 * Copyright 2018 Fotech Solutions
 * ----------------------------------------
 * 
 * Contains core Javascript to provide prog-enhance of core UI
 */

"use strict;";

var FotechCore = {
    _preferences: {
    },
};

FotechCore.preferences = function( preference ){
    return FotechCore._preferences;
}

FotechCore.preferences.set = function( pref, value ){
    FotechCore._preferences[ pref ] = value;
    FotechCore.preferences.save();
    return FotechCore.preferences.get( pref );
}

FotechCore.preferences.get = function( pref ){
    return FotechCore.preferences()[ pref ];
}

FotechCore.preferences.save = function(){
    try {
        localStorage.setItem( 'FotechCore', JSON.stringify( FotechCore._preferences ));
    } catch( e ){
        console.log( "Unable to store FotechCore feature preferences", e );
    }
}

FotechCore.preferences.load = function(){
    /* There may be some FotechCore Preferences set outside of the standard
     * preferences mechanism, these should be used as a basis for the settings
     * and then overlaid as required */

    if ( window && window.fotechCorePreferences ){
        FotechCore._preferences = window.fotechCorePreferences;
    }
    
    try {
        if ( !localStorage.getItem( 'FotechCore' )){
            /* there aren't any settings stored locally, guess we won't be loading them */
            return;
        }
        var savedPreferences = JSON.parse( localStorage.getItem( 'FotechCore' ));

        Object.keys( savedPreferences ).forEach( function(pref){
            FotechCore._preferences[ pref ] = savedPreferences[pref];
        });

    } catch( e ){
        console.log( "Unable to load FotechCore feature preferences", e );
    }
}

/* FotechCore - Feature toggling
 * Some FotechCore features can be enabled / disabled on a feature by feature basis, this
 * is stored in LocalStorage and toggled accordingly */

FotechCore.feature = function( feature ){
    /* If we are asked for a feature, we should assume there is one */
    var features = FotechCore.preferences.get('features') || {};
    features[ feature ] = features[ feature ] !== undefined ? features[feature] : false;

    return !!features[ feature ];
}

FotechCore.features = function(){
    return FotechCore.preferences.get('features');
}

FotechCore.feature.enable = function(feature){
    var features = FotechCore.preferences.get('features') || {};
    features[ feature ] = true;
    FotechCore.preferences.set( 'features', features );
    return FotechCore.feature( feature );
}

FotechCore.feature.disable = function(feature){
    var features = FotechCore.preferences.get('features') || {};
    features[ feature ] = false;
    FotechCore.preferences.set( 'features', features );
    return FotechCore.feature( feature );
}

FotechCore.preferences.load();

FotechCore.classNameFromName = function( name ){
    /* Classnames can't really have . in them, or silly characters, so replace anything
     * that isn't going to work with something easier */

    let className = name ? name : "";

    className = className.replace( /\./g, '_' );
    className = className.replace( /[^a-z0-9_\-]/ig, '' );

    return className.toLowerCase();
};

FotechCore.getContainer = function( el ){
    /* return the container for this element, saves on duplicating the dom manipulation */
    let className = FotechCore.classNameFromName( el.getAttribute('name') );

    return document.querySelectorAll( '.fotechFieldContainer' + className )[0];
};

FotechCore.getAttributes = function( el, attributePrefix, splitter ){
    let attrs = {};
    if ( el.hasAttributes() ){
        for ( let i = 0 ; i < el.attributes.length ; i ++ ){
            let attr = el.attributes[i];
            if ( attr.nodeName.indexOf( attributePrefix ) == 0 ){
                let attributeName = attr.nodeName.replace( attributePrefix, '' );
                if ( splitter ){
                    attrs[ attributeName ] = attr.nodeValue.split( splitter );
                } else {
                    attrs[ attributeName ] = attr.nodeValue;
                }
            }
        };
    }
    return attrs;
}

FotechCore.getValueOrDefault = function( el ){
    /* If the element has a value field and it's not blank */
    /* and the element doesn't have any options */

    if ( el.options && el.selectedIndex >= 0 ){
        return el.options[ el.selectedIndex ];
    } else if ( el.value && el.value != "" ){
        return el.value;
    } else if ( el.getAttribute('placeholder') ){
        return el.getAttribute('placeholder');
    }

    return;
}

FotechCore.getAncestor = function(el, sel) {
    while ((el = el.parentElement) && !((el.matches || el.matchesSelector).call(el,sel)));
    return el;
}

FotechCore.getValue = function( name ){
    /* Return the "value" of an Element, regardless of type */

    /* we might have multiple elements by the same name (thank you radio buttons) */
    /* we should look for the element name ... */
    let value = null;

    document.querySelectorAll('[name="' + name + '"]' ).forEach( function(el){
        switch ( el.tagName.toLowerCase() ){
            case 'input':
                /* Depending upon the type of input we might not want to treat it as
                * relevant */
                let type = el.getAttribute('type').toLowerCase();
                if ( type == 'radio' ){
                    if ( !!el.checked ){
                        value = el.value;
                        return;
                    }
                } else {
                    value = !!el.checked;
                    return;
                }
                break;
            case 'select':
                /* Select boxes are only relevant when they have a value */
                value = el.options[ el.selectedIndex ].value;
                return;
                break;
            default:
                value = el.value;
                return;
                break;
        }
    });

    return value;
}

FotechCore.getElementArray = function( element, selector, params ){
    params = params ? params : {};

    Object.keys( params ).forEach( function(p){
        selector = selector.replace( '%%' + p + '%%', CSS.escape(params[p]));
    });

    if ( !element ){
        return [];
    }

    return Array.prototype.slice.call( element.querySelectorAll(selector) );
}

/* FotechCore DOMReady
 */

FotechCore.DOMReady = function( callback ){
    try {
        YAHOO.util.Event.onDOMReady( callback );
    } catch ( e ) {
        window.addEventListener('DOMContentLoaded', callback );
    }
};


/* FotechCore Feature
 * A clear set tag which allows an Element to be tagged as belonging to and/or
 * being controlled by a particular feature */

FotechCore.Feature = function( element ){
    /* Take the data-core-feature tag and tag the feature accordingly */
    var tags = element.getAttribute('data-core-feature').split( ',' );

    tags.forEach( function( feature ){
        element.classList.add( 'fotechFeature' + feature );
    });

    return element;
}

/* FotechCore CustomEvent
 * A Polyfilled CustomEvent creation class, (oddly it's Safari that doesn't work this time)
 * rather than IE.
 */

FotechCore.CustomEvent = function( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
}

/* FotechCore DispatchEvent
 * A (somewhat) polyfilled Event dispatching class which is used to dispatch a custom event
 * on the target element or the window if no target is defined */

FotechCore.dispatchEvent = function( target, event, params ){
    if ( event instanceof Event ){
        /* We already have an event (we were given one) we can simply dispatch it */
        return target.dispatchEvent( event, params );
    } else {
        /* We need to create an event to handle this event */
        return target.dispatchEvent( new FotechCore.CustomEvent( event, { detail: params } ));
    }
}

/* FotechCore QueryParams
 * Take a URL, extract the GET parameters from it and return a hash of key/value pairs
 * where a URL is not supplied, use the current URL instead */

FotechCore.QueryParams = function( url ){
    if ( url === undefined ){
        url = window.location.href;
    }

    var params = url.split( '?', 2 )[1];
    var urlparams = new URLSearchParams( params );

    var keyvalues = {};
    for ( var i of urlparams ){
        keyvalues[i[0]] = i[1];
    }

    return keyvalues;
}

/* FotechCore UI Interactive element
 * Interactive elements - a low level directive which is used to determine fields
 * and their associated contents, mostly just adds methods for accessing and
 * addressing DOM elements */

FotechCore.UI = function( coreUIElement ){
    /* find any core elements (select, input, textarea et al */
    coreUIElement.querySelectorAll('input, textarea, select, button, [data-core-useid]').forEach( function(coreUIInteractive){
        if ( coreUIInteractive.classList.contains( 'coreUIInteractive' ) ){
            /* we don't need to enhance things more than once */
            return;
        }
        coreUIInteractive.classList.add('coreUIInteractive');
        /* The element is interactive, woo!, set our coreUIElement to have a classname similar
         * to the one we are wishing to manipulate, this allows us to find the LI which has a
         * control within it */

        /* determine a new classname for this element */
        coreUIInteractive.classList.add( 'fotechField' );
        coreUIElement.classList.add( 'fotechContainer' );

        /* Non interactive elements (or tradititionally non-interactive) ones can still be enhanced
         * mostly so they can be enabled or disabled, but won't likely have a "name" attribue as they
         * are fairly unique to interactive elements
         *
         * Derive the fields list in an alternative way, use a data-core-useid attribute instead to
         * signal to use the ID of the element as the basis */

        var className = FotechCore.classNameFromName( coreUIInteractive.getAttribute('name') );

        if (
            (!className || className == "")
            &&
            coreUIInteractive.hasAttribute('data-core-useid')
        ){
            className = FotechCore.classNameFromName( coreUIInteractive.getAttribute('id') );
        }

        var fields = [ className ];

        if ( coreUIInteractive.tagName.toLowerCase() == 'input' && coreUIInteractive.getAttribute('type').toLowerCase() == 'radio' ){
            fields.push( className + "_" + CSS.escape( coreUIInteractive.getAttribute( 'value' ) ));
        }

        fields.forEach( function(className){
            coreUIInteractive.classList.add( 'fotechField' + className );
            coreUIElement.classList.add( 'fotechField' + className );
        });

        return;
    });
}

FotechCore.Events = function(){
    this._events = {};
}

FotechCore.Events.prototype.addEvent = function( name, callback ){
    if ( !this._events[ name ] ){
        this._events[name] = [];
    }

    this._events[name].push( callback );
}

FotechCore.Events.prototype.fireEvent = function( name ){
    if ( this._events[name] ){
        this._events[name].forEach( function(ev){
            ev( arguments );
        });
    }
}

/* FotechCore Dialog
 * Creates and manipulates a simple dialog, estensibly a wrapper around the YUI library
 * call of the same */

FotechCore.Dialog = function( options ){
    /* Create a new uuid as a name for this dialog */
    var uuid = 'fotechcore_dialog_' + fotech.util.uuid();

    /* Create and Use Events */
    FotechCore.Events.call( this, options );

    /* Create an element to contain it */
    var dialogContainer = new Element('div', { id: uuid } );
    this.header  = new Element( 'div', { className: 'hd' });
    this.body    = new Element( 'section', { className: 'bd core dialog' });
    this.form    = new Element( 'form', {} );
    this.content = new Element( 'fieldset', { className: 'core' } );
    this.footer  = new Element( 'div', { className: 'ft' } );
    this.footerContents  = new Element( 'div', { className: 'button-group' } );

    dialogContainer.appendChild( this.header );
    dialogContainer.appendChild( this.body );
    dialogContainer.appendChild( this.footer );

    this.footer.appendChild( this.footerContents );

    this.buttons = {};

    [ 'Cancel', 'Reset', 'Submit' ].forEach( function(b){
        var button = new Element('button', { });
        button.textContent = b;
        this.buttons[b.toLowerCase()] = button;
        this.footerContents.appendChild( button );

        button.addEventListener( 'click', this[b.toLowerCase()] ? this[b.toLowerCase()].bind(this) : function(){
        } );

    }.bind(this));

    this.body.appendChild( this.form );
    this.form.appendChild( this.content );

    document.body.appendChild( dialogContainer );

    /* Set defaults */
    options = options !== undefined ? options : {};
    options['title'] = options['title'] !== undefined ? options['title'] : 'Options';

    /* And use the parameters */
    this.header.textContent = options['title'];

    this.yahooDialog = new fotech.gui.ValidatingDialog(
                            uuid,
                            {
                                postmethod: 'none',
                                visible: false,
                                x: 100000,
                                y: 30,
                                constraintoviewport: true
                            },
                            'dynamic_form'
                        );

    this.yahooDialog.hideEvent.subscribe( function(){ this.fireEvent('close'); }.bind(this));
    this.yahooDialog.showEvent.subscribe( function(){ this.fireEvent('open'); }.bind(this));
}

FotechCore.Dialog.prototype = Object.create( FotechCore.Events.prototype );

FotechCore.Dialog.prototype.setTitle = function(title){
    this.header.textContent = title;
}

FotechCore.Dialog.prototype.open = function(){
    this.yahooDialog.render();
    this.yahooDialog.show();
}

FotechCore.Dialog.prototype.close = function(){
    this.yahooDialog.hide();
}

FotechCore.Dialog.prototype.submit = function(){
    this.fireEvent('submit');
    this.yahooDialog.hide();
}

FotechCore.Dialog.prototype.reset = function(){
    this.fireEvent('reset');
    this.form.reset();
}

FotechCore.Dialog.prototype.cancel = function(){
    this.fireEvent('cancel');
    this.yahooDialog.hide();
}



/* FotechCore Enable
 * Enable / Disable / Hide / Show advanced control, allows for controls to be hidden
 * or shown, or enabled or disabled on mass */

FotechCore.Enable = function( controlElement ){
    /* Check to see if we have already been enhanced */
    if ( controlElement.classList.contains( 'coreEnable' ) ){
        /* we don't need to enhance things more than once */
        return;
    }

    /* We need to find the control(s) which enables / disables these options */
    let controlElements = {
        enable : FotechCore.getAttributes( controlElement, 'data-core-enable-', ',' ),
        disable: FotechCore.getAttributes( controlElement, 'data-core-disable-', ',' ),
        hide:    FotechCore.getAttributes( controlElement, 'data-core-hide-', ',' ),
        show:    FotechCore.getAttributes( controlElement, 'data-core-show-', ',' )
    };

    let containerDisplay = function(el,elName,display){
        controlElement.baseContainer.querySelectorAll(
            '.fotechContainer.fotechField' + elName.toLowerCase()
            + ',' + 
            'fieldset.fotechField' + elName.toLowerCase()
        ).forEach( function(l){
            l.style.display = display
        });
    };

    var enableDisableElements = function( elements, state){
        elements.forEach( function(l){
            if ( l ){
                if ( state ){
                    l.classList.remove('disabled');
                } else {
                    l.classList.add('disabled');
                }
            }
        });
    };

    var enableLabel = function(el){
        /* because of radio buttons, there may be other elements with the same
         * name as this one, the state of the label should only be determined
         * if they are all enabled, or disabled */

        var elements = FotechCore.getElementArray( el.form || document, '[name="%%name%%"]', { name: el.getAttribute('name') });
        var disabledElements = elements.filter( function(a){
            return a.disabled;
        });

        var state = !( elements.length == disabledElements.length );

        var enableDisable = function(label, state){
            /* Due to existing code, some labels have active entries which are
             * made inactive by the presence of a disabled class, in which case
             * we should also populate those entries */

            var labels = FotechCore.getElementArray( label, 'img' );
            labels.unshift( label );

            enableDisableElements( labels, state );
        };

        /* For straight forward entries, we can set the enabled / disabled state
         * based upon the state of the entry, is everything enabled / disabled ? */
        FotechCore.getElementArray( el.form || document, 'label[for="%%name%%"]', {
            name: el.getAttribute('name')
        }).forEach( function(el){
            enableDisable(el, state);
        });

        /* Radio buttons are of course, different, they are dictated by their individual
         * state, however their bulk status should be set as above */
        if (
            el.tagName.toLowerCase() == 'input'
            &&
            ( el.getAttribute('type') || '' ).toLowerCase() == 'radio'
        ){
            FotechCore.getElementArray( el.form || document, 'label[for="%%id%%"]', {
                id: el.getAttribute('id')
            }).forEach( function(label){
                enableDisable( label, !!!el.disabled );
            });
        }
    };

    var name = controlElement.getAttribute('name');

    var isSet = function(el, entry, state){
        el[ entry ] = el[ entry ] ? el[ entry ] : {};

        /* reset the state for this controlledElement if required */
        el[ entry ][ name ] = state;

        var setCount = 0;
        Object.keys( el[entry] ).forEach( function(a){
            if ( el[entry][a] ){
                setCount++;
            }
        });

        /* Check whether this element is being enabled by several things */
        return ( setCount > 0 );
    };

    var enableDisableInteractiveElement = function( el, state ){
        /* Check if this element is an interactive one, that can be disabled
         * Such as inputs, checkboxes and so on, other elements such as simple
         * elements have to be disabled in an alternative way
         */
        if ( ['input', 'select', 'textarea','button'].includes( el.tagName.toLowerCase() ) ){
            /* This is an interactive element, do nothing */
            return;
        }

        /* Instead we need to enable / disable the element */
        enableDisableElements( [ el ], state );
    }

    let actions = {
        enable: function(el){
            /* Check whether this entry is enabled or disabled by something else */
            isSet( el, '_enabledBy', true )
            if ( el.enable ){
                el.enable();
            }
            el.disabled = false
            enableDisableInteractiveElement( el, true );
        },
        disable: function(el){
            /* Check whether this entry is enabled or disabled by something else */
            if ( !isSet( el, '_enabledBy', false ) ){
                if ( el.disable ){
                    el.disable();
                }
                el.disabled = true
                enableDisableInteractiveElement( el, false );
            }
        },
        /* HIDE and SHOW should operate on the LI not the element */
        hide: function(el,elName){
            /* Check whether this entry is enabled or disabled by something else */
            isSet( el, '_hiddenBy', true );
            containerDisplay(el,elName,"none");
        },
        show: function(el,elName){
            /* Check whether this entry is enabled or disabled by something else */
            /* The values of radio buttons may be the thing which is hiding this
             * element, temporarily allow them regardless */
//            if ( isSet( el, '_hiddenBy', false ) ){
                containerDisplay(el,elName,"block");
//            }
        }
    };

    /* Check to see whether we are actively controlling anything */
    let controlled = 0;

    Object.values( controlElements ).forEach( function(i){
        var controlledElementIds = Object.keys(i);
        controlled += controlledElementIds.length;
        /* Mark each of the elements we control with a suitable tag */
        controlledElementIds.forEach( function(id){
            FotechCore.getElementArray( document, '.fotechField' + id).forEach( function(element){
                element.setAttribute('data-core-enable-controlled', true);
            });
        });
    });

    if ( controlElement && controlled > 0 ){
        /* Create a function for manipulating itself */
        let enablerFunc = function(ev){
            /* We need to vary what we are doing depending upon the type of the controlElement */
            let isRelevant = false;
            let controlType = controlElement.tagName.toLowerCase();

            switch ( controlType ){
                case 'input':
                    /* Depending upon the type of input we might not want to treat it as
                        * relevant */
                    let type = controlElement.getAttribute('type').toLowerCase();
                    if ( type == 'radio' ){
                        isRelevant = !!controlElement.checked;
                    } else if ( type == 'checkbox' ){
                        /* Checkboxes are always relevant */
                        isRelevant = true;
                    }
                    break;
                case 'select':
                    /* Select boxes are only relevant when they have a value, however
                        * we probably can't work that out here as what we want to do is
                        * check whether we want to do any actions based on each value */
                    isRelevant = true;
                    break;
                default:
                    break;
            }

            /* if we aren't the value we desired, do nothing more */
            if ( !isRelevant ){
                return;
            }

            /* We need to iterate through each of our controlled elements and perform
                * the appropriate action upon them */

            Object.keys(controlElements).forEach( function(action){
                /* Each of these is a field on the page, we don't care about the value */
                Object.keys( controlElements[action] ).forEach( function(param){
                    /* if we are a select box, we may well be given a wide variety of conditions
                        * under which we are supposed to operate */
                    if ( controlType == 'select' ){
                        /* if this action hasn't been declared to run on this value, don't run it */
                        if ( !controlElements[action][param] || !controlElements[action][param].includes(
                                controlElement.options[ controlElement.selectedIndex].value
                            )){
                            return;
                        }
                    }

                    /* Checkboxes are odd as they tend to toggle the action rather than
                        * enact it, in this case we can take the action defined in the declaration
                        * and assume that is the "positive" connotation, i.e. the one to do when 
                        * the checkbox is checked, otherwise we can invert the logic */

                    let actionToPerform = actions[action];
                    if ( controlElement.type.toLowerCase() == 'checkbox' && !!!controlElement.checked ){
                        /* invert the logic of our actions, hide becomes show, enabled becomes disable */
                        switch ( action ){
                            case 'hide':
                                actionToPerform = actions['show'];
                                break;
                            case 'show':
                                actionToPerform = actions['hide'];
                                break;
                            case 'enable':
                                actionToPerform = actions['disable'];
                                break;
                            case 'disable':
                                actionToPerform = actions['enable'];
                                break;
                            default:
                                break;
                        };
                    }

                    /* find the element and enact the action */
                    var toUpdate = FotechCore.getElementArray(
                        controlElement.form || document,
                        '.fotechField.fotechField' + param.toLowerCase() +
                        ',' +
                        '.fotechFeature' + param.toLowerCase()
                    );

                    toUpdate.forEach( function(el){
                        if (el.classList.contains( 'fotechField' + FotechCore.classNameFromName( controlElement.id )) ){
                            /* Do not attempt to disable our parent control or ourselves */
                            return;
                        }
                        actionToPerform( el, param );
                    });

                    toUpdate.forEach( function(el){
                        enableLabel( el );
                        /* Finally, if we are in control of enabling / disabling controls and we ourselves
                         * are disabled then we should enact the "disable" command on our controlled
                         * elements as well */

                        if ( [ 'disable', 'enable' ].includes( action ) && controlElement.disabled ){
                            actions['disable'](el, param);
                        }
                    });
                });
            });
        };

        controlElement.addEventListener( "change", enablerFunc );

        /* because we can disable the enabler control, which should */
        /* inherently disable anything that it controls, we need to */
        /* create a mutation observer for it */

        var observer = new MutationObserver(function(mutations) {
            for (var i=0, mutation; mutation = mutations[i]; i++) {
                if (mutation.attributeName == 'disabled' || mutation.attributeName == 'checked' ) {
                    enablerFunc();
                }
            };
        });

        // Observe attributes change
        observer.observe( controlElement, {attributes: true});

        /* and set the initial state */
        enablerFunc();

        /* Fotech Forms are initially loaded with the wrong values and populated dynamically
        * listen to and respond to them being updated */

        window.addEventListener('fotech:form:refresh', enablerFunc );
    }

    /* denote that this class has been coreEnhanced so we can avoid doing it twice */
    controlElement.classList.add( "coreEnable" );
}

/* FotechCore Advanced
 * Advanced controls, hides controls or shows them */

FotechCore.Advanced = function( controlElement ){
    /* Advanced controls should be grouped together in a fieldset with a data-core-advanced="defaultstate"
        * markup tag associated with them.  Their <legend> is used for the control etc .. */
    if ( controlElement.classList.contains( 'coreAdvanced' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    controlElement.classList.add('coreAdvanced');

    let defaultMode = controlElement.getAttribute('data-core-advanced');
    let controlledElements = controlElement.querySelectorAll('ul,fieldset');
    controlElement.isHidden = ( defaultMode == "hidden" );

    let toggle = function(){
        if ( this.isHidden ){
            controlElement.classList.remove("hidden");
            controlledElements.forEach( function(el){ el.style.display = "inline-block" } );
        } else {
            controlElement.classList.add("hidden");
            controlledElements.forEach( function(el){ el.style.display = "none" } );
        }
        this.isHidden = !!!this.isHidden;
    };

    controlElement.addEventListener( 'click', toggle );
    toggle();
}

/* FotechCore Chooser
 * Chooser control, provides a visually clear list of options */

FotechCore.Chooser = function( element ){
    /* Chooser controls are usually radio buttons laid out horizontally, they should be tied
     * with their label and tidied up to make it more obvios that they are controls and that
     * their label is associated with them */

    if ( element.classList.contains( 'coreChooser' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    element.classList.add('coreChooser');

    /* firstly, from the element we need to discover and find its label */
    var label = FotechCore.getElementArray( element.baseContainer, 'label[for="%%id%%"]', { id: element.getAttribute('id') })[0];
    var name = element.getAttribute('name');

    /* Create a container element (a suitable div) to contain the radio and its label */
    var container = new Element('div', { className: 'coreChooser' });
    container.setAttribute('data-core-chooser-for', CSS.escape( name ) );

    /* insert it into place (where the radio currently is) */
    element.parentNode.insertBefore( container, element );
    container.radio = element;

    /* now put the radio inside the container */
    container.appendChild( element );

    /* Now it's label */
    if ( label ){
        container.appendChild( label );
    }

    /* and do some styling when the option is selected */
    container.choose = function(ev){
        /* Annoyingly change events don't work well on radio buttons, so
         * instead react to clicks by selecting this element, but none of
         * its brethren (which have the same name) */
        var sameName = FotechCore.getElementArray( element.form, '[data-core-chooser-for="%%name%%"]', { name: CSS.escape( element.getAttribute('name'))});

        sameName.forEach( function( el ){
            if ( el.radio.checked ){
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    };

    element.addEventListener( 'click', container.choose );
    element.addEventListener( 'change', container.choose );

    /* Since setting values via Javascript doesn't fire events, we should also watch for 
     * the checked value mutating (i.e. being changed) */
    var observer = new MutationObserver(function(mutations) {
        for (var i=0, mutation; mutation = mutations[i]; i++) {
            if ( mutation.attributeName == 'checked' ) {
                container.choose();
            }
        };
    });

    observer.observe( element, {attributes: true});

    window.addEventListener('fotech:form:refresh', container.choose );
    container.choose();
}


/* FotechCore DropDown
 * DropDown menu select control replacement, similar to a select box but with styling
 * */

FotechCore.DropDown = function( dropdown ){
    if ( dropdown.classList.contains( 'coreDropDown' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    dropdown.classList.add('coreDropDown');

    /* Firstly we need to wrap the dropdown in an element which we have control
        * over the styling of */

    var container = new Element( 'div', { className: 'coreDropDown' } );

    if ( !dropdown.parentNode ){
        console.log( "Unable to enhance", dropdown, "no parent");
        return;
    }

    /* insert the container into the DOM before the dropdown */
    dropdown.parentNode.insertBefore( container, dropdown );

    /* and then move the dropdown into the container, before we do so however we should
        * mote it somewhere we know is visible, then measure it */

    document.body.appendChild( dropdown );
    var menuSize = dropdown.getBoundingClientRect();
    container.appendChild( dropdown );

    /* and finally remove the dropdown from being visible */
    dropdown.style.display = "none";

    /* Now we have our container, we need a "selected" item for it, which should show
        * the value of the dropdown's current value */

    var selectedMarker = new Element( 'div', { className: 'coreDropDownMarker control' } );
    selectedMarker.textContent = " ";
    container.appendChild(selectedMarker);

    /* Create a menu for this select box, this will contain all our menu items */
    var menu = new Element('div', { className: 'coreDropDownMenu' } );

    /* Options to show / hide the menu */
    var timeout = null;

    menu.reveal = function(){
        /* work out where the menu should be, then fix its positioning and then position it */
        var pos = container.getBoundingClientRect();

        menu.style.top = pos.bottom;
        menu.style.left = pos.left;

        menu.style.display = "block";

        selectedMarker.classList.add('coreDropDownOpen');

        clearTimeout( timeout );
    };

    menu.conceal = function( immediate ){
        selectedMarker.classList.remove('coreDropDownOpen');
        if ( immediate ){
            menu.style.display = "none";
            return;
        }
        timeout = setTimeout( function(){
            menu.style.display = "none";
        }, 50 );

    };

    var options = [];

    /* Now create menu items for each option in the original select box */
    for( var i = 0; i < dropdown.options.length; ++i ){
        var option = dropdown.options[i];
        var menuOption = new Element('div', { className: 'coreDropDownMenuOption' });
        menu.appendChild( menuOption );

        /* configure it accordingly */
        menuOption.setAttribute('data-core-value', option.value );

        /* Add some text for the option */
        menuOption.text = new Element('span', { className: 'coreDropDownMenuOptionText' });
        menuOption.text.textContent = option.textContent;

        /* Append */
        menuOption.appendChild( menuOption.text );

        menuOption.name = function(){
            return this.text.textContent;
        }.bind( menuOption );

        menuOption.value = function(){
            return this.getAttribute('data-core-value');
        }.bind( menuOption );


        /* wire up the options's selection */
        menuOption.choose = function( ev, noUpdate ){
            var value = this.value();
            for( var i = 0; i < dropdown.options.length; ++i ){
                if ( dropdown.options[i].value == value ){
                    selectedMarker.textContent = this.name();

                    if ( noUpdate === undefined || !noUpdate ){
                        dropdown.options[i].selected = true;
                        dropdown.dispatchEvent( new Event('change'));
                    }
                }
            }
            menu.conceal();
        }.bind( menuOption );

        menuOption.addEventListener('click', menuOption.choose );

        options.push( menuOption );
    };

    /* quickly hide it (before we even show it) */
    menu.conceal( true );

    /* make sure everything is the size it should be */
    var width = Math.ceil( menuSize.width ) + 'px';
    menu.style.width = width;
    selectedMarker.style.width = width;

    /* now we can put it on the page */
    container.appendChild(menu);

    /* Set the current selection */
    options[ dropdown.selectedIndex ].choose();

    /* Now we need to wire up the operation for the control, which involves what
        * happens when it's clicked, the positioning of the menu etc etc etc... */
    selectedMarker.addEventListener( 'click', menu.reveal );
    selectedMarker.addEventListener( 'mouseleave', menu.conceal );

    menu.addEventListener( 'mouseenter', menu.reveal );

    /* add reverse mapping of the select box back to the overloaded version */
    dropdown.select = function( option ){
        /* DO NOT use the choose method without refraining from updating the select box */
        options[ option ].choose( null, true );
    };
}

/* FotechCore TabView
 * Provides a tabbed interface - obstensibly a wrapper around Yahoo's TabView
 * but with some additional functionality */

FotechCore.TabView = function( tabareaID ){
    /* The tab area contains a list of divs which are to be constructed into a series
     * of tabs, each one of these divs contains (or should contain) all the appropriate
     * information regarding their layouts and contents to pass to a Yahoo UI TabView
     *
     * However, the Yahoo Tabview doesn't allow for tabs to be hidden / removed easily
     * from their original layout, nor does it allow for tabs to be referred to by name
     * rather than ID (or position within the tabview) */

    /* Firstly, we should get a list of the "tabs" and in the process clear the contents
     * of our tab area so we can move things back (or add new elements to it) as we
     * see fit */

    var tabarea = document.querySelectorAll('#' + tabareaID)[0];

    if ( !tabarea ){
        console.log( "Unable to produce tabs" );
        return;
    }

    if ( tabarea.classList.contains( 'coreTabView' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    tabarea.classList.add('coreTabView');


    var contents = new Element('div', { className: 'coreTabViewShadow'});

    while( tabarea.firstChild ){
        contents.appendChild( tabarea.firstChild );
    }

    /* Now we have a list of contents, we can go through it looking for tabs
     * These are "div" elements within a yui-content div, but divs within a
     * div essentially */

    var tabs = [];

    for ( var cn = 0; cn < contents.childNodes.length; ++cn ){
        var child = contents.childNodes[cn];
        for ( var gc = 0; gc < child.childNodes.length ; ++gc ){
            var grandChild = child.childNodes[gc];
            if ( grandChild.nodeType == 1 && grandChild.tagName.toLowerCase() == 'div' ){
                tabs.push( grandChild );
            }
        }
    }

    /* we finally have our list of tabs, so we can reconstruct the tabview contents
     * in such a way that the Yahoo control can use it.  */

    /* we have our list of tabs, we can view that as the definitive list (we can add
     * or remove elements from it seperately) so we can now rebuild the tabarea
     * in a way which works for the Yahoo Control */

    /* the tab area should be empty, we did empty it afterall, so create two new
     * areas, one for the labels and one for the tab contents */

    var tabList = new Element( 'ul', { className: 'yui-nav' } );
    var panel = new Element( 'div', { className: 'yui-content coreTabViewTabsPanel' });
    var inactivePanel = new Element( 'div', { className: 'yui-content coreTabViewInactiveTabsPanel' });
    inactivePanel.style.display = "none";

    var tabId = 1;
    var tabMap = {};

    for ( var i = 0 ; i < tabs.length; ++i ){
        var tab = tabs[i];
        var name = tab.name = tab.getAttribute(['data-core-tab']);

        /* Is this tab visible ? */
        var hidden = tab.getAttribute('data-core-hidden');
        if ( hidden !== null ){
            /* If it's hidden, don't include it in the tabs list, but instead
             * place it in our (invisible) staging area (which has to be in the same form) */
            inactivePanel.appendChild( tab );
            continue;
        }

        var id = tab.getAttribute('id').replace(/_content$/, '' );

        var tabTitle = new Element('li', { id: id + '_nav'} );
        var tabLink = tabTitle.appendChild(  new Element( 'a', { href: '#tab' + (tabId) } ));
        tabLink.textContent = name;
        tabLink.appendChild( new Element('span', {} ) ).innerHTML = "&nbsp;"; /* used to higlight errors */

        tabList.appendChild( tabTitle );
        panel.appendChild( tab );

        tabMap[name] = tabId - 1;
        tabId++;
    }

    tabarea.appendChild( tabList );
    tabarea.appendChild( panel );
    tabarea.appendChild( inactivePanel );

    var yahooControl = new YAHOO.widget.TabView( tabareaID );

    /* Overload the yahoo 'selectTab' function with a more friendly one which allows
     * you to select it by name *or* id */

    var originalselectTab = yahooControl.selectTab;

    yahooControl.selectTab = function( id ){
        if ( id != parseInt( id ) ){
            /* work out what the tabs Id should be */
            id = tabMap[id];
        }
        originalselectTab.call( yahooControl, id );
    }

    return yahooControl;
}

/* FotechCore Checkbox
 * Advanced checkbox control, replaces a checkbox (and maybe corresponding text) with a visually prettier
 * version */

FotechCore.Checkbox = function( element ){
    if ( element.classList.contains( 'coreCheckbox' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    element.classList.add('coreCheckbox');

    /* Checkboxes aren't especially pretty, replace them with the slider style controls which
     * are used in Windows / MacOS / Android etc etc */

    /* Firstly create a container element which will wrap over the checkbox, this should replace
     * the checkbox in the DOM */

    var container = new Element('div', { className: 'coreCheckbox' });

    /* insert it into place (where the radio currently is) */
    element.parentNode.insertBefore( container, element );
    container.radio = element;

    /* now put the radio inside the container */
    container.appendChild( element );

    /* We then need two "sliders", one for "on", one for "off" */
    var options = [ 'on', 'off' ];

    /* Steal the labels as well, at least move them into the container and tie them up */
    var labels = FotechCore.getElementArray( element.baseContainer, 'label[for="%%id%%"] > *', { id: element.getAttribute('id')});

    var setOnOff = function(){
        options.forEach( function(opt){
            container.classList.remove( opt );
        });

        if ( element.checked ){
            container.classList.add( 'on');
        } else {
            container.classList.add( 'off');
        }
    };

    var func = function(){
        element.checked = !element.checked;
        element.dispatchEvent( new Event('click'));
        element.dispatchEvent( new Event('change'));
        setOnOff();
    };

    options.forEach( function( def ){
        /* Create the slider control */
        var slider = new Element( 'div', { className: "slider " + def });

        /* Create a knob at the end */
        var knob = new Element( 'div', { className: 'knob' });
        slider.appendChild( knob );

        //var label = new Element( 'label', { });
        //slider.appendChild( label );

        labels.forEach( function(label){
            if ( label.classList.contains( def ) ){
                slider.appendChild( label );
            }
        });

        slider.addEventListener( 'click', func );

        /* And place the container in the correct place */
        container.appendChild( slider );
    });

    setOnOff();
    window.addEventListener('fotech:form:refresh', setOnOff );

    element.addEventListener( 'change', setOnOff );
}

/* FotechCore Dynamic Properties panels
 * Creates a dynamic popup window */

FotechCore.Dynamic = function( element ){
    if ( element.classList.contains( 'coreDynamic' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    element.classList.add('coreDynamic');

    var options = FotechCore.getAttributes( element, 'data-core-dynamic-' );
    var popup = new FotechCore.Dialog();
    var ready = false;

    var open = false;

    var elements = [];
    var forms = [];

    var duplicate = function(){
        /* Dynamic properties are composed of several controls which may (or may not)
         * have been enhanced already.  The contents of our popup should be a clone
         * of the elements we wish to control, which won't have been enhanced in any
         * way and won't carry copies of any event handlers */

        var remappedIds = {};

        var controlList = new Element('ul');
        popup.content.appendChild( controlList );

        element.querySelectorAll( 'li' ).forEach( function( control ){
            /* Having determined the control, we now need to extract the controls for it */

            var newControl = new Element('li', {} );
            controlList.appendChild( newControl );

            control.querySelectorAll( 'label, input, select, textarea' ).forEach( function(el){
                var copiedElement = el.cloneNode(true); // True performs a deep clone which is handy
                /* We need to strip any fotechCore like class definitions from the element
                 * the easiest way is to just strip *all* class definitions and hope that
                 * there weren't any useful ones in there */
                copiedElement.classList = '';

                /* rework the ID values to make the copied element unique */
                var copiedElementId = el.id !== undefined ? 'fotechCoreDynamic_' + el.id : undefined;

                /* The name, similarly needs reworking (if present) */
                var copiedElementName = el.name !== undefined ? 'fotechCoreDynamic_' + el.name : undefined;

                /* Remember the ID / Name of this element so we can rework anything else
                 * that refers to it */
                if ( copiedElementId !== undefined ){
                    remappedIds[ el.id ] = copiedElementId;
                    remappedIds[ FotechCore.classNameFromName( el.id ) ] = FotechCore.classNameFromName( copiedElementId );
                }
                if ( copiedElementName !== undefined ){
                    /* Keep a record of the original name, this is what is used during a dynamic update */
                    copiedElement.origin = el.name;
                    remappedIds[ el.name ] = copiedElementName;
                    remappedIds[ FotechCore.classNameFromName( el.name ) ] = FotechCore.classNameFromName( copiedElementName );
                }

                /* we also need to tie the "old" elements into the new ones, so should the old
                 * ones change in any way, the new ones will update to reflect the change */

                var update = function( target, source, ev ){
                    if ( ev && ev.detail && ev.detail.fotechCoreReflection ){
                        /* Do not reflect this event back onto itself, that way recursion lies */
                        return;
                    }

                    var tag = source.tagName.toLowerCase();
                    switch( tag ){
                        case 'select':
                            target.selectedIndex = source.selectedIndex;
                            break;
                        case 'input':
                            var type = source.getAttribute('type').toLowerCase();
                            switch( type ){
                                case 'checkbox':
                                case 'radio':
                                    target.checked = source.checked;
                                    break;
                                default:
                                    target.value = source.value;
                                    break;
                            }
                            break;
                        default:
                            target.value = source.value;
                            break;
                    }
                    target.dispatchEvent( new FotechCore.CustomEvent('change', { detail: { fotechCoreReflection: true }}) );
                };

                el.addEventListener('change', function( ev ){ update( copiedElement, el, ev ) } );
                el.addEventListener('click',  function( ev ){ update( copiedElement, el, ev ) } );

                /* And add two way binding so that the changes to the copied element get
                 * reflected back to the original */
                if ( options && options['reflective'] ){
                    copiedElement.addEventListener('change', function(ev){ update( el, copiedElement, ev ); });
                }

                update( copiedElement, el );

                newControl.appendChild( copiedElement );

                /* Ensure that a reset on the form works as predicted too */
                var form = FotechCore.getAncestor( copiedElement, 'form' );
                if ( form && !forms.includes( form ) ){
                    forms.push( form );
                }

                elements.push( {
                    original: el,
                    clone: copiedElement
                });
            });
        });

        forms.forEach( function( form ){
            form.addEventListener('reset', function(ev){
                ev.stop();
                elements.forEach( function(elementCollection){
                    /* Update each element with their new values */
                    update( elementCollection.clone, elementCollection.original, ev );
                });
                elements.forEach( function(elementCollection){
                    /* And then perform change handlers */
                    elementCollection.clone.dispatchEvent( new Event('change'));
                });
            });
        });

        /* Now we need to remap all properties and parameters which might reflect this control */
        elements.forEach( function(elementCollection){
            /* Iterate through each of the elements attributes and look for an attribute whose
             * name resembles one of our known IDs, or whose value does. If so, replace it for
             * the mapped version of the ID */
            var el = elementCollection.clone;

            var attrs = {};
            for ( var i = 0 ; i < el.attributes.length; ++i ){
                attrs[ el.attributes[ i ].nodeName ] = el.attributes[ i ].nodeValue;
            }

            Object.keys( attrs ).forEach( function(key){
                /* For each of the remapped and duplicated objects, check for their IDs */
                /* Firstly - Check the attribute name */
                Object.keys( remappedIds ).forEach( function( id ){
                    if ( id === undefined || id == "" ){
                        return;
                    }

                    /* Rework values */
                    if ( attrs[key] !== undefined && attrs[key] != "" && attrs[key].indexOf( id ) >= 0 ){
                        var newValue = attrs[key].replace( id, remappedIds[id] ).toLowerCase();
                        el.setAttribute( key, newValue );
                    }
                    /* and rework the attributes themselves */
                    if ( key.indexOf( id.toLowerCase() ) >= 0 ){
                        var newId = key.replace( id, remappedIds[id] ).toLowerCase();
                        el.setAttribute( newId, attrs[key] );
                        el.removeAttribute( key );
                    }
                });
            })
        });

        FotechCore.enhance( controlList );

        /* Having enhanced all our controls, we can now add debounced change handlers which
         * will automagically set the settings appropriately */

        var submitDynamicProperties = function( save ){
            var dynamicProperties = [];
            elements.forEach( function(el){
                /* Get the current values / properties for this control */
                var tag = el.clone.tagName.toLowerCase();
                var value = undefined;

                switch( tag ){
                    case 'select':
                        value = el.clone.options[ el.clone.selectedIndex ].value;
                        break;
                    case 'input':
                        var type = el.clone.getAttribute('type').toLowerCase();
                        switch( type ){
                            case 'checkbox':
                                if ( el.clone.checked ){
                                    value = el.clone.value ? el.clone.value : true;
                                } else {
                                    value = el.clone.value ? 'FALSE' : false;
                                }
                                break;
                            case 'radio':
                                /* Radio buttons don't exist unless they're checked */
                                value = el.clone.value ? el.clone.value : el.clone.checked;
                                if ( !el.clone.checked ){
                                    return;
                                }
                                break;
                            default:
                                value = el.clone.value;
                                break;
                        }
                        break;
                    default:
                        value = el.clone.value;
                        break;
                }

                var dynamicProperty = { key: el.original.name, value: value };

                /* Each Dynamic property needs some context of where to return to, this is extracted from
                 * the dynamic properties using the data-core-dynamic-context and data-core-dynamic-context-*
                 * properties, where the * denotes the property followed by the name it is to be referred
                 * to as, the value is a regex used to extract the appropriate values */
                if ( options && options['context']){
                    var dynamicContextElement = document.querySelectorAll( options['context']);
                    if ( dynamicContextElement.length > 0 ){
                        dynamicContextElement = dynamicContextElement[0];
                    }
                    var context = FotechCore.getAttributes( element, 'data-core-dynamic-context-' );
                    Object.keys( context ).forEach( function(ctx){
                        if ( dynamicContextElement ){
                            try {
                                var c = ctx.split( '-', 2 );
                                var propertyName = c[0];
                                var variable = c[1];
                                var expression = context[ctx];//.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                var matcher = new RegExp( expression );

                                var property = dynamicContextElement.getAttribute( propertyName );
                                var value = matcher.exec( property ).splice(1).join('');

                                dynamicProperty[ variable ] = value;
                            } catch ( e ){
                                console.log( "Unable to determine dynamic property context", e);
                            }
                        }
                    });


                }

                if ( el.original.name ){
                    dynamicProperties.push( dynamicProperty );
                }
            });

            try {
                /* Are we saving or applying?  Applying dynamic properties
                 * is done dynamically (oddly enough) but still needs to be
                 * done, saving is done on submit */
                var success = function(){
                    setStatusMessage("Submitted dynamic property.");
                    Event.fire(window, 'fotech:dynamic_changes', {properties: dynamicProperties});
                };

                var failure = function(){
                    setStatusMessage("Failed to submit dynamic property.");
                };

                if ( save ){
                    /* Now, finally, submit the properties */
                    util.saveDynamicProperties( {
                        parameters: dynamicProperties,
                        id: pushDaemonUniqueId,
                        onSuccess: success,
                        onFailure: failure,
                        onComplete: function( e ){
                        }
                    });
                } else {
                    util.setDynamicProperties( {
                        parameters: dynamicProperties,
                        id: pushDaemonUniqueId,
                        onSuccess: success,
                        onFailure: failure,
                        onComplete: function( e){
                        }
                    });
                }

            } catch ( e ){
                console.log( "Unable to submit properties", e );
            }
        };

        var debouncedSubmit = fotech.debounce(
            function(){
                submitDynamicProperties( false );
            }, 500
        );

        elements.forEach( function(el){
            el.clone.addEventListener( 'change', function(){
                if ( open ){
                    debouncedSubmit();
                }
            });
        });

        ready = true;

        popup.addEvent('submit', function(){
            if ( open ){
                submitDynamicProperties( true );
            }
        });
    };

    var update = function(){
        /* set the dialog title */
        if ( options && options['title'] ){
            var titles = document.querySelectorAll( options['title'] );
            if ( titles.length > 0 ){
                popup.setTitle( titles[0].textContent );
            }
        }
        elements.forEach( function(el){
            el.original.dispatchEvent( new Event('change'));
        });
    };

    /* Find the controlling dialog window, if there is one */
    var parentWindow = FotechCore.getAncestor( element, '[data-core-other-dialog]' );

    popup.addEvent('open', function(ev){
        open = true;
        if ( parentWindow && parentWindow.fotechCoreOtherDialog ){
            parentWindow.fotechCoreOtherDialog.cancel();
        }
    });

    popup.addEvent('close', function(ev){
        open = false;
        if ( parentWindow && parentWindow.fotechCoreOtherDialog ){
            parentWindow.fotechCoreOtherDialog.show();
        }
    });

    /* Create an element to use as a control to bring up the dynamic properties */
    var controlButton = new Element( 'img', { src: "/images/dynamic.png", className: 'coreDynamic' });

    element.parentNode.insertBefore( controlButton, element );

    /* Now wire it up */
    controlButton.addEventListener( 'click', function(){
        if ( !ready ){
            /* Build and establish the dialog if not already present ) */
            duplicate();
        }
        popup.open();
        update();
    });
}

/* FotechCore Slider
 * Slider control, replaces a dropdown menu with a visual slider version */

FotechCore.Slider = function( element ){
    if ( element.classList.contains( 'coreSlider' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    element.classList.add('coreSlider');

    var container = new Element('div', { className: 'coreSlider' });

    /* insert it into place (where the select currently is) */
    element.parentNode.insertBefore( container, element );
    container.radio = element;

    /* Vary how our options are to work depending upon the options we have
     * been presented with */

    var options = FotechCore.getAttributes( element, 'data-core-slider-' );

    options['label'] = options['label'] !== undefined ? options['label'] : '';

    /* For a slider, we need several key components, firstly we need a bar
     * which the "knob" runs along */

    var runner = new Element( 'div', { 'className': 'bar'} );

    /* and we need a knob that the user can move along */
    var knob = new Element('div', { 'className': 'knob'} );

    /* Add an element into the knob with a power button on it */
    var power = new Element('div', { 'className': 'fa fa-power-off inner'} );
    knob.appendChild( power );

    /* Somewhere to store ticks */
    var tickContainer = new Element('div', { 'className': 'ticks' });

    /* a nice little panel to show the currently selected value */
    var panel = new Element( 'div', { 'className': 'panel' });

    /* Now add some "ticks" to show position */
    var ticks = [];

    var bbox;
    var divPerSection;
    var controller;

    var addOption = function( text, caption, callback ){
        var tick   = new Element( 'div', { 'className': 'tick' } );
        var marker = new Element( 'div', { 'className': 'marker' } );
        marker.textContent = text;

        ticks.push( {
            tick: tick,
            marker: marker,
            choose: callback,
            text: text,
            caption: caption
        });
        tickContainer.appendChild( tick );
        tickContainer.appendChild( marker );
    };

    var selectItem = function( id, nochange ){
        panel.textContent = options['label'] + ticks[id].caption;
        ticks[ id ].choose();
        knob.style.left = ( id * divPerSection ) + 'px';

        if ( !nochange ){
            element.dispatchEvent( new Event('change') );
        }

        if ( options['onoff'] !== undefined ){
            /* The first option is always "on/off" if we are an on/off
             * style slider */

            if ( id == 0 ){
                container.classList.add('off');
            } else {
                container.classList.remove('off');
            }

            /* If we have a controller, we will need to pass on the clicked
             * events, because, well, because ... (javascript won't fire
             * any event handlers if you change it via javascript */

            if ( controller ){
                /* Create a callback for selecting an indexed item */
                if ( id == 0 ){
                    controller.checked = false;
                } else {
                    controller.checked = true;
                }

                /* click on it */
                controller.dispatchEvent( new Event('click'));
                controller.dispatchEvent( new Event('change'));
            }
        }

        for ( var i = 0; i < ticks.length; ++i ){
            /* reposition the ticks if required */
            ticks[ i ].tick.style.left = ( i * divPerSection ) + 'px';
            ticks[ i ].marker.style.left = ( i * divPerSection ) + 'px';

            /* Check whether we are discriminating with minor and major
             * ticks, which stops us from showing too many */

            var mark = function( mark ){
                [ ticks[i].tick, ticks[i].marker ].forEach( function(el){
                    el.classList.remove( 'major' );
                    el.classList.remove( 'minor' );
                    el.classList.remove( 'none' );

                    el.classList.add( mark );
                } );
            }

            if ( options['major'] === undefined || (( i % options['major']) == 0)){
                /* Turn this into a major tick */
                mark( 'major' );
            } else if ( options['minor'] !== undefined && (( i % options['minor']) == 0 )) {
                /* it's a minor tick */
                mark( 'minor' );
            } else {
                /* Don't show it at all */
                mark( 'none' );
            }
        }
    };

    /* are we styling a "width" option ?  these look slightly different */
    if ( options['width'] !== undefined ){
        container.classList.add('width');
    }

    /* If our options denote that we are to use a tickbox to control ourselves
     * vis a vis whether we are on or off, then we should control that here
     * as well */

    if ( options['onoff'] !== undefined ){
        try{
            container.classList.add('onoff');
            controller = document.getElementById( options['onoff'] );

            if ( controller ){
                addOption( "Off", 'Off', function(){
                });

                /* we should hide the controller */
                var par = FotechCore.getAncestor( controller, 'li' );
                if ( par ){
                    par.style.display = 'none';
                }
            }
        } catch ( e ){
            console.log( "unable to parse correctly", e );
        };
    }

    /* Determine how many knob positions there are */
    var numberOfOptions = element.options.length - 1;

    for ( var i = 0; i <= numberOfOptions; ++i ){
        let y = i + 0;

        addOption( parseInt( element.options[i].text ), element.options[i].text, function(){
            element.selectedIndex = y;
        });
    }

    /* add events to the knob, noticably this is a simple mousedown event which
     * makes the mousemove event fire / capture / do something useful */
    var dragging = false;

    knob.addEventListener('mousedown', function(){
        dragging = true;
    }.bind( this ));

    document.addEventListener('mouseup', function(){
        dragging = false;
    }.bind( this ));

    var setSize = function(){
        bbox = container.getBoundingClientRect();
        var width = bbox.width ? bbox.width : parseInt( window.getComputedStyle( container ).width );
        divPerSection = width / (ticks.length - 1);
    }.bind(this);

    document.addEventListener('mousemove', function(e){
        if ( dragging ){
            setSize();

            var position = Math.min( e.clientX - bbox.left );
            var desiredPosition = Math.max( 0, Math.min( bbox.width, position ));
            var lclunk = Math.floor( desiredPosition / divPerSection );
            var rclunk = Math.ceil( desiredPosition / divPerSection );

            /* Determine which clunk is closest */
            var distanceL = position - ( lclunk * divPerSection);
            var distanceR = ( rclunk * divPerSection ) - position;

            var clunk = distanceL < distanceR ? lclunk : rclunk;

            /* Select The chosen option */
            selectItem( clunk );
        }
    });

    /* add all the elements to the UI (in an appropriate order ) */
    container.appendChild( tickContainer );
    container.appendChild( runner );
    container.appendChild( knob );
    container.appendChild( panel );

    /* now put the dropdown (select) back inside the container */
    container.appendChild( element );

    var refresh = function( nochange ){
        try{
            setSize();
            var id = element.selectedIndex;
            if ( controller ){
                if ( !controller.checked ){
                    id = 0;
                } else {
                    id++;
                }
            }
            selectItem( id, nochange );
        } catch( e ){
            console.log( "Unable to render", e );
        }
    };

    refresh();
    element.addEventListener('change', function(){
        refresh( true );
    });

    window.addEventListener('fotech:form:refresh', refresh );

    /* because we can disable the enabler control, which should */
    /* inherently disable anything that it controls, we need to */
    /* create a mutation observer for it */

    var enablerFunc = function(){
        if ( element.disabled ){
            container.classList.add( 'disabled' );
        } else {
            container.classList.remove( 'disabled' );
        }
    }

    var observer = new MutationObserver(function(mutations) {
        for (var i=0, mutation; mutation = mutations[i]; i++) {
            if (mutation.attributeName == 'disabled') {
                enablerFunc();
            }
        };
    });

    observer.observe( element, {attributes: true});
}

/* FotechCore ResizableGrid
 * Resizable control, takes an element filled with absolutely positioned elements
 * which are selectable via the attribute value and makes those elements proportionally
 * resizable (with appropriate markers) */

FotechCore.ResizableGrid = function( element ){
    if ( element.classList.contains( 'coreResizableGrid' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    element.classList.add('coreResizableGrid');

    var grid = FotechCore.getElementArray( element, element.getAttribute( 'data-core-resizable-grid' ));
    var elementPosition = element.getBoundingClientRect();

    var getMousePosition = function( ev ){
        var top = ev.clientY - elementPosition.top;
        var height = elementPosition.height;

        return Math.min( Math.max( (( top / height ) * 100 ), 0 ), 100 );
    }

    var resize = fotech.throttle( function(){
        FotechCore.dispatchEvent( element, 'resize' );
    }, 50 );

    for ( var i = 0 ; i < grid.length ; ++i ){
        let id = parseInt( i + 0 );

        /* create a handle to deal with moving this element */

        /* We don't need to make the "last" item resizable, as the bottom isn't going to move */
        var handle = new Element( 'div', { className: 'handle' } );
        element.appendChild( handle );
        grid[id].handle = handle;
        if ( i == grid.length -1 ){
            grid[id].handle.style.display = "none";
        }

        grid[id].setPosition = function( height, top ){
            grid[id].style.height = parseInt( height ) + '%';
            grid[id].style.top = parseInt( top ) + '%';
            grid[id].handle.style.top = (parseInt(top) + parseInt(height)) + '%';
        };

        /* set the initial position to the intial position, this will place the handle
         * in the correct location */
        grid[id].setPosition( grid[id].style.height, grid[id].style.top );

        /* Assign a move operator to the handle */
        grid[id].move = function( ev ){
            let position = getMousePosition( ev );
            let nextElement;
            if ( id < (grid.length) ){
                nextElement = grid[ id + 1];
            }

            position = Math.max( position, parseInt( grid[id].style.top ));
            var bottom = 100;
            if ( nextElement ){
                bottom = parseInt( nextElement.style.top ) + parseInt( nextElement.style.height);
                position = Math.min( position, bottom );
            }

            var height = position - parseInt( grid[id].style.top );

            grid[id].setPosition( height, grid[id].style.top );

            if ( nextElement ){
                if ( nextElement.setPosition ){
                    var nextElementTop = position;
                    var nextElementHeight = Math.ceil( bottom - nextElementTop );
                    nextElement.setPosition( nextElementHeight, nextElementTop );
                } else {
                }
            }
            resize();
        };

        grid[id].handle.addEventListener('mousedown', function(){
            document.addEventListener( 'mousemove', grid[id].move );
        })

        document.addEventListener( 'mouseup', function(){
            document.removeEventListener( 'mousemove', grid[id].move );
        })
    }
}

/* FotechCore Tooltip
 * Provides a tooltip over a given element, uses the value of the data-core-tooltip as
 * a means to select an appropriate element (whose contents are cloned) as the contents
 * of the tooltip, or the actual tooltip as literal text
 *
 * */

FotechCore.Tooltip = function( element ){
    if ( element.classList.contains( 'coreTooltip' ) ){
        /* we don't need to enhance things more than once */
        return;
    }
    element.classList.add('coreTooltip');

    /* determine whether this element is something which should have a tooltip, or is the
     * tooltip itself */

    var tooltip = element.getAttribute( 'data-core-tooltip' );

    if ( tooltip ){
        /* This is an element which possesses a tooltip, so we should make the tooltips
         * work accordingly */

        var el  = new Element('span', { className: 'tooltips' });
        element.removeAttribute( 'title' );
        element.appendChild( el );

        /* firstly, we should decide whether this is a CSS selector (which can subsequently
         * select something) and provide the contents of the tooltip, or otherwise */

        var els = [];

        try {
            els = FotechCore.getElementArray( document, tooltip );
        } catch ( e ){
        }

        if ( els.length > 0 ){
            els.forEach( function(e){
                var n = e.cloneNode(true);
                n.removeAttribute('id');
                n.removeAttribute('data-core-tooltip');
                n.classList.remove('coreTooltip');
                n.classList.remove('empty');
                n.classList.add('extra');
                el.appendChild( n )
            });
        } else {
            el.textContent = tooltip;
        }

    } else {
        element.classList.add('empty');
    }
}

/* FotechCore ToolbarAutohide
 * Allows for a menu which automatically hides itself when not active (being hovered over)
 *
 * */

FotechCore.ToolbarAutohide = function( element ){
    if ( element.classList.contains( 'coreToolbarAutohide' ) ){
        /* we don't need to enhance things more than once */
        return;
    }

    /* We want to create a handle for this toolbar */
    var handle = new Element( 'div', { className: 'handle'} );

    var handleBlobs = new Element( 'span', { className: 'fa fa-ellipsis-h'} );
    handle.appendChild( handleBlobs );

    /* and a container, that we can adjust the rendering of */
    var container = new Element( 'div', { className: 'container ' + element.className } );
    element.className = '';

    element.classList.add('coreToolbarAutohide');

    /* The container needs to adopt all of the element's children */
    while ( element.firstChild) {
        container.appendChild( element.firstChild);
    }

    /* The element now needs to contain the handle and the container */
    element.appendChild(handle);
    element.appendChild(container);
}


/* Alarm Generation Tools
 * Used exclusively for the Alarm testing tool, not universably reusable but follows the same
 * design patterns */

FotechCore.Alarm = function( uuid, parameters, panel, deletionCallback ){
    this._uuid = uuid;
    this._replayInterval = null;
    this._parameters = parameters;
    this._panel = panel;
    this._delete = deletionCallback;
    this._createPanel();
}

FotechCore.Alarm.prototype._createPanel = function(){
    if ( this._panel ){
        var parameters = this.parameters();
        /* if we have a panel, we can add ourselves (and our details) to it */
        var container = new Element('div', {'className': 'core coreAlarm' });
        var description = new Element( 'span', { className: 'description'} );

        var icon = new Element( 'img', { className: 'icon', src: "/images/fotech/fibre/event_markers/" + parameters.event_label_id + "_small.png" });
        var label = new Element( 'span', { className: "label"} );

        label.textContent = parameters.event_label_id +
                                        " (" + this.count() +
                                        " every " + ( (this.interval()/1000).toFixed(2)) + "s " +
                                        "from:" + parseInt( parameters['alarm.location'] ) +
                                        " to: " + ( parseInt(parameters['alarm.location'] ) + parseInt( parameters['alarm.range'] )) +
                                        ")";

        description.appendChild( icon );
        description.appendChild( label );

        var controls = new Element( 'div', { className: 'controls '});

        this._button = new Element( 'span',{});

        var play = new Element( 'span', { 'className': 'fa fa-play' });
        var stop = new Element( 'span', { 'className': 'fa fa-stop' });

        this._button.play = new Element('span', { className: 'play'});
        this._button.stop = new Element('span', { className: 'stop'});

        this._button.play.appendChild( play );
        this._button.stop.appendChild( stop );

        this._button.textContent = " ";

        this._button.appendChild( this._button.play );
        this._button.appendChild( this._button.stop );

        controls.appendChild( this._button );

        this._button.addEventListener( 'click', function(){
            if ( this._replayInterval ){
                this.stop();
            } else {
                this.play();
            }
        }.bind(this));

        if ( this._delete ){
            var del = new Element( 'span', { 'className': 'fa fa-times-circle' });
            var deleteButton = new Element('span', { className: 'delete' });
            deleteButton.appendChild( del );
            deleteButton.addEventListener( 'click', function(){
                this.stop();
                container.remove();
                this._delete();
            }.bind(this) );
            controls.appendChild( deleteButton );
        }

        /* put the control into a normal state (stopped) */
        this.stop();

        container.appendChild( description );
        container.appendChild( controls );
        this._panel.appendChild( container );
    }
}

FotechCore.Alarm.prototype.interval = function(){
    return this._parameters['alarm.frequency'] ? this._parameters['alarm.frequency'] * 1000: 1000;
}

FotechCore.Alarm.prototype.count = function(){
    return this._parameters['alarm.count'] ? this._parameters['alarm.count'] : 1;
}

FotechCore.Alarm.prototype.parameters = function(){
    return this._parameters || {};
}

FotechCore.Alarm.prototype.stop = function(){
    clearTimeout( this._replayInterval );
    this._replayInterval = null;
    if ( this._button ){
        this._button.play.style.display = 'inline-block';
        this._button.stop.style.display = 'none';
    }
}

FotechCore.Alarm.prototype.play = function(){
    var interval = this.interval();

    this._sendAlarm( this.parameters() );
    if ( interval > 0 ){
        this._replayInterval = setTimeout( this.play.bind(this), interval );
        if ( this._button ){
            this._button.stop.style.display = 'inline-block';
            this._button.play.style.display = 'none';
        }
    }
    return this._replayInterval;
}

FotechCore.Alarm.prototype._sendAlarm = function( parameters ){
    parameters = {
        "uuid": this._uuid,
        "event_label_id": parameters['event_label_id'],
        "alarm.location": parseFloat( parameters['alarm.location'] ),
        "alarm.magnitude": parameters['alarm.magnitude'],
        "alarm.width": parameters['alarm.width'],
        "alarm.confidence": parameters['alarm.confidence'],
        "alarm.velocity": parameters['alarm.velocity'],
        "alarm.acceleration": parameters['alarm.acceleration'],
        "channel_id": appSettings.getCurrentChannelId(),
        "count": parseInt( parameters['alarm.count'] ),
        "range": parseInt( parameters['alarm.range'] )
    };

    var self = this;

    util.postProperties( '/helios/generate_test_alarm',{
        parameters: {
            properties: parameters
        },
        onFailure: function(){
            setStatusMessage("Failure to submit test alarm.");
        },
        onComplete: function() {
        }
    });
}


FotechCore.AlarmGenerator = function( dialog ){
    this._dialog = dialog;
    this._panel = dialog.querySelectorAll('.details')[0];
    this._form = dialog.form;
    this._generators = {};

    var alarms = FotechCore.preferences.get('alarmGenerator') || {};

    Object.keys( alarms ).forEach( function( alarm ){
        this._generators[ alarm ] = new FotechCore.Alarm( alarm, alarms[alarm], this._panel, function(){
            this.removeAlarm(alarm);
        }.bind(this) );
    }.bind(this));

}

FotechCore.AlarmGenerator.prototype.add = function( parameters ){
    var uuid = fotech.util.uuid();
    /* Store this alarm in our preferences */
    var alarms = FotechCore.preferences.get('alarmGenerator') || {};
    alarms[uuid] = parameters;
    FotechCore.preferences.set( 'alarmGenerator', alarms );

    /* Now generate the actual alarm */
    this._generators[uuid] = new FotechCore.Alarm( uuid, parameters, this._panel, function(){
        this.removeAlarm(uuid);
     }.bind(this) );
    return uuid;
}

FotechCore.AlarmGenerator.prototype.removeAlarm = function( uuid ){
    /* Store this alarm in our preferences */
    var alarms = FotechCore.preferences.get('alarmGenerator') || {};
    alarms[uuid] = null;
    delete alarms[uuid];
    FotechCore.preferences.set( 'alarmGenerator', alarms );
}

/* Notification Panels
 * Used to show notifications of important events and things that have happened */

FotechCore.Notifications = function(){
    /* Create the notifications system, each of the notifications is a div in and
     * of itself, however, the list of them, their management and positioning is
     * controlled centrally */
}

FotechCore.Notifications.prototype.add = function( params ){
    if ( !this.notifications ){
        this.notifications = new Element('div');
        document.body.appendChild( this.notifications );
    }
    
    /* There are two possibilites for replacements, one is that the replacement
     * will be different in some way to this one, where they share the same ID
     * but not the same details, so they should be replaced as if they were a
     * new notification, with the previous one having gone away */

    var others = FotechCore.getElementArray( this.notifications, '[data-core-notification-id="%%id%%"]', { id: params.id });

    /* Check for an identical duplicate, if we have one we should make it live longer */
    var duplicate = null;
    others.forEach( function( notification ){
        if ( notification.identical( params )){
            duplicate = notification;
        }
    });

    if ( duplicate ){
        /* it's a duplicate, but we should extend its lifespan */
        duplicate.timeout();
        return duplicate;
    }

    var newNotification = new FotechCore.Notification( this, params );
    return newNotification;
}

FotechCore.Notifications.prototype.reposition = function(){
    var notifications = FotechCore.getElementArray( this.notifications, '.coreNotification' );

    var bottom = 30;

    for( var i = 0; i < notifications.length ; ++i ){
        notifications[i].style.bottom = bottom + 'px';
        bottom += ( notifications[i].getBoundingClientRect().height + 10 );
    }
}

FotechCore.Notification = function( parent, params ){
    /* The notification contains several key elements */
    this._settings = {
        id: params.id || fotech.util.uuid(),
        severity: params.severity,
        title: params.title,
        message: params.message,
        dismissable: params.dismissable !== undefined ? params.dismissable : true,
        replaceOnly: params.replaceOnly !== undefined ? params.replaceOnly: false,
        duration: params.duration !== undefined ? params.duration * 1000 : 5000
    };

    this.manager = parent;

    /* A mapping from severity level to icon class */
    this._icons = {
        'ok': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle',
        'info': 'info-circle'
    };

    /* Create the panel itself */
    this._panel = new Element( 'div', {
        'data-core-notification-id': this._settings.id,
        'className': 'core coreNotification ' + this._settings.severity
    });

    /* Now add some other parts, to show the message etc */
    this._iconPanel = new Element( 'div', { 'className': 'fa fa-' + params.icon || this._icons[this._settings.severity ] });
    this._icon = new Element( 'div', { 'className': 'icon' });
    this._message = new Element( 'div', { 'className': 'message' });
    this._title = new Element( 'div', { 'className': 'title' });
    this._messageBody = new Element( 'div', { 'className': 'body' });

    this._message.appendChild( this._title );
    this._message.appendChild( this._messageBody );

    this._title.textContent = this._settings.title;
    this._messageBody.textContent = this._settings.message;

    /* do we need a remove button ? */
    if ( this._settings.dismissable ){
        var dismissIcon = new Element('span', { 'className': 'fa fa-times-circle' });
        this._dismiss = new Element( 'div', { 'className': 'dismiss' });
        this._dismiss.appendChild( dismissIcon );
        this._panel.appendChild( this._dismiss );

        this._dismiss.addEventListener( 'click', this.hide.bind(this));
    }

    /* Map functions back to this element */
    this._panel.hide = this.hide.bind(this);
    this._panel.show = this.show.bind(this);
    this._panel.identical = this.identical.bind(this);
    this._panel.timeout = this.timeout.bind(this);

    this._icon.appendChild( this._iconPanel );
    this._panel.appendChild( this._icon );
    this._panel.appendChild( this._message );

    this.show();
}

FotechCore.Notification.prototype.identical = function( params ){
    var uniqueProperties = [ 'id', 'title', 'severity' ];
    var identical = true;
    uniqueProperties.forEach( function( prop ){
        if ( params[ prop ] !== this._settings[prop] ){
            identical = false;
        }
    }.bind(this));

    return identical;
}

FotechCore.Notification.prototype.show = function(){
    /* Show the notification panel */

    /* add it to the screen */

    /* It is possible that we are replacing an existing entry which will share
     * and ID but may have totally different parameters */
    var others = FotechCore.getElementArray( this.manager.notifications, '[data-core-notification-id="%%id%%"]', { id: this._settings.id });

    /* Is this entry replacing another ? */
    var replacing = false;

    if ( others.length > 0 ){
        /* Now remove any others */
        others.forEach( function(el){
            replacing = true;
            el.hide();
        });
    }
    
    /* Just add it as required (if required) */
    if ( !this._settings.replaceOnly || replacing ){
        this.manager.notifications.appendChild( this._panel );
    }

    /* give it some time to appear */
    this._panel.classList.add( 'shown' );

    this.manager.reposition();

    setTimeout( function(){
        this.manager.reposition();
    }.bind(this), 500 );

    /* And set it to disappear at some point in the future */
    this.timeout();
}

FotechCore.Notification.prototype.timeout = function(){
    if ( this._settings.dismissable ){
        clearTimeout( this._removalTimeout );
        this._removalTimeout = setTimeout( this.hide.bind(this), this._settings.duration);
    }
}

FotechCore.Notification.prototype.hide = function(){
    this._panel.classList.remove('shown');
    this._panel.classList.add('hidden');
    setTimeout( function(){
        try {
            this.manager.notifications.removeChild( this._panel );
        } catch (e){
            /* unable to tidy the node up */
        }
        this.manager.reposition();
    }.bind(this), 500 );
}

FotechCore.notifications = new FotechCore.Notifications();

/* Enhancement functions .. This enhances the controls */


FotechCore.enhance = function( element ){
    element = element ? element : document;

    /* Primitive enhancements - use to discover the LI block that various controls
     * reside within and allow them to be used accoridngly */

    element.querySelectorAll(".core ul li").forEach( function(coreUIElement){
        return FotechCore.UI( coreUIElement );
    });

    var coreEnhance = function( selector, enhancement ){
        var enhance = function( el ){
            el.baseContainer = element;
            return enhancement( el );
        };

        if ( element != document && FotechCore.selectorMatches( element, selector ) ){
            enhance( element );
            return;
        }
        element.querySelectorAll( selector ).forEach( enhance );
    };

    /* Enable / disable control sections - Where a checkbox or similar controls whether various
     * fields are enabled or not */

    /* Dynamic form fields and fieldsets */
    coreEnhance( '[data-core-dynamic]', FotechCore.Dynamic );

    /* Fotech fields tend to be . seperated, for reasons they are _ in HTML */
    coreEnhance( '[data-core-feature]', FotechCore.Feature );

    /* Advanced element hiders .. Hide advanced controls */
    coreEnhance( '[data-core-advanced]', FotechCore.Advanced );

    /* Select boxes - a nusience since they can't be styled easily */
    coreEnhance( '[data-core-dropdown]', FotechCore.DropDown );

    /* Chooser controls */
    coreEnhance( '[data-core-chooser]', FotechCore.Chooser );

    /* Checkboxes */
    coreEnhance( '[data-core-checkbox]', FotechCore.Checkbox );

    /* Sliders */
    coreEnhance( '[data-core-slider]', FotechCore.Slider );

    /* Enable / Disable controls */
    coreEnhance( '[data-core-enable]', FotechCore.Enable );

    /* Resizable controls */
    coreEnhance( '[data-core-resizable-grid]', FotechCore.ResizableGrid );

    /* Tooltips */
    coreEnhance( '[data-core-tooltip]', FotechCore.Tooltip );

    /* ToolbarAutohide */
    coreEnhance( '[data-core-toolbar-autohide]', FotechCore.ToolbarAutohide );

}

/* Taken from David Walsh's blog */
FotechCore.selectorMatches = function(el, selector) {
	var p = Element.prototype;
	var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function(s) {
		return [].indexOf.call(document.querySelectorAll(s), this) !== -1;
	};
	return f.call(el, selector);
}

FotechCore.DOMReady( function(){
    try {
        FotechCore.enhance();
    } catch ( e ){
        console.log( "Unable to enhance - ", e );
    }
});

/* Polyfils for bits missing from some browsers */
/*! https://mths.be/cssescape v1.5.1 by @mathias | MIT license */
;(function(root, factory) {
	// https://github.com/umdjs/umd/blob/master/returnExports.js
	if (typeof exports == 'object') {
		// For Node.js.
		module.exports = factory(root);
	} else if (typeof define == 'function' && define.amd) {
		// For AMD. Register as an anonymous module.
		define([], factory.bind(root, root));
	} else {
		// For browser globals (not exposing the function separately).
		factory(root);
	}
}(typeof global != 'undefined' ? global : this, function(root) {

	if (root.CSS && root.CSS.escape) {
		return root.CSS.escape;
	}

	// https://drafts.csswg.org/cssom/#serialize-an-identifier
	var cssEscape = function(value) {
		if (arguments.length == 0) {
			throw new TypeError('`CSS.escape` requires an argument.');
		}
		var string = String(value);
		var length = string.length;
		var index = -1;
		var codeUnit;
		var result = '';
		var firstCodeUnit = string.charCodeAt(0);
		while (++index < length) {
			codeUnit = string.charCodeAt(index);
			// Note: there’s no need to special-case astral symbols, surrogate
			// pairs, or lone surrogates.

			// If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
			// (U+FFFD).
			if (codeUnit == 0x0000) {
				result += '\uFFFD';
				continue;
			}

			if (
				// If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
				// U+007F, […]
				(codeUnit >= 0x0001 && codeUnit <= 0x001F) || codeUnit == 0x007F ||
				// If the character is the first character and is in the range [0-9]
				// (U+0030 to U+0039), […]
				(index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
				// If the character is the second character and is in the range [0-9]
				// (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
				(
					index == 1 &&
					codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
					firstCodeUnit == 0x002D
				)
			) {
				// https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
				result += '\\' + codeUnit.toString(16) + ' ';
				continue;
			}

			if (
				// If the character is the first character and is a `-` (U+002D), and
				// there is no second character, […]
				index == 0 &&
				length == 1 &&
				codeUnit == 0x002D
			) {
				result += '\\' + string.charAt(index);
				continue;
			}

			// If the character is not handled by one of the above rules and is
			// greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
			// is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
			// U+005A), or [a-z] (U+0061 to U+007A), […]
			if (
				codeUnit >= 0x0080 ||
				codeUnit == 0x002D ||
				codeUnit == 0x005F ||
				codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
				codeUnit >= 0x0041 && codeUnit <= 0x005A ||
				codeUnit >= 0x0061 && codeUnit <= 0x007A
			) {
				// the character itself
				result += string.charAt(index);
				continue;
			}

			// Otherwise, the escaped character.
			// https://drafts.csswg.org/cssom/#escape-a-character
			result += '\\' + string.charAt(index);

		}
		return result;
	};

	if (!root.CSS) {
		root.CSS = {};
	}

	root.CSS.escape = cssEscape;
	return cssEscape;

}));

/*! (C) Andrea Giammarchi - Mit Style License */
var URLSearchParams=URLSearchParams||function(){"use strict";function URLSearchParams(query){var index,key,value,pairs,i,length,dict=Object.create(null);this[secret]=dict;if(!query)return;if(typeof query==="string"){if(query.charAt(0)==="?"){query=query.slice(1)}for(pairs=query.split("&"),i=0,length=pairs.length;i<length;i++){value=pairs[i];index=value.indexOf("=");if(-1<index){appendTo(dict,decode(value.slice(0,index)),decode(value.slice(index+1)))}else if(value.length){appendTo(dict,decode(value),"")}}}else{if(isArray(query)){for(i=0,length=query.length;i<length;i++){value=query[i];appendTo(dict,value[0],value[1])}}else if(query.forEach){query.forEach(addEach,dict)}else{for(key in query){appendTo(dict,key,query[key])}}}}var isArray=Array.isArray,URLSearchParamsProto=URLSearchParams.prototype,find=/[!'\(\)~]|%20|%00/g,plus=/\+/g,replace={"!":"%21","'":"%27","(":"%28",")":"%29","~":"%7E","%20":"+","%00":"\0"},replacer=function(match){return replace[match]},secret="__URLSearchParams__:"+Math.random();function addEach(value,key){appendTo(this,key,value)}function appendTo(dict,name,value){var res=isArray(value)?value.join(","):value;if(name in dict)dict[name].push(res);else dict[name]=[res]}function decode(str){return decodeURIComponent(str.replace(plus," "))}function encode(str){return encodeURIComponent(str).replace(find,replacer)}URLSearchParamsProto.append=function append(name,value){appendTo(this[secret],name,value)};URLSearchParamsProto["delete"]=function del(name){delete this[secret][name]};URLSearchParamsProto.get=function get(name){var dict=this[secret];return name in dict?dict[name][0]:null};URLSearchParamsProto.getAll=function getAll(name){var dict=this[secret];return name in dict?dict[name].slice(0):[]};URLSearchParamsProto.has=function has(name){return name in this[secret]};URLSearchParamsProto.set=function set(name,value){this[secret][name]=[""+value]};URLSearchParamsProto.forEach=function forEach(callback,thisArg){var dict=this[secret];Object.getOwnPropertyNames(dict).forEach(function(name){dict[name].forEach(function(value){callback.call(thisArg,value,name,this)},this)},this)};URLSearchParamsProto.toJSON=function toJSON(){return{}};URLSearchParamsProto.toString=function toString(){var dict=this[secret],query=[],i,key,name,value;for(key in dict){name=encode(key);for(i=0,value=dict[key];i<value.length;i++){query.push(name+"="+encode(value[i]))}}return query.join("&")};var dP=Object.defineProperty,gOPD=Object.getOwnPropertyDescriptor,createSearchParamsPollute=function(search){function append(name,value){URLSearchParamsProto.append.call(this,name,value);name=this.toString();search.set.call(this._usp,name?"?"+name:"")}function del(name){URLSearchParamsProto["delete"].call(this,name);name=this.toString();search.set.call(this._usp,name?"?"+name:"")}function set(name,value){URLSearchParamsProto.set.call(this,name,value);name=this.toString();search.set.call(this._usp,name?"?"+name:"")}return function(sp,value){sp.append=append;sp["delete"]=del;sp.set=set;return dP(sp,"_usp",{configurable:true,writable:true,value:value})}},createSearchParamsCreate=function(polluteSearchParams){return function(obj,sp){dP(obj,"_searchParams",{configurable:true,writable:true,value:polluteSearchParams(sp,obj)});return sp}},updateSearchParams=function(sp){var append=sp.append;sp.append=URLSearchParamsProto.append;URLSearchParams.call(sp,sp._usp.search.slice(1));sp.append=append},verifySearchParams=function(obj,Class){if(!(obj instanceof Class))throw new TypeError("'searchParams' accessed on an object that "+"does not implement interface "+Class.name)},upgradeClass=function(Class){var ClassProto=Class.prototype,searchParams=gOPD(ClassProto,"searchParams"),href=gOPD(ClassProto,"href"),search=gOPD(ClassProto,"search"),createSearchParams;if(!searchParams&&search&&search.set){createSearchParams=createSearchParamsCreate(createSearchParamsPollute(search));Object.defineProperties(ClassProto,{href:{get:function(){return href.get.call(this)},set:function(value){var sp=this._searchParams;href.set.call(this,value);if(sp)updateSearchParams(sp)}},search:{get:function(){return search.get.call(this)},set:function(value){var sp=this._searchParams;search.set.call(this,value);if(sp)updateSearchParams(sp)}},searchParams:{get:function(){verifySearchParams(this,Class);return this._searchParams||createSearchParams(this,new URLSearchParams(this.search.slice(1)))},set:function(sp){verifySearchParams(this,Class);createSearchParams(this,sp)}}})}};upgradeClass(HTMLAnchorElement);if(/^function|object$/.test(typeof URL)&&URL.prototype)upgradeClass(URL);return URLSearchParams}();(function(URLSearchParamsProto){var iterable=function(){try{return!!Symbol.iterator}catch(error){return false}}();if(!("forEach"in URLSearchParamsProto)){URLSearchParamsProto.forEach=function forEach(callback,thisArg){var names=Object.create(null);this.toString().replace(/=[\s\S]*?(?:&|$)/g,"=").split("=").forEach(function(name){if(!name.length||name in names)return;(names[name]=this.getAll(name)).forEach(function(value){callback.call(thisArg,value,name,this)},this)},this)}}if(!("keys"in URLSearchParamsProto)){URLSearchParamsProto.keys=function keys(){var items=[];this.forEach(function(value,name){items.push(name)});var iterator={next:function(){var value=items.shift();return{done:value===undefined,value:value}}};if(iterable){iterator[Symbol.iterator]=function(){return iterator}}return iterator}}if(!("values"in URLSearchParamsProto)){URLSearchParamsProto.values=function values(){var items=[];this.forEach(function(value){items.push(value)});var iterator={next:function(){var value=items.shift();return{done:value===undefined,value:value}}};if(iterable){iterator[Symbol.iterator]=function(){return iterator}}return iterator}}if(!("entries"in URLSearchParamsProto)){URLSearchParamsProto.entries=function entries(){var items=[];this.forEach(function(value,name){items.push([name,value])});var iterator={next:function(){var value=items.shift();return{done:value===undefined,value:value}}};if(iterable){iterator[Symbol.iterator]=function(){return iterator}}return iterator}}if(iterable&&!(Symbol.iterator in URLSearchParamsProto)){URLSearchParamsProto[Symbol.iterator]=URLSearchParamsProto.entries}if(!("sort"in URLSearchParamsProto)){URLSearchParamsProto.sort=function sort(){var entries=this.entries(),entry=entries.next(),done=entry.done,keys=[],values=Object.create(null),i,key,value;while(!done){value=entry.value;key=value[0];keys.push(key);if(!(key in values)){values[key]=[]}values[key].push(value[1]);entry=entries.next();done=entry.done}keys.sort();for(i=0;i<keys.length;i++){this["delete"](keys[i])}for(i=0;i<keys.length;i++){key=keys[i];this.append(key,values[key].shift())}}}})(URLSearchParams.prototype);
