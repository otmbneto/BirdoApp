include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* OBS: nao usa interface de progressBar
-------------------------------------------------------------------------------
Name:		BAT_RepaintColors.js

Description:	Este script roda a funcao de recolor para o projeto em formato BAT;

Usage:		rodar como batch!

Author:		Leonardo Bazilio Bentolila

Created:	maio, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

BAT_RepaintColors();

function BAT_RepaintColors(){

	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	var recolor = require(projectDATA["paths"]["birdoPackage"] + "utils/project_recolor.js").project_recolor(projectDATA, false);
	
	if(recolor == false){
		Print("Recolor fail!");
	} else {
		var msg = "Fim do recolor! " + recolor + " nodes tiveram drawings repintados! Veja lista no MessageLog!";
		Print(msg);
	}
}

