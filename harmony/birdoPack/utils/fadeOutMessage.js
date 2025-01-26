/*
	funcao q abre ui temporaria com mensagem q some em fade out;
	
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function fadeOutMessage(projData, message){
	
	var pathUI = projData.paths.birdoPackage + "ui/BD_FadeMessage.ui";
	try{	
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
	var geo = get_ui_geometry();
	for(var i=0; i<wlist.length; i++){
		if(wlist[i].windowTitle == "BD_FadeOutMessage"){
			Print("Fade Message Interface found...");
			if(wlist[i].visible){
				wlist[i].close();
				Print("ui is still active..");
				return false;
			}
			return new FadeOutMessage(wlist[i], geo);
		}
	};
	Print("Fade Message Interface created!");
	var d = new FadeOutMessage(ui_path, geo);
	return d;
}

function FadeOutMessage(uifile, geometry){

	this.ui = typeof uifile == "string" ? UiLoader.load(uifile) : uifile;
	this.ui.activateWindow();
	this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
	this.ui.setGeometry(geometry.center().x() - 150, geometry.center().y() - 35, 300, 70);

	//timer
	this.button_timer = new QTimer();
	this.button_timer.interval = 1000/24;	

	//style info
	this.ss = "QWidget {\n  background-color: rgba(79, 182, 0, {ALPHA});\n  border-radius: 10px;\n}";
	this.opacity = 255;
	this.timmer_play = function(){
		if(this.opacity <= 0){
			this.button_timer.stop();
			Print("Close...");
			this.ui.close();
		}
		this.opacity = this.opacity - 5;
		this.ui.styleSheet = this.ss.replace("{ALPHA}", this.opacity);
		Print("opacity : " + this.opacity);
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

function get_ui_geometry(){
	var views = view.viewList()
	var screen = QApplication.desktop().geometry;//screen geometry
	var top_corner = null;//canto superior esq da widget
	var h_list = [screen.height()];
	var w_list = [screen.width()];
	var counter = 0;
	views.forEach(function(item, index){
		var pos = view.viewPosition(item);
		if(view.type(item) == "Node View"){
			curr_nv_group = view.group(item);
			top_corner = pos;
			counter++;
		}
		if(h_list.indexOf(pos.y()) == -1){
			h_list.push(pos.y());
		}
		if(w_list.indexOf(pos.x()) == -1){
			w_list.push(pos.x());
		}
	});
	w_list.sort(function(a,b){ return b-a});
	h_list.sort(function(a,b){ return b-a});
	if(counter != 1){
		Print("Mais de uma Node View ativa! Feche uma para funcionar este script!!");
		return false;
	}
	var w = w_list[w_list.indexOf(top_corner.x()) - 1] - w_list[w_list.indexOf(top_corner.x())]; 
	var h = h_list[h_list.indexOf(top_corner.y()) - 1] - h_list[h_list.indexOf(top_corner.y())];
	return new QRect(top_corner.x() + 5, top_corner.y() -20, w, h);
}