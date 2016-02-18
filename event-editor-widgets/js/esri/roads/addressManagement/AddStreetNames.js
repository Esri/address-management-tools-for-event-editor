/*
 Copyright 2016 Esri

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
define([
"dojo/_base/array", 
"dojo/_base/connect", 
"dojo/_base/declare", 
"dojo/_base/Deferred",
"dojo/keys", 
"dojo/_base/lang",
"dojo/_base/window", 
"dojo/data/ItemFileWriteStore", 
"dojo/date/locale", 
"dojo/DeferredList", 
"dojo/dom-attr", 
"dojo/dom-construct", 
"dojo/string", 
"dojox/grid/DataGrid", 
"dojox/grid/cells/dijit",
 "dojox/widget/Standby", 
 "dijit/MenuItem", 
 "dijit/form/Button", 
 "dijit/form/CheckBox", 
 "dijit/form/DateTextBox", 
 "dijit/form/Select", 
 "dijit/form/FilteringSelect", 
 "dijit/form/ValidationTextBox", 
 "dijit/layout/ContentPane", 
 "dijit/layout/TabContainer", 
 "dijit/registry",
 "esri/request", 
 "esri/tasks/query", 
 "esri/tasks/QueryTask",  
 "esri/layers/FeatureLayer",
 "roads/addressManagement/util/mathUtil", 
  "roads/dijit/layout/TransitionStackContainer", 
 "roads/dijit/form/Dialog", 
 "roads/dijit/dijit", 
 "roads/maputils", 
 "roads/util/date", 
 "roads/util/method",  
 "roads/addressManagement/StreetNameValidationTextBox",
 "roads/addressManagement/tasks/AddressManagementTask",
 "roads/utils", 
 "roads/addressManagement/SelectBlockRangeInfoWindow", 
 "dojo/text!./templates/AddStreetNames.html", 
 "dojo/i18n!./nls/res_common", 
 "dojo/i18n!./nls/res_AddStreetNames"], 
 function(array, connect, declare, Deferred, keys, lang, win, ItemFileWriteStore, dateLocale, DeferredList, domAttr, 
 domConstruct, string, DataGrid, gridCells, Standby, MenuItem, Button, CheckBox, DateTextBox, Select, FilteringSelect, 
 ValidationTextBox, ContentPane, TabContainer, registry, esriRequest, Query, QueryTask, FeatureLayer, mathUtil, TransitionStackContainer, Dialog,
 dijitUtils, maputils, dateUtils, methodUtils, StreetNameValidationTextBox, AddressManagementTask, utils, 
 SelectBlockRangeInfoWindow, template, bundle1, bundle2){
    var bundle = utils.deepMixin({}, bundle1, bundle2);
    
    // alias
    var MeasureReferenceTypes = methodUtils.MeasureReferenceTypes;
    
    var AddStreetNames = declare("roads.addressManagement.AddStreetNames", [dijitUtils._BaseWidget], {
    
        templateString: template,
        
        // UI defaults
        widgetPlacement: dijitUtils.FLOAT,
        
        
        preferredWidth: 300,  
        preferredHeight: 320,
        
        // Instance variables
        _config: null,
        _addressConfig: null,
        _mapManager: null,
        _selectionManager: null,
        _selectedNetworkLayer: null,
        _mapTolerance: null,
        _grids: null,
        _mapClickPoint: null,
        _currentEventId: null,
        _keyHandler: null,
        _selectedEvent: null,
        _newEvent:null,
        _addressTask: null,
        _offsetFeatureSet: null,
        _routeFeatureSet: null,
        _flipParity: false,
        _watchHandles: null,
        _fromIntersection: null,
        _toIntersection: null,
        _prevStartDate: null,
        _prevEndDate: null,
        _routeStartEndDate: null,
        _fullStreetName: null,
        _masterStreetNameTable: null,
        _dialog:null,
        _streetNameLength:null,
        _attributeStandby:null,
        
        _addressManagementTask:null,
        
        arrowHeadSymbol: null,
        lineSymbol: null,
        routeId: null,
        
        constructor: function(params){
            this._config = params.config;
            this._addressConfig = params.addressConfig;
            this._mapManager = params.mapManager;
            this._masterStreetNameTable = params.masterStreetNameTable;
            this._selectionManager = params.mapManager.selectionManager;
            this._dialog = new Dialog({ style: "width: 300px;" });
            this._dialog.startup();
            this._watchHandles = [];
        },
        
        postMixInProperties: function(){
            this.inherited(arguments);
            this.bundle = utils.deepMixin({}, this.bundle, bundle);
            this.title = bundle.title;
        },
        
        postCreate: function(){
            this.inherited(arguments);
            
            this._standby = new Standby({
                target: this.get("id")
            }, domConstruct.create("div", null, win.body()));
            this._standby.startup();
            
            this._attributeStandby = new Standby({
                target: this._attributeGroupTabs.get("id"),
                centerIndicator: "text"
            }, domConstruct.create("div", null, win.body()));
            this._attributeStandby.startup();
            this._attributeStandby.set("color", "#dedede");
            this._attributeStandby.set("text",bundle.enterValidStreetName);
            this._attributeStandby.show();
            
            this._addressManagementTask = new AddressManagementTask({
                mapManager: this._mapManager
            });
            
            this._loadNetworkLayers();
            this._loadEventLayers(this._addressConfig.blockRangeLayer.layerName);
            
            this._fullStreetName = this._addressConfig.masterStreetNameTable.fullStreetNameField;
            this._initAttributeGrid();
           
            this._streetNameInput.set("config",{
              mapManager: this._mapManager,
              fullStreetName: this._fullStreetName,
              layerId: this._masterStreetNameTable.id,
              isNew: true
            });
            
            this._watchHandles.push(this._streetNameInput.watch("value", lang.hitch(this, function(){
                var currentState = this._streetNameInput.get("state");
                //Validation textbox  "" =Normal
                if (currentState == "") {
                   if( this._attributeStandby)
                   {
                      this._attributeStandby.hide();
                   }
                } else {
                    this._attributeStandby.show();
                }
            })));
            
            this._watchHandles.push(this._streetNameInput.watch("state", lang.hitch(this, function(){
                var currentState = this._streetNameInput.get("state");
                //Validation textbox  "" =Normal
                if (currentState == "") {
                   if( this._attributeStandby)
                   {
                      this._attributeStandby.hide();
                   }
                } else {
                    this._attributeStandby.show();
                }
            })));
            
            this._streetNameInput.focus();
        },
        
        _loadNetworkLayers: function(){
            var networkLayers = this._mapManager.lrsServiceConfig.networkLayers;
            if (networkLayers.length > 0) {
                this._selectedNetworkLayer = networkLayers[0];
               
            }
        },
        
        _loadEventLayers: function(eventLayerName){
            var eventLayerMetadata = this._mapManager.lrsServiceConfig.eventLayers;
            
            if (eventLayerMetadata.length > 0) {
                this._selectedEventLayer = array.filter(eventLayerMetadata, function(lyr){
                     return (lyr.name == eventLayerName);
                }, this)[0];
            }
        },
        
         onClose:function(){
          var message = bundle.cancelWarning;
          return !this._checkUnsavedChanges() || confirm(message);
        },
       
        destroy: function(){
            this._selectionManager.unregisterTool(this._selectRouteButton);
            this._streetNameInput.reset();
           // connect.disconnect(this._keyHandler);
          //  this._keyHandler = null;
            array.forEach(this._watchHandles, function(handle){
                handle.unwatch();
            }, this);
            this._watchHandles = null;
            if (this._attributeStandby) {
              this._attributeStandby.destroy();
              this._attributeStandby= null;
            }
            if (this._standby) {
                this._standby.destroy();
                this._standby = null;
            }
            this.inherited(arguments);
        },
       
        _populateDefaultAttributes: function(){
            // Populate default field values in the grid
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        var defaultValue;
                        if (this._masterStreetNameTable.templates && this._masterStreetNameTable.templates.length>0) {
                          defaultValue = this._masterStreetNameTable.templates[0].prototype.attributes[itemInfo.field.name];
                        }else{
                          defaultValue = null;
                        }
                        itemInfo.field.value = null;
                        grid.store.setValue(item, "fieldValue", defaultValue);
                    })
                });
            }, this);
            
            // Refresh the grids
            array.forEach(this._grids, function(g){
                g.update();
            }, this);
        },
        
    
        _initAttributeGrid: function(){
            // remove existing tabs
            if (this._attributeGroupTabs.hasChildren()) {
                this._attributeGroupTabs.destroyDescendants(false);
            }
            
            var itemIndex = 1;
            this._grids = [];
            this._editItemInfo = {};
            this._includeLayers = {};
            
            var groupDataItems = [];
            var lastLayerId = -1;
           
            array.forEach(this._masterStreetNameTable.fields, function(field){
                // Filter out fields that have special handling or are not editable
                var unsupportedDataTypes = ["esriFieldTypeGeometry", "esriFieldTypeBlob", "esriFieldTypeRaster", "esriFieldTypeXML", "esriFieldTypeOID"];
                var editorTrackingFields = ["LASTUPDATE","LASTEDITOR"];
                var displayFieldName = this._fullStreetName;
                var fieldInfo;
                if (
                (array.indexOf(unsupportedDataTypes, field.type) == -1) &&
                (array.indexOf(editorTrackingFields, field.name) == -1)) {
                  if(displayFieldName.toUpperCase()== field.name.toUpperCase()){
                    this._streetNameLength = field.length;
                    this._streetNameInput.set("maxLength", this._streetNameLength);
                    return  true;
                  }
                   fieldInfo = field;
                    
                    var item = {
                        id: "" + itemIndex,
                        fieldAlias: fieldInfo.alias || "",
                        fieldValue: ""
                    };
                    groupDataItems.push(item);
                    this._editItemInfo[item.id] = {
                        // Extra properties that shouldn't be stored directly in the data store item
                        layer: this._masterStreetNameTable,
                        field: fieldInfo
                    };
                    itemIndex++;
                }
                
            }, this);
            
            var store = new ItemFileWriteStore({
                data: {
                    items: groupDataItems
                }
            });
            var layout = [{
                name: bundle.attributeColumn,
                field: "fieldAlias",
                 width:"50%"
            }, {
                name: bundle.valueColumn,
                field: "fieldValue",
                editable: true,
                type: _FieldEditor,
                parent: this,
                 width:"50%",
                formatter: lang.hitch(this, "_formatFieldValue")
            }];
            var grid = new DataGrid({
                store: store,
                structure: layout,
                selectionMode: "none",
                singleClickEdit: true,
                columnReordering: false,
                canSort: function(col){
                    return false;
                },
                width:"100%"
            }, domConstruct.create("div"));
            this._grids.push(grid);
            
            // Workaround for a scrolling bug when coded value domains contain long text descriptions
            // Set timeout so that edit values don't get duplicated into the next row
            connect.connect(grid, "onApplyCellEdit", grid, function(){
                setTimeout(function(){
                    grid.update();
                }, 10);
            });
            connect.connect(grid, "onCancelEdit", grid, function(){
                setTimeout(function(){
                    grid.update();
                }, 10);
            });
            
            var tabContent = new ContentPane({
                content: grid,
                style: "padding:0; margin:0;"
            });
            this._attributeGroupTabs.setContent(grid);
            this._populateDefaultAttributes();
            
            
        },
        
        _populateFields: function(feature){
        
            this._selectedEvent = feature;
            this._currentEventId = feature.attributes["OBJECTID"];
            this._zoomBlockButton.setBlockFeature(feature);
            var lastPoint, prevPoint;
            var map = this._mapManager.map;
            
            this._routeInput.set("value", feature.attributes[this._selectedEventLayer.routeIdFieldName]);
            this._flipParity = false;
            if (feature.geometry.type == "polyline") {
                this._addBlockRangeGraphic(feature, true);
            }
            
            this._useRouteStartDate.set("checked", true);
            this._useRouteEndDate.set("checked", true);
            this._setRouteStartEndDate(feature.attributes);
            
            this._blockRangeIdInput.set("value", feature.attributes[this._selectedEventLayer.eventIdFieldName]);
            this._populateAttributeValues(feature.attributes);
            this._standby.hide();
        },
        
        
     
        
         isEmpty:function(obj){
             for (var prop in obj) {
                 if (obj.hasOwnProperty(prop)) 
                     return false;
             }
             return true;
        },
        
        _formatFieldValue: function(value, rowIndex, cell){
            var label = value;
            var itemId = cell.grid.store.getValue(cell.grid.getItem(rowIndex), "id");
            var itemInfo = this._editItemInfo[itemId];
            // destroying tab container's child seems to trigger the formatter so we need to check null
            var field = itemInfo ? itemInfo.field : null;
            if (!field) {
                return label;
            }
            
            if (!this._validateFieldValue(value, field)) {
                cell.customStyles[0] = "background-color: " + this._config.eventAttributes.errorCellColor;
            }
            
            if (this._wasValueEdited(value, itemInfo)) {
                cell.customStyles[0] = 'background-color: ' + this._config.eventAttributes.editedCellColor;
                
            }
            
            if (value === undefined || value === null) {
                label = "";
            }
            else 
                if (field.domain && field.domain.type == "codedValue") {
                    label = "";
                    array.forEach(field.domain.codedValues, function(codedValue){
                        if (codedValue.code == value) {
                            label = codedValue.name;
                        }
                    }, this);
                }
                else 
                    if (field.type == "esriFieldTypeDate") {
                        if (value !== "" && !isNaN(value)) {
                            label = dateLocale.format(new Date(Number(value)), {
                                selector: "date",
                                datePattern: bundle.DatePattern
                            });
                        }
                        else {
                            label = "";
                        }
                    }
                    else 
                        if (!lang.isString(value)) {
                            if (value !== "" && !isNaN(value)) {
                                label = String(value);
                            }
                            else {
                                label = "";
                            }
                        }
            return label || "&nbsp;";
        },
        
       
       _wasValueEdited: function(value, itemInfo) {
          var edited = false;
          var field = itemInfo.field;
          var original = field.value;
          if (value!== value || value == undefined || value == "" || value == bundle.NullValue) {
            value = null;
          }
          if (original!== original || original == undefined || original == "") {
            original = null;
          }
          if (field.type === "esriFieldTypeDate") {
            var newDate = new Date(Number(value));
            var oldDate = new Date(Number(original));
            if (newDate.toDateString() != oldDate.toDateString()) {
              edited = true;
            }
          } else {
            if (value != original) {
              edited = true;
            }
          }
          
          return edited;
        },
        
        
        _getFieldObj: function(layer, fieldName){
            var field = null;
            if (layer.fields.length > 0) {
                array.forEach(layer.fields, function(f){
                    if (f.name == fieldName) {
                        field = f;
                        return;
                    }
                });
            }
            return field;
            
        },
        
        _getCodedValue: function(field, value){
            var code;
            if (field) {
                if (field.domain) {
                    array.some(field.domain.codedValues, function(codedValue){
                        if (value.indexOf(codedValue.name) > 0) {
                            code = codedValue.code;
                            return true;
                        }
                        return false;
                    }, this);
                }
            }
            return code;
        },
        
        _saveEdits: function(){
            // Accumulate the attribute values for any new events on included event layers
            var invalidNumericRouteId = false;
            var invalidFieldValue = false;
            var layerEdits = [];
            var eventRecords = [];
            
            var layerEditsMap = {};
            var eventLayer;
           
            var eventAttributes = {};
            // Optional attributes to define a temporality range for this event
            var masterStreetNameInfo = this._mapManager.addressInfo.masterStreetNameInfo,
                urlAndParams = this._addressManagementTask.getFeatureServerUrlAndUrlParams(masterStreetNameInfo.serviceLayer.url),
                url = urlAndParams.url + this._masterStreetNameTable.id + urlAndParams.params;
            
            eventLayer = new FeatureLayer(url);
           
            var streetName = this._streetNameInput.get("value");
            if (streetName == null || streetName.length == 0 || streetName ==" ") {
                this.showMessage(bundle.error.invalidStreetName);
                return;
            }
            eventAttributes[this._fullStreetName] = streetName;
            
            eventRecords.push({
                attributes: eventAttributes
            });
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        
                        
                        var fieldInfo = itemInfo.field;
                        
                        
                        
                        // Process the attribute value
                        var val = grid.store.getValue(item, "fieldValue");
                        
                        if (!this._validateFieldValue(val, fieldInfo)) {
                            invalidFieldValue = true;
                            return;
                        }
                        if (val === undefined || val === "") {
                            val = null;
                        }
                        
                        
                        
                        var fieldType = fieldInfo.type;
                        if (val !== null) {
                            if (fieldType == "esriFieldTypeInteger" || fieldType == "esriFieldTypeSmallInteger" || fieldType == "esriFieldTypeOID") {
                                val = Number(val);
                                val = isNaN(val) ? null : val;
                            }
                            else 
                                if (fieldType == "esriFieldTypeDouble" || fieldType == "esriFieldTypeSingle") {
                                    val = Number(val);
                                    val = isNaN(val) ? null : val;
                                }
                                else 
                                    if (fieldType == "esriFieldTypeDate") {
                                        val = Number(val);
                                        val = isNaN(val) ? null : val;
                                    // TODO: shift the time to the timezone of the event layer, rather than UTC (eventLayer.timeZoneOffset)
                                    }
                        }
                        
                        // If no event ID was entered by the user, then keep any auto-generated UUID
                        if (fieldInfo.name === eventLayer.eventIdFieldName && val === null) {
                            return;
                        }
                        
                        // Apply the attribute value to all matching event records
                        array.forEach(eventRecords, function(eventRec){
                            eventRec.attributes[fieldInfo.name] = val;
                        }, this);
                    })
                });
            }, this);
            
            
            if (invalidFieldValue) {
                this._standby.hide();
                this.showMessage(bundle.error.correctErrors);
                return;
            }
             this._standby.show();
            // Save the edits to the server
            utils.setIoTimeout(600);
            eventLayer.applyEdits(eventRecords, null, null).then(lang.hitch(this, function(){
                utils.restoreIoTimeout();
                this._standby.hide();
                // Clear map markers and highlights
                this._selectionManager.remove(this);
                // Refresh the map
                this._mapManager.lrsMapLayer.refresh();
                this._streetNameInput.set("isNew", true);
                // Update the UI
                this._onSaveComplete();
            }), lang.hitch(this, function(err){
                // Save failed
                utils.restoreIoTimeout();
                var msg = err.message || err;
                array.forEach(err.details, function(detail){
                    msg += "\n\n" + detail;
                }, this);
                console.log("Error while applying Master Streetname Table edits. ", msg);
                this._standby.hide();
                this.showMessage(string.substitute(bundle.error.saveError, [msg]));
            }));
        },
        
        _cancelEdits: function(){
          if (this._checkUnsavedChanges()) {
            this._dialog.showConfirm(bundle.title, bundle.cancelWarning, lang.hitch(this, function(toContinue){
              if (toContinue) {
                this.closeWidget();
                
              }
            }));
          } else{
            this.closeWidget();
          }
        },
        
        
         /*
         * Check for unsaved changes
         */
         _checkUnsavedChanges:function(){
             var unsavedChanges = false;
             var streetName = this._streetNameInput.get("value");
             if(streetName!=null && streetName.trim()!=""& streetName.length>0){
               unsavedChanges = true;
             }
             return unsavedChanges;
         },
        
        _onSaveComplete: function(){
            this._streetNameInput.set("value","");
            this._streetNameInput.reset();
            this._populateDefaultAttributes();
        },
        
        
        /*
         * Validates a data value based on field properties.
         */
        _validateFieldValue: function(value, field){
            var isValid = true;
            if (field) {
                var isNullValue = (value === undefined || value === null || value === "" || (!lang.isString(value) && isNaN(value)));
                if (isNullValue) {
                    isValid = field.nullable;
                }
                else 
                    if (field.type == "esriFieldTypeString") {
                        if (field.length > 0 && value && value.length > field.length) {
                            isValid = false;
                        }
                    }
                    else {
                        switch (field.type) {
                            case "esriFieldTypeInteger":
                            case "esriFieldTypeSmallInteger":
                            case "esriFieldTypeOID":
                                isValid = utils.integerRegExp.test(value);
                                break;
                            case "esriFieldTypeDouble":
                            case "esriFieldTypeSingle":
                                isValid = utils.numberRegExp.test(value);
                                break;
                        }
                    }
            }
            return isValid;
        },
        
        _populateDefaultAttributeValues: function(){
            // Populate default field values in the grid
            this._standby.show();
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        var defaultValue = itemInfo.field.defaultValue;
                        grid.store.setValue(item, "fieldValue", defaultValue);
                    })
                });
            }, this);
            this._standby.hide();
            // Refresh the grids
            array.forEach(this._grids, function(g){
                g.update();
            }, this);
        },
        _populateAttributeValues: function(attributes){
            this._standby.show();
            // Populate default field values in the grid
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        var newValue = this._formatNewAttrValue(attributes, itemInfo.field);
                        itemInfo.field.value = newValue;
                        grid.store.setValue(item, "fieldValue", newValue);
                    })
                });
            }, this);
            this._standby.hide();
            // Refresh the grids
            array.forEach(this._grids, function(g){
                g.update();
            }, this);
            
            
        },
        
        _populateAttribute: function(fieldName, value){
            // Populate default field values in the grid
            this._standby.show();
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        if (itemInfo.field.name == fieldName) 
                            grid.store.setValue(item, "fieldValue", value);
                    })
                });
            }, this);
            this._standby.hide();
            // Refresh the grids
            array.forEach(this._grids, function(g){
                g.update();
            }, this);
            
        },
        
        
        /*
         * Takes attributes from a graphic and a field object.
         * Returns the value for the field in the provided attribute set.
         * If the field is not nullable, returns a blank string.
         * If the field has a domain, returns the coded value.
         */
        _formatNewAttrValue: function(attrs, field){
            if (attrs == null || attrs[field.name] == null) {
                if (field.nullable) {
                    return null;
                }
                else {
                    return "";
                }
            }
            else {
                var value = attrs[field.name];
                if (value == "Null") {
                    value = null;
                }
                else 
                    if (field.domain) {
                        array.some(field.domain.codedValues, function(codedValue){
                            if (value == codedValue.name) {
                                value = codedValue.code;
                                return true;
                            }
                            return false;
                        }, this);
                    }
                return value;
            }
        }
    });
    /*
     * A multiplexing cell editor that handles numbers, dates, coded value domains, and regular text input types.
     */
    var _FieldEditor = declare("roads.addressManagement.AddStreetNamesUtil._FieldEditor", [dojox.grid.cells._Widget], {
    
        MODE_TEXT: "text",
        MODE_NUMBER: "number",
        MODE_INTEGER: "integer",
        MODE_DATE: "date",
        MODE_DOMAIN: "domain",
        MODE_SELECT: "select",
        
        _NULL_VALUE: "[[_null_]]", // just an arbitrary string that is unlikely to ever be a code within a coded value domain
        _mode: null,
        _extraWidgetProps: null,
        
        constructor: function(cellProps){
            this._mode = this.MODE_TEXT;
        },
        
        getValue: function(rowIndex){
            var value = this.inherited(arguments);
            if (this._mode == this.MODE_DATE) {
                // convert a Date to Number of millis
                value = value ? Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), value.getUTCHours()) : null;
            }
            else 
                if (this._mode == this.MODE_DOMAIN) {
                    if (value === this._NULL_VALUE) {
                        value = null;
                    }
                }
            return value;
        },
        
        setValue: function(rowIndex, value){
            if (this._mode == this.MODE_DATE) {
                if (this.widget) {
                    var dateVal = (value === undefined || value === null || value === "" || isNaN(value)) ? null : new Date(Number(value));
                    this.widget.set("value", dateVal);
                    return;
                }
            }
            if (this.mode == this.MODE_SELECT) {
                this.widget.set("displayedValue", value);
            }
            this.inherited(arguments);
        },
        
        /* Not making changes here for User Story 38689 since the code is not being used anywhere per Raji.
           DELETE THE CODE IF REALLY NOT NEEDED.
           
        onKeyDown: function(evt){
            this._isBackspaceKey = (evt.keyCode == keys.BACKSPACE);
            
            
            this.set("autoComplete", true);
            
            // Set time out to get the current entered value. Otherwise, it shows previous entered value.
            setTimeout(lang.hitch(this, function(){
            
            
                // Sets where clause (case-insensitive) to get the location names based on the route Id entered.                                               
                var where = this.get("displayedValue") ? "UPPER(" + this.fullStreetFieldName + ") LIKE '" + utils.escapeSql(this.get("displayedValue")).toUpperCase() + "%'" : "1=1";
                
                var query = new Query();
                query.returnGeometry = false;
                query.where = where;
                query.outSpatialReference = this.mapManager.map.spatialReference;
                query.outFields = ["*"];
                
                // Query the intersection layer.
                var queryUrl = utils.appendUrlPath(this.mapManager.lrsMapLayerConfig.url, "/" + this.masterStreetLayer.id), def = new Deferred();
                 if (!this._isBackspaceKey) {
                   new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                     var featureCount = featureSet.features.length;
                     if (featureCount === 0) {
                       this.set("displayedValue", "");
                       this.setErrorState();
                     }
                     else {
                     
                       var searchValue = this.get("displayedValue"), optionsCount = 0, data = [], displayFieldValue;
                       
                       var streetName;
                       array.some(featureSet.features, function(feature){
                         displayFieldValue = feature.attributes[this.fullStreetFieldName];
                         
                         
                         streetName = displayFieldValue;
                         
                         
                         // Case insensitive comparison.
                        if (streetName.toUpperCase().indexOf(searchValue.toUpperCase()) == 0) {
                          data.push({
                            name: displayFieldValue,
                            id: displayFieldValue
                          });
                          optionsCount++;
                          // Show intellisense up to 10 matching records.
                          if (optionsCount == 10) {
                            return true;
                          }
                        }
                        return false;
                      }, this);
                      
                      // Sort options by name.
                      data.sort(lang.partial(utils.ascSortByPropertyName, "name"));
                      this.get("store").setData(data);
                    }
                    
                  }));
                }
            }), 500);
        },*/
        
        
        
        
        getWidgetProps: function(data){
            return lang.mixin({}, this.inherited(arguments), this._extraWidgetProps || {});
        },
        
        formatNode: function(domNode, data, rowIndex){
            var itemId = this.grid.store.getValue(this.grid.getItem(rowIndex), "id");
            var field = this.parent._editItemInfo[itemId].field;
            this._extraWidgetProps = {};
            if (field.domain && field.domain.type == "codedValue") {
                    this._mode = this.MODE_DOMAIN;
                    this.widgetClass = Select;
                    var domainItems = [];
                    if (field.nullable) {
                        domainItems.push({
                            value: this._NULL_VALUE,
                            label: bundle.NullValue
                        });
                    }
                    array.forEach(field.domain.codedValues, function(codedValue){
                        domainItems.push({
                            value: String(codedValue.code),
                            label: codedValue.name
                        });
                    }, this);
                    lang.mixin(this._extraWidgetProps, {
                        options: domainItems,
                        style: "width: 100%;"
                    });
                }
                else 
                    if (field.type == "esriFieldTypeDate") {
                        this._mode = this.MODE_DATE;
                        this.widgetClass = DateTextBox;
                        var dateVal = (data === undefined || data === null || data === "" || isNaN(data)) ? null : new Date(Number(data));
                        lang.mixin(this._extraWidgetProps, {
                            value: dateVal,
                            required: !field.nullable,
                            constraints: {
                                datePattern: bundle.DatePattern
                            }
                        });
                    }
                    else 
                        if (field.type == "esriFieldTypeInteger" || field.type == "esriFieldTypeSmallInteger" || field.type == "esriFieldTypeOID") {
                            this._mode = this.MODE_INTEGER;
                            this.widgetClass = ValidationTextBox;
                            lang.mixin(this._extraWidgetProps, {
                                required: !field.nullable,
                                regExp: utils.integerRegExpFormat,
                                invalidMessage: bundle.validation.enterNumberWithoutDecimal
                            });
                        }
                        else 
                            if (field.type == "esriFieldTypeDouble" || field.type == "esriFieldTypeSingle") {
                                this._mode = this.MODE_NUMBER;
                                this.widgetClass = ValidationTextBox;
                                lang.mixin(this._extraWidgetProps, {
                                    required: !field.nullable,
                                    regExp: utils.numberRegExpFormat,
                                    invalidMessage: bundle.validation.enterNumber
                                });
                            }
                            else {
                                this._mode = this.MODE_TEXT;
                                this.widgetClass = ValidationTextBox;
                                lang.mixin(this._extraWidgetProps, {
                                    required: !field.nullable
                                });
                                if (field.length > 0) {
                                    lang.mixin(this._extraWidgetProps, {
                                        regExp: ".{0," + field.length + "}",
                                        invalidMessage: string.substitute((field.length == 1) ? bundle.validation.enterStringLengthSingular : bundle.validation.enterStringLengthPlural, [field.length])
                                    });
                                }
                            }
            
            // Destroy the editor widget so a different one can be created for another field
            var oldWidget = this.widget;
            
            if (oldWidget) {
                setTimeout(function(){
                    try {
                        oldWidget.destroyRecursive();
                    } 
                    catch (e) {
                        console.log("error while destroying editor widget: [" + oldWidget.declaredClass + "] ", e);
                    }
                }, 10);
            }
            this.widget = null;
            
            this.inherited(arguments);
        }
        
    });
    _FieldEditor.markupFactory = function(node, cell){
        dojox.grid.cells._Widget.markupFactory(node, cell);
    };
    
    
    return AddStreetNames;
}); // end define
