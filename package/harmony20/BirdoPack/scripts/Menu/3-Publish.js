/*
	Script para fazer publish do shot na rede do projeto

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

//TODO: Fazer funcao para gerar fila do render e mudar mensagem de aviso da fazendinha pos publish

function Publish(){
				
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}

	if(projectDATA.entity.type != "SHOT"){
		MessageBox.warning("Erro! Este nao e um SHOT do projeto! O script de publish por enquanto somente funciona para SHOT!", 0, 0);
		Print("[PUBLISH] Error! Script de publish por enquanto somente funciona para shot!");
		return false;
	}
	
	var step = projectDATA.getStepByUser();
	
	var shot_server_path = projectDATA.getShotPublishFolder(step);

	if(!shot_server_path){
		MessageBox.warning("Fail to get server_shot_path!", 0, 0);
		Print("fail to get server_shot_path!");
		return;
	}
	
	var render_step = projectDATA.getRenderStep();
	
	if(!render_step){
		Print("Canceled..");
		return;
	}
	
	var render_path = projectDATA.getRenderPath("server", render_step);

	if(!render_path){
		MessageBox.warning("Fail to get server_shot_path!", 0, 0);
		Print("fail to get server_shot_path!");
		return;
	}
	
	render_path = render_path + projectDATA.entity.name + ".mov";
	
	if(!BD2_checkFrames()){
		Print("cancelado pelo usuario por estar sem o numero de frames corretos!");
		return;
	}
	
	//roda o script pre-publish com todas funcoes q modificam a cena antes de enviar
	var pre_publish_js = projectDATA["paths"]["birdoPackage"] + "utils/pre_publish.js";
	if(!BD1_FileExists(pre_publish_js)){
		Print("Fail to find project_recolor.js script!");
		MessageBox.warning("Fail to run pre-publish scripts!",0,0);
		return;
	}
	require(pre_publish_js).pre_publish(projectDATA);
	
	//save scene modifications!
	scene.saveAll();
	
	var compactJs = projectDATA.paths.birdoPackage + "utils/compact_version.js";

	var compact_version_data = require(compactJs).create_compact_file_list();

	if(!BD2_AskQuestion("Publish SHOT: Este script irá salvar esta cena, e enviar para o server com o versionamento correto!\nDeseja continuar?")){
		Print("publish cancelado pelo usuraio!");
		return;
	}

	var publish_data = publish_py_script(projectDATA, compact_version_data, shot_server_path, render_path, render_step, step);
	
	Print(publish_data);
	
	if(!publish_data){
		Print("[ERROR] python publish failed!");
		return;
	}
	
	if(!publish_data["upload"]){
		
		MessageBox.warning(publish_data["status"],0 ,0);
		
	} else {
		//Mensagem sobre a fazendinha
		MessageBox.information("[FAZENDINHA VIVE!!] Este shot foi publicado com sucesso, e a cena foi adicionada a fila de render da Fazendinha! Aguarde aparecer o render na pasta.\nQualquer duvida sobre os renders, consulte a Direcao Tecnica!");
		check_scene_location_and_copy_file(projectDATA, shot_server_path, publish_data);
		
	}
		
	///FUNCOES EXTRAS/////
	function publish_py_script(projectDATA, versionData, publish_server_path, render_path, render_step, step){//Roda o script de publish em python
		
		versionData["status"] = "running python script...";
		versionData["user_name"] = projectDATA.user_name;
		
		if(!publish_server_path){
			MessageBox.warning("Publish somente de SHOTS! Este arquivo de Harmony nao tem opcao de Publish ainda!", 0, 0);
			return false;
		}
				
		var publish_local_path = projectDATA.getLocalRoot() + publish_server_path + "/PUBLISH";
		var projectId = projectDATA.id;
		
		var pythonPath = projectDATA.birdoApp + "venv/Scripts/python";
		var pyFile = BD2_RenameAll(projectDATA.birdoApp + "app/utils/server_upload_scene.py", "/", "\\\\");
		var tempfolder = projectDATA.systemTempFolder + "/BirdoApp/publish/";
		
		if(!BD1_DirExist(tempfolder)){//cria o folder temp se nao existir
			BD1_createDirectoryREDE(tempfolder);
		}
		
		if(!BD1_DirExist(publish_local_path)){//cria o folder do publish local da cena caso nao existir
			BD1_createDirectoryREDE(publish_local_path);
		}
				
		var output_json = tempfolder + "publish_shot" + new Date().getTime() + ".json";
		BD1_WriteJsonFile(versionData, output_json);
		
		var start = Process2(pythonPath, pyFile, publish_server_path, publish_local_path, render_path, render_step, step, projectId, output_json);
		
		//PRINTA os comandos do script de python q vai rodar
		var commands = pythonPath + " " + pyFile + " " + publish_server_path + " " + publish_local_path + " " + render_path + " " + render_step + " " + step + " " + projectId + " " + output_json;
		Print("COMMANDS PYTHON SCRIPT: ##################"); 
		MessageLog.trace(commands);
		Print("##################################");
		var ret = start.launch();
		
		if(ret != 0){
			Print("Fail to start publish python script!!");
			MessageBox.warning("ERRO! Fail to start the python file!!!", 0, 0);
			return false; 
		}
		var outputData = BD1_ReadJSONFile(output_json);

		if(outputData["status"] == "running python script..."){
			MessageBox.warning("ERRO! Python script did not returned any value!", 0, 0);
			return false;
		}
		return outputData;
	}
	
	function check_scene_location_and_copy_file(projectDATA, publishPath, publish_data){//funcao para verificar se a cena esta no folder correto do projeto e pergunta se deseja copiar
		
		var thisScenePath = BD2_updateUserNameInPath(scene.currentProjectPath());
		var local_shot_work_path = projectDATA.getLocalRoot() + publishPath + "/WORK/";
		var local_shot_path = BD2_RenameAll((local_shot_work_path + projectDATA.entity.name), "\\", "/"); 
		Print("TESTE thisScenePath: " + thisScenePath);
		Print("TESTE local_shot_path: " + local_shot_path);

		if(thisScenePath == local_shot_path){//se o folder local do shot, estiver no lugar certo, nao faz nada
			Print("No need to update shot location!");
			MessageBox.information(publish_data["status"]);
			return;
		}
		
		if(!BD2_AskQuestion("O Shot foi publicado com sucesso! Mas este arquivo não se encontra na estrutura de pastas de episódios do projeto no seu folder local!\nÉ importante copiar este arquivo para o folder correto.\n\n(OBS: Esta ação será importante quando o Script 'Open Scene' for liberado, por enquanto pode continuar trabalhando neste local mesmo!)\n\nDeseja Fazer isso agora e abrir este arquivo em seu novo local?\n\nIMPORTANTE: Ser optar por 'Yes', continue trabalhando no arquivo em seu novo local, use o arquivo neste local atual somente para backup. Faça qualquer alteração futura da cena no novo local!")){
			Print("usuario optou por NAO copiar cena para caminho do SHOT no folder do projeto!");
			return;
		}
		
		if(BD1_DirExist(local_shot_path)){
			MessageBox.warning("Este Shot já contám uma versão salva no folder local correto do projeto! Confira se esta versão está correta. Qualquer dúvida, chame a Direção Técnica!",0,0);
			Print("ERRO copiando o arquivo para o folder do projeto! Ja existe uma versao deste shot salva no folder do ep: " + local_shot_path);
			return;
		}
		
		if(!BD1_DirExist(local_shot_work_path)){
			if(!BD1_createDirectoryREDE(local_shot_work_path)){
				MessageBox.warning("Fail to create shot local folder!",0,0);
				Print("Error creating local shot file!");
				return;
			}
		}
		
		if(!BD1_UnzipFile(publish_data["local_zip"], local_shot_work_path)){
			MessageBox.warning("Erro descompactando publish zip file! Avise a direcao tecnica!",0,0);
			Print("Fail to unzip published file: " + publish_data["local_zip"]);
			return;
		}
		
		//Open new copied scene...
		var xstage_published_scene = local_shot_path + "/" + publish_data["version_published"] + ".xstage";
		
		if(!BD1_FileExists(xstage_published_scene)){
			MessageBox.warning("Algo deu errado! Nao foi possivel encontrar a cena descompactada em seu novo destino! Avise a direcao tecnica!");
			Print("[ERROR] cant find unpacked published harmony file: " + xstage_published_scene);
			return;
		}else {
			openNewSceneAndExit(xstage_published_scene);
		}		
		
	}
	
	function openNewSceneAndExit(newScene){//abre a cena nova e fecha a atual!
		var tbPath = specialFolders.bin + "/HarmonyPremium.exe";
		var start = Process2(tbPath, newScene);
		start.launchAndDetach();
		Print("Opening copied scene and closing this...");
		scene.closeSceneAndExit();
	}
	
	
}

exports.Publish = Publish;
