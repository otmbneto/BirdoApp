/*
-------------------------------------------------------------------------------
Name:		BD_ShowHideFXNodes.js

Description:	Este script e usado para habilitar e desabilitar os nodes de fx internos do rig 

Usage:		Seleciona o group do rig na node view para habilitar ou desabilitar os fx

Author:		Leonardo Bazilio Bentolila

Created:	novembro, 2022.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_ShowHideFXNodes(){
	
	var rig_group = selection.selectedNode(0);
	if(!rig_group || !node.isGroup(rig_group)){
		MessageBox.warning("Select a group node in the node view!",0,0);
		return;
	}
	var node_name = node.getName(rig_group);
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//get comp nodes
	var comp_types = ["BLEND_MODE_MODULE", "FADE", "GLOW"];
	var nodes_list = BD2_ListNodesInGroup(rig_group, comp_types, true);
	if(nodes_list.length == 0){
		MessageBox.information("No FX nodes found for this group!");
		Print("No FX nodes found for this group!");
		return;
	}
	
	//get current nodes enabled state
	var curr_state = getCurrentState(nodes_list);
			
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_EnableDisableFXNodes.ui";

	var nvp = get_nodeview_position();
	
	if(!nvp){
		Print("Error getting node view position!");
		return;	
	}
	
	var uis_data = new UIListData(nvp);
	
	if(!uis_data.is_valid){
		var msg = "Voce atingiu o limite de " + uis_data.count_limit + " UIs criadas para este script!\Delete algumas antes de continuar!";
		Print(msg);
		MessageBox.warning(msg,0,0);
		return;
	}
	
	try {
		var d = new Interface(nodes_list, node_name, pathUI, curr_state, uis_data);
		d.ui.show();
	} catch(e){
		Print(e);	
	}
	
	//EXTRA FUNCTIONS
	function getCurrentState(fx_nodes){//define se os nodes estao mais OFF ou mais ON
		var counter = {"on": 0, "off": 0};
		fx_nodes.forEach(function(item){	
			if(node.getEnable(item)){
				counter["on"]++;
			} else {
				counter["off"]++;	
			}
		});
		return counter.on > counter.off;
	}
	
	function get_nodeview_position(){//retorna o ponto do canto esq da Node View
		var nodeview = view.viewList().filter(function(item){ return view.type(item) == "Node View"});
		if(nodeview.length == 0){
			Print("nodwview not found!");
			return false;
		} else if(nodeview.length > 1){
			MessageBox.warning("ERROR! Mais de uma janela de node view detectada! Feche uma das janelas para funcionar!",0,0);
			return false;
		}
		var nv_pos = view.viewPosition(nodeview[0]);
		//fix padding for nodeview position
		return new QPoint(nv_pos.x() + 5, nv_pos.y() -20);
	}
	
	function UIListData(offSetPoint){//constroi objeto com geometry das UIs do script criadas
		//define tamanho e espacamento das uis
		this.w = 140;
		this.h = 90;
		this.spacing = 5;//espacamento entre as uis
		this.count_limit = 4;//define tamanho da lsita de uis (comecar com 4);
		this.columns = 2;//numero de coluas no grid de uis
		this.offset = offSetPoint;
	
		//define a lista de uis ativas usando a string salva em preferences
		var ui_list_str = preferences.getString("comp_fx_ui_list", "");
		var ui_list = ui_list_str.length == 0 ? [] : ui_list_str.split(",").map(function(x){ return parseFloat(x)});

		//descobre qual o index do ui a ser criado e atualiza a lista de uis deste objeto
		for(var i=0 ; i<=ui_list.length; i++){
			if(ui_list.indexOf(i) == -1){
				this.ui_index = i;
				ui_list.push(i);
				break;
			}
		}
		this.ui_list = ui_list.sort();
		
		//define se o objeto passou do limite de uis
		this.is_valid = this.ui_list.length < this.count_limit;

		//callbacks metodos da classe objeto
		this.get_current_ui_geometry = function(){
			//retorna o rect do ui a ser criado
			var coluna = this.ui_index%this.columns;
			var linha = Math.floor(this.ui_index/this.columns);
			var pos_x = this.offset.x() + (coluna * (this.w + this.spacing));
			var pos_y = this.offset.y() + (linha * (this.h + this.spacing));
			return new QRect(pos_x, pos_y, this.w, this.h);
		}
		
		this.update_ui_preference_list = function(){//atualiza o preference UI list com o ui criado
			preferences.setString("comp_fx_ui_list", this.ui_list.toString());
			MessageLog.trace("Preferences UI list updated with index: " + this.ui_index);	
		}

		this.remove_ui_from_list_pref = function(){//remove o index do ui da ui list nas preferences
			//checa se a lista mudou
			var curr_list = preferences.getString("comp_fx_ui_list", "");
			if(curr_list !=	this.ui_list.toString()){
				MessageLog.trace("lista atualizou no meio tempo...");
				if(curr_list.indexOf(this.ui_index) == -1){
					MessageLog.trace("lista ja nao contem indice : " + this.ui_index);
					return;
				}
				this.ui_list = curr_list.split(",").map(function(x){ return parseFloat(x)});
			}
			this.ui_list.splice(this.ui_list.indexOf(this.ui_index), 1);
			preferences.setString("comp_fx_ui_list", this.ui_list.toString());
			MessageLog.trace("Ui index removed from Preferences ui list: " + this.ui_index);
		}
	}
}

function Interface(nodes_list, node_name, pathUI, curr_state, uis_data){

	this.ui = UiLoader.load(pathUI);
	this.ui.activateWindow();
	this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
	var ui_rect = uis_data.get_current_ui_geometry();
	this.ui.setGeometry(ui_rect.x(), ui_rect.y(), ui_rect.width(), ui_rect.height());
	
	//update preferences
	uis_data.update_ui_preference_list();

	//update label name
	this.ui.label.text = formatName(node_name);
	
	//style sheet options
	this.sliderOffStyle = "QSlider::groove:horizontal {\n    border: 2px solid rgb(255, 93, 93);\n	border-radius: 18px;\n    height: 34; \n    background: rgb(255, 181, 156);\n}\n\nQSlider::handle:horizontal {\n    background: rgb(255, 138, 138);\n    border: 2px solid rgb(255, 98, 93);\n    border-radius: 12px;\n    width: 24px;\n	height: 24px;\n    margin: 4px 8px;\n}";
	this.sliderOnStyle = "QSlider::groove:horizontal {\n    border: 2px solid rgb(70, 190, 80);\n	border-radius: 18px;\n    height: 34; \n    background: rgb(181, 230, 150);\n}\n\nQSlider::handle:horizontal {\n    background: rgb(138, 250, 138);\n    border: 2px solid rgb(98, 200, 93);\n    border-radius: 12px;\n    width: 24px;\n	height: 24px;\n    margin: 4px 8px;\n}";
	this.labelOnStyle = "QLabel {\n	color: rgb(80, 150, 40);\n	background: rgba(213, 255, 196, 155);\n	border-radius: 10px;\n}";
	this.labelOffStyle = "QLabel {\n	color: rgb(150, 80, 40);\n	background: rgba(255, 213, 196, 155);\n	border-radius: 10px;\n}";

	//update current value
	this.ui.horizontalSlider.value = curr_state ? 1 : 0;
	this.ui.horizontalSlider.styleSheet = curr_state ? this.sliderOnStyle : this.sliderOffStyle;
	this.ui.label.styleSheet = curr_state ? this.labelOnStyle : this.labelOffStyle;

	//call backs
	this.onUpdateSlider = function(){
		this.ui.horizontalSlider.styleSheet = this.ui.horizontalSlider.value ? this.sliderOnStyle : this.sliderOffStyle;
		this.ui.label.styleSheet = this.ui.horizontalSlider.value ? this.labelOnStyle : this.labelOffStyle;
		var state = Boolean(this.ui.horizontalSlider.value);
		updateNodesState(nodes_list, state, node_name);
	}
	
	this.onClose = function(){
		MessageLog.trace(node_name + " comp FX On Off CLOSED!");
		uis_data.remove_ui_from_list_pref();
		this.ui.close();
	}
	
	//connections
	this.ui.pushButton.clicked.connect(this, this.onClose);
	this.ui.horizontalSlider.valueChanged.connect(this, this.onUpdateSlider);
	
	//extra funcs
	function updateNodesState(nodes_list, state, node_name){
		scene.beginUndoRedoAccum("Turn Comp nodes " + state);
		
		nodes_list.forEach(function(item, index){
			node.setEnable(item, state);
			MessageLog.trace("Node : " + item + " set to : " + state);
		});
		var text = state ? "enabled!" : "disabled!";
		var msg = node_name + " Show/Hide Comp nodes Done!\n" + nodes_list.length + " are now " + text;
		MessageBox.information(msg);
		MessageLog.trace(msg);
		
		scene.endUndoRedoAccum();
	}
	function formatName(name_str){//formata o nome para botar na widget
		if(name_str.length > 15){
			return "..." + name_str.slice(name_str.length - 12, name_str.length -1);
		} else {
			return name_str;
		}
	}
}