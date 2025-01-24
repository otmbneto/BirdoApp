include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
----------------------------------------------------------------------------------
Name:		updateSETUP.js

Description:	Este script é uma coletane de fncoes para atualizar o SETUP tanto de SHOT como ASSET

Usage:		Use como util (require) em outros scripts (retorna status do update)

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2023
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
//projects list that has updateSETUP available 
var projects_update = ["LEB", "AST", "BAB"];

//listar elementos para ignorar nos templates
var elements_ignore = ["Asset", "REFERENCIA", "SAFE_AREA"];


function updateSETUP(projectDATA){
	
	if(projects_update.indexOf(projectDATA.prefix) == -1){
		return "Project does not suport SETUP update!";
	}
	var entity_type = projectDATA.entity.type;
	
	//list elements in entity template
	var template_name = entity_type == "SHOT" ? "_shot_SETUP" : "_ASSET_template";
	template_name = projectDATA.prefix + template_name;
	var template_element_folder = projectDATA.birdoApp + "templates/" + template_name + "/elements/";
	var element_list = BD1_ListFolders(template_element_folder).filter(function(item){ return elements_ignore.indexOf(item) == -1});
	var nodes_data = {};
	element_list.forEach(function(element_name){
		var nodename = element_name.split(".")[0];
		nodes_data[element_name] = getNodePath(entity_type, nodename);
	});
	Print("Node list: ");
	Print(nodes_data);
	
	//update nodes elements
	return checkUpdates(nodes_data, template_element_folder);
}
exports.updateSETUP = updateSETUP;


//retorna o caminho do node de setup pra ser atualizado; (add se nao existir!)
function getNodePath(asset_type, node_name){
	//tip nodes
	var node_group = asset_type == "SHOT" ? "Top/REF_ANIM-G" : "Top/SETUP";
	var node_path = node_group + "/" + node_name;
	if(node.getName(node_group) == ""){
		Print("ERRO... group node not found in setup");
		return false;
	}	
	if(node.getName(node_path) == ""){
		var upnode = asset_type == "SHOT" ? node_group + "/REF_ANIM-P" : node_group + "/Camera-P";
		var downnode = asset_type == "SHOT" ? node_group + "/Composite" : node_group + "/Comp_VIEW";
		var coord = asset_type == "SHOT" ? {x: 234, y: 431, z: 1} : {x: 815, y: -180, z: 1};
		node_path = BD2_addNode("READ", node_group, node_name, coord);
		if(!node_path){
			Print("ERROR addind tip node!");
			return false;
		}
		node.link(upnode, 0, node_path, 0, false, false);
		if(asset_type == "SHOT"){
			node.link(node_path, 0, downnode, 0, false, true);
		} else {
			node.link(node_path, 0, downnode, 2, false, true);
		}
	}	
	return node_path;
}

//checa updates pros nodes listados do setup
function checkUpdates(setupNodesData, template_element_folder){
	var counter = 0;
	for(item in setupNodesData){
		//server paths for nodes lib (tvg lib);
		var element_path = template_element_folder + item + "/";
		var nodePath = setupNodesData[item];
		if(updateNode(nodePath, element_path)){
			counter++;
		}
		node.setLocked(nodePath, true);
	}
	return "SETUP nodes UPDATE ended with: " + counter + " updates!";
}

//atualiza os drawings do node 
function updateNode(nodeP, element_path){

	//lib tvg list 
	var tvg_list = BD1_ListFiles(element_path, "*.tvg");
	var template_tvg = tvg_list[tvg_list.length-1];
	if(!template_tvg){
		Print("ERROR finding node tvg update in template!");
		return false;
	}
	var col = node.linkedColumn(nodeP, "DRAWING.ELEMENT");
	var id = node.getElementId(nodeP);
	var drawList = column.getDrawingTimings(col);
	var lastTimming = drawList[drawList.length-1];
	var node_tvgs = drawList.map(function(item){ BD1_fileBasename(Drawing.filename(id, item))});
	if(!Boolean(lastTimming) || node_tvgs.indexOf(template_tvg) == -1){
		Print("-- Updating node drawing: " + nodeP);
		//var nodeElementFolder_dst = element.completeFolder(id) + "/" + BD1_fileBasename(template_tvg);
		try {
			var newEpx = template_tvg.split("-")[1].replace(".tvg", "");
			Drawing.create(id, newEpx, true);
			var drawingFileTempPath = Drawing.filename(id, newEpx);
			BD1_CopyFile(element_path + template_tvg, drawingFileTempPath);
			column.setEntry(col, 1, 1, newEpx);
			return true;
		} catch(e){
			Print(e);
			Print("Fail to copy and create drawing file!");
			return false;
		}
	}
	Print("No need to update node: " + nodeP);
	return false;
}