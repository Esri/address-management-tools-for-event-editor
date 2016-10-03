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
    "dojo/DeferredList",
    "dojo/_base/lang",
    "dojo/string",
    "dijit/registry",
    "esri/config",
    "esri/graphic",
    "esri/units",
    "esri/geometry/Point",
    "esri/geometry/Polyline",
    "esri/tasks/FeatureSet",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/layers/GraphicsLayer",
    "roads/maputils",
    "roads/addressManagement/tasks/AddressManagementTask",
    "roads/addressManagement/SelectBlockRangeInfoWindow",
    "roads/tasks/ProjectionTask",
    "roads/util/attributeSetQuery",
    "roads/util/conflict",
    "roads/utils", 
 "dojo/i18n!./nls/res_Fishbone"
], function(
    array, connect, declare, Deferred, DeferredList, lang, string, registry,
    esriConfig, Graphic, Units, Point, Polyline, FeatureSet, Query, QueryTask,GraphicsLayer, 
    maputils, AddressTask, SelectBlockRangeInfoWindow, ProjectionTask, attributeSetQueryUtils, conflictUtils, utils, bundle
) {
    
    
return declare("roads.addressManagement.Fishbone", null, {
    
     _map: null,
    _standby: null,
    _config: null,
    _mapManager: null,
    _selectionManager: null,
    _lrsMapLayer: null,  
    _lrsMapLayerConfig: null, 
    _lrsServiceTask: null, 
    _eventLayerInfo: null,
    _networkLayerInfo: null,
    _nonLRSLayerInfo: null,
    _nonLRSOperationalLayerInfo: null,
    _eventLayers: null,
    _layerId: null,
    _serviceUrl: null,
    _subscribeHandles: null,
    _networkRoute: null,
    _addressTask: null,
    _method: null,
    
    _selectedNetworkLayer: null,
    _graphicsLayer: null,
    _lineSymbol:null,
    
    constructor: function(params) {
        this._config = params.config;
        this._standby = params.standby;
        this._mapManager = params.mapManager;
        this._selectionManager = params.mapManager.selectionManager;
        this._map = this._mapManager.map;
        this._lrsServiceTask = this._mapManager.lrsServiceTask;
        this._lrsMapLayerConfig = this._mapManager.lrsMapLayerConfig;
        this._lrsMapLayer = this._mapManager.lrsMapLayer;
        this._eventLayers = this._mapManager.lrsServiceConfig.eventLayers;
    },
          
    postMixInProperties: function() {
        this.inherited(arguments);
        this._labels = utils.deepMixin({}, bundle1, bundle2);
    },
    
    postCreate: function() {
        this.inherited(arguments);
        
        this._loadNetworkLayers();
        this._graphicsLayer = new GraphicsLayer();
        this._graphicsLayer.id = "Fishbone";
        this._map.addLayer(this._graphicsLayer, this._map.layerIds.length + this._map.graphicsLayerIds.length);
        if (this._mapManager.addressInfo.config.fishboneSelectionSymbols) {
          this._lineSymbol = maputils.createLineSymbol(this._mapManager.addressInfo.config.fishboneSelectionSymbols.line);
        } else{
          this._lineSymbol = maputils.createLineSymbol(this._mapManager.addressInfo.config.selectionSymbols.line);
        }  
        this._addressTask = new AddressTask({
            mapManager: this._mapManager
        });        
    },
    
    
    
    destroy: function() {
        // unsubscribe
        array.forEach(this._subscribeHandles, function(handle) {
            handle.remove();
        });
        this._subscribeHandles = null;
        
        this.inherited(arguments);
    },
    
     _loadNetworkLayers: function(){
            var networkLayers = this._mapManager.lrsServiceConfig.networkLayers;
            if (networkLayers.length > 0) {
                this._selectedNetworkLayer = networkLayers[0];
            }
        },
   
   getFishboneAtPoint:function(mapClickPoint){
       this._graphicsLayer.clear();
       this._addressTask.queryBlockRangesAtPoint(mapClickPoint).then(lang.hitch(this, function(featureSet){
           var features = featureSet.features;
           var found = false;
           if (features.length == 1) {
               var blockRangeFeature = features[0];
               array.forEach(this._graphicsLayer.graphics, function(graphic){
                 if(graphic.id == blockRangeFeature.attributes[this._mapManager.addressInfo.blockRangeInfo.eventLayerInfo.eventIdFieldName])
                 {
                   found= true;
                 }
               }, this);
                this._graphicsLayer.clear();
               if (found) {
                
                 return;
               }
               else {
                 this._addressTask.getBlockRangeSiteAddressFeatures(blockRangeFeature).then(lang.hitch(this, function(siteAddresses){
                   this._drawFishbone(blockRangeFeature, siteAddresses);
                 }));
               }
           }
           else if (features.length > 1) {
                this._setPopupContent(this._mapManager.map, features, mapClickPoint);
            } else if(features.length == 0){
              this._graphicsLayer.clear();
            }
       }));
   },
   
   clearFishboneLayer: function(){
     this._graphicsLayer.clear();
   },
   
   _drawFishbone:function(blockRangeFeature, siteAddresses){
       var defds = [];
       var graphic = new esri.Graphic(blockRangeFeature.geometry, this._lineSymbol);
       //this._selectionManager.addHighlight(new esri.Graphic(blockRangeFeature.geometry.getExtent().expand(3)));
       graphic.id = blockRangeFeature.attributes[this._mapManager.addressInfo.blockRangeInfo.eventLayerInfo.eventIdFieldName];
       this._graphicsLayer.add(graphic);
       var params;
       locations = [];
       if (siteAddresses.length > 0) {
         array.forEach(siteAddresses, function(siteAddress){
           var location = {
             "routeId": blockRangeFeature.attributes[this._mapManager.addressInfo.blockRangeInfo.eventLayerInfo.routeIdFieldName],
             "measure": siteAddress.measure
           };
           locations.push(location);
         }, this);
         var params = {
           "locations": locations,
           "outSR": this._mapManager.map.spatialReference.toJson()
         };
         this._mapManager.lrsServiceTask.measureToGeometry(this._selectedNetworkLayer.id, params).then(lang.hitch(this, function(result){
           if (result && result.locations && result.locations.length > 0) {
             array.forEach(result.locations, function(location, index){
               if (location.status == "esriLocatingOK") {
                 geometry = location.geometry;
                 if (geometry) {
                   if (location.geometryType == "esriGeometryPoint") {
                     var geometry = new Polyline([[siteAddresses[index].geometry.x, siteAddresses[index].geometry.y], [geometry.x, geometry.y]]);
                     geometry.setSpatialReference(siteAddresses[index].geometry.spatialReference);
                     var graphic = new esri.Graphic(geometry, this._lineSymbol);
                     this._graphicsLayer.add(graphic);
                   }
                 }
               }
             }, this);
           }
         }));
       }else{
         alert(bundle.error.noSiteAddress);
       }
   },
   
    _setPopupContent: function(map, features, point){
            var displayField = this._mapManager.addressInfo.config.blockRangeLayer.fullStreetNameField;
            var popup = new SelectBlockRangeInfoWindow({
                map: map,
                infoWindowManager: this._mapManager.infoWindowManager
            });
            connect.connect(popup, "onFeatureSelected", lang.hitch(this, this._popupSelectBlockRangeOnClick));
            popup.setDisplayType(popup.DisplayTypes.BLOCKRANGE, features.length);
            popup.showBlockRangePopup(features, displayField, this._mapManager.addressInfo.config.blockRangeLayer.leftFromAddressField, this._mapManager.addressInfo.config.blockRangeLayer.rightFromAddressField, this._mapManager.addressInfo.config.blockRangeLayer.leftToAddressField, this._mapManager.addressInfo.config.blockRangeLayer.rightToAddressField, point, this);
        },
        
        _popupSelectBlockRangeOnClick: function(feature, routeId){
          var found = false;
            array.forEach(this._graphicsLayer.graphics, function(graphic){
                 if(graphic.id == feature.attributes[this._mapManager.addressInfo.blockRangeInfo.eventLayerInfo.eventIdFieldName])
                 {
                    found = true;
                }
            }, this);
             this._graphicsLayer.clear();
            if (found) {
               
                return;
            }
            else {
                this._addressTask.getBlockRangeSiteAddressFeatures(feature).then(lang.hitch(this, function(siteAddresses){
                    this._drawFishbone(feature, siteAddresses);
                }));
            }
        }
   
});  // end declare
});  // end define
