/*
	Este script roda a atualização do SETUP em modo batch
*/

include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


BAT_UpdateSETUP();

function BAT_UpdateSETUP(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[BIRDOAPP][ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	
	var utils = require(projectDATA["paths"]["birdoPackage"] + "utils/updateSETUP.js");

	try{
		Print(utils.updateSETUP(projectDATA));
	}catch(e){
		Print(e);
	}
	Print("[BIRDOAPP] END BATCH UPDATE SETUP!");
}