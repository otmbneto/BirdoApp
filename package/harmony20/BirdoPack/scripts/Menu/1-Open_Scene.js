/*
	Funcao teste para o package

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function OpenScene(){
	
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}

	if(projectDATA.entity.type != "SHOT"){
		MessageBox.warning("Erro! Este nao e uma cena do projeto! O script de publish por enquanto somente funciona para SHOT!", 0, 0);
		Print("[PUBLISH] Error! Script de publish por enquanto somente funciona para shot!");
		return false;
	}
	
	var projectId = projectDATA.id;
	var shot_name = projectDATA.entity.name;
	var pythonPath = projectDATA.birdoApp + "venv/Scripts/python";
	var pyFile = BD2_RenameAll((projectDATA.birdoApp + "app/plugins/open_scene/open_scene.py"), "/", "\\");
	
	var start = Process2(pythonPath, pyFile, projectId, shot_name);

var teste = [pythonPath, pyFile, projectId, shot_name];
Print(teste);

	var ret = start.launchAndDetach();

	if(ret != 0){
		Print("Fail to start progressBirdo progress!");
		MessageBox.warning("Fail to launch 'Open Scene' interface!",0,0);
		return false;
	}else{
		Print("Open scene interface initiated..");
	}
	
}

exports.OpenScene = OpenScene;