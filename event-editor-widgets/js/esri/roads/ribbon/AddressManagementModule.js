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
    "dojo/_base/lang",
    "dojo/_base/window",
    "dojo/_base/Deferred", 
    "dojo/_base/xhr",
    "dojo/DeferredList",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dijit/MenuItem",
    "dojox/widget/Standby",
    "esri/toolbars/draw",
    "roads/ribbon/RibbonModule",
    "roads/addressManagement/Fishbone",
    "roads/addressManagement/tasks/AddressManagementTask",
    "roads/tasks/ConflictTask",
    "roads/tasks/serviceInfoCache",
    "roads/utils",
    "dojo/i18n!roads/ribbon/nls/res_AddressManagementModule",
    "dojo/i18n!roads/addressManagement/nls/res_AddressConflictTask"
], function(
    array, connect, declare, lang, win,Deferred, xhr, DeferredList, domConstruct, domStyle, MenuItem, Standby, Draw, RibbonModule, Fishbone,
    AddressManagementTask, ConflictTask, serviceInfoCache, utils, bundle, bundle1
) {
/*
 * Ribbon module for address management tools.
 */
return declare("roads.ribbon.AddressManagementModule", [RibbonModule], {
	 _blockRangeLayer:null,
   configPath: "address_management.json",
  _addressTask :null,
  _masterStreetNameTable:null,
  _standby:null,
  _layerDetected: true,
  _fishboneWidget:null,
  blockRangeLayer:null,
  
	onMapReady: function() {
        // Load the app configuration
        this._loadConfig(this.configPath).then(lang.hitch(this, function(config){
          var ribbon = this.ribbon,
            mgr = ribbon.mapManager;

            mgr.addressConflictTask = new ConflictTask({ mapManager: this.ribbon.mapManager, config: this.ribbon.config, bundle: bundle1});
            ribbon.config = utils.deepMixin(this.ribbon.config, config);
            mgr.addressInfo.config = config;
            var task = new AddressManagementTask({
                mapManager: mgr
            });
            this._fishboneWidget = new Fishbone({
            config: ribbon.config,
            mapManager: mgr,
            standby: null
        });
        this._fishboneWidget.postCreate();
            this._addressTask = task;
            domStyle.set(this.ribbon._addressManagementDiv, {
                visibility: "visible",
                display: ""
            });
            this._displayMessage(bundle.loading);
            blockRangeLayer = this.getFeatureLayerByName(config.blockRangeLayer.layerName);
            if (!blockRangeLayer) {
              
              domStyle.set(this.ribbon._blockRangeButton, {
                visibility: "visible",
                display: "block"
              });
              domStyle.set(this.ribbon._blockRangeButton, {
                opacity: "0.5",
                "pointer-events": "none"
              });
              
              domStyle.set(this.ribbon._siteAddressButton, {
                visibility: "visible",
                display: ""
              });
              domStyle.set(this.ribbon._siteAddressButton, {
                opacity: "0.5",
                "pointer-events": "none"
              });
              domStyle.set(this.ribbon._streetNameButton, {
                visibility: "visible",
                display: ""
              });
              domStyle.set(this.ribbon._streetNameButton, {
                opacity: "0.5",
                "pointer-events": "none"
              });
              if (this._standby) {
                      this._standby.hide();
                    }
                    console.log("Unable to load the feature layer for Site Address");
                    this.showMessage(bundle.loadFeatureLayer);
            }
            else {
                var eventLayerMetadata = this.ribbon.mapManager.lrsServiceConfig.eventLayers, selectEventLayer;
                if (eventLayerMetadata.length > 0) {
                    selectedEventLayer = array.filter(eventLayerMetadata, function(lyr){
                        return (lyr.name == this.ribbon.config.blockRangeLayer.layerName);
                    }, this)[0];
                }
                this.ribbon.mapManager.addressInfo.blockRangeInfo = {
                    eventLayerInfo: selectedEventLayer,
                    serviceLayer: this.ribbon.mapManager.lrsMapLayer,
                    layerId: blockRangeLayer.id
                };
                domStyle.set(this.ribbon._blockRangeButton, {
                    visibility: "visible",
                    display: "block"
                });
                this._isSiteAddressLayerConfigured(config.siteAddressPoints.layerName).then(lang.hitch(this, function(result){
                    if (result.isConfigured) {
                        this._addressTask.detectFeatureServer(result.serviceUrl, result.layerId).then(lang.hitch(this, function(result){
                            if (result.detected) {
                                domStyle.set(this.ribbon._siteAddressButton, {
                                    visibility: "visible",
                                    display: ""
                                });
                                domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                    visibility: "visible",
                                    display: ""
                                });
                                domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                    visibility: "visible",
                                    display: ""
                                });
                            }
                            else {
                                this._layerDetected = false;
                                domStyle.set(this.ribbon._siteAddressButton, {
                                    visibility: "visible",
                                    display: ""
                                });
                                domStyle.set(this.ribbon._siteAddressButton, {
                                    opacity: "0.5",
                                    "pointer-events": "none"
                                });
                                domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                    visibility: "visible",
                                    display: ""
                                });
                                domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                    opacity: "0.5",
                                    "pointer-events": "none"
                                });
                                domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                    visibility: "visible",
                                    display: ""
                                });
                                domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                    opacity: "0.5",
                                    "pointer-events": "none"
                                });
                            }
                        }), lang.hitch(this, function(err){
                            this._layerDetected = false;
                            domStyle.set(this.ribbon._siteAddressButton, {
                                visibility: "visible",
                                display: ""
                            });
                            domStyle.set(this.ribbon._siteAddressButton, {
                                opacity: "0.5",
                                "pointer-events": "none"
                            });
                            
                            domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                visibility: "visible",
                                display: ""
                            });
                            domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                                opacity: "0.5",
                                "pointer-events": "none"
                            });
                            domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                visibility: "visible",
                                display: ""
                            });
                            domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                                opacity: "0.5",
                                "pointer-events": "none"
                            });
                        }));
                    }
                    else {
                        this._layerDetected = false;
                        domStyle.set(this.ribbon._siteAddressButton, {
                            visibility: "visible",
                            display: ""
                        });
                        domStyle.set(this.ribbon._siteAddressButton, {
                            opacity: "0.5",
                            "pointer-events": "none"
                        });
                        
                        domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                            visibility: "visible",
                            display: ""
                        });
                        domStyle.set(this.ribbon._selectBlockRangeFishbone, {
                            opacity: "0.5",
                            "pointer-events": "none"
                        });
                        domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                            visibility: "visible",
                            display: ""
                        });
                        domStyle.set(this.ribbon._clearBlockRangeFishbone, {
                            opacity: "0.5",
                            "pointer-events": "none"
                        });
                    }
                    this._isMasterStreetTableConfigured(config.masterStreetNameTable.tableName).then(lang.hitch(this, function(result){
                        
                        if (result.isConfigured) {
                            this._masterStreetNameTable = result.table;
                            var masterStreetNameInfo = this.ribbon.mapManager.addressInfo.masterStreetNameInfo;
                            this._addressTask.detectFeatureServer(masterStreetNameInfo.serviceLayer.url, masterStreetNameInfo.layerId).then(lang.hitch(this, function(result){
                                if (this._standby) {
                                    this._standby.hide();
                                }
                                
                                if (result.detected) {
                                    domStyle.set(this.ribbon._streetNameButton, {
                                        visibility: "visible",
                                        display: ""
                                    });
                                    this._masterStreetNameTable = result.layer;
                                }
                                else {
                                    this._layerDetected = false;
                                    domStyle.set(this.ribbon._streetNameButton, {
                                        visibility: "visible",
                                        display: ""
                                    });
                                    domStyle.set(this.ribbon._streetNameButton, {
                                        opacity: "0.5",
                                        "pointer-events": "none"
                                    });
                                }
                            }), lang.hitch(this, function(err){
                                if (this._standby) {
                                    this._standby.hide();
                                }
                                this._layerDetected = false;
                                domStyle.set(this.ribbon._streetNameButton, {
                                    visibility: "visible",
                                    display: ""
                                });
                                domStyle.set(this.ribbon._streetNameButton, {
                                    opacity: "0.5",
                                    "pointer-events": "none"
                                });
                            }));
                        }
                        else {
                            if (this._standby) {
                                this._standby.hide();
                            }
                            this._layerDetected = false;
                            domStyle.set(this.ribbon._streetNameButton, {
                                visibility: "visible",
                                display: ""
                            });
                            domStyle.set(this.ribbon._streetNameButton, {
                                opacity: "0.5",
                                "pointer-events": "none"
                            });
                            
                        }
                        if (!this._layerDetected) {
                          if (this._standby) {
                            this._standby.hide();
                          }
                          console.log("Unable to load the feature layer for Site Address");
                          this.showMessage(bundle.loadFeatureLayer);
                          
                        }
                }));
              }));
            }
        }), lang.hitch(this, function(err){
            if (err.status && err.status == 404) {
                domStyle.set(this.ribbon._addressManagementDiv, {
                    visibility: "hidden",
                    display: "none"
                });
            }
            else {
                domStyle.set(this.ribbon._addressManagementDiv, {
                    visibility: "hidden",
                    display: "none"
                });
                console.log("Unable to load the application configuration. " + (err || ""));
                this.showMessage(bundle.loadConfig);
            }
        }));
    },
  
    _isMasterStreetTableConfigured: function(tableName) {
        var defd = new Deferred(),
            siteAddressLayer = this.getFeatureLayerByName(tableName);
        var url = this.ribbon.mapManager.lrsMapLayerConfig.url;
        this._addressTask.getTableInformation(url, tableName).then(lang.hitch(this, function(result){
            if (result.hasStreetNameTable) {
                this.ribbon.mapManager.addressInfo.masterStreetNameInfo = {
                    serviceLayer: this.ribbon.mapManager.lrsMapLayer,
                    layerId: result.table.id
                };
                defd.callback({
                    isConfigured: true,
                    table: result.table
                });
            } else {
                // Look through other operational layers
                var defds = [],
                    nonLrsOperationalLayers = [];
                array.forEach(this.ribbon.mapManager.webMapData.operationalLayers, function(operationalLayer, index) {
                    if (operationalLayer.url != this.ribbon.mapManager.lrsMapLayerConfig.url) {
                        var url = utils.appendUrlPath(operationalLayer.url, "/layers");
                        nonLrsOperationalLayers.push(operationalLayer);
                        defds.push(serviceInfoCache.get(url));
                    }
                }, this);
                if (defds.length === 0) {
                    defd.callback({ isConfigured: false });
                    return defd;
                }
                new DeferredList(defds).then(lang.hitch(this, function(results) {
                    var found = array.some(results, function(result, resultIndex) {
                        if (result[0]) {
                            return array.some(result[1].tables, function(tableDetails) {
                                if (tableDetails.name == tableName) {
                                    this.ribbon.mapManager.addressInfo.masterStreetNameInfo = {
                                        serviceLayer: nonLrsOperationalLayers[resultIndex].layerObject,
                                        layerId: tableDetails.id
                                    };                                    
                                    defd.callback({
                                        isConfigured: true,
                                        table: tableDetails
                                    });
                                    return true;
                                }
                                return false;
                            }, this);
                        }
                        return false;
                    }, this);
                    if (!found) {
                        defd.callback({ isConfigured: false });
                    }
                }));
            }
        })); 
        return defd;      
    },
    
    _isSiteAddressLayerConfigured: function(layerName) {
        var defd = new Deferred(),
            siteAddressLayer = this.getFeatureLayerByName(layerName);
        if (siteAddressLayer) {
            this.ribbon.mapManager.addressInfo.siteAddressPointsInfo = {
                serviceLayer: this.ribbon.mapManager.lrsMapLayer,
                layerId: siteAddressLayer.id
            };
            defd.callback({
                isConfigured: true,
                serviceUrl: this.ribbon.mapManager.lrsMapLayerConfig.url,
                layerId: siteAddressLayer.id
            });
        } else {
            // Look through other operational layers
            var defds = [],
                nonLrsOperationalLayers = [];
            array.forEach(this.ribbon.mapManager.webMapData.operationalLayers, function(operationalLayer, index) {
                if (operationalLayer.url != this.ribbon.mapManager.lrsMapLayerConfig.url) {
                    var url = utils.appendUrlPath(operationalLayer.url, "/layers");
                    nonLrsOperationalLayers.push(operationalLayer);
                    defds.push(serviceInfoCache.get(url));
                }
            }, this);
            if (defds.length === 0) {
                defd.callback({ isConfigured: false });
                return defd;
            }
            new DeferredList(defds).then(lang.hitch(this, function(results) {
                var found = array.some(results, function(result, resultIndex) {
                    if (result[0]) {
                        return array.some(result[1].layers, function(layerDetails) {
                            if (layerDetails.name.indexOf(layerName) > -1) {
                                this.ribbon.mapManager.addressInfo.siteAddressPointsInfo = {
                                    serviceLayer: nonLrsOperationalLayers[resultIndex].layerObject,
                                    layerId: layerDetails.id
                                };
                                defd.callback({
                                    isConfigured: true,
                                    serviceUrl: nonLrsOperationalLayers[resultIndex].url,
                                    layerId: layerDetails.id
                                });
                                return true;
                            }
                            return false;
                        }, this);
                    }
                    return false;
                }, this);
                if (!found) {
                    defd.callback({ isConfigured: false });
                }
            }));
        }
        return defd;
    },
    
    /*
     * Loads the app config JSON file.
     * Returns Deferred.
     */
    _loadConfig: function(path) {
        var deferred = new Deferred();
        // Append a timestamp to prevent browser caching
        path += (path.indexOf("?") == -1 ? "?" : "&") + "_ts=" + (new Date().getTime());
        xhr.get({
            url: path,
            handleAs: "json",
            load: function(json) {
                var config = json || {};
                deferred.callback(config);
            },
            error: function(err) {
                console.log("Unable to load the application configuration. " + (err||""));
                deferred.errback(err);
            }
        });
        return deferred;
    },
    
    _drawEnd: function(geometry) {
        this._fishboneWidget.getFishboneAtPoint(geometry);
    },

    
    _drawFishboneGraphics:function(){
      if (this.ribbon.mapManager.selectionManager._activeTool) {
        this.ribbon._setVisualState(this.ribbon._selectBlockRangeFishbone, false, false);
      }else{
        this.ribbon._setVisualState(this.ribbon._selectBlockRangeFishbone, true, false);
      }
      var drawEndHandler = lang.hitch(this,"_drawEnd");
       var toolInfo = {
                button: this.ribbon._selectBlockRangeFishbone,
                drawType:  Draw.POINT,
                drawCallback: drawEndHandler,
                isRibbonTool: true
            };
            connect.publish("/esri/roads/ribbon/button", [toolInfo]);            
    },
    
    _clearFishboneGraphics: function(){
      this._fishboneWidget.clearFishboneLayer();
    },
    
     /*Returns feature layer id*/
     getFeatureLayerByName: function(layerName){
         var layerInfos = this.ribbon.mapManager.lrsMapLayer.layerInfos;
         var layer = array.filter(layerInfos, function(lyr){
            return (lyr.name ==layerName);
         }, this)[0];
         return layer;
     },
     
    /*
     * Displays message using Standby. Sets color to empty string for 
     * transparent background.
     */
    _displayMessage: function(text, color) {
        var standby = this._standby;
        if (!standby) {
            standby = new Standby({
                target: this.ribbon._addressManagementDiv,
                centerIndicator: "text"
            }, domConstruct.create("div", null, win.body()));
            this._standby = standby;
            standby.startup();
        }
        standby.set("color", color || "");
        standby.set("text", text);
        standby.show();
    },
    
     destroy: function () {
        var ribbon = this.ribbon;
        this._fishboneWidget = null;
    },
    
     _showAddBlockRangeWidget:function(){
         var addressRangeStringFields = this._checkAddressRangeFields();
         if (addressRangeStringFields && addressRangeStringFields.length > 0) {
             alert(bundle.addressRangeFieldsError + "\n" + addressRangeStringFields.join("\n"));
             
         }
         else {
             this.ribbon.launchWidget("roads.addressManagement.AddBlockRange", {
                 addressConfig: this.ribbon.config,
                 masterStreetNameTable: this._masterStreetNameTable
             });
         }
    },
    
    _showAddSiteAddressWidget:function(){
        var addressRangeStringFields = this._checkAddressRangeFields();
        if (addressRangeStringFields && addressRangeStringFields.length > 0) {
            alert(bundle.addressRangeFieldsError + "\n" + addressRangeStringFields.join("\n"));
            
        }
        else {
            this.ribbon.launchWidget("roads.addressManagement.AddSiteAddresses", {
                addressConfig: this.ribbon.config,
                masterStreetNameTable: this._masterStreetNameTable
            });
        }
    },
    
    _showAddStreetNamesWidget:function(){
        this.ribbon.launchWidget("roads.addressManagement.AddStreetNames", {
            addressConfig: this.ribbon.config,
            masterStreetNameTable: this._masterStreetNameTable
        });  
    },
    
    _checkAddressRangeFields:function(){
        var addressRangeStringFields = [], 
            selectedEventLayer = this.ribbon.mapManager.addressInfo.blockRangeInfo.eventLayerInfo;
        if (selectedEventLayer) {
            array.forEach(selectedEventLayer.fields, function(field){
                if (field.name == this.ribbon.config.blockRangeLayer.leftFromAddressField ||
                field.name == this.ribbon.config.blockRangeLayer.rightFromAddressField ||
                field.name == this.ribbon.config.blockRangeLayer.leftToAddressField ||
                field.name == this.ribbon.config.blockRangeLayer.rightToAddressField) {
                    var isStringField = utils.isStringField([field], field.name);
                    if (isStringField) {
                        addressRangeStringFields.push(field.name);
                    }
                }
            }, this);
        }
        return addressRangeStringFields;
    }
    
});  // end declare
});  // end define
