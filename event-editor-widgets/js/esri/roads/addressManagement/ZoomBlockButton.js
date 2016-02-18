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
define(["dojo/_base/array", "dojo/_base/declare", "dojo/_base/lang", "dijit/Menu", "dijit/MenuItem", "dijit/form/DropDownButton", "esri/geometry/Point",    "roads/utils",
    "roads/dijit/dijit", "roads/editing/EventZoomer", "dojo/text!./templates/ZoomBlockButton.html", "dojo/i18n!./nls/res_ZoomBlockButton"], function(array, declare, lang, Menu, MenuItem, DropDownButton, Point,utils, dijitUtils, EventZoomer, template, bundle){
    return declare("roads.addressManagement.ZoomBlockButton", [dijitUtils._AppWidget], {
    
        bundle: null,
        mapManager: null,
        templateString: template,
        
        _blockFeature: null,
        
        postMixInProperties: function(){
            this.inherited(arguments);
            this.bundle = bundle;
        },
        
        setBlockFeature: function(value){
            this._blockFeature = value;
        },
        
        
        
        _setDisabledAttr: function(value){
            this._zoomBlockButton.set("disabled", value);
        },
        
        init: function(options){
            lang.mixin(this, options || {});
        },
        
        _onZoomBlockClick: function(){
            this._disableRouteStartEnd(false);
        },
        
        _disableRouteStartEnd: function(disabled){
            this._blockStartItem.set("disabled", disabled);
            this._blockEndItem.set("disabled", disabled);
        },
        
        zoomBlockExtent: function(){
            var feature = this._blockFeature;
            if (feature && feature.geometry) {
                this.mapManager.map.setExtent(feature.geometry.getExtent().expand(1.1), true);
            }
            else {
                alert(bundle.error.zoomToRouteExtent);
            }
        },
        
        _onBlockExtentClick: function(){
            this.zoomBlockExtent();
        },
        
        _onBlockStartClick: function(){
            this.zoomBlockStart();
        },
        
        _onBlockEndClick: function(){
            this.zoomBlockEnd();
        },
        
        
        
        /*
         * Zooms to the block start point.
         */
        zoomBlockStart: function(){
            var feature = this._blockFeature;
            if (feature && feature.geometry) {
                this.zoomBlockStartPoint(feature.geometry);
            }
            else {
                alert(bundle.error.zoomToRouteStart);
            }
        },
        
        /*
         * Zooms to the block end point.
         */
        zoomBlockEnd: function(){
            var feature = this._blockFeature;
            if (feature) {
                this.zoomBlockEndPoint(feature.geometry);
            }
            else {
                alert(bundle.error.zoomToRouteEnd);
            }
        },
        
        /*
         * Centers and zooms to the block start point.
         */
        zoomBlockStartPoint: function(geometry){
            if (geometry && geometry.paths) {
                var map = this.mapManager.map, point = new Point(utils.first(utils.first(geometry.paths)), map.spatialReference);
                this._centerAndZoom(point);
            }
        },
        
        /*
         * Centers and zooms to the block end point.
         */
        zoomBlockEndPoint: function(geometry){
            if (geometry && geometry.paths) {
                var map = this.mapManager.map, point = new Point(utils.last(utils.last(geometry.paths)), map.spatialReference);
                this._centerAndZoom(point);
            }
        },
        
        /*
         * Centers and zooms to the point.
         */
        _centerAndZoom: function(point){
            var map = this.mapManager.map;
            map.centerAndZoom(point,this.mapManager.pointZoomLevel);
        }
    
    }); // end declare
}); // end define
