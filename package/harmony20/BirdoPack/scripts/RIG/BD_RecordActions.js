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

	try{
		var d = new Interface(ui_path, utils);
		d.ui.show();
		Print("End");
	} catch(e){
		Print(e);
	}
}

function Interface(uifile, utils){
	this.ui = UiLoader.load(uifile);
	this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
	this.ui.activateWindow();
	
	//test if is recording
	this.recording = false;
	
	//scene timer to track changes with callback
	this.timer = new QTimer();
	this.timer.interval = 1500;	
	
	//current group in nodeview
	this.nodeViewGroup = null;
	
	//DELETE
	this.listTest = []
	
	
	//callbacks
	this.onClose = function(){
		MessageLog.trace("CLOSED! Timer stoped!");
		this.timer.stop()
		this.ui.close();
	}
	
	this.recordingLoop = function(){
		
		if(scene.isDirty()){
			MessageLog.trace("Scene Changed!");
			scene.saveAll();
			MessageLog.trace("Changes saved!");
		}	
		
	}
	
	this.updateWidgets = function(){
		this.ui.groupRec.pushREC.text = this.recording ? "■" : "REC";
		this.ui.groupPlay.enabled = this.recording;
		this.ui.groupRec.lineEdit.enabled = this.recording;
		this.ui.groupRec.styleSheet = this.recording ? "QGroupBox {\n	border: 1px solid red;\n}" : "";
	}
	
	this.onRec = function(){
		if(!this.recording){
			MessageLog.trace("Recording stated...");
			this.nodeViewGroup = utils.getCurrentGroupNV();
			this.timer.start();
		} else {
			MessageLog.trace("Recording stoped!");
			this.timer.stop();
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
		MessageLog.trace("PLAY!");
		var currGroup = utils.getCurrentGroupNV();
		this.listTest.push(utils.getNodeViewGroupSnapShop(currGroup));
		//Print(this.listTest[this.listTest.length-1]);
		if(this.listTest.length == 2){
			
			var mod = utils.getModifications(this.listTest[0], this.listTest[1]);
			try{
				if(!mod){
					this.addLogInfo("> No changes to Nodeview!");
				} else {
					this.addLogInfo("> Changes to the Nodeview!");
					Print(mod);
				}
			} catch(e){
				Print(e);
			}
			this.listTest = [];
		}
	}
	
	//connections
	this.ui.pushButtonClose.clicked.connect(this, this.onClose);
	this.ui.groupRec.pushREC.clicked.connect(this, this.onRec);
	this.ui.groupPlay.pushButtonPlay.clicked.connect(this, this.onPlay);

	this.timer.timeout.connect(this, this.recordingLoop);
	
	//
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}

}
	
