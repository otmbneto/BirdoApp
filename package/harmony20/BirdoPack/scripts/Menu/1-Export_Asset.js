/*V7 - adaptado para o BirdoAPP 
- deleta o compact render antes de comecar 
- cria opcao pra quando nao encontrar o quicktime no pc 
- acerta pasta local do render pelo tipo
-------------------------------------------------------------------------------
Name:		RenderPreview.js

Description:	Este Script renderiza a cena na pasta local de render do projeto

Usage:		Renderiza uma versao baixa da cena na pasta local de render

Author:		Leonardo Bazilio Bentolila

Created:	2020, (setembro 2021)
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function ExportAsset(){
	
	//init project data
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	if(projectDATA.entity.type != "ASSET"){//checa o tipo de cena, se nao for SHOT nao roda
		MessageBox.warning("Este script somente funciona para ASSET!", 0, 0);
		Print("[EXPORTASSET] ENTITY NAO E ASSET! CANCELADO!");
		return;
	}

	//config information
	var images_format = ["png", "jpeg", "tiff"];//lista de formatos de imagem
	var displays_nodes = node.getNodes(["DISPLAY"]);
	var display_names = [];
	displays_nodes.forEach(function(x){ display_names.push(node.getName(x))});
	var config_json = scene.currentProjectPath() + "/_exportAsset.json";
	var export_config = {
		"layers": getLayersNodesFilters(),
		"output": "images",
		"formats": {
			"list": images_format,
			"selected": images_format[0]
		},
		"fps": scene.getFrameRate(),
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
			//layers 
			for(item in export_config["layers"]["filters"]){
				if(export_config["layers"]["filters"][item]){
					export_config["layers"]["filters"][item]["checked"] = memory_config["layers"]["filters"][item]["checked"];
				}
			}
			//output
			export_config["output"] = memory_config["output"];
			//image_format
			if(images_format.indexOf(memory_config["formats"]["selected"]) != -1){
				export_config["formats"]["selected"] = memory_config["formats"]["selected"];
			}
			//frames
			export_config["start_frame"] = memory_config["start_frame"];
			export_config["end_frame"] = memory_config["end_frame"];
			//output folder
			if(BD1_DirExist(memory_config["folder"])){
				export_config["folder"] = memory_config["folder"];
			}
			export_config["file_name"] = memory_config["file_name"];
			export_config["open_folder"] = memory_config["open_folder"];
			
		} else {
			Print("Fail to read memory json file!");
		}
	}

	var d = new createInterface(projectDATA, export_config, config_json);
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


function createInterface(projData, config_data, config_json){
	var uiPath = projData.paths.birdoPackage + "ui/BD_ExportASSET.ui";
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	
	//fix windows size
	this.ui.setFixedSize(390, 520);
	
	//self variables
	this.obj_radios = {
		"images": this.ui.groupOutput.radioImages,
		"gif": this.ui.groupOutput.radioGif,
		"movie": this.ui.groupOutput.radioMov
	}
	
	//update widgets - layers
	this.ui.groupLayers.enabled = config_data.layers.groupBoxEnabled;
	if(config_data.layers.filters.lineup){
		this.ui.groupLayers.checkLineup.checked = config_data.layers.filters.lineup.checked;
	} else {
		config_data.layers.filters.lineup.enabled = false;
	}
	if(config_data.layers.filters.colourcard){
		this.ui.groupLayers.checkColorCard.checked = config_data.layers.filters.colourcard.checked;
	} else {
		config_data.layers.filters.colourcard.enabled = false;
	}
	if(config_data.layers.filters){
		this.ui.groupLayers.checkRef.checked = config_data.layers.filters.ref.checked;
	} else {
		config_data.layers.filters.enabled = false;
	}
	
	//update widgets - output folder and button
	this.ui.groupOutput.spinStart.maximum = frame.numberOf() - 1;
	this.ui.groupOutput.spinEnd.maximum = frame.numberOf();
	this.ui.groupOutput.spinEnd.minimum = this.ui.groupOutput.spinStart.value + 1;
	this.ui.groupOutput.spinStart.value = config_data.start_frame;
	this.ui.groupOutput.spinEnd.value = config_data.end_frame;
	
	//update widgets - output folder and button
	var folderIcon = projData.birdoApp + "app/icons/folder.png";
	var icon = new QIcon(folderIcon);
	this.ui.groupOutput.buttonFolder.icon = icon;
	this.ui.groupOutput.lineEditFolder.text = config_data.folder;
	this.ui.groupOutput.lineFileName.text = config_data.file_name;
	
	//update widgets - display
	this.ui.comboDisplay.addItems(config_data.display.names);
	this.ui.comboDisplay.setCurrentIndex(config_data.display.names.indexOf(config_data.display.last));
	
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
	
	this.onExport = function(){
		//update export data with options:
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
		
		//output 
		for(item in this.obj_radios){
			if(this.obj_radios[item].checked){
				config_data["output"] = item;
				break;	
			}	
		}
		if(config_data.output == "images"){
			config_data["formats"]["selected"] = this.ui.groupOutput.comboFormat.currentText;
		} else {
			config_data["fps"] = this.ui.groupOutput.spinFPS.value;
		}
		config_data["start_frame"] = this.ui.groupOutput.spinStart.value;
		config_data["end_frame"] = this.ui.groupOutput.spinEnd.value;

		//folder
		config_data["folder"] = this.ui.groupOutput.lineEditFolder.text;
		config_data["file_name"] = this.ui.groupOutput.lineFileName.text;
		config_data["open_folder"] = this.ui.checkOpenFolder.checked;

		//display
		config_data["display"]["last"] = this.ui.comboDisplay.currentText;

		var util_export = require(projData.paths.birdoPackage + "utils/exportASSET.js");
		Print(config_data);
		util_export.exportASSET(this, config_data, config_json);
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

	this.ui.groupOutput.spinStart['valueChanged(QString)'].connect(this, this.updateSpin);

	this.ui.groupOutput.buttonFolder.clicked.connect(this, this.chooseFolder);

	this.ui.buttonExport.clicked.connect(this, this.onExport);
	this.ui.buttonCancel.clicked.connect(this, this.onClose);
	
	//update widgets - output
	this.obj_radios[config_data.output].checked = true;
	this.ui.groupOutput.comboFormat.addItems(config_data.formats.list);
	this.ui.groupOutput.spinFPS.value = config_data.fps;
	
	//EXTRA FUNCTIONS
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
}

exports.ExportAsset = ExportAsset;
