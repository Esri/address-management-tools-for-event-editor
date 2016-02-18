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
    "dojo/_base/json", 
    "dojo/_base/lang",
    "dojo/date/locale", 
    "dojo/dom-attr",
    "dojo/dom-geometry", 
    "dojo/dom-style", 
    "dojo/query", 
    "dojo/string",
    "dojox/uuid", 
    "dojox/uuid/generateTimeBasedUuid",
    "esri/config", 
    "esri/units", 
    "esri/urlUtils",
    "roads/utils"
], function(
    array, connect, declare, Deferred, json, lang, dateLocale, domAttr, domGeometry, domStyle, domQuery, string, uuid, generateTimeBasedUuid,
    esriConfig, Units, urlUtils, utils
) {
    
    var mathUtil=  {
        nearlyEqual: function(a, b){
            var epsilon = 0.001;
            var absA = Math.abs(a), absB = Math.abs(b), diff = Math.abs(a - b);
            
            if (a == b) { // shortcut, handles infinities
                return true;
            }
            else 
                if (a == 0 || b == 0 || diff < Number.MIN_VALUE) {
                    // a or b is zero or both are extremely close to it
                    // relative error is less meaningful here
                    return diff < (epsilon * Number.MIN_VALUE);
                }
                else { // use relative error
                    return diff < epsilon;
                }
        }
    };
    lang.setObject("roads.addressManagement.util.mathUtil", mathUtil);
return mathUtil;
    
});  // end define
