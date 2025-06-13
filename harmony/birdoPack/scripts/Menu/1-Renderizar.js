/*
-------------------------------------------------------------------------------
Name:		Renderizar.js

Description:	Este Script renderiza o arquivo no folder de destino.

Usage:		Define o tipo de render conforme o tipo de arquivio:
	projeto: se for uma cena de projeto, usa o render específico do step;
	outro: qualquer outro tipo de arquivo, abre o render_file com opções pre-definidas pelo birdoapp.

Author:		Leonardo Bazilio Bentolila

Created:	2020, (maio, 2025)
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function Renderizar(){
	
	//init project data
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Falha ao pegar as informações básicas do BirdoApp. CANCELADO!!");
		return false;
	}
	
	//define o tipo de arquivo para prosseguir...
	if(projectDATA.entity.type == "ASSET" || !projectDATA.entity.type){
		try{
			require(projectDATA.paths.birdoPackage + "utils/render_file.js").render_file(projectDATA);
		} catch(e){
			Print(e);
			return;
		}
	} else if(projectDATA.entity.type == "SHOT"){
		//ceck scene duration
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
					Print("Renderizar cancelado...");
				} else{
					MessageBox.information("Cena renderizada no arquivo: \n..." + output_mov.slice(-30));
				}
			} else if(render_step == "COMP"){
				require(comp_script).comp_render(projectDATA);
			}
		} catch(e){
			MessageBox.warning("Erro renderizando cena!",0,0);
			Print(e);
			return;
		}
	} else {
		Print("[BIRDOAPP] invalid entity type...");
		return;
	}
	Print("[BIRDOAPP] Renderizar terminou!");
}
exports.Renderizar = Renderizar;
