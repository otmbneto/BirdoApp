include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* OBS: se for COMP, renderiza na rede com o caminho renderComp, se for PRE_COMP, renderiza na pasta frames da cena!
-------------------------------------------------------------------------------
Name:		pre_comp_render.js

Description:	Este script prepara a cena para o render, deixando os writenodes prontos para saida do tipo pre_comp;

Usage:		usar no modo batch no pre render da fazendinha

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

pre_comp_render();

function pre_comp_render(){
		
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	
	var prepare_render_js = projectDATA.paths.birdoPackage + "utils/prepare_for_render.js";	
	
	var output_data = require(prepare_render_js).prepare_for_render(projectDATA, "PRE_COMP", false);
	Print("SCRIPT OUTPUT: ");
	Print(output_data);
		
	if(!output_data){
		Print("error setting scene for render!");
		return;
	}		
		
	var output_json_data = scene.currentProjectPath() + "/_renderData.json";
	
	//Write json with render data setted
	BD1_WriteJsonFile(output_data, output_json_data);
	
}