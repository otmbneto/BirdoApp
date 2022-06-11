/*
-------------------------------------------------------------------------------
Name:		BD_Set_CS_NONE.js

Description:	Este script muda o espaco de cor da cena inteira para "NO_COLOUR_SPACE"!

Usage:		Usa o SetSpaceColours.js do utils

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2022.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_Set_CS_NONE(){
	
	var cs = "NO_COLOUR_SPACE"; //MUDAR ESPACO DE COR AQUI PRO TIPO PRETENDIDO PARA ESTE SCRIPT!!!!
	
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
}
