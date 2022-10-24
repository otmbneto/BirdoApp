include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
-------------------------------------------------------------------------------
Name:		BD_BirdoLib_Save.js

Description: Este script importa os assets 3d feitos para cena (animados

Usage:		Escolha as camadas pra importar os assets 3d encontrados para cena.

Author:		Leonardo Bazilio Bentolila

Created:	out, 2022
            
Copyright:   @leobazao
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_Import_Scene3d_MNM(){

	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		MessageBox.warning("Error loading project data information!",0,0);
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}

	//check if project needs MC update!
	if(projectDATA.prefix != "MNM"){
		MessageBox.warning("Este script foi feito somente para o projeto Maluquinho!",0,0);
		Print("Este script e somente para o projeto MALUQUINHO!");
		return false;
	}
	
	var loadingScreen = BD2_loadingBirdo(projectDATA.birdoApp, 15000, "donwloading_3D_sequences...");
	
	var sequence = donwload_assets(projectDATA);
	Print(sequence);
	if(!sequence){
		loadingScreen.terminate();
		Print("Error downloading files!");
		MessageBox.warning("Erro baixando as imagens!", 0, 0);
		return;
	}
	
	if(sequence.assets3D.length == 0){
		loadingScreen.terminate();
		Print("Scene has no 3D sequence!");
		MessageBox.information("Esta cena nao contem assets 3D para importar!!");
		return;
	}
	
	loadingScreen.terminate();

	var d = new createInterface(projectDATA, sequence);
	d.ui.show();
	
	//EXTRA FUNCTIONS
	function donwload_assets(projectDATA){//runs python script to download from server
	
		var birdoAppPath = projectDATA.birdoApp.replace(/\/$/, "_SANDBOX/"); //FIXME!!!######################
		var libsPath = birdoAppPath + "venv/Lib/site-packages";
		var pyFilePath = birdoAppPath + "app/utils/import3dMNM.py";
		PythonManager.addSysPath(fileMapper.toNativePath(libsPath));
		PythonManager.addSysPath(fileMapper.toNativePath(birdoAppPath));

		var myPythonObject = PythonManager.createPyObject(fileMapper.toNativePath(pyFilePath));
		myPythonObject.addObject("messageLog", MessageLog);
		
		Print("Loading python script...");
		return myPythonObject.py.import_3d_assets(fileMapper.toNativePath(birdoAppPath), scene.currentScene());
	}
}


function createInterface(projectDATA, layers_data){
	var uifile = projectDATA.paths.birdoPackage + "ui/BD_Import3DSeq.ui";
	this.require_script = require(projectDATA.paths.birdoPackage + "utils/import3DSeqMNM.js");
	this.ui = UiLoader.load(uifile);
	this.ui.activateWindow();
	//fix windows size
	//this.ui.setFixedSize(390, 520);
	
	//attributes
	this.final_data = {};
	var bfont = new QFont();
	bfont.setBold(true);
	
	//add widgets items	
	var row = 0;
	for(var i=0; i<layers_data.assets3D.length; i++){
		var asset_name = layers_data["assets3D"][i].full_name;
		var lay = this.ui.groupBox.layout();
		var label1 = new QLabel("Asset:");
		var label2 = new QLabel(asset_name);
		label1.font = bfont;
		label2.font = bfont;
		lay.addWidget(label1, row, 0, Qt.AlignTop);
		lay.addWidget(label2, row, 1, Qt.AlignTop);
		row++;
		this.final_data[asset_name] = layers_data["assets3D"][i]["layers"].map(function(item, index){
			var obj = {
				"name": item.name,
				"file_list": item["files"].map(function(x){return item["path"] + "\\" + x;}),
				"checkbox": new QCheckBox("Layer " + (index + 1), this),
				"lineEdit": new QLineEdit(item.name, this)
			};
			obj.checkbox.checked = true;
			obj.checkbox.toggled.connect(this, function(){
				obj.lineEdit.enabled = obj.checkbox.checked;
			});
			lay.addWidget(obj.checkbox, row, 0, Qt.AlignCenter);
			lay.addWidget(obj.lineEdit, row, 1, Qt.AlignTop);
			row++;
			return obj;
		});
	}
	//CALLBACKs
	this.updateMainData = function(){//clean widgets and remove unchecked items from final list 
		for(asset in this.final_data){
			Print(asset);
			Print(this.final_data[asset].length);
			var listupdate = [];
			this.final_data[asset].forEach(function(item){
				//updates names values
				var itemname = "3D_" + item.lineEdit.text;
				if(!validate_name(itemname)){
					Print("Invalid name for item : " + itemname);
					this.ui.close();
					return;
				}
				item["imput_name"] = itemname;
				item["valid"] = item.checkbox.checked;
			});
		}
	}
	
	this.onImport = function(){
		Print("on import...");
		this.updateMainData();
		Print("Updated final data:");
		Print(this.final_data);
		this.require_script.import3DSeqMNM(this, this.final_data);
		this.ui.close();				
	}
	
	this.onClose = function(){
		Print("Ui closed..");
		this.ui.close();
	}

	//connections
	this.ui.pushImport.clicked.connect(this, this.onImport);
	this.ui.pushCancel.clicked.connect(this, this.onClose);
	
	
	//EXTRA FUNCTIONS
	function validate_name(name){//valida o nome escolhido na widget lineEdit
		var reg_nonASCII = /[^\u0000-\u007F]+/;
		var reg_invalidCHARS = /\W/;
		if(reg_nonASCII.test(name) || reg_invalidCHARS.test(name)){
			MessageBox.warning("ERRO! Nome invalido para camada: '" + name + "'\nEscolha outro nome!", 0, 0);
			return false;
		}
		if(name.length > 19){
			MessageBox.warning("ERRO! Nome muito grande para camada: '" + name + "'\nEscolha outro nome!", 0, 0);
			return false;	
		}
		return true;
	}
	
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
}