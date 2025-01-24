include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
	TODO:
	[ ] fazer o entity retornar sempre um objeto, se nao achar a entity, faz uma chave "valid" = false
	[ ] acertar logica dos nomes vindo dos jsons
		[ ] config.json
		[ ] project_data.json
	[ ] revisar metodos da classe
	
*/
function birdoPaths(){//main func para criar objeto atravez do arquivo config classe do projeto
	
	//pega os caminhos root do birdoApp e sistema
	var appdata = BD2_updateUserNameInPath(BD2_FormatPathOS(System.getenv("APPDATA")));
	var system_temp = BD2_updateUserNameInPath(BD2_FormatPathOS(specialFolders.temp));
	var scripts_path = System.getenv("TOONBOOM_GLOBAL_SCRIPT_LOCATION");
	if(!scripts_path){
		MessageBox.warning("ATENCAO! A instalação da variável com o caminho do birdoApp não está instalada corretamente!\n" + 
		"Aparentemente a instalação não está correta!",0,0);
		return false;
	}
	var birdoApp = BD2_updateUserNameInPath(BD1_dirname(scripts_path));
	if(about.isMacArch()){//if the system is mac
		appdata = System.getenv("HOME") + "/Library";
	}
	
	//get config data
	var config_json = birdoApp + "/config.json";
	var config_data = BD1_FileExists(config_json) ? BD1_ReadJSONFile(config_json) : null;
	
	var projDATA = new ProjectData(entity);

	//atualiza o main Object com os caminhos do birdoApp e do appData do Sistema
	projDATA["appdata"] = BD2_RenameAll(appdata, "\\", "/");
	projDATA["systemTempFolder"] = BD2_RenameAll(system_temp, "\\", "/");
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
	
	Print("[BIRDO PATHS] Paths for project '" + projDATA.project_name + "' successfully loaded!");
	return projDATA;
}
exports.birdoPaths = birdoPaths;


/////////FUNCOES EXTRAS/////////////////
//retorna o prefixo do projeto da cena (se nao houver, retorna null)
function find_scene_project_prefix(){
	var fileName = scene.currentScene();
	var nameSplit = fileName.split("_");
	if(/^[a-zA-Z]{3}$/.test(nameSplit[0])){
		return nameSplit[0];
	} else {
		var infoProj = "Top/SETUP/proj";
		if(node.getName(infoProj) == "proj"){
			return node.getTextAttr(infoProj, 1,"TEXT").toUpperCase();
		}
	}
	Print("[BIRDOAPP] -> cena não é uma cena válida de projeto!");
	return null;
}

