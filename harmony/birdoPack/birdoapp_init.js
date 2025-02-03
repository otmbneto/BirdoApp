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

//main func para criar objeto atravez do arquivo config classe do projeto
function birdoapp_init(scripts_path){
	
	//primeiro monta um objeto com importantes valores, depois cria a classe principal
	
	//get config data
	var birdoapp_root = BD2_updateUserNameInPath(BD1_dirname(scripts_path));
	var config_json = birdoapp_root + "/config.json";
	var config_data = BD1_FileExists(config_json) ? BD1_ReadJSONFile(config_json) : {"user_name": null, "server_projects": null, "user_projects": []};
		
	//acha o prefix na cena
	var prefix = find_scene_project_prefix();

	//define se a config birdoapp_root é valida:
	config_data["valid"] = BD1_FileExists(config_json) && Boolean(config_data["server_projects"]) && Boolean(prefix);

	config_data["birdoapp"] = birdoapp_root + "/";
	config_data["appdata"] = BD2_updateUserNameInPath(BD2_FormatPathOS(System.getenv("APPDATA")));
	config_data["systemTempFolder"] = BD2_updateUserNameInPath(BD2_FormatPathOS(specialFolders.temp));
	config_data["scripts_path"] = scripts_path;
		
	//se prefixo é valido, importa os dados do projeto da cena, se nao, importa o template json
	var root_path = [config_data["server_projects"], prefix].join("/") + "/";
	var proj_root = (Boolean(prefix) && BD1_DirExist(root_path)) ? root_path : birdoapp_root + "/template/project_template/";
	Print("TESTE PROJ ROOT: " + proj_root);
	var proj_data = BD1_ReadJSONFile(proj_root + "project_data.json");
	var find_proj_data = config_data["user_projects"].filter(function(item){ return item["id"] == proj_data["id"]});
	proj_data["proj_confg_root"] = proj_root;
	if(find_proj_data.length == 0){
		proj_data["paths"]["local_folder"] = null;
		proj_data["user_role"] = null;
		config_data["valid"] = false;
	}else {
		proj_data["paths"]["local_folder"] = find_proj_data[0]["local_folder"]
		proj_data["user_role"] = find_proj_data[0]["user_role"];
	}
	
	var birdodata = new BirdoAppConfig(config_data, proj_data);
	birdodata.defineEntity();
	
	if(birdodata.valid){
		Print("[BIRDOAPP] BirdoApp configurado para o projeto '" + birdodata.project_name + "' com sucesso!");
	} else {
		Print("[BIRDOAPP] BirdoApp configurado (sem projeto) com sucesso!");	
	}
	return birdodata;
}
exports.birdoapp_init = birdoapp_init;


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


