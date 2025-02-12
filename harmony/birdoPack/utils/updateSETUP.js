include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
----------------------------------------------------------------------------------
Name:		updateSETUP.js

Description:	Funcoes para update do setup baseado no template na pasta config do projeto

Usage:		Usar como utils nos scripts de upadate do SETUP (Retorna mensagem com status do update)

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2023 (update fevereiro 2025)
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
//listar elementos para ignorar nos templates
var elements_ignore = ["Asset", "REFERENCIA", "SAFE_AREA"];


function updateSETUP(projectDATA){
	
	var entity_type = projectDATA.entity.type;
	
	//list elements in entity template
	var template_name = entity_type == "SHOT" ? "SCENE_template" : "ASSET_template";
	var template_element_folder = projectDATA.proj_confg_root + template_name + "/elements/";
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
		Print("[BIRDOAPP] ERRO... group node not found in setup");
		return false;
	}
	return node_path;
}

//checa updates pros nodes listados do setup
function checkUpdates(setupNodesData, template_element_folder){
	var counter = 0;
	for(item in setupNodesData){
		var nodePath = setupNodesData[item];
		if(!nodePath){
			continue;
		}
		//server paths for nodes lib (tvg lib);
		var element_path = template_element_folder + item + "/";
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
		Print("[BIRDOAPP] ERROR finding node tvg update in template!");
		return false;
	}
	var col = node.linkedColumn(nodeP, "DRAWING.ELEMENT");
	var id = node.getElementId(nodeP);
	var drawList = column.getDrawingTimings(col);
	var lastTimming = drawList[drawList.length-1];
	var node_tvgs = drawList.map(function(item){ BD1_fileBasename(Drawing.filename(id, item))});
	if(!Boolean(lastTimming) || node_tvgs.indexOf(template_tvg) == -1){
		Print("[BIRDOAPP]-- Updating node drawing: " + nodeP);
		try {
			var newEpx = template_tvg.split("-")[1].replace(".tvg", "");
			Drawing.create(id, newEpx, true);
			var drawingFileTempPath = Drawing.filename(id, newEpx);
			BD1_CopyFile(element_path + template_tvg, drawingFileTempPath);
			column.setEntry(col, 1, 1, newEpx);
			return true;
		} catch(e){
			Print(e);
			Print("[BIRDOAPP] UPDATE SEUPT => Fail to copy and create drawing file!");
			return false;
		}
	}
	Print("[BIRDOAPP] No need to update node: " + nodeP);
	return false;
}