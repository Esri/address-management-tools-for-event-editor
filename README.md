# address-management-tools-for-event-editor

The address management tools for the Event Editor app are used to collect and manage address block ranges, site addresses, and related mailing address data. 
They can be used by planning, public safety, or land records organizations to streamline the collection, maintenance, and use of authoritative address information. 
The Esri Roads and Highways address management tools support the ArcGIS for Local Government data model.

![Screenshot of app widget](address-management-tools-for-event-editor.png?raw=true)

## Features

* Manage and edit linear-referenced street address data
* Add street names to the master street table
* Add and edit address block ranges
* Add and edit site address points

## Instructions

1. Download this repository as a .zip file and unzip it to your machine.
2. Ensure that the Event Editor \(formerly known as Roadway Characteristics Editor\) web app has been deployed.  Event Editor is a part of the Esri Roads and Highways product.  Refer to the [deployment guide](http://desktop.arcgis.com/en/arcmap/10.4/extensions/roads-and-highways/event-editor-deployment-guide.htm) for details.
3. Copy the folders and files from within event-editor-widgets into the folder where you have deployed the Event Editor app.
4. Rename the sample_address_management.json file to address_management.json, and configure it for your environment.  Change the map layer names, field names, and other settings to match your data.
5. For more detailed instructions on deploying and using the address management widgets in Event Editor, please read the [user guide](https://github.com/Esri/address-management-tools-for-event-editor/blob/master/address-management-user-guide.pdf?raw=true).

## Requirements

* Esri Roads and Highways 10.4.1
* ArcGIS Desktop 10.4.1
* ArcGIS Server 10.4.1
* Web server: Microsoft Internet Information Services (IIS)
* Web browser: Chrome, Firefox, IE 10+

## Resources

* [User guide](https://github.com/Esri/address-management-tools-for-event-editor/blob/master/address-management-user-guide.pdf?raw=true) (PDF) for deploying and using the address management tools
* [Event Editor \(formerly known as Roadway Characteristics Editor\) user guide](http://desktop.arcgis.com/en/arcmap/10.4/extensions/roads-and-highways/what-is-event-editor.htm)
* Learn more about [Esri Roads and Highways](http://desktop.arcgis.com/en/arcmap/10.4/extensions/roads-and-highways/what-is-roads-and-highways.htm)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone.  Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing

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

A copy of the license is available in the repository's [LICENSE.txt](https://github.com/Esri/address-management-tools-for-event-editor/blob/master/LICENSE.txt?raw=true) file.

[](Esri Tags: Roads Highways Address Management Event Editor Linear Referencing)
[](Esri Language: JavaScript)
