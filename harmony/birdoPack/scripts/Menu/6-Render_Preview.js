/*V7 - adaptado para o BirdoAPP 
- deleta o compact render antes de comecar 
- cria opcao pra quando nao encontrar o quicktime no pc 
- acerta pasta local do render pelo tipo
-------------------------------------------------------------------------------
Name:		RenderPreview.js

Description:	Este Script renderiza a cena na pasta local de render do projeto

Usage:		Renderiza uma versao baixa da cena na pasta local de render

Author:		Leonardo Bazilio Bentolila

Created:	2020, (update maio, 2025);
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function RenderPreview(){
	
	var currPath = scene.currentProjectPath();
	var currScene = scene.currentScene();
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//checa o tipo de cena, se nao for SHOT nao roda
	if(projectDATA.entity.type != "SHOT"){
		MessageBox.warning("Este script somente funciona para Shot!", 0, 0);
		Print("[RENDERLOCAL] ENTITY NAO E SHOT! CANCELADO!");
		return;
	}

	if(!BD2_checkFrames()){
		return;
	}
	
	//Render Step definido baseado no user_type
	var render_step = projectDATA.user_type != "COMP" ? "PRE_COMP" : "COMP";
	var pre_comp_script = projectDATA.paths.birdoPackage + "utils/pre_comp_render.js";
	var comp_script = projectDATA.paths.birdoPackage + "utils/comp_render.js";
	try{
		if(render_step == "PRE_COMP"){
			var output_mov = require(pre_comp_script).pre_comp_render(projectDATA);
			if(!output_mov){
				MessageBox.warning("Erro renderizando a cena!",0,0);
			} else{
				MessageBox.information("Cena renderizada no arquivo: \n..." + output_mov.slice(-30));
			}
		} else if(render_step == "COMP"){
			Print("criar funcao de render de comp... ");
		}
	} catch(e){
		MessageBox.warning("Erro renderizando cena!",0,0);
		Print(e);	
	}

}
exports.RenderPreview = RenderPreview;