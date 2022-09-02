include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
	TODO:
	[X] criar objeto com infos da cena aberta (EP, ENTITY TYPE, ASSET TYPE, NAME);
	[X] Pegar Objeto atraves da classe do projeto em config usando o objeto de entity;
	[X] adicionar caminho da birdoApp no objeto
	[X] caminho projeto local (interface pra escolher o caminho do projeto local e salvar num json no AppBirdo (ou na pasta da cena) ???)
	
*/


function birdoPaths(){//main func para criar objeto atravez do arquivo config classe do projeto
	
	var systemFolder = BD2_updateUserNameInPath(BD2_FormatPathOS(System.getenv("APPDATA")));
	var systemTempFolder = BD2_updateUserNameInPath(BD2_FormatPathOS(specialFolders.temp));
	
	if(about.isMacArch()){//if the system is mac
		systemFolder = System.getenv("HOME") + "/Library";
	}
	
	var entity = getEntityData();
	
	if(!entity){
		Print("[BIRDO PATHS] [ERROR] Fail to get ENTITY data for this file!");
		return false;
	}


	var birdoApp = systemFolder + "\\BirdoApp\\";
	var projectPathFile = birdoApp + "config\\projects\\" + entity.prefix + "\\birdoPath_" + entity.prefix + ".js";//arquivo .js com classe construtora de caminhos para o arquivo aberto
	
	if(!BD1_DirExist(birdoApp)){
		MessageBox.warning("ERRO! A Pasta do BirdoApp nao foi encontrada! Os scripts da Birdo nao irao funcinar!", 0, 0);
		Print("[BIRDO PATHS] [ERROR] BirdoApp Folder nao encontrado!!! Os scripts nao iram funcionar!");
		return false;
	}

	if(!BD1_FileExists(projectPathFile)){
		MessageBox.warning("ERRO! Nao foi possivel encontrar o .js Paths para este projeto! Os scripts da Birdo nao irao funcinar!\nAvise a Direcao Tecnica!", 0, 0, 0);
		Print("[BIRDO PATHS][ERROR] Classe construtora de paths do projeto nao encontrada!!! Os scripts nao iram funcionar!");
		return false;
	}
	
	var projeto = require(BD2_RenameAll(projectPathFile, "\\", "/"));
	var projDATA = new projeto.BirdoProject(entity);

	//atualiza o main Object com os caminhos do birdoApp e do appData do Sistema
	projDATA["systemPath"] = BD2_RenameAll(systemFolder, "\\", "/");
	projDATA["systemTempFolder"] = BD2_RenameAll(systemTempFolder, "\\", "/");
	projDATA["birdoApp"] = BD2_RenameAll(birdoApp, "\\", "/");
	
	var localData = getLocalData(projDATA);
	
	if(!localData){
		Print("[BIRDO PATHS][ERROR] BirdoApp local DATA is not ready to start!");
		return false;
	} else {
		//UPDATE MAIN OBJECT WITH LOCAL INFORMATION
		projDATA["user_name"] = localData.user_name;
		projDATA["id"] = localData.id;
		projDATA["user_type"] = localData.user_type;
		projDATA["paths"] = localData.paths;
		projDATA["server"] = localData.server;
		projDATA["pipeline"] = localData.pipeline;
		projDATA["harmony"] = localData.harmony;
		projDATA["project_name"] = localData.name;
	}
	
	if(!projDATA.checkToonBoom()){//metodo que checa se o projeto e compativel com a versao de toon boom aberta
		return false;
	}
	
	Print("[BIRDO PATHS] Paths for project '" + projDATA.project_name + "' successfully loaded!");
	return projDATA;
}


/////////FUNCOES EXTRAS/////////////////

