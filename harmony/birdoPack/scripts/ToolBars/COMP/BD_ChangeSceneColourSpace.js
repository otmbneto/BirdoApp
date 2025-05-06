/*
-------------------------------------------------------------------------------
Name:		BD_Set_CS_ACES.js

Description:	Este script muda o espaco de cor da cena inteira para ACES!

Usage:		Usa o SetSpaceColours.js do utils

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2022. (update junho 2025)
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_ChangeSceneColourSpace(){
	
	var projData = BD2_ProjectInfo();
	if(!projData){
		MessageBox.warning("Erro ao logar infos do BirdoApp! Avise a DT!",0,0);
		return;
	}
	
	var cs = get_cs(projData);
	if(!cs){
		Print("caneled...");
		return;
	}

	var setCS_script_path = projData.paths.birdoPackage + "utils/setColourSpace.js";
	var require_script = require(setCS_script_path).setColourSpace(cs);
	if(!require_script){
		MessageBox.warning("ERROR CHANGING COLOUR SPACE: " + cs + "\nCheck MessageLog for details!",0,0);
	} else {
		MessageBox.information(require_script);
	}
	
	//extra function
	function get_cs(projData){
		var cs_list = Object.keys(projData.colour_spaces);
		var label = "Escolha o STEP para o Espaço de Cor desejado:\n\n";
		cs_list.forEach(function(item){ label += (" [" + item + "] : " + projData.colour_spaces[item] + ";\n")});
		var choice = Input.getItem(label, cs_list, cs_list[0], false, "Set Colour-Space", 0);
		if(choice){
			return projData.colour_spaces[choice];
		}
		return false;
	}
}