/*
-------------------------------------------------------------------------------
Name:		BD_Set_CS_ACES.js

Description:	Este script muda o espaco de cor da cena inteira para ACES!

Usage:		Usa o SetSpaceColours.js do utils

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2022.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_ChangeSceneColourSpace(){
	
	var cs = get_cs();
	if(!cs){
		Print("caneled...");
		return;
	}
	
	var projData = BD2_ProjectInfo();
	if(!projData){
		MessageBox.warning("Erro ao logar infos do BirdoApp! Avise a DT!",0,0);
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
	function get_cs(){
		var cs_list = ["NO_COLOUR_SPACE", "ACES", "sRGB"];
		return Input.getItem("Choose colour-space:", cs_list, "NO_COLOUR_SPACE", false, "Set Colour-Space", 0);
	}
}