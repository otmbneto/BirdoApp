include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*versao adaptada para BirdoAPP
-------------------------------------------------------------------------------
Name:		BD_AddGradToSelected.js

Description:	Este Script adiciona um efeito de gradiente na selecao do rig

Usage:		use para comp (nao cria o writenode na saida)

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2022;

Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/

function BD_AddGradToSelected(){
	
	var projData = BD2_ProjectInfo();
	if(!projData){
		MessageBox.warning("Erro ao logar infos do BirdoApp! Avise a DT!",0,0);
		return;
	}

	var utils_script = projData.paths.birdoPackage + "utils/add_gradient_utils.js";
	var utils = require(utils_script);
	
	var drawing_util_script = projData.paths.birdoPackage + "utils/drawing_api.js";
	var drawing_util = require(drawing_util_script);
	
	
	var sel = selection.selectedNode(0);
	if(!sel){
		MessageBox.warning("Select a node!", 0, 0);
		return;
	}
	
	//converte selecao pra array
	if(node.type(sel) == "READ"){
		var read_list = [sel];
	} else if(node.isGroup(sel)){
		var read_list = BD2_ListNodesInGroup(sel, ["READ"], true);
	} else {
		MessageBox.warning("Tipo de node invalido!",0,0);
		Print("Invalid node type!");
		return false;
	}
	
	//get transformation data
	var transform_data = utils.getTimelineRectPosition(read_list, drawing_util);
	if(!transform_data.is_valid){
		MessageBox.warning("Nenhuma informação de drawings na seleção!",0,0);
		Print("No valid transformation!");
		return;
	}
	
	//the action!
	scene.beginUndoRedoAccum("Add Gradient to Selection");
	
	var gradient = utils.addPatchFX(sel);
	if(!gradient){
		MessageBox.warning("ERROR adding gradient node!",0,0);
		scene.cancelUndoRedoAccum();
		return;
	}
	
	utils.applyTransformToGradPoints(transform_data, gradient);
	
	scene.endUndoRedoAccum();
	
	MessageBox.information("Feito! Gradient node aplicado! ");
	Print("Done!");
	
}