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
    "dojo/_base/declare",
    "dojo/_base/Deferred",
    "dojo/_base/lang",
    "esri/tasks/query", 
    "esri/tasks/QueryTask",
    "dijit/form/ValidationTextBox",
    "roads/utils",
    "dojo/i18n!./nls/res_StreetNameValidationTextBox"
], function(
    array, declare, Deferred, lang, Query, QueryTask,ValidationTextBox, utils, bundle
) {
return declare("roads.addressManagement.StreetNameValidationTextBox", [ValidationTextBox], {
    
    _config: null,
    _isValid: true,
    
    
    constructor: function() {
        this._config = {};
    },
    
    postMixInProperties: function(){
        this.inherited(arguments);
        this.invalidMessage = bundle.error.invalidMessage;
    },
    
    /*
     * Sets the properties required for this widget.
     */
    _setConfigAttr: function(value) {
        this._config = lang.mixin(this._config, value);
    },
    
    /*
     * Validates the street name value when it's set in the ValidationTextBox.
     */
    _setValueAttr: function(/*String|Number*/ value, /*Boolean?*/ priorityChange, /*String?*/ formattedValue) {
        this.inherited(arguments, [value, priorityChange, formattedValue]);
        this.validateValue();
    },
    
    
  
  
    /*
     * Overrides the function of ValidationTextBox to include check of whether
     * the streetname entered is valid.
     */
    validator: function(/*anything*/ value, /*dijit.form.ValidationTextBox.__Constraints*/ constraints){
      return this._isValid && this.inherited(arguments);
    },

    /*
     * Validates whether measure value can be located on the given route and 
     * network layer ID and update the error state.
     */
    validateValue: function() {
        this.resetState();

        var config = this._config,
            defd = new Deferred();
            
            if (this.get("value").trim()==="") {
              this.invalidMessage = bundle.error.invalidMessage;
              this._isValid = false;            
            this.validate();
            return defd;
        }  
          var where = "UPPER(" + config.fullStreetName + ") = '" + utils.escapeSql(this.get("value")).toUpperCase() + "'";
          var query = new Query();
          query.returnGeometry = false;
          query.where = where;
          query.outFields = ["*"];
          
          // Query the intersection layer.
          var masterStreetNameInfo = config.mapManager.addressInfo.masterStreetNameInfo,
              queryUrl = utils.appendUrlPath(masterStreetNameInfo.serviceLayer.url, "/" + config.layerId);
          new QueryTask(queryUrl).execute(query).then(lang.hitch(this, function(featureSet){
            var featureCount = featureSet.features.length;
            if (featureCount === 0) {
              this.resetState();
            }
            else {
              this.invalidMessage = bundle.error.nameAlreadyExists;
              this._isValid = false;            
              this.validate();
            }
            defd.callback(featureSet);
          }), lang.hitch(this, function(err){
            console.log('Unable to validate street name.', err);
            defd.errback(err);
          }));
          
          
        
        return defd;
    },
    
    /*
     * Sets the state of validation text boxes to be invalid.
     * This shows the invalid messages and highlights textbox.
     */
    setErrorState: function() {
        if (this.get("value").length > 0) {
            this._isValid = false;            
            this.validate();
        }     
    },

    /*
     * Resets the state of a route text box to remove invalid messages and 
     * text box highlight.
     */
    resetState: function() {
        this._isValid = true;
        this.validate();
    },
    
    isValidState: function() {
      return this._isValid;
    }
});
});  // end define
