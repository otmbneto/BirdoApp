include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_RecordActions.js

Description:	Este Script cria um script de acoes gravadas pelo usuario

Usage:		Crie uma acao nova e grave a sequencia de acoes, e salve num script para ser aplicado novamente depois;

Author:		Leonardo Bazilio Bentolila

Created:	setembro, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
	TODO: 
	- descobrir erro de duplicar a acao link que rolou no ACtionTeste2(descobrir se é na hora de escrever);
	- add action de backdrop;
	- add action de waypoint;
*/

function BD_RecordActions(){
	
	//save scene
	if(!BD2_AskQuestion("Esta cena precisa ser salva para começar a gravar. Deseja continuar?")){
		Print("canceled..");
		return;
	}
	scene.saveAll();

	//inicia o birdoApp
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var utils = require(projectDATA["paths"]["birdoPackage"] + "utils/record_actions_utils.js");
	
	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_RecordActions.ui";
	var ui_util = require(projectDATA.paths.birdoPackage + "utils/ui_utils.js");

	//get temporary folder
	var tempfolder = projectDATA.systemTempFolder + "/BirdoApp/actions/";
	if(!BD1_DirExist(tempfolder)){
		BD1_createDirectoryREDE(tempfolder);
	}
	
	//get scripts data
	var actions_data = {
		rootDir: tempfolder,
		scripts: BD1_ListFiles(tempfolder, "*.js")
	}
	
	try{
		var d = new Interface(ui_path, utils, actions_data, ui_util);
		d.ui.show();
		Print("End");
	} catch(e){
		Print(e);
	}
}

function Interface(uifile, utils, actions_data, ui_util){
	this.ui = UiLoader.load(uifile);
	this.ui.activateWindow();
	
	//test if is recording
	this.recording = false;
	
	//scene timer to track changes with callback
	this.timer = new QTimer();
	this.timer.interval = 1500;	
	
	//current group in nodeview
	this.current_nv_group = null;
	
	//snap list
	this.snap_shop_list = [];
	
	//modification list
	this.modification_list = [];
	
	//list actions
	this.scripts = ["SELECT_SCRIPT"].concat(actions_data.scripts);
	this.temp_folder = actions_data.rootDir;
	//set play area
	this.ui.groupPlay.comboBox.enabled = this.scripts.length > 0;
	this.ui.groupPlay.comboBox.addItems(this.scripts);
		
	//callbacks	
	this.resetVariables = function(){
		this.modification_list = [];
		this.snap_shop_list = [];
		this.current_nv_group = null;
	}
	
	this.updateModifications = function(){
		var curr_snap = utils.getNodeViewGroupSnapShop(this.current_nv_group);
		var mod = utils.getModifications(this, this.snap_shop_list[this.snap_shop_list.length -1], curr_snap);
		if(mod){
			this.snap_shop_list.push(curr_snap);
			this.modification_list.push(mod);
			Print("modification list updated!");
		}
	}
	
	this.recordingLoop = function(){
		if(scene.isDirty()){
			MessageLog.trace(" -- Scene Changed!");
			scene.saveAll();
			MessageLog.trace("!!Changes saved!!");
			try{
				this.updateModifications();
			}catch(e){
				Print(e);
			}
		}
	}
	
	this.updateWidgets = function(){
		this.ui.groupRec.pushREC.text = this.recording ? "STOP" : "REC";
		this.ui.groupPlay.enabled = !this.recording;
		this.ui.groupRec.styleSheet = this.recording ? "QGroupBox {\n	border: 1px solid red;\n}" : "";
	}
	
	this.registerAction = function(){
		if(this.modification_list.length == 0){
			MessageBox.information("Insuficient Modifications! Canceled");
			Print("insuficient modifications!");
			return;
		}
		var actionName = utils.chooseActionName(this, this.temp_folder);
		if(!actionName){
			Print("Canceled");
			return;
		}
			
		var scriptObj = new utils.JSScript(this.modification_list, actionName);
		//write script
		var script_path = this.temp_folder + actionName + ".js";
		if(scriptObj.createScript(script_path)){
			this.ui.groupPlay.comboBox.addItem(actionName + ".js");
			this.ui.groupPlay.comboBox.enabled = true;
		}
	}
	
	this.onRec = function(){
		if(!this.recording){
			MessageLog.trace("Recording stated...");
			this.current_nv_group = utils.getCurrentGroupNV();
			this.snap_shop_list = [utils.getNodeViewGroupSnapShop(this.current_nv_group)];
			this.timer.start();
			this.addLogInfo(">REC start at group: " + this.current_nv_group);
		} else {
			MessageLog.trace("Recording stoped!");
			this.timer.stop();
			this.registerAction();
			this.resetVariables();
			this.addLogInfo(">REC Stop!");
		}
		this.recording = !this.recording;
		this.updateWidgets();
	}
	
	this.addLogInfo = function(text){
		var scroll_wid = this.ui.groupRec.groupLog.scrollArea.widget();
		var log_layout = scroll_wid.layout();

		var label = new QLabel(text);
		label.setParent(scroll_wid);
		log_layout.addWidget(label, 0, Qt.AlignTop);	
	}
	
	this.onPlay = function(){
		Print("Create function");
		var scriptName = this.ui.groupPlay.comboBox.currentText;
		var chosen_script = this.temp_folder + scriptName;
		Print("chosen scritp : " + chosen_script);
		this.addLogInfo(">Play action: " + scriptName);
		//command script require
		var cmd = "require(chosen_script)." + scriptName.replace(".js", "") + "()";
		Print("action script command: " + cmd);
		try{
			var output = eval(cmd);
			MessageBox.information("Script Action ended with " + output + " modifications on group " + utils.getCurrentGroupNV() + "!");
			Print("Action modifications: " + output);
		}catch(e){
			Print(e);
		}
	}
	
	this.onChangeCombo = function(){
		this.ui.groupPlay.pushButtonPlay.enabled = this.ui.groupPlay.comboBox.currentIndex != 0;
	}
	
	//connections
	this.ui.groupRec.pushREC.clicked.connect(this, this.onRec);
	this.ui.groupPlay.pushButtonPlay.clicked.connect(this, this.onPlay);
	this.timer.timeout.connect(this, this.recordingLoop);
	
	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.groupPlay.comboBox", "combo", "this.onChangeCombo"));
	
	//extra
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}

}
	