//cria classe principal do birdoapp no projeto (ou nao) do arquivo Harmony aberto
function BirdoAppConfig(config_data, project_data){
	
	//main paths data
	this.render_farm = project_data["render_farm"];
	this.birdoApp = config_data["birdoapp"];
	this.appdata = config_data["appdata"];
	this.systemTempFolder = config_data["systemTempFolder"];
	
	//define se a config e valida
	this.valid = config_data["valid"];
	
	//get project data
	this.prefix = project_data["prefix"];

	this.project_name = project_data["name"];
	this.user_name = config_data["user_name"];
	this.user_type = project_data["user_role"];
	this.entity = {};
	this.systemPath = config_data["appdata"];
	this.scripts_path = config_data["scripts_path"];
	this.proj_confg_root = config_data["proj_confg_root"];
	this.paths = project_data["paths"];
	
	//cria os objetos de regex
	this.pattern = {
        "asset": new RegExp(project_data["pattern"]["asset"]["regex"]),
        "scene": new RegExp(project_data["pattern"]["scene"]["regex"].replace("PREFIX", this.prefix)),
        "animatic": new RegExp(project_data["pattern"]["animatic"]["regex"].replace("PREFIX", this.prefix)), 
        "ep": new RegExp(project_data["pattern"]["ep"]["regex"]),
		"sc": new RegExp(project_data["pattern"]["sc"]["regex"])
    }
	
	this.colour_spaces = project_data["colour_spaces"];
	this.resolution = project_data["resolution"];
	
	this.sub_name = project_data["sub_name"];
	this.icon = project_data["proj_confg_root"] + project_data["icon"];
	this.roles = project_data["roles"];
	this.assets_types = project_data["assets_types"];
	this.write_node_att = project_data["write_node_att"];
	
	//Metodos de caminhos
	this.defineEntity = function(){//metodo para definir chave entity da classe
		var fileName = scene.currentScene();
		if(this.pattern["scene"].test(fileName)){
			this.entity["type"] = "SHOT";
			this.entity["name"] = fileName;
			this.entity["ep"] = this.pattern["ep"].exec(fileName)[0];
			
		} else if(this.pattern["asset"].test(fileName)){
			this.entity["type"] = "ASSET";
			this.entity["asset_type"] = /[a-zA-Z]+/.exec(fileName)[0];
			this.entity["name"] = fileName.replace(/_v\d+^/, "");		
			this.entity["ep"] = [];
		} else {
			MessageLog.trace("[BIRDOAPP] Nao foi possivel determinar a 'entity' do arquivo Harmony. Algumas funcionalidades nao estaram disponiveis.");
			this.entity["type"] = null;
			this.entity["name"] = scene.currentScene();
			this.entity["ep"] = null;
			this.entity["asset_type"] = null;
		}
	}
	
	this.getServerRoot = function(){//retorna o caminho root do server
		return [this.paths["root"], this.paths["projRoot"]].join("/");
	}
	
	this.getLocalRoot = function(){//retorna root do projeto local -OK
		return this.paths["local_folder"] + "/";
	}
	
	this.getTBLIB = function(root){//retorna caminho da tblib (root = server ou local)
		var tb_root = "";
		if(root == "server"){
			tb_root = this.paths["root"];
		} else if(root == "local"){
			tb_root = this.getLocalRoot();
		}
		return tb_root + this.paths["tblib"] + "/";
	}
	
	this.getAssetTypeFullName = function(){//retorna  o nome completo do tipo de asset
		if(this.entity.type != "ASSET"){
			MessageLog.trace("[BIRDOAPP][getAssetTypeFullName - ERROR] Metodo somente disponivel para assets!");
			return false;
		}

		for(var i=0; i<this.assets_types.length; i++){//encontra o nome completo do tipo de asset
			if(this.assets_types[i].slice(0, this.entity.asset_type.length).toUpperCase() == this.entity.asset_type){
				return this.assets_types[i];
			}		
		}
		MessageLog.trace("[BIRDOAPP][getAssetTypeFullName - ERROR] Este tipo de asset nao esta registrado no banco de dados do projeto!");
		return false;
	}
	
	this.getPublishStep = function(){//retorna uma lista com steps baseado no USER TYPE (DT retorna todos steps possiveis, e outros filtram)
		var steps_list = Object.keys(this.paths.steps);
		//se a comp NAO usar harmony, tira comp de destino possível para step de publish
		if(!this.paths.steps.COMP.harmony){
			steps_list.splice(steps_list.indexOf("COMP"), 1);
		}

		var user_type = this.user_type;
		if(user_type == "COMP"){
			return ["ANIM"];
		}
		var step_filtered = steps_list.filter(function(item){ return user_type.indexOf(item) != -1});
		if(step_filtered.length == 0){
			return steps_list;
		}
		
		return step_filtered;
	}
	
	this.getRenderStep = function(){//retorna o step do render (DT e COMP retorna mais opcoes)
		var steps_list = Object.keys(this.paths.steps);
		var user_type = this.user_type;
		if(user_type == "DT"){
			return steps_list;
		}
		return steps_list.filter(function(item){ return user_type.indexOf(item) != -1});
	}
	
	this.setProjectCS = function(step){//seta o espaco de cor para o projeto
		if(!(step in this.colour_spaces)){
			MessageLog.trace("[BIRDOAPP][setProjectCS - ERROR] PARAMETRO DE STEP INVALIDO!");
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
		if(!(step in this.resolution)){
			MessageLog.trace("[BIRDOAPP][setProjectResolution - ERROR] PARAMETRO DE STEP INVALIDO!");
			return false;
		}
		var res = this.resolution[step];
		if(scene.setDefaultResolution(res[0], res[1], scene.defaultResolutionFOV())){
			MessageLog.trace("[BIRDOAPP] Scene resolution updated to: " + res);
			return true;
		} else {
			MessageLog.trace("[BIRDOAPP] FAIL to update scene resolution to: " + res);
			return false;
		}
	}
	
	this.get_scene_step_folder = function(step_type){//retorna o nome da pasta de step no render
		return this.paths["step"][step_type]["folder_name"];	
	}

	this.getShotPublishFolder = function(step){//retorna o caminho de folder para publish do arquivo aberto para o projeto
		var ep = this.entity["ep"];
		var sceneName = this.entity["name"];
		var publish = null;
		
		return [this.paths["episodes"], ep, this.paths.ep.cenas.folder, this.get_scene_step_folder(step), this.entity["name"]].join("/");
	}
	
	this.getRenderComp = function(){//caminho do render de comp
		if(this.paths.steps.COMP.harmony){
			return this.getRenderPath("server", "COMP")		
		}
		var server_root = this.getServerRoot();
		return server_root + [ 
			this.paths["episodes"], 
			this.entity.ep, 
			this.paths.ep.cenas.folder, 
			this.get_scene_step_folder("COMP"),
			this.entity["name"],
			this.paths.step.COMP.server.filter(function(item){ return item.toUpperCase().indexOf("RENDER") != -1})[0]
		].join("/");
	}
	
	this.getRenderPath = function(root, step){
				
		var tb_root = "";
		if(root == "server"){
			tb_root = this.getServerRoot();
		} else if(root == "local"){
			tb_root = this.getLocalRoot();
		}
		
		return tb_root + [
			this.paths["episodes"], 
			this.entity.ep, 
			this.paths.ep.cenas.folder, 
			this.paths.ep.cenas.render.folder, 
			this.get_scene_step_folder(step)
		].join("/");
	}
	
	this.getRenderAnimaticLocalFolder = function(){//retorna o folder local dos renders do animatic
		return this.getLocalRoot() + [
			this.paths["episodes"], 
			this.entity.ep, 
			this.paths.ep.cenas.folder, 
			this.paths.ep.cenas.render.folder, 
			this.paths.ep.cenas.render.sub_folders[0]
		].join("/");
	}
	
	this.getLibPath = function(){
		return this.getTBLIB("server") + "BirdoLib/";
	}
	
	this.usesBirdoLib = function(){//testa se o projeto usa birdoLib
		return dirExist(this.getLibPath());	
	}
	
	this.getWriteNodeAtt = function(step){//retorna o atributo do write node para o step ('pre_comp' ou 'comp')
		return this.write_node_att[step.toLowerCase()];
	}
		
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