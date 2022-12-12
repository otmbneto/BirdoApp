/*v2.0
-------------------------------------------------------------------------------
Name:		BD_ShowHideFXNodes.js

Description:	Este script e usado para habilitar e desabilitar os nodes de fx internos do rig 

Usage:		Seleciona o group do rig na node view para habilitar ou desabilitar os fx

Author:		Leonardo Bazilio Bentolila

Created:	novembro, 2022 (update Dezembro 2022).
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

var curr_nv_group = null;//global var q define qual o grupo atual na node view

function BD_ShowHideFXNodes(){
	
	//fecha possiveis uis abertas
	close_uis();
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	//ui file path
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_EnableDisableFXNodes.ui";

	//gets node view geometry in the monitor
	var nv_geometry = get_nodeview_geometry();
	if(!nv_geometry){
		Print("Error getting node view position!");
		return;	
	}


	//gets rig nodes info
	var rigs_list = get_rig_nodes_list_data();
	if(!rigs_list){
		MessageBox.information("No FX nodes found in the current Node View Group!");
		return;
	}
	
	var ui_generator = new UiGeometry(nv_geometry);
	
	rigs_list.forEach(function(item, index){
		var ui_geometry = ui_generator.get_geometry(index);
		if(!ui_geometry){
			Print("Ui limit! Wont create ui index " + index, 0, 0);
			return;
		}
		try {
			var d = new Interface(item.nodes_list, item.rig_name, pathUI, item.enable_state, ui_geometry);
			d.ui.show();
		} catch(e){
			Print(e);	
		}
	});
	
	//EXTRA FUNCTIONS
	function close_uis(){
		var counter = 0;
		var wlist = QApplication.allWidgets();
		wlist.forEach(function(item){
			if(item.windowTitle == "ShowHideFXScript"){
				item.close();
			}
		});	
		Print(counter + " uis widgets foram fechadas!");
	}
	function get_nodeview_geometry(){
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
	
	function get_rig_nodes_list_data(){//retorna lista de objetos contendo info dos grupos de rigs encontrados
		var comp_types = ["BLEND_MODE_MODULE", "FADE", "GLOW"];//nodes de efeitos a procurar
		var all_groups = node.subNodes(curr_nv_group).filter(function(item){ return node.isGroup(item) && node.getName(item) != "SETUP"});
		var rig_data_list = [];
		
		//cria lista baseada na lista de grupos de rigs encontrados no current group da node view
		all_groups.forEach(function(item){
			var obj = {
				"rig_name": node.getName(item),
				"nodes_list": BD2_ListNodesInGroup(item, comp_types, true),
			}
			obj["enable_state"] = getCurrentState(obj.nodes_list);//get current nodes enabled state for this rig
			if(obj.nodes_list.length > 0){
				rig_data_list.push(obj);
			}
		});
		
		if(rig_data_list.length == 0){
			Print("No FX nodes found in the current Node View Group!");
			return false;
		}
		return rig_data_list;
		
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
	}
	
	function UiGeometry(nvg){//constroi objeto que gera gerometrys de uis a serem criadas
		//define tamanho e espacamento das uis
		this.w = 140;
		this.h = 90;
		this.spacing = 5;//espacamento entre as uis
		this.columns = Math.floor(nvg.width()/this.w);//numero de coluas no grid de uis
		this.lines = Math.floor(nvg.height()/this.h);
		this.nodeview = nvg;
		MessageLog.trace(this.columns + " ===> colunas");
		MessageLog.trace(this.lines + " ===> lines");

		//callbacks metodos da classe objeto
		this.get_geometry = function(ui_index){
			//retorna o rect do ui a ser criado
			var coluna = ui_index%this.columns;
			var linha = Math.floor(ui_index/this.columns);
			if(linha > this.lines){
				MessageBox.warning("Limit UIs for this NodeView! Make the Node View Bigger to fit all uis!", 0, 0);
				return false;		
			}
			var pos_x = this.nodeview.topLeft().x() + (coluna * (this.w + this.spacing));
			var pos_y = this.nodeview.topLeft().y() + (linha * (this.h + this.spacing));
			return new QRect(pos_x, pos_y, this.w, this.h);
		}
	}
}

function Interface(nodes_list, node_name, pathUI, curr_state, ui_rect){
	this.ui = UiLoader.load(pathUI);
	this.ui.activateWindow();
	this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
	this.ui.setGeometry(ui_rect.x(), ui_rect.y(), ui_rect.width(), ui_rect.height());
	this.ui.setWindowTitle("ShowHideFXScript");

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