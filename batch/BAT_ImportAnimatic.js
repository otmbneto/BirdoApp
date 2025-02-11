include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


BAT_ImportAnimatic();

function BAT_ImportAnimatic(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//checa se o arquivo é cena 
	if(projectDATA["entity"]["type"] != "SHOT"){
		Print("Este script somente funciona para SHOTS!");
		return;
	}	
	
	//get utils Animatic class
	var animatic_utils = projectDATA.birdoApp + "harmony/birdoPack/utils/import_animatic.js";
	if(!BD1_FileExists(animatic_utils)){
		Print("[BIRDOAPP] Nao foi encontrado o script de utils do import_animatic.js!");
		return;
	}
	
	try{
		
		var animatic_script = require(animatic_utils);
		var animatic = new animatic_script.Animatic(projectDATA, false);
		
		//run python update animatic
		var py_script_run = animatic.run_python_script();
		if(py_script_run == 0){
			Print("[BIRDOAPP] Script python terminou todas acoes!");
		} else if(py_script_run == 1){
			Print("[BIRDOAPP] ERROR extraindo o audio do arquivo de animatic!");
			return;
		} else if(py_script_run == 2){
			Print("[BIRDOAPP] ERROR extraindo sequencia de imagens temp do arquivo de animatic!");
			return;
		} else if(py_script_run == 3){
			Print("[BIRDOAPP] Nao e necessario a atualizacao do Animatic da cena! Ja esta atualizado!");
			return;
		} else {
			Print("[BIRDOAPP] Fail to run python script!");
			Print(" >> RETURN FROM PYTHON SCRIPT: " + py_script_run);
			return;
		}
			
		//run update
		var update = animatic.update();	
		Print("[BIRDOAPP] Animatic update: " + update);
		
	} catch(e){
		Print(e);
	}
}
