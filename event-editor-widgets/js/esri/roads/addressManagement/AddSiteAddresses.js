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
"dojox/gfx/move",
"dojo/_base/lang", 
"dojo/_base/window", 
"dojo/data/ItemFileWriteStore",
"dojo/date/locale", 
"dojo/DeferredList", 
"dojo/dom-attr", 
"dojo/dom-style",
"dojo/dom-construct", 
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
"dijit/form/Form", 
"dijit/registry", 
"roads/addressManagement/SiteAddressItemsModel",
"dijit/Tree",
"dojo/_base/Color", 
"esri/symbols/SimpleLineSymbol", 
"esri/symbols/SimpleMarkerSymbol",
"esri/request",
"esri/graphic", 
"esri/geometry/Point", 
"esri/geometry/Polyline", 
"esri/geometry/mathUtils", 
"esri/tasks/IdentifyParameters", 
"esri/tasks/IdentifyTask", 
"esri/tasks/query", 
"esri/layers/FeatureLayer",
"esri/toolbars/edit",
"esri/tasks/QueryTask", 
"esri/toolbars/draw", 
"esri/symbols/PictureMarkerSymbol",
"roads/dijit/dijit", 
"roads/dijit/RouteValidationTextBox", 
"roads/addressManagement/SiteAddressTree", 
"roads/addressManagement/util/mathUtil",
"roads/dijit/layout/TransitionStackContainer",
"roads/editing/AttributeSet", 
"roads/dijit/form/Dialog",
"roads/maputils", 
"roads/util/date", 
"roads/util/method", 
"roads/utils",
"roads/addressManagement/SelectBlockRangeInfoWindow", 
"roads/addressManagement/tasks/AddressManagementTask",
"dojo/text!./templates/AddSiteAddresses.html", 
"dojo/i18n!./nls/res_common", 
"dojo/i18n!./nls/res_AddSiteAddresses"],
   function(array, connect, declare, Deferred, keys,Moveable, lang, win, ItemFileWriteStore, dateLocale, DeferredList, domAttr, domStyle,domConstruct, string, 
   DataGrid, gridCells,Memory, Standby, MenuItem, Button, CheckBox, DateTextBox, Select,FilteringSelect, ValidationTextBox, ContentPane, TabContainer,Form, registry, 
   ForestStoreModel,Tree, Color, SimpleLineSymbol, SimpleMarkerSymbol, esriRequest, Graphic, Point, Polyline, geometryMathUtils, IdentifyParameters, IdentifyTask, Query, FeatureLayer, Edit, QueryTask, Draw, 
   PictureMarkerSymbol, dijitUtils, RouteValidationTextBox, SiteAddressTree, mathUtil, TransitionStackContainer, editing,Dialog, maputils, dateUtils, methodUtils, utils, 
   SelectBlockRangeInfoWindow,AddressManagementTask,  template, bundle1, bundle2){
   
    var bundle = utils.deepMixin({}, bundle1, bundle2);

    // alias
    var MeasureReferenceTypes = methodUtils.MeasureReferenceTypes;

    var AddSiteAddresses = declare("roads.addressManagement.AddSiteAddresses", [dijitUtils._BaseWidget], {

        templateString : template,

        // UI defaults
        widgetPlacement : dijitUtils.DOCK_LEFT,
        preferredHeight : 300,
        preferredWidth : 450,

        // Instance variables
        _config : null,
        _addressConfig : null,
        _mapManager : null,
        _selectionManager : null,
        _selectedNetworkLayer : null,
        _itemIndex : 0,
        _mapTolerance : null,
        _mapClickPoint : null,
        _editToolBar : null,
        _subscribes : [],
        _mapConnect : null,
        _widgetConnect : null,
        _widgetGraphics : null,

        _groupDataItems : [],
        _currentRootItem : null,
        _store : null,
        _grids : [],
        _tree : null,
        _currentGridId : null,
        _currentId : null,
        _siteAddressArr : [],
        _isBlockRangeButtonActive : true,
        _dialog : null,

        _onLayersAddResultConnect : null,
        _addressManagementTask : null,
        featureLayer : null,
        mapLayer : null,
        _highlightSymbol : null,

        _treeStandby : null,
        _gridStandby : null,

        category : {
            TYPE_BLOCKRANGE : "blockRange",
            TYPE_SITEADDRESS : "siteAddress"
        },

        _UNIQUE_VALUE : "[[_00000_]]", // just an arbitrary string that is unlikely to ever be a block range id

        lineSymbol : null,

        constructor : function(params) {
            this._config = params.config;
            this._addressConfig = params.addressConfig;
            this._masterStreetNameTable = params.masterStreetNameTable;
            this._mapManager = params.mapManager;
            this._dialog = new Dialog({
                style : "width: 300px;"
            });
            this._dialog.startup();
            this._selectionManager = params.mapManager.selectionManager;
        },

        postMixInProperties : function() {
            this.inherited(arguments);
            this.bundle = utils.deepMixin({}, this.bundle, bundle);
            this.title = bundle.title;
        },

        postCreate : function() {
            this.inherited(arguments);

            this._standby = new Standby({
                target : this.get("id")
            }, domConstruct.create("div", null, win.body()));
            this._standby.startup();

            this._loadNetworkLayers();
            this._loadEventLayers(this._addressConfig.blockRangeLayer.layerName);

            this._addressManagementTask = new AddressManagementTask({
                mapManager : this._mapManager
            });
            this._editToolBar = new Edit(this._mapManager.map);
            this._selectionManager.registerTool(this._selectBlockRangeButton, Draw.POINT, lang.hitch(this, "_onSelectRoute"), this);
            this._selectionManager.registerTool(this._addSiteButton, Draw.POINT, lang.hitch(this, "_onAddSiteAddressPoint"), this);
            this._selectionManager.registerTool(this._selectSiteButton, Draw.POINT, lang.hitch(this, "_onSelectSiteAddressPoint"), this);
            this._selectionManager.registerTool(this._addGenericSiteButton, Draw.POINT, lang.hitch(this, "_onAddGenericSiteAddressPoint"), this);

            this._onLayersAddResultConnect = connect.connect(this._mapManager.map, "onLayersAddResult", this, "_onLayersAddResult");
            this._siteAddressArr = [];

            this._widgetGraphics = [];

            this._mapConnect = connect.connect(this._mapManager.map, "onClick", this, "_onMapClick");
            this._widgetConnect = connect.connect(this, "onShow", this, "_onWidgetShow");

            var color = new Color([255, 255, 0]);

            var markerOutline = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, color, 1);
            this._highlightSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, markerOutline, color);

            this.lineSymbol = maputils.createLineSymbol(this._addressConfig.selectionSymbols.line);
            this._fullStreetName = this._addressConfig.masterStreetNameTable.fullStreetNameField;

            this._initFeatureLayer();
            this._prorateAddressCheckbox.set("checked", true);
            this.disableControls([this._addSiteButton, this._selectSiteButton, this._deleteSiteButton, this._saveButton, this._cancelButton, this._prorateAddressCheckbox]);
        },

        _onWidgetShow : function() {
            if (this._widgetGraphics && !this.isEmpty(this._widgetGraphics)) {
                for (tag in this._widgetGraphics) {
                    this._selectionManager.add(this._widgetGraphics[tag], this, tag);
                }
            }
        },

        isEmpty : function(obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop))
                    return false;
            }
            return true;
        },

        _onMapClick : function() {
            var activeTool = this._selectionManager._activeTool;
            if (activeTool && activeTool.owner === this) {
                this._editToolBar.deactivate();
            }
        },

        /*
         * Creates attribute inspector after feature layers are added to the map.
         */
        _onLayersAddResult : function(results) {
            this._initTree();
            this._initAttributeGrid();
            /* this._subscribes.push(connect.subscribe("/esri/roads/drawTool/activate", this, function(data){
             if (data.toolInfoOrTemplate.button === this._selectBlockRangeButton) {
             this._selectBlockRangeButton.set("iconClass","iconButton selectBlockRangeIcon");
             this._isBlockRangeButtonActive=true;
             }
             }));*/
            this._standby.hide();
            connect.disconnect(this._onLayersAddResultConnect);
            this._onLayersAddResultConnect = null;
        },

        _initFeatureLayer : function() {
            var map = this._mapManager.map, siteAddressPointsInfo = this._mapManager.addressInfo.siteAddressPointsInfo, serviceLayer = siteAddressPointsInfo.serviceLayer;
            this.mapLayer = serviceLayer;
            var urlAndParams = this._addressManagementTask.getFeatureServerUrlAndUrlParams(serviceLayer.url), visibleLayers = serviceLayer.visibleLayers;
            var visible = (array.indexOf(visibleLayers, siteAddressPointsInfo.layerId) !== -1), url = urlAndParams.url + siteAddressPointsInfo.layerId + urlAndParams.params;
            this.featureLayer = new FeatureLayer(url, {
                mode : FeatureLayer.MODE_ONDEMAND,
                outFields : ["*"],
                visible : false,
                id : this._addressConfig.siteAddressPoints.layerName
            });

            // this gets triggered after applyEdits() is called for adding, deleting, or updating feature
            connect.connect(this.featureLayer, "onEditsComplete", this, "_onEditsComplete");
            this._standby.show();
            map.addLayers([this.featureLayer]);

        },

        /*
         * Gets called after we apply add, update, or delete edits to the feature layer.
         */
        _onEditsComplete : function(addResults, updateResults, deleteResults) {
            this._resetFields();
            this._standby.hide();
        },

        _loadNetworkLayers : function() {
            var networkLayers = this._mapManager.lrsServiceConfig.networkLayers;
            if (networkLayers.length > 0) {
                this._selectedNetworkLayer = networkLayers[0];
            }
        },

        _loadEventLayers : function(eventLayerName) {
            var eventLayerMetadata = this._mapManager.lrsServiceConfig.eventLayers;

            if (eventLayerMetadata.length > 0) {
                this._selectedEventLayer = array.filter(eventLayerMetadata, function(lyr){
                return (lyr.name== eventLayerName);
                }, this)[0];
            }
        },

        onClose : function() {
            var message = bundle.closeWarning;
            return !this._checkUnsavedChanges() || confirm(message);
        },

        destroy : function() {
            this._clearMap();
            this._selectionManager.unregisterTool(this._selectBlockRangeButton);
            this._selectionManager.unregisterTool(this._addSiteButton);
            this._selectionManager.unregisterTool(this._selectSiteButton);
            this._mapManager.map.removeLayer(this.featureLayer);
            connect.disconnect(this._onLayersAddResultConnect);
            this._onLayersAddResultConnect = null;
            connect.disconnect(this._mapConnect);
            this._mapConnect = null;
            connect.disconnect(this._widgetConnect);
            this._widgetConnect = null;

            this._widgetGraphics = null;

            array.forEach(this._subscribes, connect.unsubscribe);
            if (this._standby) {
                this._standby.destroy();
                this._standby = null;
            }
            this.inherited(arguments);
        },

        _onSelectRoute : function(mapClickPoint) {
            //this._clearMap();
            //this._resetFields();
            /* if (!this._isBlockRangeButtonActive) {
             this._onAddSiteAddressPoint(mapClickPoint);
             }
             else {*/
            this._mapTolerance = (this._mapManager.map.extent.getWidth() / this._mapManager.map.width) * this._mapManager.selectionManager.tolerancePixels;
            this._mapClickPoint = mapClickPoint;
            var extent = maputils.pointToExtent(mapClickPoint, this._mapTolerance);
            this._queryGeometry(extent);
            /*  }*/
        },

        /*
         * Resets the intersection or location feature set, removes options, and reset parent network description.
         */
        _resetSelectOptions : function() {
            this._fromIntersectionInput.set("displayedValue", "");
            this._fromIntersectionInput.get("store").setData([]);
            // remove options
            this._toIntersectionInput.set("displayedValue", "");
            this._toIntersectionInput.get("store").setData([]);
        },

        _queryGeometry : function(geometry, /*String*/routeId) {
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
            new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet) {
                this._standby.hide();

                if (featureSet.features.length == 1) {
                    /*this._isBlockRangeButtonActive = false;
                     this._selectBlockRangeButton.set("iconClass", "iconButton addSiteAddressPointNearSelectedBlockRange");
                     */
                    var map = this._mapManager.map;
                    var geometry = new Polyline(map.spatialReference);
                    geometry.paths = featureSet.features[0].geometry.paths;
                    this._selectionManager.add(new Graphic(geometry, this.lineSymbol), this, "siteAddressblockRange");
                    this._widgetGraphics["siteAddressblockRange"] = new Graphic(geometry, this.lineSymbol);
                    map.centerAt(featureSet.features[0].geometry.getExtent().getCenter());
                    this._populateTreeNode(featureSet.features[0]);

                    this.enableControls([this._addSiteButton, this._prorateAddressCheckbox]);
                } else if (featureSet.features.length > 1) {
                    // Prompt to select one route out of multiple matches
                    this._setPopupContent(this._mapManager.map, this._selectedNetworkLayer, featureSet.features, this._mapClickPoint, this._routeInput, this);
                }

            }), lang.hitch(this, function(err) {
                defd.errback(err);
            }));
        },

        _setPopupContent : function(map, networkLayer, features, point, routeInput, ownerWidget) {
            var displayField = this._addressConfig.blockRangeLayer.fullStreetNameField;
            var popup = new SelectBlockRangeInfoWindow({
                map : map,
                infoWindowManager : this._mapManager.infoWindowManager
            });
            connect.connect(popup, "onFeatureSelected", lang.hitch(this, this._popupSelectBlockRangeOnClick, routeInput, ownerWidget));
            popup.setDisplayType(popup.DisplayTypes.BLOCKRANGE, features.length);
            popup.showBlockRangePopup(features, displayField, this._addressConfig.blockRangeLayer.leftFromAddressField, this._addressConfig.blockRangeLayer.rightFromAddressField, this._addressConfig.blockRangeLayer.leftToAddressField, this._addressConfig.blockRangeLayer.rightToAddressField, point, ownerWidget);
        },

        _popupSelectBlockRangeOnClick : function(routeInput, ownerWidget, feature, routeId) {
            /* this._isBlockRangeButtonActive = false;
             this._selectBlockRangeButton.set("iconClass", "iconButton addSiteAddressPointNearSelectedBlockRange");
             */
            var map = this._mapManager.map;
            var geometry = new Polyline(map.spatialReference);
            geometry.paths = feature.geometry.paths;
            this._selectionManager.add(new Graphic(geometry, this.lineSymbol), this, "siteAddressblockRange");
            this._widgetGraphics["siteAddressblockRange"] = new Graphic(geometry, this.lineSymbol);
            this._widgetGraphics["siteAddressblockRange"] = new Graphic(geometry, this.lineSymbol);
            map.centerAt(feature.geometry.getExtent().getCenter());
            this._populateTreeNode(feature);

            this.enableControls([this._addSiteButton, this._prorateAddressCheckbox]);
        },

        _populateTreeNode : function(feature) {
            var min = Math.min(feature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField], feature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField]), max = Math.max(feature.attributes[this._addressConfig.blockRangeLayer.leftToAddressField], feature.attributes[this._addressConfig.blockRangeLayer.rightToAddressField]);

            var item = {
                id : "" + feature.attributes[this._selectedEventLayer.eventIdFieldName],
                routeId : feature.attributes[this._selectedEventLayer.routeIdFieldName],
                name : feature.attributes[this._addressConfig.blockRangeLayer.fullStreetNameField],
                label : feature.attributes[this._addressConfig.blockRangeLayer.fullStreetNameField] + "(" + min + " to " + max + ")",
                type : this.category.TYPE_BLOCKRANGE,
                feature : feature,
                children : []
            };
            this._store.fetchItemByIdentity({
                identity : feature.attributes[this._selectedEventLayer.eventIdFieldName],
                onItem : lang.hitch(this, function(storeItem) {
                    if (!storeItem) {
                        this._store.newItem(item);
                    }
                })
            });
            this._store.fetchItemByIdentity({
                identity : feature.attributes[this._selectedEventLayer.eventIdFieldName],
                onItem : lang.hitch(this, function(storeItem) {
                    if (storeItem) {
                        this._currentRootItem = storeItem;
                    }
                })
            });

            this._store.save();
        },

        _checkPointLocation : function(a, b, c) {
            if (mathUtil.nearlyEqual(b.x - a.x, 0)) {// vertical line
                if (c.x < b.x) {
                    return b.y > a.y ? 1 : -1;
                }
                if (c.x > b.x) {
                    return b.y > a.y ? -1 : 1;
                }
                return 0;
            }
            if (mathUtil.nearlyEqual(b.y - a.y, 0)) {// horizontal line
                if (c.y < b.y) {
                    return b.x > a.x ? -1 : 1;
                }
                if (c.y > b.y) {
                    return b.x > a.x ? 1 : -1;
                }
                return 0;
            }
            var slope = (b.y - a.y) / (b.x - a.x);
            var yIntercept = a.y - a.x * slope;
            var cSolution = (slope * c.x) + yIntercept;
            if (slope != 0) {
                if (c.y > cSolution) {
                    return b.x > a.x ? 1 : -1;
                }
                if (c.y < cSolution) {
                    return b.x > a.x ? -1 : 1;
                }
                return 0;
            }
            return 0;
        },

        _isCloseBy : function(a, b) {
            if (Math.abs(a - b) == 0)
                return true;
            else
                return false;
        },

        _onAddSiteAddressPoint : function(mapPoint) {
            this._mapClickPoint = mapPoint;
            this.enableControls([this._selectSiteButton, this._deleteSiteButton, this._saveButton, this._cancelButton]);
            var measure, map = this._mapManager.map, routeId = this._store.getValue(this._currentRootItem, "routeId"), tolerance = this._selectionManager.tolerancePixels * (map.extent.getWidth() / map.width), params = {
                locations : [{
                    routeId : routeId,
                    geometry : {
                        x : mapPoint.x,
                        y : mapPoint.y
                    }
                }],
                tolerance : tolerance,
                inSR : map.spatialReference.toJson()
            }, task = this._mapManager.lrsServiceTask, layerId = this._selectedNetworkLayer.id;
            this._standby.show();
            task.geometryToMeasure(layerId, params).then(lang.hitch(this, function(response) {
                var resultLocation = response.locations[0];
                if (resultLocation.results && resultLocation.results.length > 0) {
                    if (resultLocation.results.length == 1) {
                        measure = parseFloat(utils.formatNumber(resultLocation.results[0].measure, this._selectedEventLayer.measurePrecision));
                    }

                    var feature = this._store.getValue(this._currentRootItem, "feature");
                    var fromMeasure = parseFloat(utils.formatNumber(feature.attributes[this._selectedEventLayer.fromMeasureFieldName], this._selectedEventLayer.measurePrecision));
                    var toMeasure = parseFloat(utils.formatNumber(feature.attributes[this._selectedEventLayer.toMeasureFieldName], this._selectedEventLayer.measurePrecision));

                    if (measure >= (fromMeasure - this._selectedNetworkLayer.spatialReferenceInfo.mTolerance) && measure <= (toMeasure + this._selectedNetworkLayer.spatialReferenceInfo.mTolerance) || measure >= (toMeasure - this._selectedNetworkLayer.spatialReferenceInfo.mTolerance) && measure <= (fromMeasure + this._selectedNetworkLayer.spatialReferenceInfo.mTolerance)) {
                        var graphic = new Graphic(new Point(this._mapClickPoint));
                        graphic.id = this._itemIndex;
                        graphic.attributes = {};

                        var address = this._prorateAddress(resultLocation.results[0], feature);
                        var label = this._prorateAddressCheckbox.get("checked") ? address : bundle.genericSiteAddressLabel;
                        var item = {
                            id : "" + this._itemIndex,
                            type : this.category.TYPE_SITEADDRESS,
                            label : label
                        };
                        this._store.newItem(item, {
                            parent : this._currentRootItem,
                            attribute : 'children'
                        });
                        this._store.save();
                        var siteAddress = {
                            id : this._itemIndex,
                            treeItem : item,
                            feature : graphic,
                            attributeGrid : null,
                            contentPane : null
                        };
                        this._selectionManager.add(siteAddress.feature, this, "site" + this._itemIndex);
                        var siteId = "site" + this._itemIndex;
                        this._widgetGraphics[siteId] = siteAddress.feature;

                        this._siteAddressArr.push(siteAddress);

                        this._initAttributeGrid(siteAddress);
                        if (this._prorateAddressCheckbox.get("checked"))
                            this._populateAttribute(siteAddress, this._addressConfig.siteAddressPoints.addressNumberField, label);
                        this._populateAttribute(siteAddress, this._addressConfig.siteAddressPoints.streetNameField, this._store.getValue(this._currentRootItem, "name"));
                        //Auto populate attributes from master street name table
                        if (this._addressConfig.masterStreetNameTable && this._addressConfig.masterStreetNameTable.attributeMapping) {
                            this._addressManagementTask.populateAttributesFromMasterStreetTable(this._addressConfig.siteAddressPoints.layerName, this._store.getValue(this._currentRootItem, "name")).then(lang.hitch(this, function(result) {
                                if (result.attributes) {
                                    for (var field in result.attributes) {
                                        var fieldValue = result.attributes[field];
                                        this._autoPopulateAttribute(siteAddress, field, fieldValue);
                                    }
                                }
                            }));
                        }

                        //Auto populate attributes from polygon layer
                        if (this._addressConfig.polygonLayers || this._addressConfig.polygonServices) {
                            this._addressManagementTask.populateAttributesFromPolygonLayer(this._addressConfig.siteAddressPoints.layerName, siteAddress.feature).then(lang.hitch(this, function(result) {
                                this._standby.hide();
                                if (result.attributes) {
                                    for (var field in result.attributes) {
                                        var fieldValue = result.attributes[field];
                                        this._autoPopulateAttribute(siteAddress, field, fieldValue);
                                    }
                                }
                                this._highlightFeatureByIdOrIndex(siteAddress.id, true);
                                this._itemIndex++;
                            }));
                        } else {
                            this._standby.hide();
                            this._highlightFeatureByIdOrIndex(siteAddress.id, true);
                            this._itemIndex++;
                        }
                    }
                }
            }));
        },

        _onAddGenericSiteAddressPoint : function(mapPoint) {
            this._mapClickPoint = mapPoint;
            this.enableControls([this._selectSiteButton, this._deleteSiteButton, this._saveButton, this._cancelButton]);
            var item = {
                id : this._UNIQUE_VALUE,
                name : bundle.genericBlockRangeLabel,
                label : bundle.genericBlockRangeLabel,
                type : this.category.TYPE_BLOCKRANGE,
                feature : null,
                children : []
            };

            this._store.fetchItemByIdentity({
                identity : this._UNIQUE_VALUE,
                onItem : lang.hitch(this, function(storeItem) {
                    if (!storeItem) {
                        this._selectionManager.remove(this, "siteAddressblockRange");
                        delete (this._widgetGraphics["siteAddressblockRange"]);
                        this._store.newItem(item);
                    }
                })
            });
            this._store.fetchItemByIdentity({
                identity : this._UNIQUE_VALUE,
                onItem : lang.hitch(this, function(storeItem) {
                    if (storeItem) {
                        this._currentRootItem = storeItem;
                    }
                })
            });
            this._store.save();

            var graphic = new Graphic(new Point(this._mapClickPoint));
            graphic.id = this._itemIndex;
            graphic.attributes = {};

            var label = bundle.genericSiteAddressLabel;
            var item = {
                id : "" + this._itemIndex,
                type : this.category.TYPE_SITEADDRESS,
                label : label
            };
            //var index= this._currentRootItem["children"].length;
            this._store.newItem(item, {
                parent : this._currentRootItem,
                attribute : 'children'
            });
            this._store.save();
            var siteAddress = {
                id : this._itemIndex,
                treeItem : item,
                feature : graphic,
                attributeGrid : null,
                contentPane : null
            };
            this._selectionManager.add(siteAddress.feature, this, "site" + this._itemIndex);
            var siteId = "site" + this._itemIndex;
            this._widgetGraphics[siteId] = siteAddress.feature;
            this._siteAddressArr.push(siteAddress);
            //this._siteAddressArr.splice(index,0, siteAddress);
            //this._siteAddressArr.sort(lang.partial(this._compareFunction, this._store.getValue(this._currentRootItem, "id"), this._store.getValue(this._currentRootItem, "label")));
            this._initAttributeGrid(siteAddress);

            if (this._addressConfig.polygonLayers || this._addressConfig.polygonServices) {
                this._addressManagementTask.populateAttributesFromPolygonLayer(this._addressConfig.siteAddressPoints.layerName, siteAddress.feature).then(lang.hitch(this, function(result) {
                    this._standby.hide();
                    if (result.attributes) {
                        for (var field in result.attributes) {
                            var fieldValue = result.attributes[field];
                            this._autoPopulateAttribute(siteAddress, field, fieldValue);
                        }
                    }
                    this._highlightFeatureByIdOrIndex(siteAddress.id, true);
                    this._itemIndex++;
                }));
            } else {
                this._standby.hide();
                this._highlightFeatureByIdOrIndex(siteAddress.id, true);
                this._itemIndex++;
            }
        },

        _prorateAddress : function(mapPointOnRoute, blockRangeFeature) {
            var geometry = blockRangeFeature.geometry;
            var lastPathIdx = geometry.paths.length - 1;
            lastIdx = geometry.paths[lastPathIdx].length - 1;
            lastPoint = geometry.getPoint(lastPathIdx, lastIdx);
            firstPoint = geometry.getPoint(0, 0);
            var isLeft = this._checkPointLocation(mapPointOnRoute.geometry, lastPoint, this._mapClickPoint);
            var min, max;
            var measure = parseFloat(utils.formatNumber(mapPointOnRoute.measure, this._selectedEventLayer.measurePrecision));
            var fromMeasure = parseFloat(utils.formatNumber(blockRangeFeature.attributes[this._selectedEventLayer.fromMeasureFieldName], this._selectedEventLayer.measurePrecision));
            var toMeasure = parseFloat(utils.formatNumber(blockRangeFeature.attributes[this._selectedEventLayer.toMeasureFieldName], this._selectedEventLayer.measurePrecision));

            //Check if the map click point lies within the block Range
            var address;
            if (measure >= (fromMeasure - this._selectedNetworkLayer.spatialReferenceInfo.mTolerance) && measure <= (toMeasure + this._selectedNetworkLayer.spatialReferenceInfo.mTolerance) || measure >= (toMeasure - this._selectedNetworkLayer.spatialReferenceInfo.mTolerance) && measure <= (fromMeasure + this._selectedNetworkLayer.spatialReferenceInfo.mTolerance)) {
                min = Math.min(blockRangeFeature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField], blockRangeFeature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField]);
                max = Math.max(blockRangeFeature.attributes[this._addressConfig.blockRangeLayer.leftToAddressField], blockRangeFeature.attributes[this._addressConfig.blockRangeLayer.rightToAddressField]);
                var totalLength = geometryMathUtils.getLength(firstPoint, lastPoint);
                var pointLength = geometryMathUtils.getLength(firstPoint, new Point(mapPointOnRoute.geometry));
                address = min + Math.floor(((max - min) / (totalLength)) * pointLength);

                if (isLeft == 1) {
                    address = (blockRangeFeature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField] % 2 == 0) ? this._generateAddressNumber(address, false) : this._generateAddressNumber(address, true);
                } else if (isLeft == -1) {
                    address = (blockRangeFeature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField] % 2 == 0) ? this._generateAddressNumber(address, false) : this._generateAddressNumber(address, true);
                }
            }
            return address;

        },

        _generateAddressNumber : function(number, isOdd) {
            var generatedNum;
            if (isOdd) {
                generatedNum = (number % 2 == 0) ? number + 1 : number;
            } else {
                generatedNum = (number % 2 == 0) ? number : number + 1;
            }
            return generatedNum;
        },

        _onSelectSiteAddressPoint : function(mapPoint) {
            var map = this._mapManager.map;
            var extent = maputils.pointToExtent(mapPoint, this._mapTolerance);
            var filteredGraphics = [];
            array.forEach(this._siteAddressArr, function(siteAddress) {
                var feature = siteAddress.feature;
                if (extent.contains(feature.geometry)) {
                    feature.setSymbol(this._selectionManager.highlightPointSymbol);
                    this._editToolBar.activate(Edit.MOVE, feature);
                } else if (feature.symbol == this._selectionManager.highlightPointSymbol) {
                    feature.setSymbol(this._selectionManager.pointSymbol);
                }
            }, this);

        },

        _onDeleteSiteAddressPoint : function() {
            var previousNode;

            if (this._store.getValue(this._tree.selectedItem, "type") == this.category.TYPE_SITEADDRESS) {
                var childNode = this._tree.selectedNode;
                if (this._tree.isFirstChild(childNode)) {
                    previousNode = this._tree.getLastChild();
                } else {
                    previousNode = this._tree.getPreviousChild(childNode);
                }
                var parentItem = childNode.getParent();
                this._deleteChildNode(childNode.item, parentItem, previousNode);
            } else {
                var parent = this._tree.selectedNode;
                if (parent === this._tree.rootNode.getChildren()[0]) {
                    if (parent.hasChildren()) {
                        var firstChildNode;
                        var children = parent.getChildren();
                        firstChildNode = children[0];
                        if (this._siteAddressArr.length > children.length) {
                            previousNode = this._tree.getLastChild();
                            if (previousNode) {
                                this._deleteRootNode(parent, previousNode);
                            }
                        } else {
                            this._deleteRootNode(parent);
                        }
                    } else {
                        if (this._siteAddressArr.length > 0) {
                            previousNode = this._tree.getLastChild();
                            if (previousNode) {
                                this._deleteRootNode(parent, previousNode);
                            }
                        } else {
                            this._deleteRootNode(parent);
                        }
                    }
                } else {
                    if (parent.getPreviousSibling()) {
                        var previousSibling = parent.getPreviousSibling();
                        if (previousSibling.hasChildren()) {
                            var children = previousSibling.getChildren();
                            previousNode = children[children.length - 1];
                            if (previousNode) {
                                this._deleteRootNode(parent, previousNode);
                            }
                        } else {
                            this._deleteRootNode(parent, parent.getPreviousSibling());
                        }
                    } else {
                        this._deleteRootNode(parent);
                    }
                }
            }
        },

        _deleteChildNode : function(childItem, parentItem, previousNode) {
            var item = this._store.getValue(childItem, "id");

            var deleteItem = array.filter(this._siteAddressArr, function(siteAddress){
            return (siteAddress.id == item);
            })[0];
            this._deleteFeatureById(deleteItem);

            if (parentItem.getChildren().length == 0) {
                var item = parentItem.item;
                this._deleteBlockRangeFeatureById(item);
            }

            if (this._siteAddressArr.length > 0) {
                if (previousNode) {
                    this._currentId = this._store.getValue(previousNode.item, "id");
                    this._highlightFeatureByIdOrIndex(this._currentId, false);
                }
            } else {
                var found = false;
                this._store.fetch({
                    onItem : lang.hitch(this, function(item) {
                        found = true;
                    })
                });
                if (!found)
                    this._resetFields();
            }
        },

        _deleteRootNode : function(parentNode, previousNode) {
            var item = parentNode.item;
            this._deleteBlockRangeFeatureById(item);
            if (previousNode) {
                if (this._store.getValue(previousNode.item, "type") == this.category.TYPE_SITEADDRESS) {
                    this._currentId = this._store.getValue(previousNode.item, "id");
                    this._highlightFeatureByIdOrIndex(this._currentId, false);
                } else {
                    this.selectTreeNodeById(this._store.getValue(previousNode.item, "id"));
                    var map = this._mapManager.map;
                    var geometry = new Polyline(map.spatialReference);
                    this._currentRootItem = previousNode.item;
                    var feature = this._store.getValue(this._currentRootItem, "feature");
                    if (feature) {
                        geometry.paths = feature.geometry.paths;
                        this._selectionManager.add(new Graphic(geometry, this.lineSymbol), this, "siteAddressblockRange");
                        this._widgetGraphics["siteAddressblockRange"] = new Graphic(geometry, this.lineSymbol);
                        map.centerAt(feature.geometry.getExtent().getCenter());
                    }
                    this._tree._onExpandoClick({
                        node : previousNode
                    });
                }
            } else {
                var found = false;
                this._store.fetch({
                    onItem : lang.hitch(this, function(item) {
                        found = true;
                    })
                });
                if (!found)
                    this._resetFields();
            }
        },

        _initTree : function() {

            this._groupDataItems = [];
            if (this._featuresPane.hasChildren()) {
                this._featuresPane.destroyDescendants(false);
            }
            this._store = new ItemFileWriteStore({
                data : {
                    identifier : "id",
                    label : "label",
                    items : this._groupDataItems
                }
            });

            var forestStore = new ForestStoreModel({
                store : this._store,
                rootId : "blockRange",
                rootLabel : "Block Ranges",
                childrenAttrs : ["children"]
            });
            this._tree = new SiteAddressTree({
                model : forestStore,
                openOnClick : false,
                showRoot : false
            }, domConstruct.create("div"));
            connect.connect(this._tree, "onClick", this, function(item, node, event) {
                if (this._store.getValue(item, "type") == this.category.TYPE_SITEADDRESS) {
                    this._highlightFeatureByIdOrIndex(item.id);
                } else if (this._store.getValue(item, "type") == this.category.TYPE_BLOCKRANGE) {
                    var map = this._mapManager.map;
                    var geometry = new Polyline(map.spatialReference);
                    this._currentRootItem = item;
                    var feature = this._store.getValue(this._currentRootItem, "feature");
                    if (feature) {
                        geometry.paths = feature.geometry.paths;
                        this._selectionManager.add(new Graphic(geometry, this.lineSymbol), this, "siteAddressblockRange");
                        this._widgetGraphics["siteAddressblockRange"] = new Graphic(geometry, this.lineSymbol);
                        map.centerAt(feature.geometry.getExtent().getCenter());
                    } else {
                        this._selectionManager.remove(this, "siteAddressblockRange");
                        delete (this._widgetGraphics["siteAddressblockRange"]);
                    }
                    this._tree._onExpandoClick({
                        node : node
                    });
                }
            });

            var tabContent = new ContentPane({
                content : this._tree,
                // title: attributeGroup.title,
                style : "padding:0; margin:0;"
            });
            this._featuresPane.addChild(tabContent);
            if (this._featuresPane) {
                this._tree.startup();
            }

        },

        _initAttributeGrid : function(siteAddress) {

            var activeLayer = this.featureLayer;
            // remove existing tabs
            /*if (this._attributePane.hasChildren()) {
             this._attributePane.destroyDescendants(false);
             }*/
            if (!siteAddress || this._siteAddressArr.length == 0) {
                if (this._attributePane.hasChildren()) {
                    this._attributePane.destroyDescendants(false);
                }
            }
            var itemIndex = 1;
            this._editItemInfo = {};
            this._includeLayers = {};

            var groupDataItems = [];
            var lastLayerId = -1;

            array.forEach(activeLayer.fields, function(field) {
                // Filter out fields that have special handling or are not editable
                var unsupportedDataTypes = ["esriFieldTypeGeometry", "esriFieldTypeBlob", "esriFieldTypeRaster", "esriFieldTypeXML", "esriFieldTypeOID"];
                var fieldInfo;
                if (field.editable && (array.indexOf(unsupportedDataTypes, field.type) == -1)) {
                    fieldInfo = field;

                    var item = {
                        id : "" + itemIndex,
                        fieldAlias : fieldInfo.alias || "",
                        fieldValue : fieldInfo.defaultValue
                    };
                    groupDataItems.push(item);
                    this._editItemInfo[item.id] = {
                        // Extra properties that shouldn't be stored directly in the data store item
                        layer : activeLayer,
                        field : fieldInfo
                    };
                    itemIndex++;
                }

            }, this);

            var store = new ItemFileWriteStore({
                data : {
                    items : groupDataItems
                }
            });
            var layout = [{
                name : bundle.attributeColumn,
                field : "fieldAlias",
                width : "120px"
            }, {
                name : bundle.valueColumn,
                field : "fieldValue",
                width : "200px",
                editable : true,
                type : _FieldEditor,
                parent : this,
                formatter : lang.hitch(this, "_formatFieldValue")
            }];
            var grid = new DataGrid({
                store : store,
                structure : layout,
                selectionMode : "none",
                singleClickEdit : true,
                columnReordering : false,
                canSort : function(col) {
                    return false;
                }
            }, domConstruct.create("div"));
            // Workaround for a scrolling bug when coded value domains contain long text descriptions
            // Set timeout so that edit values don't get duplicated into the next row
            connect.connect(grid, "onApplyCellEdit", grid, function() {
                setTimeout(function() {
                    grid.update();
                }, 10);
            });
            connect.connect(grid, "onCancelEdit", grid, function() {
                setTimeout(function() {
                    grid.update();
                }, 10);
            });
            var contentPane = new ContentPane({
                content : grid,
                style : "padding:0; margin:0;"
            });
            if (this._siteAddressArr.length > 1) {
                domStyle.set(this._attributesScrollPane, {
                    visibility : "visible",
                    display : "block"
                });
            } else {
                domStyle.set(this._attributesScrollPane, {
                    visibility : "hidden",
                    display : "none"
                });
            }
            if (siteAddress) {
                siteAddress.attributeGrid = grid;
                siteAddress.contentPane = contentPane;
                this._attributePane.addChild(contentPane);
                //populate default values only after adding an address point
                this._populateDefaultAttributeValues(grid);
            } else
                this._attributePane.addChild(contentPane, 0);

        },

        _populateDefaultAttributeValues : function(grid) {
            grid.store.fetch({
                onItem : lang.hitch(this, function(item) {
                    var itemId = grid.store.getValue(item, "id");
                    var itemInfo = this._editItemInfo[itemId];
                    var defaultValue;
                    //Check for default values first under types
                    if (this.featureLayer.types && this.featureLayer.types.length > 0) {
                        defaultValue = this.featureLayer.types[0].templates[0].prototype.attributes[itemInfo.field.name];
                    } else//if not found then look under templates
                    if (this.featureLayer.templates && this.featureLayer.templates.length > 0) {
                        defaultValue = this.featureLayer.templates[0].prototype.attributes[itemInfo.field.name];
                    } else {
                        defaultValue = null;
                    }
                    itemInfo.field.value = null;
                    grid.store.setValue(item, "fieldValue", defaultValue);
                })
            });

            grid.update();

        },

        /*
         * Check for unsaved changes
         */
        _checkUnsavedChanges : function() {
            var unsavedChanges = false;
            array.forEach(this._siteAddressArr, function(siteAddress) {
                var feature = siteAddress.feature;
                var grid = siteAddress.attributeGrid;
                grid.store.fetch({
                    onItem : lang.hitch(this, function(item) {
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
            return unsavedChanges;
        },

        _populateAttribute : function(item, fieldName, value) {
            // Populate default field values in the grid
            this._standby.show();
            var grid = item.attributeGrid;
            grid.store.fetch({
                onItem : lang.hitch(this, function(item) {
                    var itemId = grid.store.getValue(item, "id");
                    var itemInfo = this._editItemInfo[itemId];
                    if (itemInfo.field.name == fieldName) {
                        grid.store.setValue(item, "fieldValue", value);
                    }
                })
            });

            this._standby.hide();
            // Refresh the grids
            array.forEach(this._siteAddressArr, function(g) {
                g.attributeGrid.update();
            }, this);

        },

        _autoPopulateAttribute : function(item, fieldName, value) {
            // Populate default field values in the grid
            var grid = item.attributeGrid;
            grid.store.fetch({
                onItem : lang.hitch(this, function(item) {
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

            this._standby.hide();
            // Refresh the grids
            array.forEach(this._siteAddressArr, function(g) {
                g.attributeGrid.update();
            }, this);

        },

        _formatFieldValue : function(value, rowIndex, cell) {
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
            if (field.name == this._addressConfig.siteAddressPoints.addressNumberField) {
                var item = array.filter(this._siteAddressArr, function(siteAddress){
                return (siteAddress.attributeGrid == cell.grid);
                })[0];
                if (item) {
                    this._store.fetchItemByIdentity({
                        identity : item.id,
                        onItem : lang.hitch(this, function(treeItem) {
                            if (this._store.getValue(treeItem, "label") != value) {
                                if (value) {
                                    if (value == "") {
                                        this._store.setValue(treeItem, "label", bundle.genericSiteAddressLabel);
                                    } else {
                                        if (isNaN(value)) {
                                            this._store.setValue(treeItem, "label", bundle.genericSiteAddressLabel);
                                        } else {
                                            this._store.setValue(treeItem, "label", value);
                                        }
                                    }
                                    this._highlightFeatureByIdOrIndex(this._store.getValue(treeItem, "id"), true);
                                } else {
                                    this._store.setValue(treeItem, "label", bundle.genericSiteAddressLabel);
                                    this._highlightFeatureByIdOrIndex(this._store.getValue(treeItem, "id"), true);
                                }
                            }
                        })
                    });
                }
            }
            if (this._wasValueEdited(value, itemInfo)) {
                cell.customStyles[0] = 'background-color: ' + this._config.eventAttributes.editedCellColor;

            }

            if (value === undefined || value === null) {
                label = "";
            } else if (field.domain && field.domain.type == "codedValue") {
                label = "";
                array.forEach(field.domain.codedValues, function(codedValue) {
                    if (codedValue.code == value) {
                        label = codedValue.name;
                    }
                }, this);
            } else if (field.type == "esriFieldTypeDate") {
                if (value !== "" && !isNaN(value)) {
                    label = dateLocale.format(new Date(Number(value)), {
                        selector : "date",
                        datePattern : bundle.DatePattern
                    });
                } else {
                    label = "";
                }
            } else if (!lang.isString(value)) {
                if (value !== "" && !isNaN(value)) {
                    label = String(value);
                } else {
                    label = "";
                }
            }
            return label || "&nbsp;";
        },

        _wasValueEdited : function(value, itemInfo) {
            var edited = false;
            var field = itemInfo.field;
            var original = field.value;
            if (value !== value || value == undefined || value == "" || value == bundle.NullValue) {
                value = null;
            }
            if (original !== original || original == undefined || original == "") {
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

        _saveFeatures : function() {
            var invalidNumericRouteId = false;
            var invalidFieldValue = false;
            var newFeatures = [];

            array.forEach(this._siteAddressArr, function(siteAddress) {
                var feature = siteAddress.feature;
                var grid = siteAddress.attributeGrid;
                grid.store.fetch({
                    onItem : lang.hitch(this, function(item) {
                        var itemId = grid.store.getValue(item, "id");
                        var itemInfo = this._editItemInfo[itemId];
                        //var eventRecords;
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
                            } else if (fieldType == "esriFieldTypeDouble" || fieldType == "esriFieldTypeSingle") {
                                val = Number(val);
                                val = isNaN(val) ? null : val;
                            } else if (fieldType == "esriFieldTypeDate") {
                                val = Number(val);
                                val = isNaN(val) ? null : val;
                                // TODO: shift the time to the timezone of the event layer, rather than UTC (eventLayer.timeZoneOffset)
                            }
                        }

                        // Apply the attribute value to all matching event records
                        feature.attributes[fieldInfo.name] = val;

                    })
                });
                newFeatures.push(feature);
            }, this);
            try {
                this._standby.show();
                this.featureLayer.applyEdits(newFeatures, null, null, lang.hitch(this, function() {
                    this.mapLayer.refresh();
                }), lang.hitch(this, function(err) {
                    console.log("Failed");
                }));
            } catch (ex) {

            }
        },

        _clearMap : function() {
            this._selectionManager.remove(this, "siteAddressblockRange");
            array.forEach(this._siteAddressArr, function(siteAddress) {
                this._selectionManager.remove(this, "site" + siteAddress.id);
            }, this);
        },

        _cancelEdits : function() {
            if (this._checkUnsavedChanges()) {
                this._dialog.showConfirm(bundle.title, bundle.cancelWarning, lang.hitch(this, function(toContinue) {
                    if (toContinue) {
                        this._resetFields();
                    }
                }));
            } else {
                this._resetFields();
            }
        },

        _resetFields : function() {
            this._clearMap();
            var infoWindowManager = this._mapManager.infoWindowManager;
            if (infoWindowManager) {
                infoWindowManager.hide(this);
            }
            this._itemIndex = 0;
            this._currentId = 0;
            this.deactivateTools();
            this.disableControls([this._addSiteButton, this._selectSiteButton, this._deleteSiteButton, this._saveButton, this._cancelButton, this._prorateAddressCheckbox]);
            this._siteAddressArr = [];
            this._widgetGraphics = [];
            this._updateScrollButtons();
            this._initTree();
            this._initAttributeGrid();
        },

        /*
         * Deactivates any active map tools on this form.
         */
        deactivateTools : function() {
            if (this._selectionManager) {
                this._selectionManager.deactivateTool(this._addSiteButton);
                this._selectionManager.deactivateTool(this._selectSiteButton);
                this._selectionManager.deactivateTool(this._selectBlockRangeButton);
            }
        },

        /*
         * Validates a data value based on field properties.
         */
        _validateFieldValue : function(value, field) {
            var isValid = true;
            if (field) {
                var isNullValue = (value === undefined || value === null || value === "" || (!lang.isString(value) && isNaN(value)));
                if (isNullValue) {
                    isValid = field.nullable;
                } else if (field.type == "esriFieldTypeString") {
                    if (field.length > 0 && value && value.length > field.length) {
                        isValid = false;
                    }
                } else {
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
                /*if (field.name == this._addressConfig.siteAddressPoints.addressNumberField) {
                 if (this._currentRootItem) {
                 var feature = this._store.getValue(this._currentRootItem, "feature");
                 if (feature) {
                 var min = Math.min(feature.attributes[this._addressConfig.blockRangeLayer.leftFromAddressField], feature.attributes[this._addressConfig.blockRangeLayer.rightFromAddressField]), max = Math.max(feature.attributes[this._addressConfig.blockRangeLayer.leftToAddressField], feature.attributes[this._addressConfig.blockRangeLayer.rightToAddressField]);
                 if ((value >max && value <min) || (value >min && value <max)) {
                 isValid = false
                 }
                 }
                 }
                 }*/

            }
            return isValid;
        },

        /** Function to navigate the Attribute Pane **/
        _onFirstButtonClick : function() {
            var first = this._tree.getFirstChild();
            this._currentId = this._store.getValue(first.item, "id");
            this._highlightFeatureByIdOrIndex(this._currentId, false);
        },

        _onPreviousButtonClick : function() {
            var previous = this._tree.getPreviousChild(this._tree.selectedNode);
            this._currentId = this._store.getValue(previous.item, "id");
            this._highlightFeatureByIdOrIndex(this._currentId, false);
        },

        _onNextButtonClick : function() {
            var next = this._tree.getNextChild(this._tree.selectedNode);
            this._currentId = this._store.getValue(next.item, "id");
            this._highlightFeatureByIdOrIndex(this._currentId, false);
        },

        _onLastButtonClick : function() {
            var last = this._tree.getLastChild();
            this._currentId = this._store.getValue(last.item, "id");
            this._highlightFeatureByIdOrIndex(this._currentId, false);
        },

        _updateScrollButtons : function(selectedNodeId) {

            if (this._siteAddressArr.length > 1) {
                var firstNodeId, lastNodeId;
                if (selectedNodeId === undefined)
                    selectedNodeId = this._store.getValue(this._tree.selectedNode.item, "id");
                var firstNode = this._tree.getFirstChild();
                if (firstNode) {
                    firstNodeId = this._store.getValue(firstNode.item, "id");
                }
                var lastNode = this._tree.getLastChild();
                if (lastNode) {
                    var lastNodeId = this._store.getValue(lastNode.item, "id");
                }

                if (selectedNodeId == firstNodeId) {
                    this._firstButton.set("disabled", true);
                    this._previousButton.set("disabled", true);
                } else {
                    this._firstButton.set("disabled", false);
                    this._previousButton.set("disabled", false);
                }

                if (selectedNodeId == lastNodeId) {
                    this._lastButton.set("disabled", true);
                    this._nextButton.set("disabled", true);
                } else {
                    this._lastButton.set("disabled", false);
                    this._nextButton.set("disabled", false);
                }
            } else {
                this._firstButton.set("disabled", true);
                this._previousButton.set("disabled", true);
                this._lastButton.set("disabled", true);
                this._nextButton.set("disabled", true);
            }
        },

        recursiveHunt : function(lookfor, model, buildme, item) {
            //console.log(">> recursiveHunt, item ", item, " looking for ", lookfor);
            var id = model.getIdentity(item);
            buildme.push(id);
            if (id == lookfor) {
                // Return the buildme array, indicating a match was found
                //console.log("++ FOUND item ", item, " buildme now = ", buildme);
                return buildme;
            }
            for (var idx in item.children) {
                // start a new branch of buildme, starting with what we have so far
                var buildmebranch = buildme.slice(0);
                //  console.log("Branching into ", model.store.getValue(item.children[idx], 'name'), ", buildmebranch=", buildmebranch);
                var r = this.recursiveHunt(lookfor, model, buildmebranch, item.children[idx]);
                // If a match was found in that recurse, return it.
                //  This unwinds the recursion on completion.
                if (r) {
                    return r;
                }
            }
            // Return undefined, indicating no match was found
            return undefined;
        },

        selectTreeNodeById : function(lookfor) {
            //console.log("See model root=", this._tree.model.root);
            var buildme = [];
            var result = this.recursiveHunt(lookfor, this._tree.model, buildme, this._tree.model.root);
            //console.log("*** FINISHED: result ", result, " buildme ", buildme);
            //console.dir(result);
            if (result && result.length > 0) {
                this._tree.set('path', result);
            }
        },

        selectGridById : function(lookFor) {
            var children = this._attributePane.getChildren();
            if (lookFor >= 0 && lookFor < children.length) {
                //arguments[0] = children[lookFor];
                this._attributePane.selectChild(children[lookFor]);
            }
        },

        _highlightFeatureByIdOrIndex : function(id, noFlashGraphic, curPos) {
            if (!noFlashGraphic === undefined) {
                noFlashGraphic = false;
            }
            if (curPos === undefined) {
                this._siteAddressArr.some(function(entry, i) {
                    if (entry.id == id) {
                        curPos = i;
                        return true;
                    }
                });
            }
            //console.log(this._siteAddressArr);
            this._currentId = id;

            this._updateScrollButtons(id);
            this.selectTreeNodeById(this._siteAddressArr[curPos].id);
            this._attributePane.selectChild(this._siteAddressArr[curPos].contentPane);
            if (!noFlashGraphic)
                maputils.flash(this._mapManager.map, this._siteAddressArr[curPos].feature, true, 500, this._highlightSymbol);
        },

        _deleteFeatureById : function(item) {
            var siteId = "site" + item.id, index;
            this._selectionManager.remove(this, siteId);
            delete (this._widgetGraphics[siteId]);
            this._store.fetchItemByIdentity({
                identity : item.id,
                onItem : lang.hitch(this, function(treeItem) {
                    this._store.deleteItem(treeItem);
                    this._store.save();
                })
            });
            this._attributePane.removeChild(item.contentPane);
            this._siteAddressArr.some(function(entry, i) {
                if (entry.id == item.id) {
                    prevIndex = i;
                    return true;
                }
            });
            this._siteAddressArr.splice(prevIndex, 1);
        },

        _deleteBlockRangeFeatureById : function(item) {
            var index;
            this._selectionManager.remove(this, "siteAddressblockRange");
            delete (this._widgetGraphics["siteAddressblockRange"]);
            this._store.fetchItemByIdentity({
                identity : item.id,
                onItem : lang.hitch(this, function(treeItem) {
                    var children = treeItem.children;
                    if (children && children.length > 0) {
                        array.forEach(children, function(child) {
                            var itemId = this._store.getValue(child, "id");
                            var deleteItem = array.filter(this._siteAddressArr, function(siteAddress){
                            return (siteAddress.id == itemId);
                            })[0];
                            this._deleteFeatureById(deleteItem);
                        }, this);
                    }
                    this._store.deleteItem(treeItem);
                    this._store.save();
                })
            });
        }
    });
    /*
     * A multiplexing cell editor that handles numbers, dates, coded value domains, and regular text input types.
     */
    var _FieldEditor = declare("roads.addressManagement.AddSiteAddressesUtil._FieldEditor", [dojox.grid.cells._Widget], {

        MODE_TEXT : "text",
        MODE_NUMBER : "number",
        MODE_INTEGER : "integer",
        MODE_DATE : "date",
        MODE_DOMAIN : "domain",
        MODE_SELECT : "select",

        _NULL_VALUE : "[[_null_]]", // just an arbitrary string that is unlikely to ever be a code within a coded value domain
        _mode : null,
        _extraWidgetProps : null,
        _timerExist : null,

        constructor : function(cellProps) {
            this._mode = this.MODE_TEXT;
        },

        getValue : function(rowIndex) {
            var value = this.inherited(arguments);
            if (this._mode == this.MODE_DATE) {
                // convert a Date to Number of millis
                value = value ? Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), value.getUTCHours()) : null;
            } else if (this._mode == this.MODE_DOMAIN) {
                if (value === this._NULL_VALUE) {
                    value = null;
                }
            }
            return value;
        },

        setValue : function(rowIndex, value) {
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

        copyAttributesFromMasterStreetTable : function(value) {
            if (this.addressConfig.masterStreetNameTable && this.addressConfig.masterStreetNameTable.attributeMapping) {
                this.addressTask.populateAttributesFromMasterStreetTable(this.addressConfig.siteAddressPoints.layerName, value).then(lang.hitch(this, function(result) {
                    if (result.attributes) {
                        for (var fieldName in result.attributes) {
                            var value = result.attributes[fieldName];
                            // Auto populate the related fields based on Master Street name attribute mapping
                            this.grid.store.fetch({
                                onItem : lang.hitch(this, function(item) {
                                    var itemId = this.grid.store.getValue(item, "id");
                                    var itemInfo = this.editItemInfo[itemId];
                                    if (itemInfo.field.name == fieldName) {
                                        var field = itemInfo.field;
                                        var original = field.value;
                                        if (original !== original || original == undefined || original === "") {
                                            original = null;
                                        }
                                        if (!original) {
                                            if (this.validateValue(value, itemInfo.field))
                                                this.grid.store.setValue(item, "fieldValue", value);
                                        }
                                    }
                                })
                            });
                            // Refresh the grids
                            this.grid.update();
                        }
                    }
                }));
            }
        },
        onKeyDown : function(evt) {
            this._isBackspaceKey = (evt.keyCode == keys.BACKSPACE);
            this.set("autoComplete", false);
            if (this._timerExist) {
                clearTimeout(this._timerExist);
                this._timerExist = null;
            }
            // Set time out to get the current entered value. Otherwise, it shows previous entered value.
            this._timerExist = setTimeout(lang.hitch(this, function() {

                // Sets where clause (case-insensitive) to get the location names based on the route Id entered.
                var where = this.get("displayedValue") ? "UPPER(" + this.fullStreetFieldName + ") LIKE '" + utils.escapeSql(this.get("displayedValue")).toUpperCase() + "%'" : "1=1";

                var query = new Query();
                query.returnGeometry = false;
                query.where = where;
                query.outSpatialReference = this.mapManager.map.spatialReference;
                query.outFields = ["*"];

                // Query the intersection layer.
                var masterStreetNameInfo = this.mapManager.addressInfo.masterStreetNameInfo, queryUrl = utils.appendUrlPath(masterStreetNameInfo.serviceLayer.url, "/" + this.masterStreetLayer.id), def = new Deferred();
                if (this._isBackspaceKey && this.get("displayedValue").length == 0) {
                    this.set("displayedValue", "");
                    this.get("store").setData([]);
                } else {
                    clearTimeout(this._timerExist);
                    this._timerExist = null;
                    new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet) {

                        var featureCount = featureSet.features.length;
                        if (featureCount === 0) {
                            this.set("displayedValue", "");
                            this.setErrorState();
                        } else {
                            this.get("store").setData([]);
                            var searchValue = this.get("displayedValue"), optionsCount = 0, data = [], displayFieldValue;

                            var streetName;
                            array.some(featureSet.features, function(feature) {
                                displayFieldValue = feature.attributes[this.fullStreetFieldName];

                                streetName = displayFieldValue;

                                // Case insensitive comparison.
                                if (streetName.toUpperCase().indexOf(searchValue.toUpperCase()) == 0) {
                                    data.push({
                                        name : displayFieldValue,
                                        id : displayFieldValue
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

        getWidgetProps : function(data) {
            return lang.mixin({}, this.inherited(arguments), this._extraWidgetProps || {});
        },

        formatNode : function(domNode, data, rowIndex) {
            var itemId = this.grid.store.getValue(this.grid.getItem(rowIndex), "id");
            var field = this.parent._editItemInfo[itemId].field;
            this._extraWidgetProps = {};
            var streetNameField = this.parent._addressConfig.siteAddressPoints.streetNameField;
            if (field.name == streetNameField) {
                this._mode = this.MODE_SELECT;
                this.widgetClass = FilteringSelect;

                var domainItems = [];
                lang.mixin(this._extraWidgetProps, {
                    store : new Memory({
                        data : [{
                            name : data,
                            id : data
                        }]
                    }),
                    options : domainItems,
                    required : !field.nullable,
                    grid : this.grid,
                    streetName : this.parent._selectedStreetName,
                    editItemInfo : this.parent._editItemInfo,
                    validateValue : this.parent._validateFieldValue,
                    onKeyDown : this.onKeyDown,
                    addressConfig : this.parent._addressConfig,
                    addressTask : this.parent._addressManagementTask,
                    onChange : this.copyAttributesFromMasterStreetTable,
                    masterStreetLayer : this.parent._masterStreetNameTable,
                    fullStreetFieldName : this.parent._fullStreetName,
                    mapManager : this.parent._mapManager,
                    networkLayer : this.parent._selectedNetworkLayer,
                    style : "width: 100%;"
                });
            } else if (field.domain && field.domain.type == "codedValue") {
                this._mode = this.MODE_DOMAIN;
                this.widgetClass = Select;
                var domainItems = [];
                if (field.nullable) {
                    domainItems.push({
                        value : this._NULL_VALUE,
                        label : bundle.NullValue
                    });
                }
                array.forEach(field.domain.codedValues, function(codedValue) {
                    domainItems.push({
                        value : String(codedValue.code),
                        label : codedValue.name
                    });
                }, this);
                lang.mixin(this._extraWidgetProps, {
                    options : domainItems,
                    style : "width: 100%;"
                });
            } else if (field.type == "esriFieldTypeDate") {
                this._mode = this.MODE_DATE;
                this.widgetClass = DateTextBox;
                var dateVal = (data === undefined || data === null || data === "" || isNaN(data)) ? null : new Date(Number(data));
                lang.mixin(this._extraWidgetProps, {
                    value : dateVal,
                    required : !field.nullable,
                    constraints : {
                        datePattern : bundle.DatePattern
                    }
                });
            } else if (field.type == "esriFieldTypeInteger" || field.type == "esriFieldTypeSmallInteger" || field.type == "esriFieldTypeOID") {
                this._mode = this.MODE_INTEGER;
                this.widgetClass = ValidationTextBox;
                lang.mixin(this._extraWidgetProps, {
                    required : !field.nullable,
                    regExp : utils.integerRegExpFormat,
                    invalidMessage : bundle.validation.enterNumberWithoutDecimal
                });
            } else if (field.type == "esriFieldTypeDouble" || field.type == "esriFieldTypeSingle") {
                this._mode = this.MODE_NUMBER;
                this.widgetClass = ValidationTextBox;
                lang.mixin(this._extraWidgetProps, {
                    required : !field.nullable,
                    regExp : utils.numberRegExpFormat,
                    invalidMessage : bundle.validation.enterNumber
                });
            } else {
                this._mode = this.MODE_TEXT;
                this.widgetClass = ValidationTextBox;
                lang.mixin(this._extraWidgetProps, {
                    required : !field.nullable
                });
                if (field.length > 0) {
                    lang.mixin(this._extraWidgetProps, {
                        regExp : ".{0," + field.length + "}",
                        invalidMessage : string.substitute((field.length == 1) ? bundle.validation.enterStringLengthSingular : bundle.validation.enterStringLengthPlural, [field.length])
                    });
                }
            }

            // Destroy the editor widget so a different one can be created for another field
            var oldWidget = this.widget;

            if (oldWidget) {
                setTimeout(function() {
                    try {
                        oldWidget.destroyRecursive();
                    } catch (e) {
                        console.log("error while destroying editor widget: [" + oldWidget.declaredClass + "] ", e);
                    }
                }, 10);
            }
            this.widget = null;

            this.inherited(arguments);
        }
    });
    _FieldEditor.markupFactory = function(node, cell) {
        dojox.grid.cells._Widget.markupFactory(node, cell);
    };

    return AddSiteAddresses;

}); // end define
