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

	var utils_script = projData.paths.birdoPackage + "utils/add_gradient_comp.js";
	var util = require(utils_script);
	
	var sel = selection.selectedNode(0);
	if(!sel){
		MessageBox.warning("Select a node!", 0, 0);
		return;
	}
	
	var general_rect = getRigCordinatesSelection(sel, frame.current());
	if(!general_rect){
		Print("Error generating geral box rect information!");
		return;
	}

	scene.beginUndoRedoAccum("TESTE gradiente coordinates");
	
	var gradient = "Top/Gradient";
	applyValuesToGradient(general_rect, gradient);
	
	Print("End of script!");

	scene.endUndoRedoAccum();
	
}