function getEntityData(){//get prefix, ep e type (asset ou shot)
	
	var fileName = scene.currentScene();
	var nameSplit = fileName.split("_");
	var version_reg = /((_|-)(v|V)?\d+)$/;
	var shot_prefix_reg = /(\w{3}_(EP)?\d{3}_(SC|sc)\d{4})$/;
	var shot_no_prefix_reg = /^(EP\d{3}_(SC|sc)\d{4})/;
	var asset_reg = /(^((CH|PR|FX|IL|CO)(\d{4}|\d{3})_\w+)|(^\w{3}_ASSET_template)|(MI_((\w+)?(\d{3})?(\w+)?_)+(Etc)?P\d{3}))/;
	var finalObj = {"prefix" : null, "type" : null, "ep" : []};

	if(shot_prefix_reg.test(fileName)){
		finalObj["prefix"] = nameSplit[0];//essa key depois e substituida pela da classe do projeto
		finalObj["type"] = "SHOT";
		finalObj["name"] = fileName;
		finalObj["ep"] = nameSplit[1];
	} else if(shot_no_prefix_reg.test(fileName)){
		finalObj["type"] = "SHOT";
		finalObj["ep"] = nameSplit[0];
	} else if(asset_reg.test(fileName)){
		finalObj["type"] = "ASSET";
		finalObj["asset_type"] = fileName.slice(0,2);
		finalObj["name"] = fileName.replace(version_reg, "");		
		finalObj["ep"] = [];
	} else {
		Print("[BIRDO PATHS][ERROR] Este arquivo nao pertence a um projeto Birdo!");
		return false;
	}
	
	var infoProj = "Top/SETUP/proj";
	if(node.getName(infoProj) == "" && finalObj["type"] == "SHOT"){
		finalObj["prefix"] = "bdb";
	} else if(node.getName(infoProj) != ""){
		finalObj["prefix"] = node.getTextAttr(infoProj, 1,"TEXT").toUpperCase();
	} else {
		Print("[BIRDO PATHS][ERROR] Falha ao encontrar o Prefixo do Projeto!");
		return false;
	}
	return finalObj;
}



function getLocalData(projectDATA){//Pega as informacao local do Usuario para este projeto nos JSONS
	
	var localDataFile = projectDATA.birdoApp + "birdoLocal.json";
	var serverDATA_json = projectDATA.birdoApp + "config/projects/" + projectDATA.prefix + "/server_DATA.json";
	var user_data_json = specialFolders.temp + "/BirdoApp/users/users.json";
	
	if(!BD1_FileExists(localDataFile)){
		MessageBox.warning("BirdoAPP erro! BirdoLocal.json nao encontrado! Avise a Direcao Tecnica!", 0, 0);
		Print("[BIRDO PATHS][ERROR] localdata json nao encontrado!!! Os scripts nao iram funcionar!");
		return false;
	}
	
	if(!BD1_FileExists(serverDATA_json)){
		MessageBox.warning("ERRO! Nao foi possivel encontrar o serverDATA_json para este projeto! Os scripts da Birdo nao irao funcinar!\nAvise a Direcao Tecnica!", 0, 0, 0);
		Print("[BIRDO PATHS][ERROR] Server Json data nao encontrada!!! Os scripts nao iram funcionar!");
		return false;
	}
	
	if(!BD1_FileExists(user_data_json)){
		MessageBox.warning("BirdoAPP erro! user_data.json nao encontrado! Voce ainda nao configurou seu login no BirdoAPP!\nUse a interface do BirdoAPP para logar!!", 0, 0);
		Print("[BIRDO PATHS][ERROR] user_data_json nao encontrado!1");
		return false;
	}

	var localObject = BD1_ReadJSONFile(localDataFile);
	var serverDATA = BD1_ReadJSONFile(serverDATA_json);
	var user_data = BD1_ReadJSONFile(user_data_json);

	var localDATA = checkLocalDATA(localObject, serverDATA, user_data, projectDATA.prefix);//gera objeto final com infos de rede do projeto 

	return localDATA;
	
}

function checkLocalDATA(localDATA, serverDATA, user_data, prefix){//garante que o arquivo local foi atualizado  esta com todas as informacoes
	
	var projectObj = null;
	
	for(item in localDATA.projects){//procura projeto no birdoLocal
		if(localDATA.projects[item]["prefix"] == prefix){
			projectObj = localDATA.projects[item];
			break;
		}
	}
	
	//CHECKS DAS INFOS DO BIRDOLOCAL//
	if(!projectObj){
		Print("[BIRDO PATHS][BIRDO LOCAL DATA] [ERROR] Projeto nao documentado no localDATA!");
		MessageBox.warning("BirdoAPP error! Projeto nao documentado na library do app!", 0, 0);
		return false;
	} 
	
	//UPDATES BIRDOLOCAL WITH THE USER DATA
	var user_login = user_data["current_user"];
	var user_login_data = user_data[user_login][prefix];

	//UPDATE SERVERDATA DATA
	if(!serverDATA.server.login){
		Print("[BIRDOPATHS] Server: No login needed!");
	}
	server_data_update = serverDATA["server"];
	server_data_update["login"] = user_login_data["server_login"];

	projectObj["user_name"] = user_login;
	projectObj["user_type"] = user_login_data["user_type"];
	projectObj["paths"] = serverDATA.paths;
	projectObj["paths"]["local_folder"] = BD2_RenameAll((user_login_data["local_folder"] + "/"), "\\", "/");
	projectObj["pipeline"] = serverDATA["pipeline"];
	projectObj["server"] = server_data_update;
	
	return projectObj;
}


exports.birdoPaths = birdoPaths;