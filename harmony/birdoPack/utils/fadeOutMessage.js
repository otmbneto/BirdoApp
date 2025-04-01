/*
	funcao q abre ui temporaria com mensagem q some em fade out;
	
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function fadeOutMessage(projData, message){
	try{	
		var pathUI = projData.paths.birdoPackage + "ui/BD_FadeMessage.ui";
		var dialog = find_interface(pathUI);
		if(!dialog){
			return;
		}
		dialog.ui.show();
		dialog.updateMessage(message);
		dialog.startFade();
		Print("Message fade out end!");
	} catch(e){
		Print(e);
	}
}
exports.fadeOutMessage = fadeOutMessage;


function find_interface(ui_path){//acha (ou cria) a interface
	var wlist = QApplication.allWidgets();
	for(var i=0; i<wlist.length; i++){
		if(wlist[i].windowTitle == "BD_FadeOutMessage"){
			Print("Fade Message Interface found...");
			if(wlist[i].visible){
				wlist[i].close();
				Print("ui is still active..");
				return false;
			}
			return new FadeOutMessage(wlist[i]);
		}
	};
	Print("Fade Message Interface created!");
	var d = new FadeOutMessage(ui_path);
	return d;
}

function FadeOutMessage(uifile){

	this.ui = typeof uifile == "string" ? UiLoader.load(uifile) : uifile;
	this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
	this.ui.activateWindow();

	//timer
	this.button_timer = new QTimer();
	this.button_timer.interval = 1000/24;	

	//style info
	this.ss = "QWidget {\n  background-color: rgba(79, 182, 0, {ALPHA});\n  border-radius: 10px;\n}";
	this.opacity = 255;
	this.timmer_play = function(){
		try{
			if(this.opacity <= 0){
				this.button_timer.stop();
				Print("Close...");
				this.ui.close();
			}
			this.opacity = this.opacity - 5;
			this.ui.styleSheet = this.ss.replace("{ALPHA}", this.opacity);
			Print("opacity : " + this.opacity);
			Print(this.ui.styleSheet);
		} catch(e) {
			Print(e);
		}
	}
	this.button_timer.timeout.connect(this, this.timmer_play);
	
	//sets label message
	this.updateMessage = function(message){
		this.ui.label.text = message;
	}
	
	this.startFade = function(){
		Print("start fade...");
		this.opacity = 255;
		this.button_timer.start();
	}
	
	
	//extra print message
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
}