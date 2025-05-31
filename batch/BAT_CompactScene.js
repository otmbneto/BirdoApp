include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
-------------------------------------------------------------------------------
Name:		BAT_CompactScene.js

Description: BATCH script para limpar a cena e deletar os arquivos nao usados da versao mais recente.

Usage:		USAR COMO BATCH (ATENCAO: somente use esse script em uma cena que tenha CERTEZA que quer deletar os arquivos nao usados da cena.

Author:		Leonardo Bazilio Bentolila

Created:	setembro, 2025
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
//runs batch
BAT_CompactScene();


function BAT_CompactScene(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	
	try{
		
		//run compact scene
		var compact_func = require(projectDATA.paths.birdoPackage + "utils/compact_version.js");
		var nodes_data = compact_func.create_compact_file_list(false);
		var allfiles = BD1_ListFolderRecursivelly(scene.currentProjectPath());
		var used_nodes_list = nodes_data["file_list"].map(function(item){ return item["full_path"]});
		var delete_list = allfiles.filter(function(item){ return used_nodes_list.indexOf(item) == -1});
		//sort folders to last
		delete_list.sort(function(a, b){ return b.split("/").length - a.split("/").length});

		Print("[BIRDOAPP - compact scene] deletando " + delete_list.length + " arquivos...");
		var counter = 0;
		delete_list.forEach(function(item){
			if(BD1_is_file(item)){
				BD1_RemoveFile(item);
				counter++;
			} else {
				BD1_RemoveDirs(item);
				counter++;
			}
		});
		
		//create animatic movie from node...
		if(require(projectDATA.paths.birdoPackage + "utils/create_animatic_movie.js").crate_animatic_movie()){
			Print("Animatic criado com sucesso!");
		} else {
			Print("[ERROR] Erro ao criar animatic.mov!");
		}

	}catch(e){
		Print(e);
	}
	Print("[BIRDOAPP] END BATCH COMPACT SCENE!");
}