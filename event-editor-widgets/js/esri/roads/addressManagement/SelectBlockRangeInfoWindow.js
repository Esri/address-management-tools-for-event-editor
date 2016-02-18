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
    "dojo/dom-construct",
    "dojo/string",
    "roads/maputils",
    "roads/utils",
    "dojo/i18n!./nls/res_SelectBlockRangeInfoWindow"
], function(
    array, connect, declare, lang, domConstruct, string, maputils, utils, bundle
) {
    /*
     * Opens a map infoWindow to select a feature.
     */
    return declare("roads.addressManagement.SelectBlockRangeInfoWindow", null, {
    	
    	// Enumeration of display types.
	    DisplayTypes: {
	       BLOCKRANGE:"blockRange",
         ROUTE:"route"
	    },
    	
    	_infoWindowManager: null,
    	_map: null,
    	_message: null,
    	_labels: null,
    	
    	/// Events ///
        onFeatureSelected: function(feature, featureId) {},
        
        constructor: function(params) {
        	if (params) {
	        	this._infoWindowManager = params.infoWindowManager;
	        	this._map = params.map;
        	}
        },
        
        /*
         * Sets the title of the info window
         */
        setTitle: function(/*String*/ title) {
        	var infoWindowManager = this._infoWindowManager;
        	if (infoWindowManager) {
        		infoWindowManager.setTitle(title);
        	}
        },
        
        /*
         * Sets the message to display above the list of features
         */
        setMessage: function(/*String*/ message) {
        	this._message = message;
        },
        
        /*
         * Sets the label to use before each feature.
         */
        setLabel: function(/*String or Array*/ label) {
        	this._label = label;
        },
        
        /*
         * Sets the title, message, and label based on type.
         * Supported types can be found in DisplayTypes enumeration
         */
        setDisplayType: function(/*String*/ type, /*Number|String*/ featuresLength) {
        	var DisplayTypes = this.DisplayTypes;
        	var title = "";
        	var message = "";
        	var label = "";
        	
        	switch (type) {
        		case DisplayTypes.BLOCKRANGE:
        			title = bundle.selectBlockRangePopup.title;
        			message = bundle.selectBlockRangePopup.message;
        			label = bundle.selectBlockRangePopup.label;
        		default:
        			title = bundle.defaultPopup.title;
        			message = bundle.defaultPopup.message;
        			label = bundle.defaultPopup.label;
        			break;
            }
            
            featuresLength ? this.setTitle(string.substitute(title, [featuresLength])) : this.setTitle(string.substitute(title, [""]));
    		this.setMessage(message);
    		this.setLabel(label);
        },
        
        /*
         * Shows the info window popup to select a feature.
         */
       showBlockRangePopup: function(/*Array*/ features, /*String*/ displayField1,/*String*/ displayField2,/*String*/ displayField3, /*String*/ displayField4, /*String*/ displayField5, /*Point*/ mapPoint, /*Object*/ owner) {
          var infoWindowManager = this._infoWindowManager;
          if (infoWindowManager) {
            var contentDiv = domConstruct.create("div");
            infoWindowManager.setContent(contentDiv);
            
            domConstruct.create("div", {
                innerHTML: this._message,
                style: "padding-bottom: 5px"
            }, contentDiv);
            
            // Create a list of feature items and links to select each feature
            array.forEach(features, function(feature, i) {
                var featureId = feature.attributes[displayField1]+" "+bundle.selectBlockRangePopup.label+ Math.min(feature.attributes[displayField2],feature.attributes[displayField3])+"-"+Math.max(feature.attributes[displayField4],feature.attributes[displayField5])+" ",
                       div = domConstruct.create("div", {
		                    innerHTML: this._getLabel(i)
		                }, contentDiv);
		            domConstruct.create("a", {
		            	href: "javascript:void(0)",
		            	title: bundle.selectLabel,
		            	innerHTML: featureId ? utils.escapeHtml(featureId):bundle.noFeatureId,
		            	onclick: lang.hitch(this, this._selectFeature, feature, featureId, owner)
		            }, div);
		            if (maputils.isValidGeometry(feature.geometry)) {
		            	domConstruct.create("span", { innerHTML: " (" }, div);
			            domConstruct.create("a", {
			                href: "javascript:void(0)",
			                title: featureId,
			                innerHTML: bundle.viewLabel,
			                onclick: lang.hitch(this, this._viewFeature, feature)
			            }, div);
			            domConstruct.create("span", { innerHTML: ")" }, div);	
		            }
	        	}, this);
		        infoWindowManager.resize(380, 220);
		        infoWindowManager.show(owner, mapPoint);
        	}
        },
        
        /*
         * Shows the info window popup to select a feature.
         */
        showPopup: function(/*Array*/ features, /*String*/ displayField, /*Point*/ mapPoint, /*Object*/ owner) {
          var infoWindowManager = this._infoWindowManager;
          if (infoWindowManager) {
            var contentDiv = domConstruct.create("div");
            infoWindowManager.setContent(contentDiv);
            
            domConstruct.create("div", {
                innerHTML: this._message,
                style: "padding-bottom: 5px"
            }, contentDiv);
            
            // Create a list of feature items and links to select each feature
            array.forEach(features, function(feature, i) {
                var featureId = feature.attributes[displayField],
                    div = domConstruct.create("div", {
                        innerHTML: this._getLabel(i)
                    }, contentDiv);
                domConstruct.create("a", {
                  href: "javascript:void(0)",
                  title: bundle.selectLabel,
                  innerHTML: featureId ? utils.escapeHtml(featureId):bundle.noFeatureId,
                  onclick: lang.hitch(this, this._selectFeature, feature, featureId, owner)
                }, div);
                if (maputils.isValidGeometry(feature.geometry)) {
                  domConstruct.create("span", { innerHTML: " (" }, div);
                  domConstruct.create("a", {
                      href: "javascript:void(0)",
                      title: featureId,
                      innerHTML: bundle.viewLabel,
                      onclick: lang.hitch(this, this._viewFeature, feature)
                  }, div);
                  domConstruct.create("span", { innerHTML: ")" }, div); 
                }
            }, this);
            
            infoWindowManager.show(owner, mapPoint);
          }
        },
        
        
        
        _getLabel: function(index) {
        	var labels = this._label;
        	if (labels instanceof Array) {
        		return labels[index % labels.length];
        	} else {
        		return labels;
        	}
        },
        
        _selectFeature: function(feature, featureId, owner) {
        	var infoWindowManager = this._infoWindowManager;
        	if (infoWindowManager) {
        		infoWindowManager.hide(owner);
        	}
        	this.onFeatureSelected(feature, featureId);
        },
        
        _viewFeature: function(feature) {
        	var map = this._map;
        	if (map) {
        		maputils.flash(map, feature.geometry, true);	
        	}
        }
    });
});  // end define
