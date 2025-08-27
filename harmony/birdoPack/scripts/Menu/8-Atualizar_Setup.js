include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*v2.0
-------------------------------------------------------------------------------
Name:			10-Atualizar_Setup.js

Description:	Update setup nodes in the scene;

Usage:			Usado pra forçar o update do setup (q rola no open scene);

Author:		Leonardo Bazilio Bentolila

Created:	Julho, 2023. (update fevereiro 2025);

Copyright:  leobazao_@Birdo
-------------------------------------------------------------------------------
*/

function AtualizarSetup(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[BIRDOAPP] [ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	var utils = require(projectDATA["paths"]["birdoPackage"] + "utils/updateSETUP.js");

	try{
		var output = utils.updateSETUP(projectDATA);
		Print(output);
		MessageBox.information(output);
	}catch(e){
		Print(e);
		Print("[BIRDOAPP] ERROR! Something went wrong during update setup!");
		MessageBox.warning("ERROR! Something went wrong during update setup!",0,0);
	}	
	Print("[BIRDOAPP] End update setup!");
}
exports.AtualizarSetup = AtualizarSetup;
