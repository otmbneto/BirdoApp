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
TODO : 
 - testar matrix de rotacao com quartenion 
 - testar matrix de deformation
 - fazer funcao pra listar os drawings pra considerar (ignorar drawings mascarados por cutter)
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
	
	//the action!
	scene.beginUndoRedoAccum("Add Gradient to Selection");
	
	//add patch node
	var patch = utils.add_gradient_patch(sel);
	if(!patch){
		scene.cancelUndoRedoAccum();
		MessageBox.warning("Erro ao adicionar patch!",0,0);
		return;
	}

	//get transformation data
	var transform_data = utils.getTimelineRectPosition(patch["read_list"], drawing_util, true);
	if(!transform_data.is_valid){
		scene.cancelUndoRedoAccum();
		MessageBox.warning("Nenhuma informação de drawings na seleção!",0,0);
		Print("No valid transformation!");
		return;
	} 
	
	var gradient = patch.gradient_node;
	if(!gradient){
		scene.cancelUndoRedoAccum();
		MessageBox.warning("ERROR! Can't find added gradient node!",0,0);
		return;
	}
	
	utils.applyTransformToGradPoints(transform_data, gradient);
	
	scene.endUndoRedoAccum();
	
	MessageBox.information("Feito! Gradient node aplicado! ");
	Print("Done!");
	
}