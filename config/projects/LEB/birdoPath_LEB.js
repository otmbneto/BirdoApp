/*
	##CLASSE para criar objeto com infos do projeto: ASTRONAUTA
	*Usar esse arquivo coomo base para outros projetos, mantendo as keys principais e adaptando os metodos conforme necessario para cada projeto
	
	TODO:
		[X] mudar as infos do nextcloud para um json mais escondido na pasta confid do projeto
		[X] mudar as infos do shotgun para um json mais escondido na pasta confid do projeto
		[ ] rever funcao check connection
		[X] rever funcao check toon boom version
		[ ] rever getPublishPath
		[X] rever os getLocalRoot
		[ ] fazer funcao com python pra pegar o serverRootPath
	
*/

function BirdoProject(entity){

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
		//var add_writeSombras = this.paths.birdoPackage + "utils/addWriteSombra_LEB.js";
		
		if(step == "COMP"){
			//exporta info dos psd
			require(get_psd_data_script).get_psd_anim_data(true);
			//require(add_writeSombras).add_writeSombras();
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
	
	this.checkToonBoom = function(){//checa se a versao aberta do toon boom e compativel com o projeto
		var versionSplit = this.harmony.version.split(".");
		var min_version = versionSplit[0] + versionSplit[1] + versionSplit[2];
		var version = String(about.majorVersion) + String(about.minorVersion) + String(about.patchVersion);//formato 2000,2100,2200,etc...

		if(version < min_version){
			MessageBox.warning("A versao do toon boom aberta nao e compativel com a versao que deve ser usada neste projeto!\nAvise a producao e providencie a versao " + this.harmony.version, 0, 0, 0);
			MessageLog.trace("[WARNING!] Versao de ToonBoom aberta nao compativel com projeto " + this.project_name);	
			return false;
		} 
		/*
		else if(parseFloat(versionSplit[2]) > parseFloat(about.patchVersion)){
			MessageLog.trace("[WARNING]: Este versao aberta do Tooon Boom pode apresentar falhas em alguns scripts neste projeto! Atualize par a versao " + this.harmony.version + " para completa compatibilidade!");
		}*/

		MessageLog.trace("[BIRDO PATHS] version check toon boom for project OK!");
		return true;
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

exports.BirdoProject = BirdoProject;