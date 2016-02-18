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
    "dijit/Tree"
], function(
    array, declare, lang, Tree, editing
) {
    
    return declare("roads.addressManagement.SiteAddressTree", [Tree], {
      
        getIconClass: function(item, opened){
            // (Dojo/1.9) Portions of this function copied from the Dojo framework.
            // Need to reverify this code after each Dojo/JSAPI upgrade.
            var itemType = item && item.type;
            if (itemType == "blockRange") {
                // layer icon in the Attribute Set
                return "treeIcon addressBlockRangeIcon";
            }
            else {
                return "treeIcon siteAddressPointIcon";
            }
            
        }, 
        
        isFirstChild:function(node){
          return node== this.getFirstChild();
        },
        
        getFirstChild: function(){
          var node = this._getFirst();
          var item = node.item;
          if(item && item.type[0]=="blockRange")
            node = this.getNextChild(node);
          return node;
        },
        
        getLastChild:function(){
          var node = this._getLast();
          var item = node.item;
          if(item && item.type[0]=="blockRange")
            node = this.getPreviousChild(node);
          return node;
        },
        
        getPreviousChild:function(node){
          var previousSibling = node.getPreviousSibling();
          if (previousSibling) {
              node = previousSibling;
              // if the previous node is expanded, dive in deep
              while (node.isExpandable &&  node.hasChildren()) {
                  // move to the last child
                  var children = node.getChildren();
                  node = children[children.length - 1];
              }
          }
          else {
              // if this is the first child, return the parent
              // unless the parent is the root of a tree with a hidden root
              var parent = node.getParent();
              if (!(!this.showRoot && parent === this.rootNode)) {
                  node = parent;
              }
          }
          var item = node.item;
          if(item && item.type[0] == "blockRange"){
            return this.getPreviousChild(node);
          }else{
            //  console.log("Previous Child",node.label)
            return node;
          }
        },
        
        getNextChild:function(node){
          var node = this._getNext(node);
          if(node){
            var item = node.item;
            if(item && item.type[0]== "blockRange"){
              return this.getNextChild(node);
            } else{
            //    console.log("Next Child", node.label);
                return node;
            }
          }
        }
            
    });
});  // end define
