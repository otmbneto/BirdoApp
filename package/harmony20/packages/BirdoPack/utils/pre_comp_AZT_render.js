include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* OBS: adaptado do pre_comp_render.js (o render type é tratado como COMP para poder manter o write de matte habilitado!
-------------------------------------------------------------------------------
Name:		pre_comp_AZT_render.js

Description:	Este script prepara a cena para o render, deixando os writenodes prontos para saida do tipo pre_comp_AZT_render

Usage:		usar no modo batch no pre render da fazendinha

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
pre_comp_AZT_render();

function pre_comp_AZT_render(){
		
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	
	//add extra nodes
	addMatteOutput(projectDATA);

	
	var prepare_render_js = projectDATA.paths.birdoPackage + "utils/prepare_for_render.js";
	
	var output_data = require(prepare_render_js).prepare_for_render(projectDATA, "COMP", true, false);
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

//funcao extra pra modificar a cena antes de preparar pro render os write nodes>>
function addMatteOutput(projData){//add write matte e o nome pra deixar tudo branco!

	var fx_comp = "Top/FX";
	var char_comp = "Top/CHAR";
	//var bg_comp = "Top/BG";
	var comps_list = [fx_comp, char_comp];

	//add comp to connect nodes
	var comp = BD2_addNode("COMPOSITE", node.root(), "matteComp", {x: 1086, y: -89, z: 1});

	//connect comps:
	comps_list.forEach(function(item){
		node.link(item, 0, comp, 0, false, true);
	});

	//add matte blur under
	var matteblur = BD2_AddNodeUnder(comp, "matteBLUR", "MATTE_BLUR", true);

	
	//add write matte
	var writeMatte = BD2_AddNodeUnder(matteblur, "White_MATTE", "WRITE", true);
	Print("Set att write: " + writeMatte);
	//render path
	var renderPathMatte = getRenderPath(projData, "MATTE");
	var setAttMatte = BD2_changeWriteNodeAtt(projData, writeMatte, renderPathMatte, "COMP");
	Print(setAttMatte);

	//add write CHARS
	var writeChars = BD2_AddNodeUnder(comp, "White_CHARS", "WRITE", true);
	Print("Set att write: " + writeChars);
	//render path
	var renderPathChars = getRenderPath(projData, "CHARS");
	var setAttChars = BD2_changeWriteNodeAtt(projData, writeChars, renderPathChars, "COMP");
	Print(setAttChars);

	Print("nodes created!");
}


function getRenderPath(projData, renderName){//retorna caminho de render da cena
	var currScene = scene.currentScene();
	var renderPath = projData.getRenderComp(currScene);
	if(!renderPath){
		Print("Este computador nao reconhece o caminho de render na rede! Avise a DT!",0,0);
		return false;
	}

	////cria a pasta de render na rede caso ainda nao exista
	//if(!BD1_DirExist(renderPath)){
	//	Print("Foi preciso criar a pasta da cena na rede");
	//	BD1_createDirectoryREDE(renderPath);
	//}
	
	renderPath += currScene;//render path Final write

	return renderPath + "_" + renderName;
}