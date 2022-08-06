include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*TODO : mudar o checkRig version para a UI (fazer checar a versao do rig e ja sugerir na Ui e bloquear a troca de versao com reconhecer uma versao de rig existente)
	[x] fazer funcao para checar nomes das libs no rig (falta aplicar)
	[x] trocar a pasta local pela pasta do server (ja troquei as variaveis no inicio)
	[x] getMainAsset update para pegar da lista de assets gerada antes
	[x] recuperar a verificacao de versao do rig pra este script em js
	[x] nao precisa da funcao python! resolver tudo por aqui mesmo!
	
	[ ] testar pq esta travando na funcao de rename nodes na hora de renomear o grupo do rig de fora (sem ser o full)
	
	versao do vpn para salvar assets no birdoASSETS
*/	
function saveTPL(self, projectDATA, assetInfoFromOtherScript){

	var assetInfo = assetInfoFromOtherScript;

	if(assetInfo.isAnim){
		MessageBox.warning("Por enquanto salvar animacao neste script esta desabilitado!", 0,0);
		return false;
	}

	var libs = find_lib_groups(assetInfo.fullNode);

	if(!libs){
		Print("Canceled to check libs groups name...");
		return false;
	}
	Print(libs);

	self.ui.progressBar.show();
	Print("Start...");	
	var temp_folder = specialFolders.temp + "/BirdoApp/" + projectDATA.server.type + "/BirdoASSET/";
	var server_birdoasset_type = projectDATA.getTBLIB("server") + "BirdoASSET/" + assetInfo["typeFullName"] + "/";
	var asset_main_list = assetInfo["assetsList"];

	var main_folder_name = getMainASSETFolder(assetInfo.prefixo, assetInfo.assetName, asset_main_list, server_birdoasset_type);
	if(!main_folder_name){
		Print("main folder nao encontrado! Cancelando");
		return false;
	}
	
	var main_assetfolder = server_birdoasset_type + main_folder_name + "/";

	if(BD1_DirExist(temp_folder)){//limpa o temp antes de comecar
		try {
			BD1_RemoveDirs(temp_folder);
			Print("Temp folder removed!");
		} catch (e) {
			Print("[SAVETPL][ERROR] Fail to clean temp folder!");
			MessageBox.warning("[SAVETPL][ERROR] Fail to clean temp folder!",0,0);
			return false;
		}
	}
	
	if(!BD1_createDirectoryREDE(temp_folder)){
		Print("fail to create temp folder : " + temp_folder);
		MessageBox.warning("Error creating temp folder!");
		return false;
	}
	Print("Temp folder created! : " + temp_folder);
	
	self.ui.progressBar.setRange(0, 8);
	self.ui.progressBar.setValue(0);
	self.ui.progressBar.format = "...searching rig version";

	if(!BD1_DirExist(main_assetfolder)){//se nao existir ainda o main folder
		if(!BD1_createDirectoryREDE(main_assetfolder)){
			Print("Error creating main folder in server!",0,0);
			return false;
		}
	}
	var rig_version = find_rig_version(main_assetfolder, assetInfo);
	if(!rig_version){
		MessageBox.warning("Error to find rig version in server!",0,0);
		return false;
	} else {
		var msg = rig_version.exists ? "\nEsta versao ja existe." : "\nSera o primeiro rig desta versao.";
		if(!BD2_AskQuestion("Rig identificado como versao: " + rig_version.version + msg + " Deseja continuar?")){
			Print("canceled...");
			return false;
		}
		assetInfo["version"] = rig_version.version;
	}
		
	var asset_server_folder = main_assetfolder + assetInfo["version"] + "/" + assetInfo.assetName;
	
	if(BD1_DirExist(asset_server_folder)){
		var ask = MessageBox.warning("Este asset ja existe na library, deseja substituir?", 3, 4) == 3;
		if(!ask){
			Print("Canceled..");
			return false;
		} else {
			if(!BD1_RemoveDirs(asset_server_folder)){
				MessageBox.warning("Error deleting existing asset!",0,0);
				return false;
			}
			
		}
	}

	// cria esquema de pastas no temporario
	if(!create_folderSchema(asset_server_folder)){
		MessageBox.warning("Error creating folder scheeme in server!",0,0);
		return false;		
	}

	self.ui.progressBar.format = "...renaming assets...";
	if(!assetInfo.isAnim){
		updateColorNames();//change color names to UPPDERCASE
		var updatedAssetInfo = renameNodesAsset(assetInfo, projectDATA.prefix);

		if(!updatedAssetInfo){
			MessageBox.warning("Error updating node names!",0,0);
			return false;
		}
		assetInfo = updatedAssetInfo;
	}
	
	self.ui.progressBar.format = "...creating version json";	
	if(assetInfo.fullNode && !assetInfo.isAnim){//se e um CHAR, confere na BirdoLib se esta versao esta correta
		var rigJson = create_rig_version_json(BD1_dirname(asset_server_folder), temp_folder, assetInfo, libs);
		if(!rigJson){
			Print("[ERROR] Falha ao criar o arquivo json da versao!");
			MessageBox.warning("ERRO ao criar o arquivo json da versao! Avise a Direcao Tecnica!!", 0, 0);
			return false;
		}
	} else {
		Print("No need to create the rig json file!");		
	}
		
	self.ui.progressBar.setValue(1);
	self.ui.progressBar.format = "...Saving TEMPLATE...";
	var tpl_name = assetInfo.isAnim ? assetInfo.assetName : assetInfo.assetName + "." + assetInfo.version;

	var save_tpl = copyPaste.createTemplateFromSelection(tpl_name, temp_folder);//cria o template e retorna o caminho
	
	if(save_tpl == ""){
		MessageBox.information("Erro ao criar o template: " + tpl_name);
		Print("[SAVETPL][ERROR] Erro ao salvar tpl no folder temporario!");
		self.ui.progressBar.format = "!!!ERROR saving Temp TPL!!!";
		MessageBox.warning("[SAVETPL][ERROR] Erro ao salvar tpl no folder temporario!",0,0);
		return false;
	} else {
		Print("[SAVETPL] template criado: " + save_tpl);
	}
	
	var tplTempPath = temp_folder + save_tpl;
	
	var data_rede = asset_server_folder + "/DATA/";
	self.ui.progressBar.setValue(2);
	self.ui.progressBar.format = "...Saving DATA.json... ";
	save_metadata_to_JSON(projectDATA, assetInfo, data_rede);

	var thumbs_rede = asset_server_folder + "/THUMBS/";
	self.ui.progressBar.setValue(3);
	self.ui.progressBar.format = "...Creating ThumbNails...";
	var thumbs_temp = BD2_createThumbnails(tplTempPath);//gera os thumbnails para o tpl criado//
	
	self.ui.progressBar.setValue(4);
	self.ui.progressBar.format = "...Copying Thumbs...";
	
	try{
		var thumbs_zip = BD2_ZipFilesInFolder(thumbs_temp, "thumbs", temp_folder);
		BD1_UnzipFile(thumbs_zip, thumbs_rede);
	} catch(e){
		Print(e);
		self.ui.progressBar.format = "!!!ERROR ziping Thumbs!!!";
		MessageBox.warning("ERROR ziping thumbnails..",0,0);
		return false;
	}
	
	self.ui.progressBar.setValue(5);
	self.ui.progressBar.format = "...Cleaning TPL...";
	BD2_CompileScript(tplTempPath + "/scene.xstage", projectDATA.paths.birdoPackage + "utils/cleanTPL_BAT.js");
		
	self.ui.progressBar.setValue(6);
	self.ui.progressBar.format = "...Ziping TPL...";
	var temp_zip = BD1_ZipFile(tplTempPath, tpl_name, temp_folder);
	if(!temp_zip){
		MessageBox.information("Falha ao compactar tpl! Operacao cancelada!");
		self.ui.progressBar.format = "!!!ERROR ziping TPL!!!";
		return false;
	}
	
	self.ui.progressBar.setValue(7);
	self.ui.progressBar.format = "...uploading tpl zip...";
	if(!BD1_CopyFile(temp_zip, asset_server_folder + "/" + BD1_fileBasename(temp_zip))){
		MessageBox.warning("Error uploading the zip file to the server!",0,0);
		return false;
	}	
	
	self.ui.progressBar.setValue(8);
	self.ui.progressBar.format = "DONE!!!";
	
	MessageBox.information("Asset: " + BD1_fileBasename(temp_zip).replace(".zip", "") + "\nCriado com sucesso! Agora o Template esta acessivel a todos atraves da ASSET Library!");
	return true;

	//////FUNCOES EXTRAS/////////
	function getMainASSETFolder(prefixo, assetName, assetsList, assetfolder){//retorna o nome da pasta principal do asset na estrutura do BirdoASSETs
		if(prefixo == "MI"){
			Print("Tipo Misc... definindo main folder");
			return "MISCELANIA";
		}
		var char_list = BD1_ListFolders(assetfolder).filter(function(x){ return x.indexOf(prefixo) != -1;});

		if(char_list.length != 0){
			return char_list[0];
		}
		
		//retira as poses da lista
		var filtered = assetsList.filter(function(x){ return /P\d{3}/.test(x) == false;});
		filtered.sort(function(a,b){ return a.length - b.length;});
		
		var chosen_item = Input.getItem("Escolha um nome para o nome folder principal desse asset:", filtered, 0, false, "Main Asset Folder");
		if(!chosen_item){
			Print("cancelado!");
			return false;
		}		
		return prefixo + "_" + chosen_item;
	}

	function create_folderSchema(path){//cria estrurua de pastas de cada asset
		try{
			BD1_createDirectoryREDE(path + "/THUMBS");
			BD1_createDirectoryREDE(path + "/DATA");
			return true;
		} catch(error){
			Print(error);
			return false;
		}
	}

	function renameNodesAsset(assetInfoOriginal, projeto){//renomeia a selecao de nodes para o Asset
		scene.beginUndoRedoAccum("Save tpl.. change ASSSET");
		var assetInfo = assetInfoOriginal;
		//renomeia backdrop
		if(!renameBackdrop(assetInfo)){
			MessageBox.warning("Error setting the asset backdrop!",0,0);
		}
		
		var pegName = "STAGE_" + assetInfo.assetName + "-P";
		var fullName = projeto + "." + assetInfo.assetName + "-" + assetInfo.version;
		var assetNodeName = assetInfo.prefixo + "_" + assetInfo.assetName;
		
		//renmeia os nodes e retorna o novo nome do node full
		var new_peg_name = BD2_renameNode(assetInfo.pegNode, pegName);

		if(!assetInfo.fullNode){
			assetNodeName = assetInfo.prefixo + "_" + assetInfo.assetName + "-" + assetInfo.version
			var new_assetgroup_name = BD2_renameNode(assetInfo.assetNode, assetNodeName);
			var new_full_name = "no_need";
		} else {
			var new_full_name = BD2_renameNode(assetInfo.fullNode, fullName);
			var new_assetgroup_name = BD2_renameNode(assetInfo.assetNode, assetNodeName);
		}
		
		//checa pra ver se os renames foram bem sucedidos!
		if(!new_peg_name || !new_assetgroup_name || !new_full_name){
			MessageBox.warning("error renaming assets nodes!",0,0);
			scene.cancelUndoRedoAccum();
			return false;
		}
		scene.endUndoRedoAccum();
		
		//update do assetINfo com os novos nomes dos nodes!
		assetInfo["pegNode"] = new_peg_name;
		assetInfo["assetNode"] = new_assetgroup_name;
		assetInfo["fullNode"] = new_full_name == "no_need" ? null : new_full_name;
		return assetInfo;
	}

	function save_metadata_to_JSON(projectDATA, assetInfo, path){//salva json com metadata do tpl salvo
		var jsonFile = path + "saveTPL.JSON";
		var metadata = {"user": projectDATA.user_name,
						"info" : assetInfo.assetData,
						"original_file" : scene.currentProjectPath() + "/" + scene.currentVersionName() + ".xstage",
						"date" : new Date(),
						"toon_boom_version" : about.getVersionInfoStr()
						};
		BD1_WriteJsonFile(metadata, jsonFile);
	}
	
	function create_rig_version_json(server_folder, temp_folder, asset_obj, libs){//cria o json da versao do rig e retorna o caminho 
		
		var mainNode = asset_obj.fullNode;
		
		if(!asset_obj.fullNode){//se nao houver nodeFull lista o grupo principal
			mainNode = asset_obj.assetNode;
		}

		var this_verion_nodes = BD2_ListNodesInGroup(mainNode, "", false);
		var char_json = temp_folder + "_rigINFO." + asset_obj.version + ".json";
		var server_json = server_folder + "/" + BD1_fileBasename(char_json);
		
		if(BD1_FileExists(server_json)){
			Print("No need to upload rig_info json!");
			return true;
		}
		
		var rig_verion_info = {
			"nodes" : this_verion_nodes, 
			"banco": {}
			};
		
		for(var i=0; i<libs.length; i++){
			if(libs[i] == asset_obj.fullNode){
				continue;
			}
			rig_verion_info["banco"][node.getName(libs[i])] = BD2_ListNodesInGroup(libs[i], "", false);
		}

		if(!BD1_WriteJsonFile(rig_verion_info, char_json)){
			MessageBox.warning("Fail to create rig info json in temp folder!",0,0);
			return false;
		}
		
		return BD1_CopyFile(char_json, server_json);
		
		function get_expression_node(mainNode, node_list){//acha o node EXPRESSAO do Rig se houver
			var expression_names = ["CABECA", "HEAD", "ROSTO", "FACE"];
			for(var i=0; i<node_list.length; i++){
				var nodePath = mainNode + "/" + node_list[i];
				var nodeType = node.type(nodePath);
				for(var j=0; j<expression_names.length; j++){
					var is_exp = node_list[i].indexOf(expression_names[j]) != -1;
					if(nodeType == "GROUP" && node_list[i].indexOf("/") == -1 && is_exp){
						return "/" + node_list[i];
					}
				}
			}
			return null;
		}
	}
	
	function find_lib_groups(main_group){//verifica se os grupos de lib do rig estao com o nome correto, e retorna lista deles
		var allnodes = BD2_ListNodesInGroup(main_group, "", true);
		var libs = [];
		var regex_lib = /\w{3}.\w+-v\d+/;
		var lib_nodes = allnodes.filter(function(x){ 
												return regex_lib.test(node.getName(x))
											});
		if(lib_nodes.length == 0){
			Print("Nao foram encontrados nenhum node de lib neste asset!");
			return libs;
		}
											
		var msg = "Foram encontrado(s) " + lib_nodes.length + " grupos de lib neste rig! Confira e confirme se os nomes estao corretos: \n";
		lib_nodes.forEach(function(x){ 
						msg += (node.getName(x) + ";\n");
						libs.push(x);
					});
		msg += "Deseja prosseguir?";
		if(MessageBox.information(msg , 3,4) == 4){
			return false;
		}
		libs.sort(function(a, b) { return b.length - a.length;});
		libs.pop();
		return libs;
	}
	
	function find_rig_version(main_folder, assetInfo){
		
		var versions = BD1_ListFolders(main_folder);
		var output = {"version": null, "exists": false};
		
		if(assetInfo.prefixo.slice(0,2) != "CH" || assetInfo.isAnim || !assetInfo.fullNode){
			Print("Rig is not entitle to lib version parameters! Will save as v00...");
			return "v00";
		}
		
		var rig_nodes = BD2_ListNodesInGroup(assetInfo.fullNode, "", false);
		rig_nodes.sort();
		
		if(versions.length == 0){
			return "v01";
		}
		
		for(var i=0; i<versions.length; i++){
			if(check_version(versions[i], rig_nodes)){
				Print("Rig version found: " + versions[i]);
				output["version"] = versions[i];
				output["exists"] = true;
				return output;
			}
		}
		
		var next_num = parseFloat(versions[versions.length-1].replace("v", "")) + 1;

		output["version"] = "v" + ("00" + next_num).slice(-2);
		return output;

		function check_version(version, rig_nodes){
			var versionInfoJson = main_folder + version + "/_rigINFO." + version + ".json"; 	
			var version_data = BD1_ReadJSONFile(versionInfoJson);
			if(!version_data){
				Print("Fail to read version data!");
				return false;
			}
			var version_nodes = version_data["nodes"].sort();
			return JSON.stringify(version_nodes) == JSON.stringify(rig_nodes);
		}
	}

	function updateColorNames(){//Rename all the colors to UPPDERCASE
		var curPaletteList = PaletteObjectManager.getScenePaletteList();
		if(curPaletteList.getLock()){
			curPaletteList.releaseLock();
		}	
		for(var i=(curPaletteList.numPalettes-1); i>=0; i--){
			var palet = curPaletteList.getPaletteByIndex(i);
			for(var y=0; y<palet.nColors; y++){
				var cor = palet.getColorByIndex(y);
				var newName = cor.name.toUpperCase();
				cor.setName(newName);
			}
		}
		Print("Colors names updated!");
	}
	
	
	function renameBackdrop(assetInfo){//renomeia o backdrop do asset com as infos (ainda precisa rodar a funcao para isso no bat do cleanTPL
		var backdrops = Backdrop.backdrops(node.root());
		var newBackdrops_list = [];
		backdrops.forEach(function(x){ 
			var new_bd = null;
			var peg_collision = check_coord_collision(BD2_get_node_coord(assetInfo.pegNode), x.position);
			var assetnode_collision = check_coord_collision(BD2_get_node_coord(assetInfo.assetNode), x.position);
			if(peg_collision && assetnode_collision){
				new_bd = x;
				new_bd["title"]["text"] = assetInfo.prefixo + "_" + assetInfo.assetName;
				new_bd["description"]["text"] = assetInfo.version;
				newBackdrops_list.push(new_bd);
			} else {
				newBackdrops_list.push(x);
			}
		});
		return Backdrop.setBackdrops(node.root(), newBackdrops_list);	
	}

	function check_coord_collision(rect1, rect2){//check se as duas coordenadas colidem
		return rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x && rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y;
	}		
}

exports.saveTPL = saveTPL;
