include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_CreateRIGTemplate.js

Description:	Este script cria um template de rig copiando um grupo selecionado;

Usage:		Selecione um grupo para gerar um template no mesmo destino;

Author:		Leonardo Bazilio Bentolila

Created:	Junho, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_CreateRIGTemplate(){
	
	var initialNode = selection.selectedNode(0);
	if(!initialNode || !node.isGroup(initialNode)){
		MessageBox.warning("Select a group node!",0,0);
		return;
	}
	
	//define o nome original do rig e o nome do template
	var names = get_names(initialNode);
	if(!names){
		Print("nomes nao escolhidos!!");
		return;
	}
	
	//start script...
	scene.beginUndoRedoAccum("Create RIG TEMPLATE");
	
	createTemplate(initialNode, names);
	
	scene.endUndoRedoAccum();

	//extra functions
	function createTemplate(rig_group, names_data){//cria o template group e retorna informacao dos nodes
		
		//template node group
		var rig_coord = BD2_get_node_coord(rig_group);
		var template_rig = BD2_addNode("GROUP", node.parentNode(rig_group), getNodeName(rig_group, names_data), rig_coord);
Print("TESTE TEMPLATE RIG: " + template_rig);		
		//create template nodes and list
		var allNodes = BD2_ListNodesInGroup(rig_group, "", false);
		allNodes.sort(function(a,b){ return a.split("/").length - b.split("/").length});
		var nodes_data = {template_rig: []};
		allNodes.forEach(function(item){
			var node_data = {};
			var node_path = rig_group + "/" + item;
			var parentgroup = node.parentNode(node_path);
			var template_groupParent = parentgroup.replace(names_data.regex, names_data.new_name);
			if(!(template_groupParent in nodes_data)){
				nodes_data[template_groupParent] = [];
			}
			var node_coord = BD2_get_node_coord(node_path);
			
			node_data["original_node"] = node_path;
			//add node
			var nodename = getNodeName(node_path, names_data);
			BD2_addNode(node.type(node_path), template_groupParent, nodename, node_coord);
			node_data["template_node"] = template_groupParent + "/" + nodename;
			node_data["connections"] = updateNodesPathsConData(BD2_get_node_connections_data(node_path), names_data);
			nodes_data[template_groupParent].push(node_data);
		});
		
		//connect nodes and set attributes
		for(item in nodes_data){
			var nodeslist = nodes_data[item];
			Print("Group node: " + item);
			nodeslist.sort(function(a,b){
				return node.coordY(b.template_node) - node.coordY(a.template_node);
			});
			nodeslist.forEach(function(nodedata, index){
				Print(">>Node :" + nodedata.template_node);
				if(node.getName(nodedata.template_node) == ""){
					var nodecoord = BD2_get_node_coord(nodedata.original_node);
					var node_name = getNodeName(nodedata.original_node, names_data);
	Print("TESTE parent : " + item);
					Print("add node: " + BD2_addNode(node.type(nodedata.original_node), item, node_name, nodecoord));
					nodedata["connections"] = updateNodesPathsConData(BD2_get_node_connections_data(nodedata.original_node), names_data);

				}
				Print("-- Connecting node: ")
				BD2_connect_node(nodedata.connections, nodedata.template_node);
				Print("-- Setting atts: ")
				BD2_copyAtributes(nodedata.original_node, nodedata.template_node, false);
			});
		}
		
	}
	
	function updateNodesPathsConData(condata, names_data){//atualiza os nomes dos nodes no objeto de conecao do node
		var str = JSON.stringify(condata);
		return JSON.parse(str.replace(names_data.regex, names_data.new_name));
	}
	
	function getNodeName(nodeP, namesData){//renomeia o node a retorna o novo nome
		var node_name = node.getName(nodeP);
		return node_name.replace(namesData.regex, namesData.new_name);
	}
	
	function get_names(node_sel){//interface simples para pegar nomes do rig

		d = new Dialog;
		d.title = "RIG Template Name";
		d.addSpace(5);

		var group = new GroupBox;		
		group.title = "Rename Options:";
		var labelOriginal = new LineEdit();
		labelOriginal.label = "Original Name:";
		labelOriginal.text = node.getName(node_sel);
		group.add(labelOriginal);
		
		group.addSpace(5);

		var labelNew = new LineEdit();
		labelNew.label = "Template Name:";
		labelNew.text = "TEMPLATE";
		group.add(labelNew);

		d.addSpace(5);
		d.add(group);
		d.addSpace(10);
		
		var rc = d.exec();
		if(!rc){ 
			return false;
		}
		var o_name = labelOriginal.text;
		var new_name = labelNew.text;

		if(!o_name || !new_name){
			MessageBox.warning("Escolha um nome original e um novo nome para o template!",0,0);
			Print("Invalid names!");
			return false;
		}
		return { original_name: o_name, new_name: new_name, regex: new RegExp(o_name, "g")};
	}
}