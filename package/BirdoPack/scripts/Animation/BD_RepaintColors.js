include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* OBS: USA interface de progressBar
-------------------------------------------------------------------------------
Name:		BD_RepaintColors.js

Description:	Este script roda a funcao de recolor para o projetoç;

Usage:		usar como botao

Author:		Leonardo Bazilio Bentolila

Created:	maio, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_RepaintColors(){
	
	scene.beginUndoRedoAccum("Repaint Colors");

	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var recolor_js = projectDATA["paths"]["birdoPackage"] + "utils/project_recolor.js";
		
	if(!BD1_FileExists(recolor_js)){
		Print("Fail to find project_recolor.js script!");
		MessageBox.warning("Fail to find project_recolor.js script!",0,0);
		return false;
	}

	var recolor = require(recolor_js).project_recolor(projectDATA, true);

	if(recolor.toString() == "false"){
		Print("Recolor fail!");
		MessageBox.warning("Erro rodando o script de repaint! Mais detalhes no MessageLog!",0,0);
	} else {
		var msg = "Fim do recolor! " + recolor + " nodes tiveram drawings repintados! Veja lista no MessageLog!";
		Print(msg);
		MessageBox.information(msg);
	}
	
	scene.endUndoRedoAccum();

}

