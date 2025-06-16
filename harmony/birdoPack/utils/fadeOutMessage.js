/*
	funcao q abre ui temporaria com mensagem q some em fade out;
	
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function fadeOutMessage(projData, message){
	try{	
		var pathUI = projData.paths.birdoPackage + "ui/BD_FadeMessage.ui";
		var dialog = new FadeOutMessage(pathUI);
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


function FadeOutMessage(uifile){

	if(typeof uifile == "string"){
		this.ui = UiLoader.load(uifile)
		this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
		this.ui.activateWindow();
		Print("Fadeout interface created..");
	} else {
		this.ui = uifile;
		Print(this.ui);
	}

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
				return;
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