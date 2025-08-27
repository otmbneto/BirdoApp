/*
	Script para fazer update do animatic da cena com o ultimo animatic na rede.
	(Roda o script update_animatic.py no python)
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function AtualizarAnimatic(){

	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//checa se o arquivo é cena 
	if(projectDATA["entity"]["type"] != "SHOT"){
		MessageBox.warning("Este script somente funciona para SHOTS!", 0, 0);
		return;
	}	
	
	//get utils Animatic class
	var animatic_utils = projectDATA.birdoApp + "harmony/birdoPack/utils/import_animatic.js";
	if(!BD1_FileExists(animatic_utils)){
		Print("[BIRDOAPP] Nao foi encontrado o script de utils do import_animatic.js!");
		MessageBox.warning("ERRO! Falha ao carregar script 'import_animatic.js'!", 0, 0);
		return;
	}
	
	try{
		
		var animatic_script = require(animatic_utils);
		var animatic = new animatic_script.Animatic(projectDATA, true);

		//inicia birdoApp splash
		var loadingScreen = BD2_loadingBirdo(projectDATA.birdoApp, 30000, "Atualizando_Animatic...");
		
		//run python update animatic
		var py_script_run = animatic.run_python_script();
		loadingScreen.terminate();
		if(py_script_run == 0){
			Print("[BIRDOAPP] Script python terminou todas acoes!");
		} else if(py_script_run == 1){
			Print("[BIRDOAPP] ERROR extraindo o audio do arquivo de animatic!");
			MessageBox.warning("Erro extraindo o arquivo de audio do mov de animatic!", 0, 0);
			return;
		} else if(py_script_run == 2){
			Print("[BIRDOAPP] ERROR extraindo sequencia de imagens temp do arquivo de animatic!");
			MessageBox.warning("Erro extraindo sequencia de imagens do mov de animatic!", 0, 0);
			return;
		} else if(py_script_run == 3){
			Print("[BIRDOAPP] Nao e necessario a atualizacao do Animatic da cena! Ja esta atualizado!");
			MessageBox.information("Nao foi necessario atualizar o animatic na cena. Ja esta ataulizado!");
			return;
		} else {
			Print("[BIRDOAPP] Fail to run python script!");
			MessageBox.warning("ERRO ao rodar o script de Update animatic do python!", 0, 0);
			Print("TESTE RETURN FROM PYTHON SCRIPT: " + py_script_run);
			return;
		}
		
		scene.beginUndoRedoAccum("Update Animatic");
		
		//run update
		var update = animatic.update();	
		Print("[BIRDOAPP] Animatic update: " + update);
		if(loadingScreen.isAlive()){
			Print("closing loading screen...");
			loadingScreen.terminate();
		}
		
		scene.endUndoRedoAccum();
	} catch(e){
		Print(e);
		MessageBox.warning("ERRO! algo deu errado!",0,0);
		if(loadingScreen.isAlive()){
			Print("closing loading screen...");
			loadingScreen.terminate();
		}
	}

}
exports.AtualizarAnimatic = AtualizarAnimatic;



