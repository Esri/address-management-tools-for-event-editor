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
    "dojo/_base/lang",
    "dijit/tree/ForestStoreModel",
    "roads/utils"
], function(
    array, declare, lang, ForestStoreModel, utils
) {
    return declare("roads.addressManagement.SiteAddressItemsModel", [ForestStoreModel], {
            _requeryTop: function(){
            // reruns the query for the children of the root node,
            // sending out an onSet notification if those children have changed
            var oldChildren = this.root.children || [];
            this.store.fetch({
                query: this.query,
                onComplete: lang.hitch(this, function(newChildren){
                    this.root.children = newChildren;
                    // reordering groups based on the orderId
                    newChildren.sort(lang.hitch(this, "_sortByOrderId"));
                    // If the list of children or the order of children has changed...
                    dojo.forEach(newChildren, function(item, index){
                      if (item.children && item.children.length > 0) {
                        item.children.sort(lang.hitch(this, "_sortByLabel"));
                        // update tree display
                          this.onChildrenChange(item, item.children);
                      }
                    }, this);
                    
                    // If the list of children or the order of children has changed...
                    if (oldChildren.length != newChildren.length ||
                    array.some(oldChildren, function(item, idx){
                      return newChildren[idx] != item;
                    })) {
                      // update tree display
                      this.onChildrenChange(this.root, newChildren);
                    }
                })
            });
        },
        
       
        _sortByOrderId: function(objA, objB) {
            var _UNIQUE_VALUE= "[[_00000_]]"; // just an arbitrary string that is unlikely to ever be a block range id
            var orderIdA = this.store.getValue(objA, "id");
            var orderIdB = this.store.getValue(objB, "id");
            if(orderIdA==_UNIQUE_VALUE){
              return -1;
            } else if(orderIdB==_UNIQUE_VALUE)
                return 1;
            else{
                var valueA = this.store.getValue(objA, "label");
                var valueB = this.store.getValue(objB, "label");
                
                return utils.ascSort(valueA, valueB);
            }
            return 0;
        },
        
        
        _sortByLabel: function(objA, objB) {
            var valueA = this.store.getValue(objA, "label");
            var valueB = this.store.getValue(objB, "label");
            if(isNaN(valueA+"")){
              valueA=0;
            }
            if(isNaN(valueB+"")){
              valueB=0;
            }
            valueA= parseInt(valueA);
            valueB = parseInt(valueB);
            return utils.ascSort(valueA, valueB);
        }
         });
});  // end define
