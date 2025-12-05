/*V7 - adaptado para o BirdoAPP 
- deleta o compact render antes de comecar 
- cria opcao pra quando nao encontrar o quicktime no pc 
- acerta pasta local do render pelo tipo
-------------------------------------------------------------------------------
Name:		RenderPreview.js

Description:	Este script renderiza o arquivo. 

Usage:		Oferece 3 tipos de render do arquivo: sequencia de imagens, GIF e movie;

Author:		Leonardo Bazilio Bentolila

Created:	2020, (setembro 2025)
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function render_file(projectDATA){
	
	//config information
	var images_format = ["png", "jpeg", "tiff"];//lista de formatos de imagem
	var displays_nodes = [""].concat(node.getNodes(["DISPLAY"]));
	
	//sort display by node name to get ASSET_VIEW first
	displays_nodes.sort(function(a, b) {
		var textA = node.getName(a);
		var textB = node.getName(b);
		return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
	});
	
	var display_names = [];
	displays_nodes.forEach(function(x){ Print(x); display_names.push(node.getName(x))});
	var config_json = scene.currentProjectPath() + "/_renderizar.json";
	var export_config = {
		"layers": getLayersNodesFilters(),
		"output": "images",
		"formats": {
			"list": images_format,
			"selected": images_format[0]
		},
		"fps": scene.getFrameRate(),
		"size": {
			"x": scene.currentResolutionX(),
			"y": scene.currentResolutionY()
		},
		"start_frame": 1,
		"end_frame": frame.numberOf(),
		"folder": scene.currentProjectPath() + "/frames",
		"file_name": projectDATA.entity.name,
		"open_folder": true,
		"display": {
			"nodes": displays_nodes,
			"names": display_names,
			"last": display_names[0]
		}
	};
	
	//sets the memory config in the last time used
	if(BD1_FileExists(config_json)){
		var memory_config = BD1_ReadJSONFile(config_json);
		Print("Reading existing config file");
		if(memory_config){
			for(item in memory_config){
				//test if output folder exists
				if(item == "folder" && !BD1_DirExist(memory_config[item])){
					continue;
				}
				export_config[item] = memory_config[item];
			}
			
		} else {
			Print("Fail to read memory json file!");
		}
	}
		
	var ui_util = require(projectDATA.paths.birdoPackage + "utils/ui_utils.js");

	var d = new createInterface(projectDATA, export_config, config_json, ui_util);
	d.ui.show();
	
	//Extra functions:
	function getLayersNodesFilters(){//retorna objeto com info dos nodes de filtro encontrados no setup
		var layers = {
			"groupBoxEnabled": false,
			"filters": {
				"ref": null,
				"colourcard": null,
				"lineup": null	
			}
		};
		var setup = "Top/SETUP";
		var visibility_list = node.subNodes(setup).filter(function(x){ return node.type(x) == "VISIBILITY"});
		
		visibility_list.forEach(function(x){
			var name_lowercase = x.toLowerCase();
			for(item in layers.filters){
				var nextNode = node.srcNode(x, 0).toLowerCase();
				if(name_lowercase.indexOf(item) != -1 || nextNode.indexOf(item) != -1){
					Print("Valid visibility node found: " + item + ": node: " + x);
					layers["filters"][item] = {"node": x, "checked": true};
					layers["groupBoxEnabled"] = true;
				}
			}
		});
		return layers;
	}
}


function createInterface(projData, config_data, config_json, ui_util){
	var uiPath = projData.paths.birdoPackage + "ui/BD_RenderFile.ui";
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	
	//fix windows size
	this.ui.setFixedSize(375, 520);
	
	//self variables
	this.obj_radios = {
		"images": this.ui.groupOutput.radioImages,
		"gif": this.ui.groupOutput.radioGif,
		"movie": this.ui.groupOutput.radioMov
	}
	
	//scene aspect ratio
	this.aspect_ratio = scene.currentResolutionX() / scene.currentResolutionY();

	//update widgets - layers
	this.ui.groupLayers.enabled = config_data.layers.groupBoxEnabled;
	if(config_data.layers.filters.lineup){
		this.ui.groupLayers.checkLineup.checked = config_data.layers.filters.lineup.checked;
	} else {
		this.ui.groupLayers.checkLineup.enabled = false;
	}
	if(config_data.layers.filters.colourcard){
		this.ui.groupLayers.checkColorCard.checked = config_data.layers.filters.colourcard.checked;
	} else {
		this.ui.groupLayers.checkColorCard.enabled = false;
	}
	if(config_data.layers.filters.ref){
		this.ui.groupLayers.checkRef.checked = config_data.layers.filters.ref.checked;
	} else {
		this.ui.groupLayers.checkRef.enabled = false;
	}
	
	//update widgets - output folder and button
	this.ui.groupOutput.spinStart.maximum = frame.numberOf();
	this.ui.groupOutput.spinEnd.maximum = frame.numberOf();
	this.ui.groupOutput.spinEnd.minimum = this.ui.groupOutput.spinStart.value;
	this.ui.groupOutput.spinStart.value = config_data.start_frame;
	this.ui.groupOutput.spinEnd.value = config_data.end_frame;
	
	//update resolution widgets
	this.ui.groupOutput.sbWidth.value = config_data.size.x;
	this.ui.groupOutput.sbHeight.value = config_data.size.y;
	
	//update widgets - output folder and button
	var folderIcon = projData.getAppIcon("folder");
	var icon = new QIcon(folderIcon);
	this.ui.groupOutput.buttonFolder.icon = icon;
	this.ui.groupOutput.lineEditFolder.text = config_data.folder;
	this.ui.groupOutput.lineFileName.text = config_data.file_name;
	
	//update widgets - display
	this.ui.comboDisplay.addItems(config_data.display.names);
	this.ui.comboDisplay.setCurrentIndex(config_data.display.names.indexOf(config_data.display.last));
	
	//enables main group if has valid display
	this.ui.groupOutput.enabled = this.ui.comboDisplay.currentIndex != 0;
	this.ui.buttonExport.enabled = this.ui.comboDisplay.currentIndex != 0;

	//update widgets - open folder at the end of render
	this.ui.checkOpenFolder.checked = config_data.open_folder;
	
	
	//CALL BACKS
	this.updateRadio = function(){
		//image widgets
		this.ui.groupOutput.comboFormat.enabled = this.ui.groupOutput.radioImages.checked;
		this.ui.groupOutput.labelFormat.enabled = this.ui.groupOutput.radioImages.checked;

		//framerate widgets
		this.ui.groupOutput.spinFPS.enabled = this.ui.groupOutput.radioGif.checked || this.ui.groupOutput.radioMov.checked;
		this.ui.groupOutput.labelFPS.enabled = this.ui.groupOutput.radioGif.checked || this.ui.groupOutput.radioMov.checked;
	}
	
	this.updateSpin = function(){
		this.ui.groupOutput.spinEnd.minimum = this.ui.groupOutput.spinStart.value + 1;
		Print("Update start value: " + this.ui.groupOutput.spinStart.value);
	}
	
	this.chooseFolder = function(){
		var dir = FileDialog.getExistingDirectory(this.ui.groupOutput.lineEditFolder.text, "Choose Output Folder");
		if(!dir){
			Print("choose dir canceled!");
			return;
		} else {
			this.ui.groupOutput.lineEditFolder.text = dir;
		}
	}
	
	this.update_width = function(){
		if(this.ui.groupOutput.cbLock.checked){
			this.ui.groupOutput.sbHeight.value = parseInt(this.ui.groupOutput.sbWidth.value / this.aspect_ratio);
			Print("Locked Height value: " + this.ui.groupOutput.sbHeight.value);
		}
	}
	
	this.update_combo_display = function(){
		this.ui.groupOutput.enabled = this.ui.comboDisplay.currentIndex != 0;
		this.ui.buttonExport.enabled = this.ui.comboDisplay.currentIndex != 0;
		var d = config_data.display.nodes[this.ui.comboDisplay.currentIndex];
		Print("display escolhido: " + d);
	}
	
	this.update_config = function(){//update export data with options:
		
		//layers
		if(config_data["layers"]["filters"]["ref"]){
			config_data["layers"]["filters"]["ref"]["checked"] = this.ui.groupLayers.checkRef.checked;
		}
		if(config_data["layers"]["filters"]["lineup"]){
			config_data["layers"]["filters"]["lineup"]["checked"] = this.ui.groupLayers.checkLineup.checked;
		}
		if(config_data["layers"]["filters"]["colourcard"]){
			config_data["layers"]["filters"]["colourcard"]["checked"] = this.ui.groupLayers.checkColorCard.checked;
		}
		
		//output type
		for(item in this.obj_radios){
			if(this.obj_radios[item].checked){
				config_data["output"] = item;
				break;
			}	
		}
		
		//image format
		if(config_data.output == "images"){
			config_data["formats"]["selected"] = this.ui.groupOutput.comboFormat.currentText;
		} else {
			config_data["fps"] = this.ui.groupOutput.spinFPS.value;
		}
		
		//size
		config_data["size"]["x"] = this.ui.groupOutput.sbWidth.value;
		config_data["size"]["y"] = this.ui.groupOutput.sbHeight.value;
		
		//duration
		config_data["start_frame"] = this.ui.groupOutput.spinStart.value;
		config_data["end_frame"] = this.ui.groupOutput.spinEnd.value;

		//folder
		config_data["folder"] = this.ui.groupOutput.lineEditFolder.text;
		config_data["file_name"] = this.ui.groupOutput.lineFileName.text;
		config_data["open_folder"] = this.ui.checkOpenFolder.checked;

		//display
		config_data["display"]["last"] = this.ui.comboDisplay.currentText;
	}
	
	this.onExport = function(){
		
		try{
			this.update_config();
			Print(config_data);

			var util_export = require(projData.paths.birdoPackage + "utils/render_file_utils.js");
			util_export.render_file(this, projData, config_data, config_json);
		
		} catch(e){
			Print(e);
		}
		
		this.ui.close();
		
	}
	
	this.onClose = function(){
		Print("Ui closed..");
		this.ui.close();
	}
	
	//connections
	this.ui.groupOutput.radioImages.toggled.connect(this, this.updateRadio);
	this.ui.groupOutput.radioGif.toggled.connect(this, this.updateRadio);
	this.ui.groupOutput.radioMov.toggled.connect(this, this.updateRadio);
	this.ui.groupOutput.buttonFolder.clicked.connect(this, this.chooseFolder);
	this.ui.buttonExport.clicked.connect(this, this.onExport);
	this.ui.buttonCancel.clicked.connect(this, this.onClose);
	
	//update widgets - output
	this.obj_radios[config_data.output].checked = true;
	this.ui.groupOutput.comboFormat.addItems(config_data.formats.list);
	this.ui.groupOutput.spinFPS.value = config_data.fps;
	
	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.groupOutput.spinStart", "spin", "this.updateSpin"));
	eval(ui_util.get_connect_string("this.ui.groupOutput.sbWidth", "spin", "this.update_width"));
	eval(ui_util.get_connect_string("this.ui.comboDisplay", "combo", "this.update_combo_display"));

	//EXTRA FUNCTIONS
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
}
exports.render_file = render_file;
