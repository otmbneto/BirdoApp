include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_OpenSceneFolder.js

Description:	Este script abre o folder da cena no explorer (se tiver um node selecionado, abre a pasta elements do node)

Usage:		Fora o birdoApp (local para uso da DT)

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2022.
            
Copyright:  leobazao_@Birdo
-------------------------------------------------------------------------------
*/

function BD_OpenSceneFolder(){
	
	var scene_folder = scene.currentProjectPath();
	
	//test if has valid selected file
	var sel = selection.selectedNode(0);
	var elementId = node.getElementId(sel);
	var element_folder = element.completeFolder(elementId);
	if(element_folder){
		scene_folder = element_folder;
	}
	
	if(!BD1_OpenFolder(scene_folder)){
		Print("Error opening scene folde!");
	}
	
}