function getEntityData(){//get prefix, ep e type (asset ou shot)
	
	var fileName = scene.currentScene();
	var nameSplit = fileName.split("_");
	var version_reg = /((_|-)(v|V)?\d+)$/;
	var shot_prefix_reg = /(\w{3}_(EP)?\d{3}_(SC|sc)\d{4})$/;
	var shot_no_prefix_reg = /^(EP\d{3}_(SC|sc)\d{4})/;
	var asset_reg = /(^((CH|PR|FX|IL|CO)(\d{4}|\d{3})_\w+)|(^\w{3}_ASSET_template)|(MI_.+))/;
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


//retorna um objeto com a config do BirdoApp
function getLocalData(projectDATA){
	
	var config_file = projectDATA.birdoApp + "config.json";
	var serverDATA_json = projectDATA.birdoApp + "config/projects/" + projectDATA.prefix + "/server_DATA.json";
	var user_data_json = specialFolders.temp + "/BirdoApp/users/users.json";
	
	if(!BD1_FileExists(config_file)){
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

	var localObject = BD1_ReadJSONFile(config_file);
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



function ProjectData(appdata, scripts_path){

	this.project_name = null;
	this.prefix = entity.prefix;
	this.user_name = null;
	this.user_type = null;
	this.entity = entity;
	this.systemPath = null;
	this.server = null;
	this.pipeline = null;
	this.birdoApp = null;
	this.paths = null;
	this.pattern = {
		"asset": new RegExp("(\\w{2}\\d{3}|\\w{2})_\\w+"),
		"shot": new RegExp("\\w{3}_EP\\d{3}_SC\\d{4}")
	};
	this.colour_spaces = {
		"PRE_COMP": "NO_COLOUR_SPACE", 
		"COMP": "NO_COLOUR_SPACE"
	};
	this.resolution_name = {
		"PRE_COMP": "HDTV_1080p24", 
		"COMP": "4K_UHD"
	};
	//limpa o prefix da entity para nao ficar com redundancia
	delete this.entity.prefix;
	
	//Methods Functions//
	this.getServerRoot = function(){//OK
		return this.paths["root"] + this.paths["projRoot"];
	}
	
	this.getLocalRoot = function(){//retorna root do projeto local -OK
		return this.paths["local_folder"] + this.paths["projRoot"];
	}
	
	this.getEntity = function(){
		var version_reg = /((_|-)(v|V)?\d+)$/;
		var shot_prefix_reg = /(\w{3}_(EP)?\d{3}_(SC|sc)\d{4})$/;
		var shot_no_prefix_reg = /^(EP\d{3}_(SC|sc)\d{4})/;
		var asset_reg = /(^((CH|PR|FX|IL|CO)(\d{4}|\d{3})_\w+)|(^\w{3}_ASSET_template)|(MI_.+))/;
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
		
	}
	
	this.getTBLIB = function(root){//retorna caminho da tblib (root = server ou local) - OK
		var tb_root = "";
		if(root == "server"){
			tb_root = this.paths["root"];
		} else if(root == "local"){
			tb_root = this.getLocalRoot();
		}
		return tb_root + this.paths["tblib"];
	}
	
	this.getAssetTypeFullName = function(){//retorna  o nome completo do tipo de asset usado no Monday - OK
		if(this.entity.type != "ASSET"){
			MessageLog.trace("[GETASSETTYPEFULLNAME][ERROR] Metodo somente disponivel para assets!");
			return false;
		}
		var assetTypeList = this.pipeline.assetsTypes;
		for(var i=0; i<assetTypeList.length; i++){//encontra o nome completo do tipo de asset
			if(assetTypeList[i].slice(0,2).toUpperCase() == this.entity.asset_type){
				return assetTypeList[i];
			}		
		}
		MessageLog.trace("[ERROR] Este tipo de asset nao esta registrado no banco de dados do projeto!");
		return false;
	}
	
	this.getStepByUser = function(){//retorna lista de steps possiveis para o tipo de usuario (RIg, ANIM E SETUP) - OK
		var steps_list = null;
		if(this.user_type == "RIG"){
			steps_list = ["SETUP", "ANIM", "COMP"];					
		} else if(this.user_type == "SETUP"){
			if(this.entity.type == "ASSET"){
				MessageLog.trace("[GETSTEPBYUSER] Entity not suported for type of user  " + this.user_type);
				return false;
			}
			if(this.entity.type == "SHOT"){
				steps_list = ["SETUP"];					
			}
		} else if(this.user_type == "ANIMATOR" || this.user_type == "ANIM_LEAD"){
			if(this.entity.type == "ASSET"){
				MessageLog.trace("[GETSTEPBYUSER] Entity not suported for type of user  " + this.user_type);
				return false;
			}
			if(this.entity.type == "SHOT"){
				steps_list = ["ANIM"];
			}
		} else if(this.user_type == "COMP"){
			if(this.entity.type == "ASSET"){
				MessageLog.trace("[GETSTEPBYUSER] Entity not suported for type of user  " + this.user_type);
				return false;
			}
			if(this.entity.type == "SHOT"){
				steps_list = ["ANIM"];					
			}
		} else {
			steps_list = ["SETUP", "ANIM"];		
		}
		
		var step = null;
		if(!steps_list){
			return false;
		} else if(steps_list.length > 1){
			step = Input.getItem("Escolha o Step para envio: ", steps_list, null, false, "BirdoApp");
			if(!step){
				MessageLog.trace("cancelado..");
				return false;
			}
		} else {
			step = steps_list[0];
		}
		return step;
	}
	
	this.setProjectCS = function(step){//seta o espaco de cor para o projeto
		if(!(step in this.colour_spaces)){
			MessageLog.trace("[SETPROJECTCS] ERROR! PARAMETRO DE STEP INVALIDO!");
			return false;
		}
		var proj_cs = this.colour_spaces[step];
		
		if(proj_cs == "ACES"){
			var ocio = fileMapper.toScenePath(specialFolders.etc + "/colormanagement/config.ocio");
			if(!fileExists(ocio)){
				MessageLog.trace("Ocio not found in this computer!");
				return false
			}
			MessageLog.trace("[SETPROJECTCS] OCIO check ok!");
		}
		
		var setCS_script_path = this.paths.birdoPackage + "utils/setColourSpace.js";
		
		MessageLog.trace("### Setting Color Space - " + proj_cs + " ###");

		var require_script = require(setCS_script_path).setColourSpace(proj_cs);
		
		if(!require_script){
			MessageBox.warning("ERROR CHANGING COLOUR SPACE: " + proj_cs + "\nCheck MessageLog for details!",0,0);
			return false;
		} else {
			MessageLog.trace(require_script);
			return true;
		}
	}
	
	this.setProjectResolution = function(step){//seta os settings de resolucao e fps do projeto
		if(!(step in this.resolution_name)){
			MessageLog.trace("[SETPROJECTRESOLUTION] ERROR! PARAMETRO DE STEP INVALIDO!");
			return false;
		}
		var res = this.resolution_name[step];
		if(scene.setDefaultResolutionName(res)){
			MessageLog.trace("Scene resolution updated to: " + res);
			return true;
		} else {
			MessageLog.trace("FAIL to update scene resolution to: " + res);
			return false;
		}
	}
	
	this.modifyScenePreRender = function(step, is_farm){
		var get_psd_data_script = this.paths.birdoPackage + "utils/get_psd_anim_data.js";
		var add_writeSombras = this.paths.birdoPackage + "utils/addWriteSombra_LEB.js";
		
		if(step == "COMP"){
			try{
				require(get_psd_data_script).get_psd_anim_data(true);//exporta info dos psd
			} catch(e){
				MessageLog.trace(e.message);
				MessageLog.trace("Error creating PSD files data!");
			}
			try{
				require(add_writeSombras).addWriteSombra_LEB();
			} catch(e){
				MessageLog.trace(e.message);
				MessageLog.trace("Error creating sombra layer!");
			}				
		} else {
			MessageLog.trace("Nenhuma acao de modify scene para o pre_comp!");
		}
	}
	
	this.getRenderComp = function(scene_name){//caminho do render da comp (direto na rede da birdo)
		var name_arr = scene_name.split("_");
		var ep = name_arr[1];
		
		var render_path = this.paths.render_comp.replace("{EP}", ep);
		return render_path.replace("{SCENE}", scene_name);
	}

	this.getShotPublishFolder = function(step){//retorna o caminho de folder para publish do arquivo aberto para o projeto - OK
		if(this.entity.type != "SHOT"){
			MessageLog.trace("[GETSHOTPUBLISHFOLDER] Error! Metodo somente funciona para shot!");
			return false;
		}
		var ep = this.entity["ep"];
		var sceneName = this.entity["name"];
		var publish = null;
		
		publish = this.paths["episodes"] + ep + "/03_CENAS/" + this.get_scene_step_folder(step) + "/" + this.entity["name"];
		return publish;
	}
	
	this.getRenderStep = function(){//retorna o step do render (se for anim ou setup o user_type, seleciona sozinho... se nao pergunta)
		var steps = this.paths.step.RENDER.map(function(x) { return x.replace(/\d{2}_/, "")});
		steps.shift();
		var step = null;
		if(this.user_type == "SETUP"){
			step = "SETUP";
		} else if (this.user_type == "COMP"){
			step = "COMP";
		} else if (this.user_type == "ANIMATOR" || this.user_type == "ANIM_LEAD"){
			step = "ANIMATION";
		}
		if(this.user_type == "DT"){
			step = Input.getItem("Escolha o Step do RENDER: ", steps, null, false, "BirdoApp");
			if(!step){
				MessageLog.trace("cancelado..");
				return false;
			}				
		}
		return step;
	}
	
	this.get_render_step_folder = function(step_type){//retorna o nome da pasta de step no render
		var steps = this.paths.step.RENDER;
		var step_name = null;
		steps.forEach(function(x){ if(x.indexOf(step_type) != -1){ step_name = x;}});
		return step_name;	
	}
	
	this.get_scene_step_folder = function(step_type){//retorna o nome da pasta de step no render
		return this.paths["step"][step_type]["folder_name"];	
	}
	
	this.getRenderPath = function(root, step){//retorna o caminho de folder do render (com o root dado local ou server - no server deixei vazio pra escolher no python)
		
		if(this.entity.type != "SHOT"){
			MessageLog.trace("[GETRENDERPATH] Metodo somente disponivel para SHOTS!");
			return false;
		}
		var ep = this.entity["ep"];
		var sceneName = this.entity["name"];
		
		var tb_root = "";
		if(root == "server"){
			tb_root = this.getServerRoot();
		} else if(root == "local"){
			tb_root = this.getLocalRoot();
		}
		
		var step_folder = this.get_render_step_folder(step);
		
		if(!step_folder){
			MessageLog.trace("[GETRENDERPATH] Step nao encontrado para este nome de step!");
			return false;
		}
		return tb_root + this.paths["episodes"] + ep + "/03_CENAS/00_RENDER/" + step_folder + "/";
	}
	
	this.getRenderAnimaticLocalFolder = function(){//retorna o folder local dos renders do animatic
		var animatic_render_path = this.getRenderPath("local", "ANIMATIC");
		return animatic_render_path;
	}
	
	this.getSceneStep = function(){//retorna o step baseado na funcao do usuario (usado para o envio de cena)
		if(this.user_type == "ANIMATOR" || this.user_type == "ANIM_LEAD"){
			return "ANIM";
		}
		if(this.user_type == "COMP"){
			return "COMP";
		}
		if(this.user_type == "SETUP"){
			return "SETUP";
		}
		return ["SETUP", "ANIM", "COMP"];
	}
	
	this.find_step_in_scene_path = function(){//procura o step no caminho da cena caso ela esteja na estrutura de cenas do projeto
		var scene_path = scene.currentProjectPath();
		var splited = scene_path.split(/\/|\\/);
		var step_regex = /^(\d{2}_(SETUP|ANIM|COMP))$/;
		for(var i=0; i<splited.length; i++){
			if(step_regex.test(splited[i])){
				return splited[i].replace(/\d{2}_/, "");
			}
		}
		return null;
	}
	
	this.checkConnection = function(){//ESCREVER FUNCAO PRA TESTAR CONEXAO COM O NEXTCLOUD (testar um esquema no python pra checar e retornar a raiz no server??)
		MessageLog.trace("[CHECKCONNECTION] Falta escrever funcao no python pra checar conexao com o Nextcloud aqui!");
		return true;
	}
	
	this.getLibPath = function(){
		return this.getTBLIB("server") + "BirdoLib/";
	}
	
	this.usesBirdoLib = function(){//testa se o projeto usa birdoLib
		return true;	
	}
	///////////////FIM DOS METODOS////////////////////////
		
	//funcoes complementares//
	function fileExists(filePath){//check if file exis
		var f = new File(filePath);
		return f.exists;
	}
	function dirExist(dirPath){
		var dir = new Dir(dirPath);
		return dir.exists;
	}
}