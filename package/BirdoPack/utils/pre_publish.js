include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		pre_publish.js

Description:	este script roda as funcoes de pre publish para o projeto (adicionar funcoes para mudar cena antes do envio aqui!

Usage:		Roda antes de comecar o publish (depois dos avisos iniciais) 

Author:		Leonardo Bazilio Bentolila

Created:	maio, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function pre_publish(projectDATA){
	
	//rodar funcoes q salvam a cena nesse bloco
	fix_cagada_version();
	
	
	//rodar funcoes com o acum undo nesse bloco
	scene.beginUndoRedoAccum("pre publish modifications");

	repaint_project_colors(projectDATA);
	
	scene.endUndoRedoAccum();

	//funcoes extras
	function fix_cagada_version(){//funcao pra corrigir a burrada do publish do mac q gerou arquivos de versoes com .zip e .rar no nome
		var versionName = scene.currentVersionName();
		var regex_ziprar = /(\.zip|\.rar)/;
		if(regex_ziprar.test(versionName)){
			Print("sceneversion needs corrections...");
			var newVersionName = versionName.replace(regex_ziprar, "_TEMP");
			Print("saving as: " + newVersionName);
			scene.saveAsNewVersion(newVersionName, true);
		} else {
			Print("No need to change version fix_cagada_version!");
		}		
	}

	function repaint_project_colors(projectDATA){//repinta as cores erradas do projeto usando o json com cores para repaint do projeto
		var recolor_js = projectDATA["paths"]["birdoPackage"] + "utils/project_recolor.js";
		if(!BD1_FileExists(recolor_js)){
			Print("Fail to find project_recolor.js script!");
			return;
		}
		var recolor = require(recolor_js).project_recolor(projectDATA, true);
		
		if(recolor == false){
			Print("Recolor fail!");
		} else {
			if(recolor == 0){
				Print("no need to repaint any node in this scene!");
			} else if (recolor > 0){
				MessageBox.information(recolor + " nodes tiveram desenhos repintados nesta cena! As alteracoes foram salvas mas podem ser desfeitas com undo!");
			}
		}
	}
	
}

exports.pre_publish = pre_publish;