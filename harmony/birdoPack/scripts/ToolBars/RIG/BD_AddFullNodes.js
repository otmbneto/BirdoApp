include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_AddFullNodes.js

Description:	Este script cria os nodes de full ao curret group do rig na nodeview

Usage:		clique no botao com o grupo do rig q deseja adicionar os nodes de full 

Author:		Leonardo Bazilio Bentolila

Created:	Junho, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_AddFullNodes(){
	
	//inicia o birdoApp
	var proj_data = BD2_ProjectInfo();
	if(!proj_data){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var current_group = getCurrentNodeViewGroup();
	if(!current_group){
		MessageBox.warning("ERRO! Node View nao esta ativa!\nDia a NodeView no Grupo que deseja criar os nodes de 'FULL'!",0,0);
		return;
	}
	
	//checa se current node é o Top 
	if(current_group == node.root()){
		MessageBox.warning("Entre em um grupo para funcionar!",0,0);
		return;
	}
	
	
	//test if already has FULL
	var fulls = node.subNodes(current_group).filter(function(item){ return node.getName(item).indexOf("FULL") != -1});
	if(fulls.length > 0){
		MessageBox.warning("Este Grupo ja contem FULL criado!",0,0);
		return;
	}
	
	//define nomes
	var names_data = get_names(current_group, findRigName(current_group, proj_data));
	if(!names_data){
		Print("Canceled..");
		return;
	}
	
	//start script...
	scene.beginUndoRedoAccum("Add FULL");
	
	//add nodes
	var fullCoordNode = create_nodes(current_group, names_data);
	if(!fullCoordNode){
		MessageBox.warning("Algo deu ruim!",0,0);
		scene.cancelUndoRedoAccum();
		return;
	}
	
	//add backdrop
	add_backdrop(current_group, names_data.simple_name, fullCoordNode);
	
	scene.endUndoRedoAccum();

	Print("Nodes Full adicionados!");

	//extra functions
	function findRigName(nodeP, proj_data){//retorna nome do rig
		var name = proj_data.pattern.asset.exec(nodeP);
		Print(name);
		if(!name){
			Print("nao é uma estrutura de rig padrão!");
			return nodeP.split("/")[1];
		}
		return name[0].replace(name[0].split("_")[0] + "_", "").replace(proj_data.pattern.version, "").replace(/(-G)?_\d+$/, "");
	}
	
	
	function getCurrentNodeViewGroup(){//retorna o current group na nodeview
		var views = view.viewList();	
		var nv = null;
		views.forEach(function(item){	
			if(view.type(item) == "Node View"){
				nv = item;
			}
		});
		return nv ? view.group(nv) : false;
	}	
	
		
	function get_names(group_node, rigName){//interface simples para definir nomes

		d = new Dialog;
		d.title = "ADD Full Nodes!";
		d.addSpace(5);

		var group = new GroupBox;		
		group.title = "Add FULL:";
		var labelRigName = new LineEdit();
		labelRigName.label = "RIG Name:";
		labelRigName.text = rigName;
		group.add(labelRigName);
		
		group.addSpace(5);

		var labelFull = new LineEdit();
		labelFull.label = "FULL Name:";
		labelFull.text = node.getName(group_node);
		group.add(labelFull);

		d.addSpace(5);
		d.add(group);
		d.addSpace(10);
		
		var rc = d.exec();
		if(!rc){ 
			return false;
		}
		var rig_name = labelRigName.text;
		var full_name = labelFull.text;

		if(!rig_name || !full_name){
			MessageBox.warning("Escolha um nome para os nodes Full!!",0,0);
			Print("Invalid names!");
			return false;
		}
		return { 
			complete_name: [rig_name, "FULL", full_name].join("_"),
			simple_name: ["FULL", full_name].join("_")
		};
	}	

		
	function add_backdrop(group, name, node_coord){//add backdrop to created nodes
		var pos = {
			x: node_coord.x - 50,
			y: node_coord.y - node_coord.h - 100,
			w: node_coord.w + 100,
			h: 200
		};
		
		var corLetter = BD2_fromRGBAtoInt(204, 241, 92, 255);
		var corBackDrop = BD2_fromRGBAtoInt(181, 58, 205, 255);

		var newBackdrop = {
			position: {
				x: pos.x,
				y: pos.y,
				w: pos.w,
				h: pos.h
			},
			title: {
				text: name,
				color: corLetter, 
				size: 14,
				font: "Arial"
			},
			description: {
				text: "",
				color: corLetter,
				size: 14,
				font: "Arial"
			},
			color: corBackDrop
		};

		Backdrop.addBackdrop(group, newBackdrop);
		return newBackdrop;
	}
	
	
	function create_nodes(group_node, names_data){//cria nodes e retorna coordenadas dos nodes do node read do full criado
		//list all nodes in group
		var allNodes = node.subNodes(group_node);
		var allPegs = allNodes.filter(function(item){ return node.type(item) == "PEG"});
		var allcomps = allNodes.filter(function(item){ return node.type(item) == "COMPOSITE"});
		var allreads = allNodes.filter(function(item){ return node.type(item) == "READ"});
		
		//find mp and output comp
		var mp = allPegs.sort(function(a,b){ return node.coordY(a) - node.coordY(b)})[0];
		var comp = allcomps.sort(function(a,b){ return node.coordY(b) - node.coordY(a)})[0];
		var upnode = mp ? mp : node.getGroupInputModule(group_node, "Multi-Port-In", 0,0,0);
		var downnode = comp ? comp : node.getGroupOutputModule(group_node, "Multi-Port-Out", 0,0,0);

		//find read full node coord
		var lastRead = allreads.sort(function(a,b){ return node.coordX(b) - node.coordX(a)})[0];
		var lastNode= allNodes.sort(function(a,b){ return node.coordX(b) - node.coordX(a)})[0];

		var lastReadCoord = BD2_get_node_coord(lastRead);
		var lastNodeCoord = BD2_get_node_coord(lastNode);

		lastReadCoord["x"] = lastNodeCoord.x + lastNodeCoord.w + 100;
		
		//add nodes
		var fullRead = BD2_addNode("READ", group_node, names_data.complete_name, lastReadCoord);
		if(!fullRead){
			MessageBox.warning("ERROR adding read FULL node",0,0);
			return false;
		}
		var fullPeg = BD2_AddNodeUp(fullRead, names_data.simple_name, "PEG");
		if(!fullPeg){
			MessageBox.warning("ERROR adding PEG FULL node",0,0);
			return false;
		}
		
		//link nodes
		node.link(upnode, 0, fullPeg, 0, false, false);
		node.link(fullRead, 0, downnode, 0, false, true);
		
		return BD2_get_node_coord(fullRead);
	}
	
}