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
"dojo/dom-style", 
"dojo/query",
"dojo/string", 
"dojox/grid/DataGrid", 
"dojox/grid/cells/dijit",
"dojo/store/Memory",
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
 "esri/graphic", 
 "esri/geometry/Extent", 
 "esri/geometry/Point", 
 "esri/geometry/Polyline", 
 "esri/geometry/mathUtils", 
 "esri/tasks/IdentifyParameters", 
 "esri/tasks/IdentifyTask", 
 "esri/tasks/query", 
 "esri/tasks/QueryTask", 
 "esri/toolbars/draw", 
 "esri/symbols/SimpleMarkerSymbol", 
 "roads/addressManagement/util/mathUtil", 
 "roads/tasks/RouteTask", 
 "roads/dijit/_RedlineMixin", 
 "roads/dijit/_ZoomRouteMixin", 
 "roads/dijit/dijit", 
 "roads/dijit/RouteValidationTextBox", 
 "roads/dijit/form/MeasureReferenceForm", 
 "roads/dijit/form/StartingStationForm", 
 "roads/dijit/form/ZoomRouteButton", 
 "roads/addressManagement/ZoomBlockButton", 
 "roads/dijit/layout/TransitionStackContainer",
  "roads/dijit/form/Dialog", 
 "roads/editing/AttributeSet", 
 "roads/maputils", 
 "roads/tasks/ReferentTask", 
 "roads/util/date", 
 "roads/util/method", 
 "roads/util/referent", 
 "roads/utils", 
 "roads/addressManagement/tasks/AddressManagementTask",
 "roads/addressManagement/SelectBlockRangeInfoWindow", 
 "dojo/text!./templates/AddBlockRange.html", 
 "dojo/i18n!./nls/res_common", 
 "dojo/i18n!./nls/res_AddBlockRange"], 
 function(array, connect, declare, Deferred, keys, lang, win, ItemFileWriteStore, dateLocale, DeferredList, domAttr, 
 domConstruct, domStyle, domQuery, string, DataGrid, gridCells, Memory, Standby, MenuItem, Button, CheckBox, DateTextBox, Select, FilteringSelect, 
 ValidationTextBox, ContentPane, TabContainer, registry, esriRequest, Graphic, Extent, Point, Polyline, geometryMathUtils, 
 IdentifyParameters, IdentifyTask, Query, QueryTask, Draw, SimpleMarkerSymbol, mathUtil, RouteTask, RedlineMixin, ZoomRouteMixin, 
 dijitUtils, RouteValidationTextBox, MeasureReferenceForm, StartingStationForm, ZoomRouteButton, ZoomBlockButton, 
 TransitionStackContainer, Dialog, editing, maputils, ReferentTask, dateUtils, methodUtils, referentUtils, utils, AddressTask,
 SelectBlockRangeInfoWindow, template, bundle1, bundle2){
    var bundle = utils.deepMixin({}, bundle1, bundle2);
    
    // alias
    var MeasureReferenceTypes = methodUtils.MeasureReferenceTypes;
    
    var AddBlockRange = declare("roads.addressManagement.AddBlockRange", [dijitUtils._BaseWidget, ZoomRouteMixin], {
    
        templateString: template,
        
        // UI defaults
        widgetPlacement: dijitUtils.DOCK_LEFT,
        preferredHeight: 300,
        preferredWidth: 450,
        
        
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
        _currentLineDirection:null,
        _mapConnect: null,
        _widgetConnect: null,
        _selectedEvent: null,
        _newEvent:null,
        _routeTask: null,
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
        _attributeStandby:null,
        _fromIntersectionOptions:null,
        _toIntersecctionOptions:null,
        _fromIntersectionId:null,
        _toIntersectionId:null,
        _intersectionLayer:null,
        _dialog: null,
        _widgetGraphics: null,
        _lockAvailable: true,
        
        _addressTask: null, 
        
        arrowHeadSymbol: null,
        lineSymbol: null,
        routeId: null,
        
        constructor: function(params){
            this._config = params.config;
            this._addressConfig = params.addressConfig;
            this._masterStreetNameTable = params.masterStreetNameTable;
            this._mapManager = params.mapManager;
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
            
            this._selectionManager.registerTool(this._selectRouteButton, Draw.POINT, lang.hitch(this, "_onSelectRoute"), this);
            
            this._selectionManager.registerTool(this._selectFromIntersectionButton, Draw.POINT, lang.hitch(this, "_onSelectIntersection", "from", "to"), this);
            this._selectionManager.registerTool(this._selectToIntersectionButton, Draw.POINT, lang.hitch(this, "_onSelectIntersection", "to", "from"), this);
            
            this._selectionManager.registerTool(this._populateAttributesButton, Draw.POINT, lang.hitch(this, "_onPopulateAttributes"), this);
            
            
            //Function to check if the arrow head lies within the extent, if not reposition the arrow head
            this._mapConnect = connect.connect(this._mapManager.map, "onExtentChange", this, "_checkblockRangeArrow");
            connect.connect(this._routeTask, "onSetRouteStartEndDate", this, "_updateRouteStartEndDate");
            
            this._routeTask = new RouteTask({
                mapManager: this._mapManager
            });
            
            this._addressTask = new AddressTask({
                mapManager: this._mapManager
            });
            // Set up the zoom route button drop-down
            this.initZoomRouteButton({
                zoomRouteButton: this._zoomRouteButton,
                routeInput: this._routeInput,
                mapManager: this._mapManager,
                routeTask: this._routeTask
            });
            
            // Set up the zoom block button drop-down
            this._zoomBlockButton.mapManager = this._mapManager;
            
            this._intersectionLayer  = this._getIntersectionOffsetLayer();
            
              
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
            this._attributeStandby.set("text",bundle.selectBlockRange);
            
            this._loadNetworkLayers();
            this._loadEventLayers(this._addressConfig.blockRangeLayer.layerName);
            this._initAttributeGrid();
            
            this.lineSymbol = maputils.createLineSymbol(this._addressConfig.selectionSymbols.line);
            this.arrowHeadSymbol = this._createMarkerSymbol(this._addressConfig.selectionSymbols.arrowHead);
            this._fullStreetName = this._addressConfig.masterStreetNameTable.fullStreetNameField;
            //this._getTableInformation(this._mapManager.lrsMapLayerConfig.url, this._addressConfig.masterStreetNameTable.tableName)
            
            this._widgetConnect = connect.connect(this, "onShow", this, "_onWidgetShow");
            this._widgetGraphics =[];
            
            this._watchHandles.push(this._routeInput.watch("value", lang.hitch(this, function(){
                this.routeId = this._routeInput.get("value");
                if (this.routeId != "") {
                    connect.publish("/esri/roads/conflict/checkLocks", [{ ownerWidget: this }]);
                }
            })));
            
            
            this._watchHandles.push(this._fromIntersectionInput.watch("value", lang.hitch(this, function(name, oldValue, value){
                if (value && value != "0" && value != " ") {
                    if (this._fromIntersectionId) {
                        var changedValue = value["type"] ? value : value.attributes[this._intersectionLayer.intersectionIdFieldName];
                        if (this._fromIntersectionId != changedValue) {
                            domStyle.set(this._fromIntersectionInput.domNode, "backgroundColor", this._config.eventAttributes.editedCellColor);
                        }
                        else {
                            domStyle.set(this._fromIntersectionInput.domNode, "backgroundColor", "");
                        }
                        
                    }
                    else {
                        domStyle.set(this._fromIntersectionInput.domNode, "backgroundColor",  this._config.eventAttributes.editedCellColor);
                    }
                }
                else {
                    domStyle.set(this._fromIntersectionInput.domNode, "backgroundColor", "");
                }
            })));
            
             this._watchHandles.push(this._toIntersectionInput.watch("value", lang.hitch(this, function(name, oldValue, value){
               if (value && value != "0" && value != " ") {
                    if (this._toIntersectionId) {
                        var changedValue = value["type"] ? value : value.attributes[this._intersectionLayer.intersectionIdFieldName];
                        if (this._toIntersectionId != changedValue) {
                            domStyle.set(this._toIntersectionInput.domNode, "backgroundColor", this._config.eventAttributes.editedCellColor);
                        }
                        else {
                            domStyle.set(this._toIntersectionInput.domNode, "backgroundColor", "");
                        }
                        
                    }
                    else {
                        domStyle.set(this._toIntersectionInput.domNode, "backgroundColor",  this._config.eventAttributes.editedCellColor);
                    }
                }
                else {
                    domStyle.set(this._toIntersectionInput.domNode, "backgroundColor", "");
                }
            })));
          
            var fromDate = this._mapManager.viewDateTask.getViewDate();
            // clear the route start/end dates and reset the checkboxes
            this._fromDateInput.set("value", fromDate);
            this._fromDateInput.set("disabled", this._useRouteStartDate.get("checked"));
            this._toDateInput.set("disabled", this._useRouteEndDate.get("checked"));
            
            this._enableConflictControls({ enabled: false, ownerWidget: this });
            this.own(connect.subscribe("/esri/roads/conflict/enableConflictControls", this, "_enableConflictControls"));
            this.own(connect.subscribe("/esri/roads/conflict/checkLocks", this, "_checkLocks"));
        },
        
        _onWidgetShow: function(){
          if(this._widgetGraphics && !this.isEmpty(this._widgetGraphics)){
            for(var tag in this._widgetGraphics){
              this._selectionManager.add(this._widgetGraphics[tag],this, tag);
            }
          }
        },
        
        /*
         * Checks locks to enable/disable controls when route ID is changed.
         */
        _checkLocks: function(data) {
            var conflictTask = this._mapManager.addressConflictTask;
            if (conflictTask.isEnabled()) {
                var ownerWidget = data.ownerWidget;
                if (ownerWidget == this) {
                    conflictTask.setEditedEventLayers([this._selectedEventLayer]);
                    var selectedRouteIds = [this._routeInput.get("value")];
                    this._enableConflictControls({
                        enabled: false,
                        ownerWidget: this
                    });
                    this._standby.show();
                    var lrsNetworkIdToRouteIds = {};
                    if (this._selectedEventLayer.parentNetwork.id == this._selectedNetworkLayer.id) {
                        var lrsNetworkId = utils.findLayer(this._mapManager.lrsServiceConfig.networkLayers, this._selectedNetworkLayer.id).lrsNetworkId;
                        lrsNetworkIdToRouteIds[lrsNetworkId] = selectedRouteIds;
                    }
                    conflictTask.continueCheckLocks(selectedRouteIds, this._selectedNetworkLayer.id, lrsNetworkIdToRouteIds, this, true).then(lang.hitch(this, function(){
                        this._standby.show();
                        if (this._selectedEvent) {
                            this._populateFields(this._selectedEvent);
                        }
                        else {
                            if (this._routeFeatureSet) {
                                this._useRouteStartDate.set("checked", true);
                                this._useRouteEndDate.set("checked", true);
                                this._setRouteStartEndDate(this._routeFeatureSet.attributes);
                            }
                            this._populateDefaultAttributeValues(false);
                        }
                        if (this._selectedEvent || this._newEvent) {
                            this._populateIntersections();
                        }
                    }), lang.hitch(this, function(err){
                        this._standby.hide();
                        console.log("Unable to acquire locks for block range editing.", err);
                        this.showMessage(bundle.error.AcquireLocksEditError);
                    }));
                }
            }
            else {
                if (this._selectedEvent) {
                    this._populateFields(this._selectedEvent);
                }
                else {
                    if (this._routeFeatureSet) {
                        this._useRouteStartDate.set("checked", true);
                        this._useRouteEndDate.set("checked", true);
                        this._setRouteStartEndDate(this._routeFeatureSet.attributes);
                    }
                    this._populateDefaultAttributeValues(false);
                }
                if (this._selectedEvent || this._newEvent) {
                    this._populateIntersections();
                }
            }
        },

        /*
         * Disables/Enables all form elements and buttons except route ID entry and tools and the network selection drop-down for conflict prevention.
         */
        _enableConflictControls: function(data) {
            var conflictTask = this._mapManager.addressConflictTask;
            if (conflictTask.isEnabled()) {
                var enabled = data.enabled, ownerWidget = data.ownerWidget;
                if (ownerWidget == this) {
                    conflictTask.setControlsEnabled(enabled);
                    if (enabled) {
                        this._lockAvailable = true;
                        this.enableControls([this._selectFromIntersectionButton, this._selectToIntersectionButton, 
                        this._saveButton, this._routeInput, this._zoomRouteButton, this._zoomBlockButton, this._useRouteStartDate, 
                        this._useRouteEndDate, this._fromIntersectionInput, this._toIntersectionInput, this._flipParityButton, 
                        this._flipGeometryButton, this._populateAttributesButton, this._attributeGroupTabs]);
                        if (this._attributeStandby) {
                            this._attributeStandby.hide();
                        }
                        setTimeout(lang.hitch(this, function(){
                            // Only enable from/to date control if use route start/end date is not checked
                            if (!this._useRouteStartDate.get("checked")) {
                                this.enableControls([this._fromDateInput]);
                            }
                            if (!this._useRouteEndDate.get("checked")) {
                                this.enableControls([this._toDateInput]);
                            }
                        }), 10);
                    }
                    else {
                        this._lockAvailable = false;
                        this.disableControls([this._selectFromIntersectionButton, this._selectToIntersectionButton, 
                        this._saveButton, this._routeInput, this._zoomRouteButton, this._zoomBlockButton, this._useRouteStartDate, 
                        this._useRouteEndDate, this._fromIntersectionInput, this._toIntersectionInput, this._flipParityButton, 
                        this._flipGeometryButton, this._populateAttributesButton, this._attributeGroupTabs]);
                        if (this._attributeStandby) {
                            this._attributeStandby.show();
                        }
                        setTimeout(lang.hitch(this, function(){
                            this.disableControls([this._fromDateInput, this._toDateInput]);
                        }), 10);
                        
                    }
                }
            }
        },
             
        /*
         * Finds and returns intersection layer based on the offset layer Id.
         */
        _getIntersectionOffsetLayer: function(){
            var layers = this.mapManager.lrsServiceConfig.intersectionLayers;
            if (layers.length == 1) 
                return layers[0];
            
        },
        
        _loadNetworkLayers: function(){
            var networkLayers = this._mapManager.lrsServiceConfig.networkLayers;
            if (networkLayers.length > 0) {
                this._selectedNetworkLayer = networkLayers[0];
                this._routeTask.setNetworkLayer(this._selectedNetworkLayer);
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
          var message = bundle.closeWarning;
          return !this._checkUnsavedChanges() || confirm(message);
        },
        
        destroy: function(){
            this._selectionManager.unregisterTool(this._selectRouteButton);
            this._selectionManager.unregisterTool(this._selectFromIntersectionButton);
            this._selectionManager.unregisterTool(this._selectToIntersectionButton);
            this._selectionManager.unregisterTool(this._populateAttributesButton);
            this._clearMap();
            connect.disconnect(this._mapConnect);
            this._mapConnect = null;
            connect.disconnect(this._widgetConnect);
            this._widgetConnect = null;
            
            this._widgetGraphics =null;
            array.forEach(this._watchHandles, function(handle){
                handle.unwatch();
            }, this);
            this._watchHandles = null;
            if (this._attributeStandby) {
                this._attributeStandby.destroy();
                this._attributeStandby = null;
            }
            if (this._standby) {
                this._standby.destroy();
                this._standby = null;
            }
            this.inherited(arguments);
       },
        
        
        _onSelectRoute: function(mapClickPoint){
            
            if (this._checkUnsavedChanges()) {
                this._dialog.showConfirm(bundle.title, bundle.cancelWarning, lang.hitch(this, function(toContinue){
                    if (toContinue) {
                        this._clearMap();
                        this._resetFields();
                        
                        this._mapTolerance = (this._mapManager.map.extent.getWidth() / this._mapManager.map.width) * this._mapManager.selectionManager.tolerancePixels;
                        this._mapClickPoint = mapClickPoint;
                        var extent = maputils.pointToExtent(mapClickPoint, this._mapTolerance);
                        this._queryGeometry(extent);
                        
                    }
                }));
            }
            else {
                this._clearMap();
                this._resetFields();
                
                this._mapTolerance = (this._mapManager.map.extent.getWidth() / this._mapManager.map.width) * this._mapManager.selectionManager.tolerancePixels;
                this._mapClickPoint = mapClickPoint;
                var extent = maputils.pointToExtent(mapClickPoint, this._mapTolerance);
                this._queryGeometry(extent);
            }
        },
        
        _onSelectIntersection: function(input,otherInput, mapClickPoint){
            var extent = maputils.pointToExtent(mapClickPoint, this._mapTolerance);
            var newIntersection = true, measure1, measure2, fromMeasure, toMeasure, newMeasure;
            var selectIntersection = input == "from" ? this._fromIntersectionInput : this._toIntersectionInput;
            if (this.routeId) {
                var measure, map = this._mapManager.map, params = {
                    locations: [{
                        routeId: this.routeId,
                        geometry: {
                            x: mapClickPoint.x,
                            y: mapClickPoint.y
                        }
                    }],
                    tolerance: this._mapTolerance,
                    inSR: map.spatialReference.toJson()
                }, task = this._mapManager.lrsServiceTask, layerId = this._selectedNetworkLayer.id;
                
                this._standby.show();
                
                task.geometryToMeasure(layerId, params).then(lang.hitch(this, function(response){
                    var resultLocation = response.locations[0];
                    if (resultLocation.results && resultLocation.results.length > 0) {
                        if (resultLocation.results.length == 1) {
                            extent = maputils.pointToExtent(new Point(resultLocation.results[0].geometry), this._mapTolerance);
                            measure = utils.formatNumber(resultLocation.results[0].measure, this._selectedEventLayer.measurePrecision);
                        }
                    }
                    if (measure) {
                        var geometry;
                        if (this._selectedEvent) {
                          geometry = this._selectedEvent.geometry;
                          
                        }
                        else {
                          geometry = this._newEvent.geometry;
                        }
                        var lastPathIdx = geometry.paths.length - 1;
                        var lastIdx = geometry.paths[lastPathIdx].length - 1;
                        var measureIndex = geometry.paths[0][0].length - 1;
                        fromMeasure = parseFloat(utils.formatNumber(geometry.paths[0][0][measureIndex], this._selectedEventLayer.measurePrecision));
                        toMeasure = parseFloat(utils.formatNumber(geometry.paths[lastPathIdx][lastIdx][measureIndex], this._selectedEventLayer.measurePrecision));
                        if (input == "from") {
                            input = this._fromIntersectionInput;
                            otherInput = this._toIntersectionInput;
                            newMeasure = toMeasure;
                        }
                        else {
                            input = this._toIntersectionInput;
                            otherInput = this._fromIntersectionInput;
                            newMeasure = fromMeasure;
                        }
                        
                        var eventLayer = this._selectedEventLayer;
                        
                         /*if (input.value && input.value != " ") {
                            measure1 = input.value["type"] ? input.value["MEASURE"] : input.value.attributes[this._intersectionLayer.measureFieldName];
                            if (Math.abs(measure - measure1) < 0.005) 
                                newIntersection = false;
                           
                             
                             if (input.value["attributes"]) {
                             var toDate = input.value.attributes[this._intersectionLayer.toDateFieldName];
                             if (utils.isValidDate(toDate)) {
                             //TODO: Revisit after standardizing the time zone between desktop and server.
                             // Currently when converting Date to milliseconds, we only use year, month, and date.
                             // So, no need to get the UTC hours, minutes, and seconds when creating Date here.
                             // We assume it's 12 AM since the UI doesn't allow to specify time.
                             toDate = new Date(toDate);
                             toDate = new Date(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
                             }
                             if (!toDate || toDate > this.getCurrentDate()) {
                             newIntersection = false;
                             }
                             }
                        }*/
                        if (otherInput.value && otherInput.value != " ") {
                            measure2 = otherInput.value["type"] ? otherInput.value["MEASURE"] : otherInput.value.attributes[this._intersectionLayer.measureFieldName];
                            if (Math.abs(measure - measure2) < 0.005) 
                                newIntersection = false;
                        }
                        if (newIntersection) {
                            this._queryOffsetLayer(this.routeId, extent).then(lang.hitch(this, function(featureSet){
                                if (featureSet.features.length > 0) {
                                    if (featureSet.features.length == 1) {
                                    
                                        var feature = featureSet.features[0];
                                        var intersection = {
                                            value: feature,
                                            label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
                                        };
                                        this._drawBlockRange(selectIntersection, intersection);
                                    }
                                    else 
                                        if (featureSet.features.length > 1) {
                                            this._createLocationPopup(featureSet.features, mapClickPoint, selectIntersection);
                                        }
                                }
                                else {
                                    var task = this._mapManager.lrsServiceTask, layerId = this._selectedNetworkLayer.id;
                                    this._queryRouteId(this.routeId).then(lang.hitch(this, function(featureSet){
                                    
                                        if (featureSet.features.length > 0) {
                                            this._routeFeatureSet = featureSet;
                                        }
                                        if (this._routeFeatureSet.features.length == 1) {
                                            var geometry = this._routeFeatureSet.features[0].geometry;
                                            if (geometry) {
                                                var lastPathIdx = geometry.paths.length - 1;
                                                lastIdx = geometry.paths[lastPathIdx].length - 1;
                                                lastPoint = geometry.getPoint(lastPathIdx, lastIdx);
                                                var measureIndex = geometry.paths[0][0].length - 1;
                                                lastMeasure = parseFloat(utils.formatNumber(geometry.paths[lastPathIdx][lastIdx][measureIndex], this._selectedEventLayer.measurePrecision));
                                                firstPoint = geometry.getPoint(0, 0);
                                                firstMeasure = parseFloat(utils.formatNumber(geometry.paths[0][0][measureIndex], this._selectedEventLayer.measurePrecision));
                                                var measureFieldName = this._getIntersectionOffsetLayer().measureFieldName, value;
                                                
                                                if (mathUtil.nearlyEqual(measure, firstMeasure)) {
                                                    value = {
                                                        type: "Route",
                                                        route: this.routeId,
                                                        MEASURE: firstMeasure,
                                                        displayValue: bundle.routeStart
                                                    };
                                                }
                                                else 
                                                    if (mathUtil.nearlyEqual(measure, lastMeasure)) {
                                                        value = {
                                                            type: "Route",
                                                            route: this.routeId,
                                                            MEASURE: lastMeasure,
                                                            displayValue: bundle.routeEnd
                                                        };
                                                    }
                                                if (value) {
                                                    var intersection = {
                                                        value: value,
                                                        label: value["displayValue"]
                                                    };
                                                    this._drawBlockRange(selectIntersection, intersection);
                                                }
                                                else {
                                                    this._standby.hide();
                                                    if (selectIntersection === this._fromIntersectionInput) {
                                                      alert(bundle.error.invalidFromIntersection);
                                                    }else{
                                                      alert(bundle.error.invalidToIntersection);
                                                    }
                                                }
                                            }
                                        }
                                    }));
                                }
                            }));
                        }
                        else {
                            this._standby.hide();
                            alert(bundle.error.intersectionError);
                        }
                    }
                    else {
                        this._standby.hide();
                        if (selectIntersection === this._fromIntersectionInput) {
                            alert(bundle.error.invalidFromIntersection);
                        }
                        else {
                            alert(bundle.error.invalidToIntersection);
                        }
                    }
                }));
               
            }
        },
        
        _validateIntersection:function(fromMeasure, toMeasure){
            var defd = new Deferred(),
                validIntersection = true,
                query = new Query();
                
            //Check for block range gap or intersection within the existing block range
            query.returnGeometry = false;
            query.outFields = [this._selectedEventLayer.fromMeasureFieldName, this._selectedEventLayer.toMeasureFieldName];
            query.where = this._selectedEventLayer.routeIdFieldName + "='" + this.routeId + "'";
            
            fromMeasure = parseFloat(utils.formatNumber(fromMeasure, this._selectedEventLayer.measurePrecision));
            toMeasure = parseFloat(utils.formatNumber(toMeasure, this._selectedEventLayer.measurePrecision));
            
            if (fromMeasure < toMeasure) {
                query.where += " AND ( " +  this._selectedEventLayer.fromMeasureFieldName + " < " + toMeasure + " and " + this._selectedEventLayer.toMeasureFieldName + " > " + fromMeasure + " ) ";
            }
            else {
                query.where += " AND ( " +  this._selectedEventLayer.fromMeasureFieldName + " < " + fromMeasure + " and " + this._selectedEventLayer.toMeasureFieldName + " > " + toMeasure + " ) ";
            }
            
            if (this._selectedEvent) {
                query.where += " AND " + this._selectedEventLayer.eventIdFieldName + " <> '" + this._selectedEvent.attributes[this._selectedEventLayer.eventIdFieldName] + "'";
            }
            
            var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + this._selectedEventLayer.id);
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                if (featureSet.features.length > 0) {
                    array.forEach(featureSet.features, function(features){
                        var fromM = parseFloat(utils.formatNumber(features.attributes[this._selectedEventLayer.fromMeasureFieldName], this._selectedEventLayer.measurePrecision));
                        var toM = parseFloat(utils.formatNumber(features.attributes[this._selectedEventLayer.toMeasureFieldName], this._selectedEventLayer.measurePrecision));
                        if (fromM == toMeasure && toM > fromMeasure ||
                            fromM < toMeasure && toM == fromMeasure) 
                            validIntersection = true;
                        else 
                            validIntersection = false;
                    }, this);
                }
                else {
                    validIntersection = true;
                }
                /*if(!validIntersection){
                 if (fromMeasure && toMeasure) {
                 if (!(measure >= fromMeasure && measure <= toMeasure) || (measure >= toMeasure && measure <= fromMeasure)) {
                 validIntersection = false;
                 }
                 }
                 }*/
                defd.callback(validIntersection);
            }), lang.hitch(this, function(err){
                defd.errback(err);
            }));
            return defd;
        },
        
                /*
         * Returns today's date at 12:00 AM.
         */
        getCurrentDate: function() {
            var date = new Date();
            date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return date;
        },
        
        
         // Helper function for _onSelectLocation
        _createLocationPopup: function(features, mapClickPoint, input){
            var popup = new SelectBlockRangeInfoWindow({
                map: this._mapManager.map,
                infoWindowManager: this._mapManager.infoWindowManager
            });
            connect.connect(popup, "onFeatureSelected", this, lang.hitch(this, this._applyLocationFeature,  input));
            popup.setDisplayType(null, features.length);
            popup.showPopup(features, this._intersectionLayer.intersectionNameFieldName, mapClickPoint, this);
        },
        
        // Helper function for _onSelectLocation
        _applyLocationFeature: function(input, feature){
            this.mapManager.infoWindowManager.hide(null, true);
            var intersection = {
                value: feature,
                label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
            };
            this._drawBlockRange(input, intersection);
         //   input.set("displayedValue", intersection.label);
           // input.set("readOnly", true);
        },
        
        /*
         * Resets the intersection or location feature set, removes options, and reset parent network description.
         */
        _resetSelectOptions: function(){
            this._fromIntersectionOptions = [];
            this._toIntersectionOptions = [];
            var option = {
                    value : "0",
                    label : " "
            };
            this.setSelectOptions(this._fromIntersectionInput, option);
            this.setSelectOptions(this._toIntersectionInput, option);
        },
        
        
        /*
         * Returns featureSet of routes at a point on the map
         */
        getRoutesAtPoint: function(mapClickPoint){
            var deferred = new Deferred();
            
            if (!this._selectedNetworkLayer) {
                console.log("No network layer selected to select a route.");
                deferred.resolve();
            }
            
            // Buffer the point to intersect any nearby routes
            var map = this._mapManager.map, buffer = this._selectionManager.tolerancePixels * (map.extent.getWidth() / map.width), bufferExtent = maputils.pointToExtent(mapClickPoint, buffer);
            
            var query = new Query();
            query.geometry = bufferExtent;
            query.outFields = ["*"];
            query.returnGeometry = true;
            query.outSpatialReference = map.spatialReference;
            
            var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + this._selectedNetworkLayer.id);
            new QueryTask(queryUrl).execute(query, lang.hitch(this, function(featureSet){
                deferred.resolve(featureSet);
            }), lang.hitch(this, function(err){
                deferred.reject(err);
            }));
            
            return deferred;
        },
        
        /*
         * Builds a route ID string based on the route ID component fields of a network layer.
         */
        _buildRouteId: function(networkLayer, attributes){
            var routeId = "";
            if (networkLayer && attributes) {
                routeId = attributes[networkLayer.compositeRouteIdFieldName];
            }
            return routeId;
        },
        
        
        
        _queryGeometry: function(geometry, /*String*/ routeId){
            var defd = new Deferred();
            var networkLayer = this._selectedNetworkLayer;
            if (!networkLayer) {
                defd.errback("No selected network layer.");
                return defd;
            }
            
            // Validate the input fields
            if (!geometry) {
                defd.errback("click on the street");
                return defd;
            }
            
            var map = this._mapManager.map, query = new Query();
            query.outFields = ["*"];
            query.outSpatialReference = map.spatialReference;
            query.returnGeometry = true;
            query.returnM = true;
            if (routeId != null) {
                query.where = this._selectedEventLayer.routeIdFieldName + "='" + routeId + "'";
            }
            query.geometry = geometry;
            this._standby.show();
            var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + this._selectedEventLayer.id);
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                if (featureSet.features.length == 0) {
                    this._selectedEvent = null;
                    this._newEvent = {};
                    this.getRoutesAtPoint(this._mapClickPoint).then(lang.hitch(this, function(featureSet){
                        var featureCount = featureSet.features.length;
                        if (featureCount == 0) {
                          this._routeInput.set("value", "");
                          if(this._standby){
                            this._standby.hide();
                          }
                        }
                        else {
                          if (featureCount === 1) {
                            var feature = featureSet.features[0];
                            this._routeFeatureSet = feature;
                            var routeId = this._buildRouteId(this._selectedNetworkLayer, feature.attributes);
                            this._routeInput.set("value", routeId);
                          }
                          else {
                            this._setRoutePopupContent(this._mapManager.map, this._selectedNetworkLayer, featureSet.features, this._mapClickPoint, this._routeInput, this);
                          }
                        }
                    }), lang.hitch(this, function(err){
                        console.log("Unable to perform query. ", err);
                        this._standby.hide();
                        alert(bundle.error.queryError);
                    }));
                }
                else {
                    this._newEvent = null;
                    this._fromDateInput.set("disabled", this._useRouteStartDate.get("checked"));
                    if (featureSet.features.length == 1) {
                        this._selectedEvent = featureSet.features[0];
                        this._routeInput.set("value", featureSet.features[0].attributes[this._selectedEventLayer.routeIdFieldName]);
            
                    }
                    else 
                        if (featureSet.features.length > 1) {
                            // Prompt to select one route out of multiple matches
                            this._setPopupContent(this._mapManager.map, this._selectedNetworkLayer, featureSet.features, this._mapClickPoint, this._routeInput, this);
                        }
                }
            }), lang.hitch(this, function(err){
                defd.errback(err);
            }));
        },
        
        _populateIntersections: function(){
            if (this.routeId) {
                this.enableControls([this._selectFromIntersectionButton, this._selectToIntersectionButton, this._saveButton, this._routeInput, this._zoomRouteButton, this._zoomBlockButton, this._fromDateInput, this._toDateInput, this._useRouteStartDate, this._useRouteEndDate, this._fromIntersectionInput,  this._toIntersectionInput, this._flipParityButton, this._flipGeometryButton,this._populateAttributesButton, this._attributeGroupTabs]);
                this._fromIntersectionInput.set("readOnly", true);
                this._toIntersectionInput.set("readOnly", true);
                if( this._attributeStandby)
                {
                    this._attributeStandby.hide();
                }
                this._fromIntersectionOptions = [];
                this._toIntersectionOptions =[];
                if (this._selectedEvent) {
                    var geometry = this._selectedEvent.geometry;
                    var fromPoint, toPoint;
                    if (geometry) {
                        var lastPathIdx = geometry.paths.length - 1;
                        lastIdx = geometry.paths[lastPathIdx].length - 1;
                        toPoint = geometry.getPoint(lastPathIdx, lastIdx);
                        var measureIndex = geometry.paths[0][0].length - 1;
                        toMeasure = parseFloat(utils.formatNumber(geometry.paths[lastPathIdx][lastIdx][measureIndex], this._selectedEventLayer.measurePrecision));
                        fromPoint = geometry.getPoint(0, 0);
                        fromMeasure = parseFloat(utils.formatNumber(geometry.paths[0][0][measureIndex], this._selectedEventLayer.measurePrecision));
                    }
                    //Get all the possible fromIntersections
                    var extent = maputils.pointToExtent(fromPoint, this._mapManager.selectionManager.tolerancePixels);
                    this._queryOffsetLayer(this.routeId, extent).then(lang.hitch(this, function(featureSet){
                        var features = featureSet.features;
                        if (features.length == 0) {
                          var task = this._mapManager.lrsServiceTask, layerId = this._selectedNetworkLayer.id;
                          this._queryRouteId(this.routeId).then(lang.hitch(this, function(featureSet){
                            if (featureSet.features.length > 0) {
                              this._routeFeatureSet = featureSet;
                              if (this._routeFeatureSet.features.length == 1) {
                                var geometry = this._routeFeatureSet.features[0].geometry;
                                if (geometry) {
                                  var lastPathIdx = geometry.paths.length - 1;
                                  lastIdx = geometry.paths[lastPathIdx].length - 1;
                                  lastPoint = geometry.getPoint(lastPathIdx, lastIdx);
                                  var measureIndex = geometry.paths[0][0].length - 1;
                                  lastMeasure = parseFloat(utils.formatNumber(geometry.paths[lastPathIdx][lastIdx][measureIndex], this._selectedEventLayer.measurePrecision));
                                  firstPoint = geometry.getPoint(0, 0);
                                  firstMeasure = parseFloat(utils.formatNumber(geometry.paths[0][0][measureIndex], this._selectedEventLayer.measurePrecision));
                                  var measureFieldName = this._getIntersectionOffsetLayer().measureFieldName, value;
                                  
                                  if (mathUtil.nearlyEqual(fromMeasure, firstMeasure)) {
                                    this._fromIntersection = {
                                      type: "Route",
                                      route: this.routeId,
                                      MEASURE: firstMeasure,
                                      displayValue: bundle.routeStart
                                    };
                                  }
                                  else 
                                    if (mathUtil.nearlyEqual(fromMeasure, lastMeasure)) {
                                      this._fromIntersection = {
                                        type: "Route",
                                        route: this.routeId,
                                        MEASURE: lastMeasure,
                                        displayValue: bundle.routeEnd
                                      };
                                    }
                                  
                                  var intersection;
                                  if (this._fromIntersection) {
                                    intersection = {
                                      value: this._fromIntersection,
                                      label: this._fromIntersection["displayValue"]
                                    };
                                  }
                                  else {
                                    intersection = {
                                      value: " ",
                                      label: bundle.chooseIntersection
                                    };
                                  }
                                  this._fromIntersectionOptions.push(intersection);
                                  
                                  if ((this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] &&
                                  this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] != "") ||
                                  (this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] &&
                                  this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] != "")) {
                                    if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] == this.routeId ||
                                    this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] == this.routeId) {
                                      if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] != null ||
                                      this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] != null) {
                                        this._fromIntersectionId = this._fromIntersection;
                                        this.setSelectOptions(this._fromIntersectionInput, this._fromIntersectionOptions);
                                      //      this._fromIntersectionInput.set("displayedValue", this._fromIntersection.displayValue);
                                      }
                                    }
                                    else {
                                      intersection = {
                                        value: " ",
                                        label: bundle.chooseIntersection
                                      };
                                      this._fromIntersectionOptions.splice(0, 0, intersection);
                                      this._fromIntersection = intersection;
                                      this.setSelectOptions(this._fromIntersectionInput, intersection);
                                    }
                                  }
                                  else {
                                     intersection = {
                                      value: " ",
                                      label: bundle.chooseIntersection
                                    };
                                    this._fromIntersectionOptions.splice(0, 0, intersection);
                                    this._fromIntersection = intersection;
                                    this.setSelectOptions(this._fromIntersectionInput, intersection);
                                  }
                                }
                              }
                            }
                          }));
                        }
                        else {
                          array.forEach(features, function(feature){
                            var intersection = {
                              value: feature,
                              label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
                            };
                            this._fromIntersectionOptions.push(intersection);
                          }, this);
                          
                          
                          //Populate the fromIntersection dropdown based on referent values
                          if ((this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] &&
                          this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] != "") ||
                          (this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] &&
                          this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] != "")) {
                            if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] != this.routeId ||
                            this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] != this.routeId) {
                              if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] != null ||
                              this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] != null) {
                                this._fromIntersectionId = this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName];
                                var intersectionFeature = [];
                                if (this._fromIntersectionOptions.length > 0) {
                                  intersectionFeature = array.filter(this._fromIntersectionOptions, function(option){
                                    var feat = option.value;
                                    if (feat.attributes) {
                                      if (feat.attributes[this._intersectionLayer.intersectionIdFieldName] == this._fromIntersectionId) 
                                        return feat;
                                    }
                                  }, this);
                                }
                                if (intersectionFeature.length > 0) {
                                  this._fromIntersection = intersectionFeature[0];
                                  this.setSelectOptions(this._fromIntersectionInput, intersectionFeature[0]);
                                //    this._fromIntersectionInput.set("displayedValue", intersectionFeature[0].label);
                                }
                                else {
                                  this._fromIntersectionId = this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName];
                                   intersectionFeature = [];
                                  if (this._fromIntersectionOptions.length > 0) {
                                    intersectionFeature = array.filter(this._fromIntersectionOptions, function(option){
                                      var feat = option.value;
                                      if (feat.attributes) {
                                        if (feat.attributes[this._intersectionLayer.intersectionIdFieldName] == this._fromIntersectionId) 
                                          return feat;
                                      }
                                    }, this);
                                  }
                                  if (intersectionFeature.length > 0) {
                                    this._fromIntersection = intersectionFeature[0];
                                    this.setSelectOptions(this._fromIntersectionInput, intersectionFeature[0]);
                                  //    this._fromIntersectionInput.set("displayedValue", intersectionFeature[0].label);
                                  }
                                  
                                  else {
                                    var where = this._intersectionLayer.intersectionIdFieldName + "= '" + this._fromIntersectionId + "'";
                                    this._queryOffsetLayer(null, null, where).then(lang.hitch(this, function(featureSet){
                                      if (featureSet.features.length == 1) {
                                        var feature = featureSet.features[0];
                                        var intersection = {
                                          value: feature,
                                          label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
                                        };
                                        this._fromIntersection = feature;
                                        this._fromIntersectionOptions.splice(0, 0, intersection);
                                        this.setSelectOptions(this._fromIntersectionInput, intersection);
                                      //              this._fromIntersectionInput.set("displayedValue", intersection.label);
                                      }
                                      else {
                                         var intersection = {
                                          value: " ",
                                          label: bundle.chooseIntersection
                                        };
                                        this._fromIntersection = intersection;
                                        this._fromIntersectionOptions.splice(0, 0, intersection);
                                        this.setSelectOptions(this._fromIntersectionInput, intersection);
                                      //    this._fromIntersectionInput.set("displayedValue", intersection.label);
                                      }
                                    }));
                                  }
                                }
                              }
                              else {
                                 intersection = {
                                  value: " ",
                                  label: bundle.chooseIntersection
                                };
                                this._fromIntersectionOptions.splice(0, 0, intersection);
                                this._fromIntersection = intersection;
                                this.setSelectOptions(this._fromIntersectionInput, intersection);
                              //    this._fromIntersectionInput.set("displayedValue", intersection.label);
                              }
                            } 
                            else {
                                intersection = {
                                    value: " ",
                                    label: bundle.chooseIntersection
                                };
                                this._fromIntersectionOptions.splice(0, 0, intersection);
                                this._fromIntersection = intersection;
                                this.setSelectOptions(this._fromIntersectionInput, intersection);
                                //this._fromIntersectionInput.set("displayedValue", intersection.label);
                            }
                          }
                          else {
                             intersection = {
                              value: " ",
                              label: bundle.chooseIntersection
                            };
                            this._fromIntersectionOptions.splice(0, 0, intersection);
                            this._fromIntersection = intersection;
                            this.setSelectOptions(this._fromIntersectionInput, intersection);
                          //this._fromIntersectionInput.set("displayedValue", intersection.label);
                          }
                        }
                        //Get all the possible toIntersections
                        var extent = maputils.pointToExtent(toPoint, this._mapManager.selectionManager.tolerancePixels);
                        this._queryOffsetLayer(this.routeId, extent).then(lang.hitch(this, function(featureSet){
                            var features = featureSet.features;
                            if (features.length == 0) {
                              var task = this._mapManager.lrsServiceTask, layerId = this._selectedNetworkLayer.id;
                              this._queryRouteId(this.routeId).then(lang.hitch(this, function(featureSet){
                                if (featureSet.features.length > 0) {
                                  this._routeFeatureSet = featureSet;
                                  if (this._routeFeatureSet.features.length == 1) {
                                    var geometry = this._routeFeatureSet.features[0].geometry;
                                    if (geometry) {
                                      var lastPathIdx = geometry.paths.length - 1;
                                      lastIdx = geometry.paths[lastPathIdx].length - 1;
                                      lastPoint = geometry.getPoint(lastPathIdx, lastIdx);
                                      var measureIndex = geometry.paths[0][0].length - 1;
                                      lastMeasure = parseFloat(utils.formatNumber(geometry.paths[lastPathIdx][lastIdx][measureIndex], this._selectedEventLayer.measurePrecision));
                                      firstPoint = geometry.getPoint(0, 0);
                                      firstMeasure = parseFloat(utils.formatNumber(geometry.paths[0][0][measureIndex], this._selectedEventLayer.measurePrecision));
                                      var measureFieldName = this._getIntersectionOffsetLayer().measureFieldName, value;
                                      
                                      if (mathUtil.nearlyEqual(toMeasure, firstMeasure)) {
                                        this._toIntersection = {
                                          type: "Route",
                                          route: this.routeId,
                                          MEASURE: firstMeasure,
                                          displayValue: bundle.routeStart
                                        };
                                      }
                                      else 
                                        if (mathUtil.nearlyEqual(toMeasure, lastMeasure)) {
                                          this._toIntersection = {
                                            type: "Route",
                                            route: this.routeId,
                                            MEASURE: lastMeasure,
                                            displayValue: bundle.routeEnd
                                          };
                                        }
                                        var intersection;
                                        if (this._toIntersection) {
                                            intersection = {
                                                value: this._toIntersection,
                                                label: this._toIntersection["displayValue"]
                                            };
                                        }
                                        else {
                                            intersection = {
                                                value: " ",
                                                label: bundle.chooseIntersection
                                            };
                                        }
                                      this._toIntersectionOptions.push(intersection);
                                      
                                      if ((this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] &&
                                      this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] != "") ||
                                      (this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] &&
                                      this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] != "")) {
                                        if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] == this.routeId ||
                                        this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] == this.routeId) {
                                          if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] != null ||
                                          this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] != null) {
                                            this._toIntersectionId = this._toIntersection;
                                            this.setSelectOptions(this._toIntersectionInput, this._toIntersectionOptions);
                                             if (this._standby) {
                                              this._standby.hide();
                                            }
                                          //      this._fromIntersectionInput.set("displayedValue", this._fromIntersection.displayValue);
                                          }
                                        }
                                        else {
                                          var intersection = {
                                            value: " ",
                                            label: bundle.chooseIntersection
                                          };
                                          this._toIntersectionOptions.splice(0, 0, intersection);
                                          this._toIntersection = intersection;
                                          this.setSelectOptions(this._toIntersectionInput, intersection);
                                           if (this._standby) {
                                              this._standby.hide();
                                            }
                                        }
                                      }
                                      else {
                                        var intersection = {
                                          value: " ",
                                          label: bundle.chooseIntersection
                                        };
                                        this._toIntersectionOptions.splice(0, 0, intersection);
                                        this._toIntersection = intersection;
                                        this.setSelectOptions(this._toIntersectionInput, intersection);
                                         if (this._standby) {
                                              this._standby.hide();
                                            }
                                      }
                                    }
                                  }
                                }
                              }));
                            }
                            else {
                              array.forEach(features, function(feature){
                                var intersection = {
                                  value: feature,
                                  label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
                                };
                                this._toIntersectionOptions.push(intersection);
                              }, this);
                              
                              //Populate the toIntersection dropdown based on referent values
                              if ((this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] &&
                              this._selectedEvent.attributes[this._selectedEventLayer.fromReferentMethodFieldName] != "") ||
                              (this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] &&
                              this._selectedEvent.attributes[this._selectedEventLayer.toReferentMethodFieldName] != "")) {
                                if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] != this.routeId ||
                                this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] != this.routeId) {
                                  if (this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName] != null ||
                                  this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] != null) {
                                    this._toIntersectionId = this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName];
                                    var intersectionFeature = [];
                                    if (this._toIntersectionOptions.length > 0) {
                                      intersectionFeature = array.filter(this._toIntersectionOptions, function(option){
                                        var feat = option.value;
                                        if (feat.attributes) {
                                          if (feat.attributes[this._intersectionLayer.intersectionIdFieldName] == this._toIntersectionId) 
                                            return feat;
                                        }
                                      }, this);
                                    }
                                    if (intersectionFeature.length > 0) {
                                      this._toIntersection = intersectionFeature[0];
                                      this.setSelectOptions(this._toIntersectionInput, intersectionFeature[0]);
                                      //     this._toIntersectionInput.set("displayedValue", intersectionFeature[0].label);
                                      if (this._standby) {
                                        this._standby.hide();
                                      }
                                    }
                                    else {
                                      this._toIntersectionId = this._selectedEvent.attributes[this._selectedEventLayer.fromReferentLocationFieldName];
                                      var intersectionFeature = [];
                                      if (this._toIntersectionOptions.length > 0) {
                                        intersectionFeature = array.filter(this._toIntersectionOptions, function(option){
                                          var feat = option.value;
                                          if (feat.attributes) {
                                            if (feat.attributes[this._intersectionLayer.intersectionIdFieldName] == this._toIntersectionId) 
                                              return feat;
                                          }
                                        }, this);
                                      }
                                      if (intersectionFeature.length > 0) {
                                        this._toIntersection = intersectionFeature[0];
                                        this.setSelectOptions(this._toIntersectionInput, intersectionFeature[0]);
                                        //     this._toIntersectionInput.set("displayedValue", intersectionFeature[0].label);
                                        if (this._standby) {
                                          this._standby.hide();
                                        }
                                      }
                                      else {
                                        var where = this._intersectionLayer.intersectionIdFieldName + "= '" + this._toIntersectionId + "'";
                                        this._queryOffsetLayer(null, null, where).then(lang.hitch(this, function(featureSet){
                                          if (featureSet.features.length == 1) {
                                            var feature = featureSet.features[0];
                                            var intersection = {
                                              value: feature,
                                              label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
                                            };
                                            this._toIntersection = feature;
                                            this._toIntersectionOptions.splice(0, 0, intersection);
                                            this.setSelectOptions(this._toIntersectionInput, intersection);
                                            //               this._toIntersectionInput.set("displayedValue", intersection.label);
                                            
                                            
                                            if (this._standby) {
                                              this._standby.hide();
                                            }
                                          }
                                          else {
                                            var intersection = {
                                              value: " ",
                                              label: bundle.chooseIntersection
                                            };
                                            this._toIntersectionOptions.splice(0, 0, intersection);
                                            this._toIntersection = intersection;
                                            this.setSelectOptions(this._toIntersectionInput, intersection);
                                            //     this._toIntersectionInput.set("displayedValue",intersection.label );
                                            if (this._standby) {
                                              this._standby.hide();
                                            }
                                          }
                                        }));
                                      }
                                    }
                                  }
                                  else {
                                    var intersection = {
                                      value: " ",
                                      label: bundle.chooseIntersection
                                    };
                                    this._toIntersectionOptions.splice(0, 0, intersection);
                                    this._toIntersection = intersection;
                                    this.setSelectOptions(this._toIntersectionInput, intersection);
                                    //     this._toIntersectionInput.set("displayedValue",intersection.label );
                                    if (this._standby) {
                                      this._standby.hide();
                                    }
                                  }
                                }
                                else {
                                  if (this._selectedEvent.attributes[this._selectedEventLayer.toReferentLocationFieldName] != null) {
                                    var intersection = {
                                  value: " ",
                                  label: bundle.chooseIntersection
                                };
                                this._toIntersectionOptions.splice(0, 0, intersection);
                                this._toIntersection = intersection;
                                this.setSelectOptions(this._toIntersectionInput, intersection);
                                  //       this._toIntersectionInput.set("displayedValue", this._toIntersection.displayValue);
                                  }
                                  if (this._standby) {
                                    this._standby.hide();
                                  }
                                }
                              }
                              else {
                                var intersection = {
                                  value: " ",
                                  label: bundle.chooseIntersection
                                };
                                this._toIntersectionOptions.splice(0, 0, intersection);
                                this._toIntersection = intersection;
                                this.setSelectOptions(this._toIntersectionInput, intersection);
                                // this._toIntersectionInput.set("displayedValue", intersection.label);
                                if (this._standby) {
                                  this._standby.hide();
                                }
                              }
                            }
                        }));
                    }));
                }
                else {
                    if (!this._offsetFeatureSet) {
                        this._queryOffsetLayer(this.routeId).then(lang.hitch(this, function(featureSet){
                            if (featureSet.features.length > 0) {
                                this._offsetFeatureSet = featureSet;
                                this._getClosestIntersection(this._offsetFeatureSet.features, this._mapClickPoint);
                            }else{
                              this._getClosestIntersection(null, this._mapClickPoint);
                            }
                            
                            //this._fromIntersectionInput.setOptions(this._offsetFeatureSet);
                            //this._toIntersectionInput.setOptions(this._offsetFeatureSet);
                           
                        }));
                    }
                    else {
                        this._getClosestIntersection(this._offsetFeatureSet.features, this._mapClickPoint);
                        //this._fromIntersectionInput.setOptions(this._offsetFeatureSet);
                        //this._toIntersectionInput.setOptions(this._offsetFeatureSet);
                        
                    }
                }
            }
        },
        
        _getClosestBlockRange: function(){
            var networkLayer = this._selectedNetworkLayer;
            if (!networkLayer) {
                defd.errback("No selected network layer.");
                return defd;
            }
            var fieldsPopulated = false;
            
            var map = this._mapManager.map, query = new Query();
            query.outFields = ["*"];
            query.outSpatialReference = map.spatialReference;
            query.returnGeometry = true;
            query.returnM = true;
            if (this.routeId != null) {
                query.where = this._selectedEventLayer.routeIdFieldName + "='" + this.routeId + "'";
            }
            
            var geometry = this._newEvent.geometry;
            var fromPoint, toPoint;
            if (geometry) {
                var lastPathIdx = geometry.paths.length - 1;
                lastIdx = geometry.paths[lastPathIdx].length - 1;
                toPoint = geometry.getPoint(lastPathIdx, lastIdx);
                 var measureIndex = geometry.paths[0][0].length -1;
                toMeasure = parseFloat(utils.formatNumber(geometry.paths[lastPathIdx][lastIdx][measureIndex], this._selectedEventLayer.measurePrecision));
                fromPoint = geometry.getPoint(0, 0);
                fromMeasure = parseFloat(utils.formatNumber(geometry.paths[0][0][measureIndex], this._selectedEventLayer.measurePrecision));
            }
            var extent = maputils.pointToExtent(fromPoint, this._mapManager.selectionManager.tolerancePixels); 
            query.geometry = extent;
            var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + this._selectedEventLayer.id);
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                if (featureSet.features.length == 1) {
                    var feature = featureSet.features[0];
                    var leftFromAddress;
                    if(feature.attributes[this._addressConfig.blockRangeLayer.rightToAddressField]<feature.attributes[this._addressConfig.blockRangeLayer.leftToAddressField]){
                      leftFromAddress = feature.attributes[this._addressConfig.blockRangeLayer.leftToAddressField];
                      this._populateAttribute(this._addressConfig.blockRangeLayer.rightFromAddressField, leftFromAddress + 1);
                      this._populateAttribute(this._addressConfig.blockRangeLayer.leftFromAddressField, leftFromAddress + 2);
                    }else{
                      leftFromAddress = feature.attributes[this._addressConfig.blockRangeLayer.rightToAddressField];
                      this._populateAttribute(this._addressConfig.blockRangeLayer.leftFromAddressField, leftFromAddress + 1);
                      this._populateAttribute(this._addressConfig.blockRangeLayer.rightFromAddressField, leftFromAddress + 2);
                    }
                    this._populateAttribute(this._selectedEventLayer.routeIdFieldName, this.routeId);
                    if (!fieldsPopulated) {
                      if (this._addressConfig.blockRangeLayer.copyFields && this._addressConfig.blockRangeLayer.copyFields.length > 0) {
                        array.forEach(this._addressConfig.blockRangeLayer.copyFields, function(field){
                          var fieldValue = feature.attributes[field];
                          this._populateAttribute(field, fieldValue);
                        }, this);
                      }
                      fieldsPopulated = true;
                    }
                    var query = new Query();
                    query.outFields = ["*"];
                    query.outSpatialReference = map.spatialReference;
                    query.returnGeometry = true; 
                    query.returnM = true;
                    if (this.routeId != null) {
                        query.where = this._selectedEventLayer.routeIdFieldName + "='" + this.routeId + "'";
                    }
                    var extent = maputils.pointToExtent(toPoint, this._mapManager.selectionManager.tolerancePixels); 
                    query.geometry = extent;
                    this._standby.show();
                    var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + this._selectedEventLayer.id);
                    new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                        if (featureSet.features.length == 0 || array.indexOf(this._addressConfig.blockRangeLayer.copyFields, this._addressConfig.blockRangeLayer.fullStreetNameField) == -1) {
                            if (this._standby) {
                                this._standby.hide();
                            }
                        }
                        if (featureSet.features.length > 0) {
                            var feature = featureSet.features[0];
                            var rightTo;
                            if (feature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField] < feature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField]) {
                                rightTo = feature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField];
                                this._populateAttribute(this._addressConfig.blockRangeLayer.leftToAddressField, Math.abs(rightTo - 1));
                                this._populateAttribute(this._addressConfig.blockRangeLayer.rightToAddressField, Math.abs(rightTo - 2));
                            }
                            else {
                                rightTo = feature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField];
                                this._populateAttribute(this._addressConfig.blockRangeLayer.rightToAddressField, Math.abs(rightTo - 1));
                                this._populateAttribute(this._addressConfig.blockRangeLayer.leftToAddressField, Math.abs(rightTo - 2));
                            }                  
                            this._populateAttribute(this._selectedEventLayer.routeIdFieldName, this.routeId);
                            if (!fieldsPopulated) {
                              if (this._addressConfig.blockRangeLayer.copyFields && this._addressConfig.blockRangeLayer.copyFields.length > 0) {
                                array.forEach(this._addressConfig.blockRangeLayer.copyFields, function(field){
                                  var fieldValue = feature.attributes[field];
                                  this._populateAttribute(field, fieldValue);
                                }, this);
                              }
                              fieldsPopulated = true;
                            }
                        }
                    }));
                }
                else {
                    var query = new Query();
                    query.outFields = ["*"];
                    query.outSpatialReference = map.spatialReference;
                    query.returnGeometry = true;
                    query.returnM = true;
                    if (this.routeId != null) {
                        query.where = this._selectedEventLayer.routeIdFieldName + "='" + this.routeId + "'";
                    }
                    var extent = maputils.pointToExtent(toPoint, this._mapManager.selectionManager.tolerancePixels); 
                    query.geometry = extent;
                    this._standby.show();
                    var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + this._selectedEventLayer.id);
                    new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                        if (featureSet.features.length == 0 || array.indexOf(this._addressConfig.blockRangeLayer.copyFields, this._addressConfig.blockRangeLayer.fullStreetNameField) == -1) {
                            if (this._standby) {
                                this._standby.hide();
                            }
                        }
                        if (featureSet.features.length > 0) {
                            var feature = featureSet.features[0];
                            var rightTo;
                            if (feature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField] < feature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField]) {
                                rightTo = feature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField];
                                this._populateAttribute(this._addressConfig.blockRangeLayer.leftToAddressField, Math.abs(rightTo - 1));
                                this._populateAttribute(this._addressConfig.blockRangeLayer.rightToAddressField, Math.abs(rightTo - 2));
                            }
                            else {
                                rightTo = feature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField];
                                this._populateAttribute(this._addressConfig.blockRangeLayer.rightToAddressField, Math.abs(rightTo - 1));
                                this._populateAttribute(this._addressConfig.blockRangeLayer.leftToAddressField, Math.abs(rightTo - 2));
                            } 
                            this._populateAttribute(this._selectedEventLayer.routeIdFieldName, this.routeId);
                            if (!fieldsPopulated) {
                                if (this._addressConfig.blockRangeLayer.copyFields && this._addressConfig.blockRangeLayer.copyFields.length > 0) {
                                    array.forEach(this._addressConfig.blockRangeLayer.copyFields, function(field){
                                        var fieldValue = feature.attributes[field];
                                        this._populateAttribute(field, fieldValue);
                                    }, this);
                                }
                                fieldsPopulated = true;
                            }
                        }
                    }));
                }
            }));
        },
        
         _getClosestIntersection: function(features, point){
             var fnearestDist = null, fnearestFeature = [], tnearestDist = null, tnearestFeature = [], fromIntersectionMeasure = null, toIntersectionMeasure = null;
             var measure, map = this._mapManager.map, routeId = this.routeId || null, tolerance = this._selectionManager.tolerancePixels * (map.extent.getWidth() / map.width);
             var task = this._mapManager.lrsServiceTask, layerId = this._selectedNetworkLayer.id;
             this._fromIntersectionInput.set("readOnly", false);
             this._toIntersectionInput.set("readOnly", false);
             this._queryRouteId(this.routeId).then(lang.hitch(this, function(featureSet){
                 if (featureSet.features.length > 0) {
                     this._routeFeatureSet = featureSet;
                 }
                 var measure, map = this._mapManager.map, routeId = this.routeId || null, tolerance = this._selectionManager.tolerancePixels * (map.extent.getWidth() / map.width), params = {
                     locations: [{
                         routeId: this.routeId,
                         geometry: {
                             x: point.x,
                             y: point.y
                         }
                     }],
                     tolerance: tolerance,
                     inSR: map.spatialReference.toJson()
                 }, task = this._mapManager.lrsServiceTask, layerId = this._selectedNetworkLayer.id;
                 
                 task.geometryToMeasure(layerId, params).then(lang.hitch(this, function(response){
                     var resultLocation = response.locations[0];
                     if (resultLocation.results && resultLocation.results.length > 0) {
                         // If more than one result with different routeIds, let the user select the route
                         if (resultLocation.results.length == 1) {
                             measure = resultLocation.results[0].measure;
                         }
                     }
                     if (this._routeFeatureSet.features.length == 1) {
                         var geometry = this._routeFeatureSet.features[0].geometry;
                         if (geometry) {
                             var lastPathIdx = geometry.paths.length - 1;
                             lastIdx = geometry.paths[lastPathIdx].length - 1;
                             lastPoint = geometry.getPoint(lastPathIdx, lastIdx);
                             var measureIndex = geometry.paths[0][0].length - 1;
                             lastMeasure = parseFloat(utils.formatNumber(geometry.paths[lastPathIdx][lastIdx][measureIndex], this._selectedEventLayer.measurePrecision));
                             firstPoint = geometry.getPoint(0, 0);
                             firstMeasure = parseFloat(utils.formatNumber(geometry.paths[0][0][measureIndex], this._selectedEventLayer.measurePrecision));
                             var addRouteStart = true, addRouteEnd = true, fnearestDist = measure - firstMeasure, tnearestDist = measure - lastMeasure;
                             var measureFieldName = this._getIntersectionOffsetLayer().measureFieldName;
                             if (features) {
                                 array.forEach(features, function(result){
                                     var intersectionMeasure = result.attributes[measureFieldName];
                                     if (mathUtil.nearlyEqual(intersectionMeasure, firstMeasure)) {
                                         addRouteStart = false;
                                     }
                                     else 
                                         if (mathUtil.nearlyEqual(intersectionMeasure, lastMeasure)) {
                                             addRouteEnd = false;
                                         }
                                 });
                             }
                             else {
                                 features = [];
                             }
                             if (addRouteStart) {
                                 features.push({
                                     type: "Route",
                                     route: this.routeId,
                                     MEASURE: firstMeasure,
                                     displayValue: bundle.routeStart
                                 });
                             }
                             if (addRouteEnd) {
                                 features.push({
                                     type: "Route",
                                     route: this.routeId,
                                     MEASURE: lastMeasure,
                                     displayValue: bundle.routeEnd
                                 
                                 });
                             }
                             array.forEach(features, function(result){
                                 var fMeasure = result["type"] ? result["MEASURE"] : result.attributes[measureFieldName];
                                 var dist = measure - fMeasure;
                                 if (fnearestDist == null || (dist > 0)) {
                                     if (dist < fnearestDist) {
                                         fnearestDist = dist;
                                         if (fnearestFeature.length > 0) {
                                             fnearestFeature = [];
                                             fnearestFeature.push(result);
                                         }
                                         else 
                                             fnearestFeature.push(result);
                                     }
                                     else 
                                         if (mathUtil.nearlyEqual(dist, fnearestDist)) {
                                             fnearestFeature.push(result);
                                         }
                                 }
                             });
                             
                             if (fnearestFeature.length == 1) {
                                 var intersection = {
                                     value: fnearestFeature[0]["type"] ? fnearestFeature[0] : fnearestFeature[0],
                                     label: fnearestFeature[0]["type"] ? fnearestFeature[0]["displayValue"] : fnearestFeature[0].attributes[this._intersectionLayer.intersectionNameFieldName]
                                 };
                                 fromIntersectionMeasure = fnearestFeature[0]["type"] ? fnearestFeature[0]["MEASURE"] : fnearestFeature[0].attributes[this._intersectionLayer.measureFieldName];
                                 this._fromIntersectionOptions.push(intersection);
                             }
                             else {
                                 array.forEach(fnearestFeature, function(feature){
                                     var intersection = {
                                         value: feature,
                                         label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
                                     };
                                     fromIntersectionMeasure = feature.attributes[this._intersectionLayer.measureFieldName];
                                     this._fromIntersectionOptions.push(intersection);
                                 }, this);
                             }
                             
                             
                             array.forEach(features, function(result){
                                 if (result != fnearestFeature) {
                                     var tMeasure = result["type"] ? result["MEASURE"] : result.attributes[measureFieldName];
                                     var dist = measure - tMeasure;
                                     if (tnearestDist == null || (dist < 0)) {
                                         if (dist > tnearestDist) {
                                             tnearestDist = dist;
                                             if (tnearestFeature.length > 0) {
                                                 tnearestFeature = [];
                                                 tnearestFeature.push(result);
                                             }
                                             
                                             else 
                                                 tnearestFeature.push(result);
                                         }
                                         else 
                                             if (mathUtil.nearlyEqual(dist, tnearestDist)) {
                                                 tnearestFeature.push(result);
                                             }
                                         
                                     }
                                 }
                             });
                             if (tnearestFeature.length == 1) {
                                 var intersection = {
                                     value: tnearestFeature[0]["type"] ? tnearestFeature[0] : tnearestFeature[0],
                                     label: tnearestFeature[0]["type"] ? tnearestFeature[0]["displayValue"] : tnearestFeature[0].attributes[this._intersectionLayer.intersectionNameFieldName]
                                 };
                                 toIntersectionMeasure = tnearestFeature[0]["type"] ? tnearestFeature[0]["MEASURE"] : tnearestFeature[0].attributes[this._intersectionLayer.measureFieldName];
                                 this._toIntersectionOptions.push(intersection);
                             }
                             else {
                                 array.forEach(tnearestFeature, function(feature){
                                     var intersection = {
                                         value: feature,
                                         label: feature.attributes[this._intersectionLayer.intersectionNameFieldName]
                                     };
                                     toIntersectionMeasure = feature.attributes[this._intersectionLayer.measureFieldName];
                                     this._toIntersectionOptions.push(intersection);
                                 }, this);
                             }
                         }
                     }
                     var params = {
                         "locations": [{
                             "routeId": this.routeId,
                             "fromMeasure": fromIntersectionMeasure,
                             "toMeasure": toIntersectionMeasure
                         }],
                         "outSR": this._mapManager.map.spatialReference.toJson()
                     };
                     this._validateIntersection(fromIntersectionMeasure, toIntersectionMeasure).then(lang.hitch(this, function(isValid){
                         if (isValid) {
                             this._mapManager.lrsServiceTask.measureToGeometry(this._selectedNetworkLayer.id, params).then(lang.hitch(this, function(result){
                                 if (result && result.locations) {
                                     var geometry = result.locations[0].geometry;
                                     if (result.locations[0].geometry) {
                                         if (fromIntersectionMeasure > toIntersectionMeasure) {
                                             var temp = this._fromIntersectionOptions;
                                             this._fromIntersectionOptions = this._toIntersectionOptions;
                                             this._toIntersectionOptions = temp;
                                         }
                                         if (this._fromIntersectionOptions.length == 1) {
                                             this.setSelectOptions(this._fromIntersectionInput, this._fromIntersectionOptions);
                                             this._fromIntersectionInput.set("displayedValue", this._fromIntersectionOptions[0].label);
                                         }
                                         else {
                                             var intersection = {
                                                 value: " ",
                                                 label: bundle.chooseIntersection
                                             };
                                             this._fromIntersectionOptions.splice(0, 0, intersection);
                                             this.setSelectOptions(this._fromIntersectionInput, this._fromIntersectionOptions);
                                             this._fromIntersectionInput.set("displayedValue", intersection.label);
                                         }
                                         if (this._toIntersectionOptions.length == 1) {
                                             this.setSelectOptions(this._toIntersectionInput, this._toIntersectionOptions);
                                             this._toIntersectionInput.set("displayedValue", this._toIntersectionOptions[0].label);
                                         }
                                         else {
                                             var intersection = {
                                                 value: " ",
                                                 label: bundle.chooseIntersection
                                             };
                                             this._toIntersectionOptions.splice(0, 0, intersection);
                                             this.setSelectOptions(this._toIntersectionInput, this._toIntersectionOptions);
                                             this._toIntersectionInput.set("displayedValue", intersection.label);
                                         }
                                         if (result.locations[0].geometryType == "esriGeometryPolyline") {
                                             var geometry = new Polyline(this._mapManager.map.spatialReference);
                                             geometry.paths = result.locations[0].geometry.paths;
                                             var feature = new Graphic(geometry, this.lineSymbol);
                                             this._selectionManager.add(new Graphic(geometry, this.lineSymbol), this, "blockRange");
                                             this._widgetGraphics["blockRange"] = new Graphic(geometry, this.lineSymbol);
                                             this._newEvent = feature;
                                             this._getLineDirectionGraphic(geometry, true);
                                             this._flipParity = false;
                                             
                                             if(this._selectedEventLayer.routeIdFieldName == this._addressConfig.blockRangeLayer.fullStreetNameField){
                                                 if (this._addressConfig.masterStreetNameTable && this._addressConfig.masterStreetNameTable.attributeMapping) {
                                                     this._addressTask.populateAttributesFromMasterStreetTable(this._selectedEventLayer, this.routeId).then(lang.hitch(this, function(result) {
                                                         if (result.attributes) {
                                                             for (var field in result.attributes) {
                                                                 var fieldValue = result.attributes[field];
                                                                 this._autoPopulateAttribute(field, fieldValue);
                                                             }
                                                         }
                                                     }));
                                                 }
                                             }
                                             if (this._addressConfig.polygonLayers || this._addressConfig.polygonServices) {
                                               this._addressTask.populateAttributesFromPolygonLayer(this._selectedEventLayer, feature).then(lang.hitch(this, function(result){
                                                 if (result.attributes) {
                                                   for (var field in result.attributes) {
                                                     var fieldValue = result.attributes[field];
                                                     this._autoPopulateAttribute(field, fieldValue);
                                                   }
                                                 }
                                                 this._getClosestBlockRange();
                                               }));
                                             }else{
                                               this._getClosestBlockRange();
                                             }
                                         }
                                     }
                                 }
                             }));
                         }
                         else {
                             this._clearMap();
                             this._resetFields();
                             this._standby.hide();
                             alert(bundle.error.newBlockRangeError);
                         }
                     }));
                 }), features);
             }), features);
        },
        
        
        _drawBlockRange:function(input, intersection){
            var fromIntersectionInput = this._fromIntersectionInput, 
                toIntersectionInput = this._toIntersectionInput, 
                fromIntersectionMeasure, toIntersectionMeasure, 
                redrawBlockRange = true, isLast = true;
            
            if (input === this._fromIntersectionInput) {
                if (toIntersectionInput.value && toIntersectionInput.value == " ") {
                    redrawBlockRange = false;
                }
                else {
                    fromIntersectionMeasure = intersection.value["type"] ? intersection.value["MEASURE"] : intersection.value.attributes[this._intersectionLayer.measureFieldName];
                    toIntersectionMeasure = toIntersectionInput.value["type"] ? toIntersectionInput.value["MEASURE"] : toIntersectionInput.value.attributes[this._intersectionLayer.measureFieldName];
                }
            }
            else {
                if (fromIntersectionInput.value && fromIntersectionInput.value == " ") {
                    redrawBlockRange = false;
                }
                else {
                    fromIntersectionMeasure = fromIntersectionInput.value["type"] ? fromIntersectionInput.value["MEASURE"] : fromIntersectionInput.value.attributes[this._intersectionLayer.measureFieldName];
                    toIntersectionMeasure = intersection.value["type"] ? intersection.value["MEASURE"] : intersection.value.attributes[this._intersectionLayer.measureFieldName];
                }
            }
            
            if (!redrawBlockRange) {
                this._standby.hide();
                this.setSelectOptions(input, intersection);
            }
            else {
                if (fromIntersectionMeasure > toIntersectionMeasure) {
                    isLast = false;
                }
                var params = {
                    "locations": [{
                        "routeId": this.routeId,
                        "fromMeasure": fromIntersectionMeasure,
                        "toMeasure": toIntersectionMeasure
                    }],
                    "outSR": this._mapManager.map.spatialReference.toJson()
                };
                this._validateIntersection(fromIntersectionMeasure, toIntersectionMeasure).then(lang.hitch(this, function(isValid){
                    if (isValid) {
                        this._mapManager.lrsServiceTask.measureToGeometry(this._selectedNetworkLayer.id, params).then(lang.hitch(this, function(result){
                            if (result && result.locations) {
                                var geometry = result.locations[0].geometry;
                                if (result.locations[0].geometry) {
                                    this._standby.hide();
                                    if (result.locations[0].geometryType == "esriGeometryPolyline") {
                                        var geometry = new Polyline(this._mapManager.map.spatialReference);
                                        geometry.paths = result.locations[0].geometry.paths;
                                        this.setSelectOptions(input, intersection);
                                        var feature = new Graphic(geometry, this.lineSymbol);
                                        this._selectionManager.add(new Graphic(geometry, this.lineSymbol), this, "blockRange");
                                        this._widgetGraphics["blockRange"] = new Graphic(geometry, this.lineSymbol);
                                        if (this._selectedEvent) 
                                            this._selectedEvent.geometry = geometry;
                                        if (this._newEvent) 
                                            this._newEvent.geometry = geometry;
                                        this._getLineDirectionGraphic(geometry, true);
                                        this._flipParity = false;
                                    }
                                }
                            }
                        }));
                    }
                    else {
                        this._standby.hide();
                        alert(bundle.error.intersectionError);
                    }
                }));
            }
        },
        
        
        /*
         * Populates attribute grid with attributes from event layers in the map.
         */
        _onPopulateAttributes: function(mapClickPoint) {
          var mgr = this._mapManager,
                map = mgr.map,
            params = new IdentifyParameters(),
              url = mgr.lrsMapLayerConfig.url;
          
          
          // Set up and execute identify task
          params.geometry = mapClickPoint;
          params.mapExtent = map.extent;
          params.width  = map.width;
          params.height = map.height;
          params.tolerance = mgr.selectionManager.tolerancePixels;
          params.returnGeometry = false;
          params.layerIds = [this._selectedEventLayer.id];
          params.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
          
          var task = new IdentifyTask(url);
            this._standby.show();
          task.execute(params, lang.hitch(this, "_handleIdentifyResponse"),
                lang.hitch(this, function(err) {
                    this._standby.hide();
                    console.log('Identify: error executing identify request. (' + url + '). ', err);
                    this.showMessage(bundle.error.identifyError);
                }));
        },
        
        _handleIdentifyResponse: function(results) {
            this._standby.hide();
          // Map attributes to event layerId
          // If multiple attribute sets are found for the same 
          // event layer, just keep one attribute set.
          var newValues = {};
          array.forEach(results, function(result) {
            newValues[result.layerId] = result.feature.attributes;
          }, this);
          
          var tobeSkippedFields = [this._addressConfig.blockRangeLayer.rightFromAddressField,
                                    this._addressConfig.blockRangeLayer.rightToAddressField, 
                                    this._addressConfig.blockRangeLayer.leftFromAddressField, 
                                    this._addressConfig.blockRangeLayer.leftToAddressField,
                                    this._selectedEventLayer.routeIdFieldName];
                                    // Populate values in the grid with identified attributes
            array.forEach(this._grids, function(grid) {
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item) {                       
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                         if (array.indexOf(tobeSkippedFields, itemInfo.field.name) ==-1) {
                             var newValue = this._formatNewAttrValue(newValues[itemInfo.layer.id], itemInfo.field, true);
                             grid.store.setValue(item, "fieldValue", newValue);
                           }
                        
                    })
                });
            }, this);
        },
        
               
        _setPopupContent: function(map, networkLayer, features, point, routeInput, ownerWidget){
            var displayField = this._addressConfig.blockRangeLayer.fullStreetNameField;
            var popup = new SelectBlockRangeInfoWindow({
                map: map,
                infoWindowManager: this._mapManager.infoWindowManager
            });
            connect.connect(popup, "onFeatureSelected", lang.hitch(this, this._popupSelectBlockRangeOnClick, routeInput, ownerWidget));
            popup.setDisplayType(popup.DisplayTypes.BLOCKRANGE, features.length);
            popup.showBlockRangePopup(features, displayField, this._addressConfig.blockRangeLayer.leftFromAddressField, this._addressConfig.blockRangeLayer.rightFromAddressField, this._addressConfig.blockRangeLayer.leftToAddressField, this._addressConfig.blockRangeLayer.rightToAddressField, point, ownerWidget);
        },
        
        _popupSelectBlockRangeOnClick: function(routeInput, ownerWidget, feature, routeId){
            // Set the route ID textbox and highlight the route on the map
            this._selectedEvent = feature;
            routeInput.set("value", feature.attributes[this._selectedEventLayer.routeIdFieldName]);
        },
        
        
        _setRoutePopupContent: function(map, networkLayer, features, point, routeInput, ownerWidget){
            var displayField = networkLayer ? networkLayer.compositeRouteIdFieldName : null;
            var popup = new SelectBlockRangeInfoWindow({
                map: map,
                infoWindowManager: this._mapManager.infoWindowManager
            });
            connect.connect(popup, "onFeatureSelected", lang.hitch(this, this._popupSelectRouteOnClick, routeInput, ownerWidget));
            popup.setDisplayType(popup.DisplayTypes.ROUTE, features.length);
            popup.showPopup(features, displayField, point, ownerWidget);
        },
        
        _popupSelectRouteOnClick: function(routeInput, ownerWidget, feature, routeId){
            // Set the route ID textbox 
            this._routeFeatureSet = feature;
            routeInput.set("value", routeId);
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
            var eventLayer = this._selectedEventLayer;
            if (!eventLayer) {
                console.log("The block range layer does not exist.");
                return;
            }
            var nonAddressFields =[];
            var nonAddressItems=[], addressItems = [];
            array.forEach(eventLayer.fields, function(field) {
                // Filter out fields that have special handling or are not editable
                var specialFields = [eventLayer.eventIdFieldName, eventLayer.routeIdFieldName, eventLayer.fromMeasureFieldName, eventLayer.toMeasureFieldName, eventLayer.fromDateFieldName, eventLayer.toDateFieldName, (eventLayer.locErrorFieldName || "")];
                var referentFields = referentUtils.getReferentFields(eventLayer);
                var unsupportedDataTypes = ["esriFieldTypeGeometry", "esriFieldTypeBlob", "esriFieldTypeRaster", "esriFieldTypeXML", "esriFieldTypeOID"];
                var fieldInfo;
                if ((field.editable) && 
                    (array.indexOf(specialFields, field.name) == -1) && 
                    (array.indexOf(unsupportedDataTypes, field.type) == -1) && 
                    (array.indexOf(referentFields, field.name) == -1)) {
                    fieldInfo = field;
                    var item;
                    if (field.name == this._addressConfig.blockRangeLayer.rightFromAddressField || 
                        field.name == this._addressConfig.blockRangeLayer.rightToAddressField || 
                        field.name == this._addressConfig.blockRangeLayer.leftFromAddressField || 
                        field.name == this._addressConfig.blockRangeLayer.leftToAddressField) {
                        item = {
                            id : "" + itemIndex,
                            networkName : eventLayer.parentNetwork.name,
                            layerName : eventLayer.name,
                            fieldAlias : fieldInfo.alias || "",
                            fieldValue : fieldInfo.defaultValue
                        };
                        groupDataItems.push(item);

                        addressItems[item.id] = {
                            // Extra properties that shouldn't be stored directly in the data store item
                            layer : eventLayer,
                            field : fieldInfo
                        };
                        itemIndex++;
                    }else {
                        item = {
                            id : "" + itemIndex,
                            networkName : eventLayer.parentNetwork.name,
                            layerName : eventLayer.name,
                            fieldAlias : fieldInfo.alias || "",
                            fieldValue : fieldInfo.defaultValue
                        };
                        nonAddressFields.push(item);
                        nonAddressItems[item.id] = {
                            // Extra properties that shouldn't be stored directly in the data store item
                            layer : eventLayer,
                            field : fieldInfo
                        };
                        itemIndex++;
                    }

                }

            }, this); 
            groupDataItems= groupDataItems.concat(nonAddressFields);
            for(var item in addressItems){
                this._editItemInfo[item]= addressItems[item];
                
            }
            for(var item in nonAddressItems){
                this._editItemInfo[item]= nonAddressItems[item];
                
            }

            
            
            var store = new ItemFileWriteStore({
                data: {
                    items: groupDataItems
                }
            });
            var layout = [{
                name: bundle.attributeColumn,
                field: "fieldAlias",
                width: "120px"
            }, {
                name: bundle.valueColumn,
                field: "fieldValue",
                width: "200px",
                editable: true,
                type: _FieldEditor,
                parent: this,
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
                }
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
                // title: attributeGroup.title,
                style: "padding:0; margin:0;"
            });
            this._attributeGroupTabs.addChild(tabContent);
            this._populateDefaultAttributeValues(true);
        },
        
        _populateFields: function(feature){
        
            this._currentEventId = feature.attributes[utils.findObjectIdFieldName(this._selectedEventLayer.fields)];
            this._zoomBlockButton.setBlockFeature(feature);
            var lastPoint, prevPoint;
            var map = this._mapManager.map;
            this._flipParity = false;
            if (feature.geometry.type == "polyline") {
                this._addBlockRangeGraphic(feature, true );
            }
            
            this._useRouteStartDate.set("checked", true);
            this._useRouteEndDate.set("checked", true);
            this._setRouteStartEndDate(feature.attributes);
            
            this._blockRangeIdInput.set("value", feature.attributes[this._selectedEventLayer.eventIdFieldName]);
            this._blockRangeIdInput.set("title", feature.attributes[this._selectedEventLayer.eventIdFieldName]);
            this._populateAttributeValues(feature.attributes);
        },
        
        
        
        /*
         * Queries event or intersection offset layer based on the where clause and returns
         * Deferred with feature set from either event or intersection layer.
         */
        _queryOffsetLayer: function(routeId,geometry, where){
            var intersectionLayer = this._getIntersectionOffsetLayer();
            if(where == undefined)
              where ="";
           
            if (routeId) {
              if (intersectionLayer.routeIdFieldName) {
                where = utils.concatenateWhereClauses(where, " UPPER(" + intersectionLayer.routeIdFieldName + ") = '" + utils.escapeSql(routeId).toUpperCase() + "'");
              }
            }
            var query = new Query();
            query.returnGeometry = true;
            query.where = where;
            query.outSpatialReference = this._mapManager.map.spatialReference;
            query.outFields = ["*"];
            query.orderByFields = [intersectionLayer.measureFieldName];
            if(geometry){
              query.geometry = geometry;
            }
            // Query the intersection layer.
            var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + intersectionLayer.id), def = new Deferred();
            
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                def.callback(featureSet);
            }), lang.hitch(this, function(err){
                console.log("Unable to query for offset location. ", err);
                def.errback(err);
                this.showMessage(bundle.error.queryError);
            }));
            return def;
        },
        
        /*
         * Queries network layer to get the parent network description based on a route Id.
         */
        _queryRouteId: function(routeId){
            var networkLayer = this._selectedNetworkLayer, def = new Deferred(), 
            query = new Query(), fieldName = networkLayer.compositeRouteIdFieldName, isStringField = utils.isStringField(networkLayer.fields, fieldName);
            query.where = fieldName + "=" + utils.enquoteFieldValue(routeId, isStringField);
            query.returnGeometry = true;
            query.returnM = true;
            fieldName = this._getParentNetworkDescriptionFieldName();
            query.outFields = ["*"];
            this._fromIntersectionInput.parentNetworkDescriptionFieldName = fieldName;
            query.outSpatialReference = this._mapManager.map.spatialReference;
            // Query the network layer.
            var queryUrl = utils.appendUrlPath(this._mapManager.lrsMapLayerConfig.url, "/" + networkLayer.id);
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                def.callback(featureSet);
            }), lang.hitch(this, function(err){
                def.errback(err);
                console.log("Unable to query for route. ", err);
                this.showMessage(bundle.error.queryError);
            }));
            return def;
        },
        
        /*
         * Returns the parent network description field name of intersection layer.
         */
        _getParentNetworkDescriptionFieldName: function(){
            var layer = this._getIntersectionOffsetLayer();
            return layer ? layer.parentNetworkDescriptionFieldName : null;
        },
        
        
        
        _checkblockRangeArrow: function(){
            if(this._lockAvailable) {
                var map = this._mapManager.map;
                var activeTool = this._selectionManager._activeTool;
                if (activeTool && activeTool.owner === this) {
                    if (this._selectedEvent != null) {
                        if (this._selectedEvent.geometry.type == "polyline") {
                            this._addBlockRangeGraphic(this._selectedEvent, !this._flipParity);
                        }
                    }
                    else 
                        if (this._newEvent && !this.isEmpty(this._newEvent)) {
                            if (this._newEvent.geometry.type == "polyline") {
                                this._addBlockRangeGraphic(this._newEvent, !this._flipParity);
                            }
                        }
                }
            }
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
            if (this._selectedEvent || this._newEvent) {
              if (!this._validateFieldValue(value, field)) {
                cell.customStyles[0] = "background-color: " + this._config.eventAttributes.errorCellColor;
              }
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
          if (value!== value || value == undefined || value === "" || value == bundle.NullValue) {
            value = null;
          }
          if (original!== original || original == undefined || original === "") {
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
        
        _onFlipParity: function(){
            var fLeft, fRight, tLeft, tRight;
            
            
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        var fieldInfo = itemInfo.field;
                        if (fieldInfo.name == this._addressConfig.blockRangeLayer.leftFromAddressField) {
                            fLeft = grid.store.getValue(item, "fieldValue");
                        }
                        else 
                            if (fieldInfo.name == this._addressConfig.blockRangeLayer.leftToAddressField) {
                                tLeft = grid.store.getValue(item, "fieldValue");
                            }
                            else 
                                if (fieldInfo.name == this._addressConfig.blockRangeLayer.rightFromAddressField) {
                                    fRight = grid.store.getValue(item, "fieldValue");
                                }
                                else 
                                    if (fieldInfo.name == this._addressConfig.blockRangeLayer.rightToAddressField) {
                                        tRight = grid.store.getValue(item, "fieldValue");
                                    }
                    })
                });
            }, this);
            
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        var fieldInfo = itemInfo.field;
                        if (fieldInfo.name == this._addressConfig.blockRangeLayer.leftFromAddressField) {
                            grid.store.setValue(item, "fieldValue", tRight);
                        }
                        else 
                            if (fieldInfo.name == this._addressConfig.blockRangeLayer.leftToAddressField) {
                                grid.store.setValue(item, "fieldValue", fRight);
                            }
                            else 
                                if (fieldInfo.name == this._addressConfig.blockRangeLayer.rightFromAddressField) {
                                    grid.store.setValue(item, "fieldValue", tLeft);
                                }
                                else 
                                    if (fieldInfo.name == this._addressConfig.blockRangeLayer.rightToAddressField) {
                                        grid.store.setValue(item, "fieldValue", fLeft);
                                    }
                    })
                });
            }, this);
            
            // Refresh the grids
            array.forEach(this._grids, function(g){
                g.update();
            }, this);
        },
        
        _onFlipGeometry: function(){
            var currentParity = this._flipParity;
            this._flipParity = !currentParity;
            
            if (this._selectedEvent != null) {
                if (this._selectedEvent.geometry.type == "polyline") {
                    this._addBlockRangeGraphic(this._selectedEvent, !this._flipParity);
                }
            } else if(this._newEvent){
              if (this._newEvent.geometry.type == "polyline") {
                    this._addBlockRangeGraphic(this._newEvent, !this._flipParity);
                }
            }
             var fromValue = this._fromIntersectionInput.get("displayedValue");
            var toValue = this._toIntersectionInput.get("displayedValue");
            
            var tempOptions = this._fromIntersectionOptions;
            this._fromIntersectionOptions = this._toIntersectionOptions;
            this._toIntersectionOptions = tempOptions;
            
            this.setSelectOptions(this._fromIntersectionInput, this._fromIntersectionOptions);
            this.setSelectOptions(this._toIntersectionInput, this._toIntersectionOptions);
            this._fromIntersectionInput.set("displayedValue", toValue);
            this._toIntersectionInput.set("displayedValue", fromValue);
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
        
        
        /*
         * Applies edits when user clicks on the Save Changes button.
         */
        _onSaveChangesButtonClick: function() {
            // Try to re-acquire previous locks for the edited events since they could be released before the save button is clicked
            var conflictTask = this._mapManager.addressConflictTask;
            if (conflictTask.isEnabled()) {
                var selectedRouteIds = [this._routeInput.get("value")];
                conflictTask.setEditedEventLayers([this._selectedEventLayer]);
                this._attributeStandby.set("text", " ");
                this._enableConflictControls({
                    enabled: false,
                    ownerWidget: this
                });
                this._standby.show();
                var lrsNetworkIdToRouteIds = {};
                if (this._selectedEventLayer.parentNetwork.id == this._selectedNetworkLayer.id) {
                    var lrsNetworkId = utils.findLayer(this._mapManager.lrsServiceConfig.networkLayers, this._selectedNetworkLayer.id).lrsNetworkId;
                    lrsNetworkIdToRouteIds[lrsNetworkId] = selectedRouteIds;
                }
                conflictTask.continueCheckLocks(selectedRouteIds, this._selectedNetworkLayer.id, lrsNetworkIdToRouteIds, this, true).then(lang.hitch(this, function(){
                    this._saveEdits();
                }), lang.hitch(this, function(err){
                    this._standby.hide();
                    console.log("Unable to acquire locks for block range editing.", err);
                    this.showMessage(bundle.error.AcquireLocksSaveChangesError);
                }));
            }
            else {
                this._saveEdits();
            }
        },
        
        _saveEdits: function(){
            // Accumulate the attribute values for any new events on included event layers
            var invalidNumericRouteId = false;
            var invalidFieldValue = false;
            var layerEdits = [];
            var layerEditsMap = {};
            var referentTask = new ReferentTask({
                mapManager: this._mapManager,
                networkLayer: this._selectedNetworkLayer,
                fromMeasureForm: this._fromMeasureForm,
                toMeasureForm: this._toMeasureForm,
                startingStationForm: this._startingStationForm
            });
            var eventRecords = [];
            var eventAttributes = {};
            var editAttributes = {};
            // Optional attributes to define a temporality range for this event
            var fromDate = this._fromDateInput.get("value");
            var toDate = this._toDateInput.get("value");
            var fromDateMillis = (fromDate == null) ? null : Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
            var toDateMillis = (toDate == null) ? null : Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
            if (fromDateMillis !== null && toDateMillis !== null && fromDateMillis >= toDateMillis) {
                this.showMessage(bundle.error.invalidFromToDates);
                return;
            }
            var eventLayer = this._selectedEventLayer;
            // Validate the input fields
            var routeId = this._routeInput.get("value");
            if (routeId == null || routeId.length == 0) {
                this.showMessage(bundle.error.invalidRouteId);
                return;
            }
            this._fromIntersection = this._fromIntersectionInput.get("value");
            this._toIntersection = this._toIntersectionInput.get("value");
            
            if (this._fromIntersection == null || this._fromIntersection == " " || this._fromIntersection=="0") {
                this.showMessage(bundle.error.invalidFromIntersection);
                return;
            }
            
            if ( this._toIntersection == null ||  this._toIntersection == " "||  this._toIntersection =="0") {
                this.showMessage(bundle.error.invalidToIntersection);
                return;
            }
            var routeIdForEvent = routeId;
            if (utils.isNumberField(eventLayer.fields, eventLayer.routeIdFieldName)) {
                if (utils.integerRegExp.test(routeIdForEvent)) {
                    routeIdForEvent = parseInt(routeIdForEvent, 10);
                }
                else {
                    invalidNumericRouteId = true;
                    return;
                }
            }
            var fromMeasure = this._fromIntersection["type"] ? this._fromIntersection["MEASURE"] : this._fromIntersection.attributes[this._getIntersectionOffsetLayer().measureFieldName];
            var toMeasure = this._toIntersection["type"] ? this._toIntersection["MEASURE"] : this._toIntersection.attributes[this._getIntersectionOffsetLayer().measureFieldName];
            
            eventAttributes[eventLayer.routeIdFieldName] = routeIdForEvent;
            eventAttributes[eventLayer.fromDateFieldName] = fromDateMillis;
            eventAttributes[eventLayer.toDateFieldName] = toDateMillis;
            if (fromMeasure < toMeasure) {
              this._currentLineDirection = "withRoute";
              eventAttributes[eventLayer.fromMeasureFieldName] = parseFloat(utils.formatNumber(fromMeasure, eventLayer.measurePrecision));
              eventAttributes[eventLayer.toMeasureFieldName] = parseFloat(utils.formatNumber(toMeasure, eventLayer.measurePrecision));
            }
            else {
              this._currentLineDirection = "oppositeRoute";
              eventAttributes[eventLayer.fromMeasureFieldName] = parseFloat(utils.formatNumber(toMeasure, eventLayer.measurePrecision));
              eventAttributes[eventLayer.toMeasureFieldName] = parseFloat(utils.formatNumber(fromMeasure, eventLayer.measurePrecision));
            }
            if (eventLayer.hasReferentLocation) {
                var fromReferentMethodFieldName, fromReferentLocationFieldName, fromReferentOffsetFieldName, toReferentMethodFieldName, toReferentLocationFieldName, toReferentOffsetFieldName;
                if (this._fromIntersection["type"]) {
                    fromReferentMethodFieldName = this._getCodedValue(this._getFieldObj(eventLayer, eventLayer.fromReferentMethodFieldName), this._selectedNetworkLayer.featureClassName);
                    fromReferentLocationFieldName = this._fromIntersection["route"];
                    fromReferentOffsetFieldName = "" + this._fromIntersection["MEASURE"];
                }
                else {
                    fromReferentMethodFieldName = this._getCodedValue(this._getFieldObj(eventLayer, eventLayer.fromReferentMethodFieldName), this._intersectionLayer.featureClassName);
                    fromReferentLocationFieldName = this._fromIntersection.attributes[this._intersectionLayer.intersectionIdFieldName];
                    fromReferentOffsetFieldName = "";
                }
                if (this._toIntersection["type"]) {
                    toReferentMethodFieldName = this._getCodedValue(this._getFieldObj(eventLayer, eventLayer.toReferentMethodFieldName), this._selectedNetworkLayer.featureClassName);
                    toReferentLocationFieldName = this._toIntersection["route"];
                    toReferentOffsetFieldName = "" + this._toIntersection["MEASURE"];
                }
                else {
                    toReferentMethodFieldName = this._getCodedValue(this._getFieldObj(eventLayer, eventLayer.toReferentMethodFieldName), this._intersectionLayer.featureClassName);
                    toReferentLocationFieldName = this._toIntersection.attributes[this._intersectionLayer.intersectionIdFieldName];
                    toReferentOffsetFieldName = "";
                }
                if (fromMeasure < toMeasure) {
                  eventAttributes[eventLayer.fromReferentMethodFieldName] = fromReferentMethodFieldName;
                  eventAttributes[eventLayer.fromReferentLocationFieldName] = fromReferentLocationFieldName;
                  eventAttributes[eventLayer.fromReferentOffsetFieldName] = fromReferentOffsetFieldName;
                  eventAttributes[eventLayer.toReferentMethodFieldName] = toReferentMethodFieldName;
                  eventAttributes[eventLayer.toReferentLocationFieldName] = toReferentLocationFieldName;
                  eventAttributes[eventLayer.toReferentOffsetFieldName] = toReferentOffsetFieldName;
                } else{
                  eventAttributes[eventLayer.fromReferentMethodFieldName] = toReferentMethodFieldName;
                  eventAttributes[eventLayer.fromReferentLocationFieldName] = toReferentLocationFieldName;
                  eventAttributes[eventLayer.fromReferentOffsetFieldName] = toReferentOffsetFieldName;
                  eventAttributes[eventLayer.toReferentMethodFieldName] = fromReferentMethodFieldName;
                  eventAttributes[eventLayer.toReferentLocationFieldName] = fromReferentLocationFieldName;
                  eventAttributes[eventLayer.toReferentOffsetFieldName] = fromReferentOffsetFieldName;
                }
            }
            this._standby.show();
            
            /*if (this._flipParity) {
                editAttributes["geometryDirection"] = (this._currentLineDirection == "withRoute") ? "oppositeRoute" : "withRoute";
            }
            else {
                editAttributes["geometryDirection"] = this._currentLineDirection;
            }*/
            editAttributes["geometryDirection"] = this._currentLineDirection;
            if (this._selectedEvent == null) {
                
                
                // Generate a UUID for the event ID
                if (utils.isStringField(eventLayer.fields, eventLayer.eventIdFieldName)) {
                    eventAttributes[eventLayer.eventIdFieldName] = utils.generateUuid(utils.findField(eventLayer.fields, eventLayer.eventIdFieldName));
                }
                
                eventRecords = [editAttributes];
                editAttributes.attributes= eventAttributes;
                
                var layerEdit = layerEditsMap["" + eventLayer.id];
                if (layerEdit == null) {
                    // Set the properties expected by the applyEdits REST API
                    layerEdit = {
                        id: eventLayer.id,
                        adds: eventRecords,
                        allowMerge: false,
                        retireMeasureOverlap: false
                    };
                    layerEdits.push(layerEdit);
                    layerEditsMap["" + eventLayer.id] = layerEdit;
                }
                else {
                    eventRecords = layerEdit.adds;
                }
            }
            else {
                editAttributes["where"] = utils.findObjectIdFieldName(this._selectedEventLayer.fields) + " = " + this._currentEventId;
                editAttributes.attributes = eventAttributes;
                
                eventRecords = [editAttributes];
                var layerEdit = layerEditsMap["" + eventLayer.id];
                if (layerEdit == null) {
                    // Do a per-layer initieventLayer.eventIdFieldNamealization
                    // Create a new event record for each route/measure match on the target network
                    var eventAttributes = {};
                    // Set the properties expected by the applyEdits REST API
                    layerEdit = {
                        id: eventLayer.id,
                        updates: eventRecords
                    };
                    layerEdits.push(layerEdit);
                    layerEditsMap["" + eventLayer.id] = layerEdit;
                }
                else {
                    eventRecords = layerEdit.updates;
                }
            }
            
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
                        
                        if (val === fieldInfo.value) {
                            return;
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
            
            if (invalidNumericRouteId) {
                this._standby.hide();
                this.showMessage(bundle.error.invalidNumericRouteId);
                this._showFirstPanel();
                return;
            }
            if (invalidFieldValue) {
                this._standby.hide();
                this.showMessage(bundle.error.correctErrors);
                return;
            }
            if (layerEdits.length == 0) {
                this._standby.hide();
                this.showMessage(bundle.error.noIncludedLayers);
                return;
            }
            
            // Save the edits to the server
            utils.setIoTimeout(600);
            this._mapManager.lrsServiceTask.applyEdits({
                edits: layerEdits
            }).then(lang.hitch(this, function(){
                utils.restoreIoTimeout();
                this._standby.hide();
                // Clear map markers and highlights
                this._selectionManager.remove(this);
                // Refresh the map
                this._mapManager.lrsMapLayer.refresh();
                // Update the UI
                this._onSaveComplete();
            }), lang.hitch(this, function(err){
                // Save failed
                utils.restoreIoTimeout();
                var msg = err.message || err;
                array.forEach(err.details, function(detail){
                    msg += "\n\n" + detail;
                }, this);
                console.log("Error while applying LRS edits. ", msg);
                this._standby.hide();
                this.showMessage(string.substitute(bundle.error.saveError, [msg]));
            }));
            
        },
        
        
        _clearMap: function(){
            this._selectionManager.remove(this, "blockRange");
            this._selectionManager.remove(this, "blockRangeArrow");
        },
        
        _resetFields: function(){
        
            var infoWindowManager = this._mapManager.infoWindowManager;
            if (infoWindowManager) {
                infoWindowManager.hide(this);
            }
            this._routeInput.set("value", "");
            this._blockRangeIdInput.set("value", "");
            this._blockRangeIdInput.set("title", "");
            var fromDate = this._mapManager.viewDateTask.getViewDate();
            
            // clear the route start/end dates and reset the checkboxes
            this._fromDateInput.set("value", fromDate);
            this._toDateInput.set("value", null);
            this._useRouteStartDate.set("checked", true);
            this._useRouteEndDate.set("checked", true);
            this._fromDateInput.set("disabled", this._useRouteStartDate.get("checked"));
            this._toDateInput.set("disabled", this._useRouteEndDate.get("checked"));
            
            this._selectedEvent = null;
            this._newEvent = null;
            this._fromIntersection = null;
            this._toIntersection = null;
            this._offsetFeatureSet = null;
            this._routeFeatureSet = null;
            this._widgetGraphics=[];
            this._fromIntersectionId = null;
            this._toIntersectionId = null;
            this._attributeStandby.set("text",bundle.selectBlockRange);
            this._attributeStandby.show();
            this._populateDefaultAttributeValues(true);
            
            this._resetSelectOptions();
        },
        
        
        _onSaveComplete: function(){
            this._clearMap();
            this._resetFields();
            this.disableControls([this._selectFromIntersectionButton, this._selectToIntersectionButton, this._saveButton, this._routeInput, this._zoomRouteButton, this._zoomBlockButton, this._fromDateInput, this._toDateInput, this._useRouteStartDate, this._useRouteEndDate, this._fromIntersectionInput, this._toIntersectionInput, this._flipParityButton, this._flipGeometryButton,this._populateAttributesButton, this._attributeGroupTabs]);
        },
        
        /*
         * Check for unsaved changes
         */
         _checkUnsavedChanges:function(){
             var unsavedChanges = false;
             var feature = null;
             if (this.routeId && this.routeId != "") {
               if (this._selectedEvent != null) {
                 feature = this._selectedEvent;
                 if (feature) {
                   this._fromIntersection = this._fromIntersectionInput.get("value");
                   this._toIntersection = this._toIntersectionInput.get("value");
                   
                   if (this._fromIntersection != " " && this._fromIntersection != "0") {
                     var unsavedFromIntersectionId = this._fromIntersection["type"] ? this._fromIntersection : this._fromIntersection.attributes[this._intersectionLayer.intersectionIdFieldName];
                     if (this._fromIntersectionId != unsavedFromIntersectionId) {
                       unsavedChanges = true;
                     }
                   }
                   if (this._toIntersection != " " && this._toIntersection != "0") {
                     var unsavedToIntersectionId = this._toIntersection["type"] ? this._toIntersection : this._toIntersection.attributes[this._intersectionLayer.intersectionIdFieldName];
                     if (this._toIntersectionId  != unsavedToIntersectionId) {
                       unsavedChanges = true;
                     }
                   }
                   array.forEach(this._grids, function(grid){
                     grid.store.fetch({
                       onItem: lang.hitch(this, function(item){
                         var itemId = grid.store.getValue(item, "id");
                         var itemInfo = this._editItemInfo[itemId];
                         var fieldInfo = itemInfo.field;
                         var value = grid.store.getValue(item, "fieldValue");
                         if (fieldInfo.value != value) {
                           unsavedChanges = true;
                         }
                       })
                     });
                   }, this);
                   
                 }
               }
               else 
                 if (this._newEvent && !this.isEmpty(this._newEvent)) {
                   unsavedChanges = true;
                 }
             }
             return unsavedChanges;
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
        
        _populateDefaultAttributeValues: function(reset){
            // Populate default field values in the grid
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        var defaultValue = reset? null: itemInfo.field.defaultValue;
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
        _populateAttributeValues: function(attributes){
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
            // Refresh the grids
            array.forEach(this._grids, function(g){
                g.update();
            }, this);
            
            
        },
        
        _populateAttribute: function(fieldName, value){
            // Populate default field values in the grid
       
            if (fieldName == this._addressConfig.blockRangeLayer.fullStreetNameField) {
                if (this._addressConfig.masterStreetNameTable && this._addressConfig.masterStreetNameTable.attributeMapping) {
                    this._addressTask.populateAttributesFromMasterStreetTable(this._selectedEventLayer, value).then(lang.hitch(this, function(result) {
                        if (this._standby) {
                            this._standby.hide();
                        }
                        array.forEach(this._grids, function(grid) {
                            grid.store.fetch({
                                onItem : lang.hitch(this, function(item) {
                                    var itemId = grid.store.getValue(item, "id");
                                    var itemInfo = this._editItemInfo[itemId];
                                    if (itemInfo.field.name == fieldName)
                                        grid.store.setValue(item, "fieldValue", value);
                                })
                            });
                        }, this);
                        if (result.attributes) {
                            for (var field in result.attributes) {
                                var fieldValue = result.attributes[field];
                                this._populateAttribute(field, fieldValue);
                            }
                        }
                    }));
                }
            } else {
                array.forEach(this._grids, function(grid) {
                    grid.store.fetch({
                        onItem : lang.hitch(this, function(item) {
                            var itemId = grid.store.getValue(item, "id");
                            var itemInfo = this._editItemInfo[itemId];
                            if (itemInfo.field.name == fieldName)
                                grid.store.setValue(item, "fieldValue", value);
                        })
                    });
                }, this);
            }
            // Refresh the grids
            array.forEach(this._grids, function(g) {
                g.update();
            }, this);

        },
        
        _autoPopulateAttribute:function(fieldName, value){
            array.forEach(this._grids, function(grid){
                grid.store.fetch({
                    onItem: lang.hitch(this, function(item){
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        if (itemInfo.field.name == fieldName) {
                            var field = itemInfo.field;
                            var original = field.value;
                            if (original !== original || original == undefined || original === "") {
                                original = null;
                            }
                            if (!original) {
                                if (this._validateFieldValue(value, itemInfo.field)) 
                                    grid.store.setValue(item, "fieldValue", value);
                            }
                        }
                    })
                });
            }, this);
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
        _formatNewAttrValue: function(attrs, field, useAlias){
           
            if (!useAlias === undefined) {
            useAlias = false;
        }
        var value;
                if(useAlias)
                  value = attrs[field.alias];
                else
                  value = attrs[field.name];
            if (attrs == null || value == null) {
                if (field.nullable) {
                    return null;
                }
                else {
                    return "";
                }
            }
            else {
                
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
        },
        
        
        /*
         * Sets the route start and end date data based on the attributes of route
         * feature.
         */
        _setRouteStartEndDate: function(attributes){
            this._routeStartEndDate = attributes ? {
                routeStartDate: attributes[this._selectedNetworkLayer.fromDateFieldName],
                routeEndDate: attributes[this._selectedNetworkLayer.toDateFieldName]
            } : {};
            
            this._updateRouteStartEndDate();
        },
        
        /*
         * Updates the start/end date input with the route start/end date.
         */
        _updateRouteStartEndDate: function(){
            var routeStartDate = null, routeEndDate = null;
            
            var data = this._routeStartEndDate||{};
            routeStartDate = data.routeStartDate || null;
            routeEndDate = data.routeEndDate || null;
            
            
            this._updateRouteDate(this._useRouteStartDate, routeStartDate, this._fromDateInput);
            this._updateRouteDate(this._useRouteEndDate, routeEndDate, this._toDateInput);
        },
        
        /*
         * A common function to update a date input with route date if the
         * "Use route [start|end] date" checkbox is checked.
         */
        _updateRouteDate: function(useRouteDate, routeDate, dateInput){
            var checked = useRouteDate.get("checked");
            if (checked) {
                if (utils.isValidDate(routeDate)) {
                    //TODO: Revisit after standardizing the time zone between desktop and server.
                    // Currently when converting Date to milliseconds, we only use year, month, and date.
                    // So, no need to get the UTC hours, minutes, and seconds when creating Date here.
                    // We assume it's 12 AM since the UI doesn't allow to specify time.
                    routeDate = new Date(routeDate);
                    routeDate = new Date(routeDate.getUTCFullYear(), routeDate.getUTCMonth(), routeDate.getUTCDate());
                }
                dateInput.set("value", routeDate);
            }
        },
        
        /*
         * A common function to disable date input if checked is true and
         * update the date input with route date.  Restores the date that's
         * previously entered if checked is false.
         */
        _onUseRouteDate: function(dateInput, checked, prevDate){
            dateInput.set("disabled", checked);
            if (checked) {
                this._updateRouteStartEndDate();
            }
            else {
                dateInput.set("value", prevDate);
            }
        },
        
        
        /*
         * Saves what's previously entered if use route start date checkbox is
         * checked and updates the start date input.
         */
        _onUseRouteStartDate: function(newValue){
            var checked = this._useRouteStartDate.get("checked");
            if (checked) {
                this._prevStartDate = this._fromDateInput.get("value");
            }
            this._onUseRouteDate(this._fromDateInput, checked, this._prevStartDate);
        },
        
        /*
         * Saves what's previously entered if use route end date checkbox is
         * checked and updates the end date input.
         */
        _onUseRouteEndDate: function(newValue){
            var checked = this._useRouteEndDate.get("checked");
            if (checked) {
                this._prevEndDate = this._toDateInput.get("value");
            }
            this._onUseRouteDate(this._toDateInput, checked, this._prevEndDate);
        },
        
        
        _addBlockRangeGraphic: function(feature, isLast){
            var map = this._mapManager.map;
            var geometry = new Polyline(map.spatialReference);
            geometry.paths = feature.geometry.paths;
            this._selectionManager.add(new Graphic(geometry, this.lineSymbol), this, "blockRange");
            this._widgetGraphics["blockRange"] = new Graphic(geometry, this.lineSymbol);
            this._getLineDirectionGraphic(geometry, isLast);
        },
        
        
        
         _getLineDirectionGraphic: function(geometry, isLast){
            var arrowGraphic, fromMeasure, toMeasure;
            var map = this._mapManager.map;
            if (geometry) {
                var lastPathIdx = geometry.paths.length - 1;
                var lastIdx = geometry.paths[lastPathIdx].length - 1;
                 var measureIndex = geometry.paths[0][0].length -1;
                  fromMeasure = geometry.paths[0][0][measureIndex];
                    toMeasure = geometry.paths[lastPathIdx][lastIdx][measureIndex];
                
                if(fromMeasure <= toMeasure){
                  this._currentLineDirection = "withRoute";
                }else{
                  this._currentLineDirection = "oppositeRoute";
                }
                if (isLast) {
                    lastPoint = geometry.getPoint(lastPathIdx, lastIdx);
                    prevPoint = geometry.getPoint(lastPathIdx, lastIdx - 1);
                }
                else {
                    lastPoint = geometry.getPoint(0, 0);
                    prevPoint = geometry.getPoint(0, 1);
                }
                if (map.extent.contains(lastPoint)) {
                  arrowGraphic = new Graphic(lastPoint, this._arrow(lastPoint, prevPoint));
                  this._selectionManager.add(arrowGraphic, this, "blockRangeArrow");
                  this._widgetGraphics["blockRangeArrow"] = arrowGraphic;
                }
                else {
                    var buffer = this._mapManager.selectionManager.tolerancePixels;
                    var extent = new Extent(map.extent.xmin + buffer, map.extent.ymin + buffer, map.extent.xmax - buffer, map.extent.ymax - buffer, map.spatialReference);
                    esriConfig.defaults.geometryService.intersect([geometry], extent).then(lang.hitch(this, function(clippedEventGeoms){
                     array.forEach(clippedEventGeoms, function(geom, index){
                      // verify if there was a valid line (not point) intersection
                      if (maputils.isValidGeometry(geom) && geom.type === "polyline") {
                        var geometry = new Polyline(map.spatialReference);
                        geometry.paths = geom.paths;
                        
                        var lastPathIdx = geometry.paths.length - 1;
                        var lastIdx = geometry.paths[lastPathIdx].length - 1;
                        if (isLast) {
                          lastPoint = geometry.getPoint(lastPathIdx, lastIdx);
                          prevPoint = geometry.getPoint(lastPathIdx, lastIdx - 1);
                        }
                        else {
                          lastPoint = geometry.getPoint(0, 0);
                          prevPoint = geometry.getPoint(0, 1);
                        }
                        var point = new esri.geometry.Point(lastPoint);
                        arrowGraphic = new esri.Graphic(lastPoint, this._arrow(lastPoint, prevPoint));
                        this._selectionManager.add(arrowGraphic, this, "blockRangeArrow");
                        this._widgetGraphics["blockRangeArrow"] = arrowGraphic;
                      }
                    }, this);
                    
                  }), lang.hitch(this, function(err){
               
                  }));
                  
                }
                
            }
            
        },
        
        
        _arrow: function(pt1, pt2){
            return this.arrowHeadSymbol.setAngle(this._calculateAngle(pt1, pt2));
        },
        
        _calculateAngle: function(p1, p2){
            var rise = p2.y - p1.y;
            var run = p2.x - p1.x;
            var angle = ((180 / Math.PI) * Math.atan2(run, rise));
            return (angle - 180);
        },
        
        _createMarkerSymbol: function(config){
            var sym = null;
            if (config) {
                if ((config.style || "").toUpperCase() == "TRIANGLE") {
                    var iconPath = "M 100 300 L 300 300 L 200 100 z", color = maputils._createColor(config), size = config.size, outline = maputils.createLineSymbol(config.outline);
                    sym = new SimpleMarkerSymbol();
                    sym.setPath(iconPath);
                    sym.setColor(color);
                    sym.setSize(size);
                    sym.setOutline(outline);
                }
                else {
                    sym = maputils.createMarkerSymbol(config);
                }
            }
            return sym;
        }
        
        
    });
    /*
     * A multiplexing cell editor that handles numbers, dates, coded value domains, and regular text input types.
     */
    var _FieldEditor = declare("roads.addressManagement.AddBlockRangeUtil._FieldEditor", [dojox.grid.cells._Widget], {
    
        MODE_TEXT: "text",
        MODE_NUMBER: "number",
        MODE_INTEGER: "integer",
        MODE_DATE: "date",
        MODE_DOMAIN: "domain",
        MODE_SELECT: "select",
        
        _NULL_VALUE: "[[_null_]]", // just an arbitrary string that is unlikely to ever be a code within a coded value domain
        _mode: null,
        _extraWidgetProps: null,
        _timerExist:null,
        
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
        
        
         copyAttributesFromMasterStreetTable:function(value){
             if (this.addressConfig.masterStreetNameTable && this.addressConfig.masterStreetNameTable.attributeMapping) {
                 this.addressTask.populateAttributesFromMasterStreetTable(this.eventLayer, value).then(lang.hitch(this, function(result){
                     if (result.attributes) {
                         for (var fieldName in result.attributes) {
                             var value = result.attributes[fieldName];
                             // Auto populate the related fields based on Master Street name attribute mapping
                             array.forEach(this.grids, function(grid){
                                 grid.store.fetch({
                                     onItem: lang.hitch(this, function(item){
                                         var itemId = grid.store.getValue(item, "id");
                                         var itemInfo = this.editItemInfo[itemId];
                                         if (itemInfo.field.name == fieldName) {
                                             var field = itemInfo.field;
                                             var original = field.value;
                                             if (original !== original || original == undefined || original === "") {
                                                 original = null;
                                             }
                                             if (!original) {
                                                 if (this.validateValue(value, itemInfo.field)) 
                                                     grid.store.setValue(item, "fieldValue", value);
                                             }
                                         }
                                     })
                                 });
                             }, this);
                             // Refresh the grids
                             array.forEach(this.grids, function(g){
                                 g.update();
                             }, this);
                         }
                     }
                 }));
             }
        },
        
        onKeyDown: function(evt){
            this._isBackspaceKey = (evt.keyCode == keys.BACKSPACE);
            this.set("autoComplete", false);
            if (this._timerExist) {
                clearTimeout(this._timerExist);
                this._timerExist = null;
            }
            // Set time out to get the current entered value. Otherwise, it shows previous entered value.
            this._timerExist = setTimeout(lang.hitch(this, function(){
            
                // Sets where clause (case-insensitive) to get the location names based on the route Id entered.                                               
                var where = this.get("displayedValue") ? "UPPER(" + this.fullStreetFieldName + ") LIKE '" + utils.escapeSql(this.get("displayedValue")).toUpperCase() + "%'" : "1=1";
                
                var query = new Query();
                query.returnGeometry = false;
                query.where = where;
                query.outSpatialReference = this.mapManager.map.spatialReference;
                query.outFields = ["*"];
                
                // Query the intersection layer.
                 var masterStreetNameInfo = this.mapManager.addressInfo.masterStreetNameInfo, 
                      queryUrl = utils.appendUrlPath(masterStreetNameInfo.serviceLayer.url, "/" + this.masterStreetLayer.id), 
                      def = new Deferred();
                if (this._isBackspaceKey && this.get("displayedValue").length == 0) {
                  this.set("displayedValue", "");
                  this.get("store").setData([]);
                }
                else {
                  clearTimeout(this._timerExist);
                  this._timerExist = null;
                  new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
                  
                    var featureCount = featureSet.features.length;
                    if (featureCount === 0) {
                      this.set("displayedValue", "");
                      this.setErrorState();
                    }
                    else {
                      this.get("store").setData([]);
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
            }), 2);
            
        },
        
        getWidgetProps: function(data){
            return lang.mixin({}, this.inherited(arguments), this._extraWidgetProps || {});
        },
        
        formatNode: function(domNode, data, rowIndex){
            var itemId = this.grid.store.getValue(this.grid.getItem(rowIndex), "id");
            var field = this.parent._editItemInfo[itemId].field;
            this._extraWidgetProps = {};
            var streetNameField = this.parent._addressConfig.blockRangeLayer.fullStreetNameField;
            if (field.name == streetNameField) {
                this._mode = this.MODE_SELECT;
                this.widgetClass = FilteringSelect;
                
                var domainItems = [];
                lang.mixin(this._extraWidgetProps, {
                  store: new Memory({ data: [{ name: data, id: data}]}),
                    options: domainItems,
                    required: !field.nullable,
                    grids: this.parent._grids,
                    editItemInfo: this.parent._editItemInfo,
                    validateValue: this.parent._validateFieldValue,
                    onKeyDown: this.onKeyDown,
                    addressConfig: this.parent._addressConfig,
                    addressTask: this.parent._addressTask,
                    onChange:this.copyAttributesFromMasterStreetTable,
                    masterStreetLayer: this.parent._masterStreetNameTable,
                    fullStreetFieldName: this.parent._fullStreetName,
                    mapManager: this.parent._mapManager,
                    eventLayer: this.parent._selectedEventLayer, 
                    networkLayer: this.parent._selectedNetworkLayer,
                    style: "width: 100%;"
                });
            }
            else 
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
    
    
    return AddBlockRange;
}); // end define
