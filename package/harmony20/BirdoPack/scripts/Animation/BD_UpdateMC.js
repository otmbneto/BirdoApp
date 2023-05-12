/*
-------------------------------------------------------------------------------
Name:			BD_UpdateMC.js

Description:	Este Script para mostrar ou esconder os MC dos rigs na cena 

Usage:			Show/hide todos MC da cena 

Author:			Leonardo Bazilio Bentolila

Created:		Agosto, 2022 (update para todos projetos em maio de 2023)
            
Copyright:   	leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_UpdateMC(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//start undo...
	scene.beginUndoRedoAccum("Update MC");
	
	
	//check if project needs MC update!
	if(projectDATA.prefix == "AST"){
		Print("Project ASTRO... will deal with MC specific...");
		var astroScript = require(projectDATA["paths"]["birdoPackage"] + "utils/AST_updateMCs.js");
		astroScript.updateMCsASTRO(projectDATA);
		scene.endUndoRedoAccum();
		return;
	}
	
	var mc_utils = require(projectDATA["paths"]["birdoPackage"] + "utils/master_controllers_utils.js");
	//atualiza os mcs da cena
	var scene_mcs = mc_utils.updateSceneMCs();
	
	if(!scene_mcs.satate){
		MessageBox.information("Nao foi encontrado nenhum mc checkbox para tualizar!");
	}
	Print("Updated : " + scene_mcs.mcs.length + " mcs to " + scene_mcs.satate + " show");
	Print(scene_mcs);
	scene.endUndoRedoAccum();	
}