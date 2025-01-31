include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		pre_render.js

Description:	este script roda as funcoes de pre render para o projeto (adicionar funcoes para mudar cena antes do render aqui!

Usage:		Roda antes de comecar o render da cena

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2025;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
function pre_render(projectDATA, render_step){
	
	//rodar funcoes com o acum undo nesse bloco
	scene.beginUndoRedoAccum("BIRDOAPP Modificacoes antes do Render");
	
	var get_psd_data_script = projectDATA.paths.birdoPackage + "utils/get_psd_anim_data.js";
	if(step == "COMP"){
		try{
			require(get_psd_data_script).get_psd_anim_data(true);//exporta info dos psd
		} catch(e){
			MessageLog.trace(e.message);
			MessageLog.trace("[BIRDOAPP][modifyScenePreRender] Error creating PSD files data!");
		}
	} else {
		MessageLog.trace("[BIRDOAPP] Nenhuma acao de modify scene para o pre_comp (adicione um codigo para modificar a cena aqui!)");
	}
	
	scene.endUndoRedoAccum();
}

exports.pre_render = pre_render;