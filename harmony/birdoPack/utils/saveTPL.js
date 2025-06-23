include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function saveTPL(self, projectDATA, assetInfoFromOtherScript){

	var assetInfo = assetInfoFromOtherScript;
	Print("asset info saveTPL.js:");
	Print(assetInfo);
	Print("------------------------------------------------");
	var libs = find_lib_groups(assetInfo.fullNode, projectDATA);
	if(!libs){
		Print("Canceled to check libs groups name...");
		return false;
	}
	Print(libs);

	self.ui.progressBar.show();
	Print("Start...");	
	var temp_folder = projectDATA.createTempFolder("saveTPL", true);
	var server_birdoasset_type = projectDATA.getTBLIB("server") + "BirdoASSET/" + assetInfo["typeFullName"] + "/";
	var asset_main_list = assetInfo["assetsList"];

	var main_folder_name = getMainASSETFolder(assetInfo.prefixo, assetInfo.assetName, asset_main_list, server_birdoasset_type);
	if(!main_folder_name){
		Print("main folder nao encontrado! Cancelando");
		return false;
	}
	
	var main_assetfolder = server_birdoasset_type + main_folder_name + "/";
	self.ui.progressBar.setRange(0, 8);
	self.ui.progressBar.setValue(0);
	self.ui.progressBar.format = "...searching rig version";
	Print("teste MAIN ASSET FOLDER: " + main_assetfolder);
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
		var ask = BD2_AskQuestion("Este asset ja existe na library, deseja substituir?");
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
	updateColorNames();//change color names to UPPDERCASE

	var updatedAssetInfo = renameNodesAsset(assetInfo, projectDATA.prefix, temp_folder);
	
	if(!updatedAssetInfo){
		MessageBox.warning("Error updating node names!",0,0);
		return false;
	}
	
	self.ui.progressBar.format = "...creating version json";	
	if(assetInfo.fullNode){//se e um CHAR, confere na BirdoLib se esta versao esta correta
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
	var tpl_name = assetInfo.assetName + "." + assetInfo.version;

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
	
	var tplTempPath = temp_folder + "/" + save_tpl;
	
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
	
	//check master controller nodes files
	if(!assetInfo["mcs"]){
		Print(">> No Master Controller nodes found in this asset!");
	} else {
		Print("Copying MC files to server.. ");
		self.ui.progressBar.format = "...saving MC files...";
		var server_mcfiles_zip = data_rede + "mcFiles.zip";
		var extrascriptsCounter = 0;
		var mcFilesCounter = 0;		
		
		if(assetInfo.mcs.temp_zip){
			if(!BD1_CopyFile(assetInfo.mcs.temp_zip, server_mcfiles_zip)){
				MessageBox.warning("ERROR enviando o zip de arquivos do MC pra rede!",0,0);
				Print("Erro ao enviar o 'mcFiles.zip' para a rede!");
			}
			mcFilesCounter++;
		}
	}
	
	self.ui.progressBar.setValue(8);
	self.ui.progressBar.format = "DONE!!!";
	
	MessageBox.information("Asset: " + BD1_fileBasename(temp_zip).replace(".zip", "") + "\nCriado com sucesso! Agora o Template esta acessivel a todos atraves da ASSET Library!");
	return true;

	//////FUNCOES EXTRAS/////////
	function updateMCAtt(mcNode, rigVersionName){//atualiza os atts do node com as novas infos de nome da versao do rig
		//atualiza o att de files do mc
		var col = node.linkedColumn(mcNode, "FILES");
		var files_list = column.getEntry(col, 1, 1);
		var reg = /CH\d+-v\d+/g;
		var new_files_att = files_list.replace(reg, rigVersionName);
		column.setEntry(col, 1, 1, new_files_att);
		
		//atuzaliza a uidata
		var ui_att_raw = node.getTextAttr(mcNode, 1, "UI_DATA");
		var new_att_data = ui_att_raw.replace(reg, rigVersionName);
		node.setTextAttr(mcNode, "UI_DATA", 1, new_att_data);
		
		//update camera view
		Action.performForEach("onActionInvalidateCanvas","cameraView");

		return files_list != new_files_att || ui_att_raw != new_att_data;
	}
	
	function getMainASSETFolder(prefixo, assetName, assetsList, assetfolder){//retorna o nome da pasta principal do asset na estrutura do BirdoASSETs
		if(prefixo == "MI"){
			Print("Tipo Misc... definindo main folder");
			return "MISCELANIA";
		}
		
		var char_list = BD1_ListFolders(assetfolder).filter(function(x){ return x.indexOf(prefixo) != -1;});
		if(char_list.length != 0){
			return char_list[0];
		}
		
		if(!BD1_DirExist(assetfolder)){
			BD1_createDirectoryREDE(assetfolder);
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

	function renameNodesAsset(assetInfoOriginal, projeto, temp_folder){//renomeia a selecao de nodes para o Asset
		scene.beginUndoRedoAccum("Save tpl.. change ASSSET");
		var assetInfo = assetInfoOriginal;
		//renomeia backdrop
		if(!renameBackdrop(assetInfo)){
			MessageBox.warning("Error setting the asset backdrop!",0,0);
		}
		
		//atualiza os mc nodes
		if(!assetInfo.mcs){
			Print("No master controller nodes found... continuing");
		} else {
			Print("Analizing mc nodes files and data...");
			var rigversioname = assetInfo.prefixo + "-" + assetInfo.version;
			Print("- rig version name: " + rigversioname);
			var files_folder = scene.currentProjectPath() + "/scripts/" + rigversioname + "/";

			//hide main checkbox mc
			assetInfo.mcs.checkbox.forEach(function(cbNode){
				node.setTextAttr(cbNode, "SHOW_CONTROLS_MODE", 1, "Normal");
				node.showControls(cbNode, false);
			});
			//update mcs 
			assetInfo.mcs.mastercontrollers.forEach(function(item){
				node.showControls(item.node, false);
				//BD2_updateNode(item.node);

				if(!updateMCAtt(item.node, rigversioname)){
					Print("No changes in MC files...");
					return;
				}
				//cria o folder com nome do rig em scripts
				if(!BD1_DirExist(files_folder)){
					if(!BD1_createDirectoryREDE(files_folder)){
						Print("fail to create script MC rig folder : " + files_folder);
						MessageBox.warning("Error creating script MC RIG folder!");
						return false;
					}
				}
				//copia os arquivos para o novo destino
				item.tbStateFiles.forEach(function(file){
					var newFilePath = files_folder + BD1_fileBasename(file);
					BD1_CopyFile(file, newFilePath);
				});
			});
			
			//update main object with zip temp for mc files
			assetInfo["mcs"]["temp_zip"] = BD1_ZipFile(files_folder, "mcFiles", temp_folder);
			
			//mostra de volta o Checkbox
			assetInfo.mcs.checkbox.forEach(function(cb){
				node.setTextAttr(cb, "SHOW_CONTROLS_MODE", 1, "Always");
				//BD2_updateNode(cb);
			});
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
		var char_json = temp_folder + "/_rigINFO." + asset_obj.version + ".json";
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
	
	function find_lib_groups(main_group, proj_data){//verifica se os grupos de lib do rig estao com o nome correto, e retorna lista deles
		var allnodes = BD2_ListNodesInGroup(main_group, "", true);
		var libs = [];
		var regex_lib = proj_data.get_rig_regex();
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
		//libs.pop();
		return libs;
	}
	
	function find_rig_version(main_folder, assetInfo){
		
		var versions = BD1_ListFolders(main_folder);
		var output = {"version": null, "exists": false};
		if(assetInfo.prefixo.slice(0,2) != "CH" || !assetInfo.fullNode){
			Print("[BIRDOAPP] Este Rig não necessita de versionamento. Vamos trata-lo como v00");
			output["version"] = "v00";
			output["exists"] = BD1_DirExist(main_folder + output["version"]);
			return output;
		}
		
		var rig_nodes = BD2_ListNodesInGroup(assetInfo.fullNode, "", false);
		rig_nodes.sort();
		if(versions.length == 0){
			output["version"] = "v01";
			output["exists"] = BD1_DirExist(main_folder + output["version"]);
			return output;
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


function checkMCnodes(nodes){//checa se existem MC nodes no rig e retorna ojbeto com info do mc
	var mcnodes = nodes.filter(function(element){ return node.type(element) == "MasterController";});
	var mcObject = {
		"checkbox": [],
		"mastercontrollers": [],
		"extra_scripts": []
	};
	if(mcnodes.length > 0){
		for(var i=0; i<mcnodes.length; i++){
			var mcnode = mcnodes[i];
			
			//add main mc checkbox node
			if(node.getName(mcnode) == "mc_Function"){
				mcObject["checkbox"].push(mcnode);
				continue;
			}
			
			//create mc data object
			var mcdata = {
				"node": mcnode,
				"tbStateFiles": []
			};
			var col = node.linkedColumn(mcnode, "FILES");
			var files_list = column.getEntry(col, 1, 1).split("\n");
			files_list.forEach(function(f){ 
				var fname = BD1_fileBasename(f);
				var fullpath = scene.currentProjectPath() + "/" + f;
				if(!BD1_FileExists(fullpath)){
					var msg = "Arquivo de MC nao encontrado na pasta da cena: " + fullpath + "\nEncontre o arquivo ou acerte o MC antes de continuar!";
					MessageBox.warning(msg, 0,0);
					Print(msg);
					return false;
				}
				if(BD1_file_extension(f) == "tbState"){
					mcdata["tbStateFiles"].push(fullpath);
				}
				if(BD1_file_extension(f) == "js" && fname.slice(0,3) == "BD_" && mcObject.extra_scripts.indexOf(fullpath) == -1){
					mcObject["extra_scripts"].push(fullpath);
				}
			});
			mcObject["mastercontrollers"].push(mcdata);
		}
		return mcObject;
	}
	return false;
}
exports.checkMCnodes = checkMCnodes;


function getAssetsProjectData(projData){
	var pythonPath = BD2_FormatPathOS(projData.birdoApp + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(projData.proj_confg_root + "_pipeline/assets_data.py");
	var tempfolder = projectDATA.createTempFolder("saveTPL", false);
	
	var jsonFile = tempfolder + "/info" + new Date().getTime() + ".json";
	
	var loadingScreen = BD2_loadingBirdo(projData.birdoApp, 15000, "geting_project_asset_information...");
	var assetTypeName = projData.getAssetTypeFullName();

	var commands = [];
	commands.push(pythonPath);
	commands.push(pyFile);
	commands.push(assetTypeName);
	commands.push(jsonFile);		
	Print("Chamada Python1: " + commands);

	var ret = Process.execute(commands);
	if(ret != 0){
		loadingScreen.terminate();
		Print("[GETASSETSDATA][ERROR] Fail to run python script!");
		return false;
	}

	if(loadingScreen.isAlive()){
		Print("closing loading screen...");
		loadingScreen.terminate();
	}
	
	if(BD1_FileExists(jsonFile)){
		return BD1_ReadJSONFile(jsonFile);
	} else {
		Print("Falha ao pegar informacoes dos assets do Projeto!");
		return false;
	}
}
exports.getAssetsProjectData = getAssetsProjectData;


function getSelection(assetType, birdo_data){
	var nodes_sel = {};
	var selected_nodes = selection.selectedNodes();
	var regex_rig_full = birdo_data.get_rig_regex();

	if(selected_nodes.length != 2){
		MessageBox.warning("A Selecao de nodes na NodeView nao esta correta!\nSelecione apenas o ASSET e sua PEG!\n\n-Se For RIG, lembre de selecionar o BackDrop!\n-Se somente existe o Node Drawing do asset sem PEG,\ncrie uma PEG!\n\nSelecione corretamente e tente de novo!", 0,0);
		Print("[SAVEASSET][ERROR] Invalid Node selection!");
		return false; 
	}
	
	var nodeASSET = selected_nodes[0];
	var nodePEG = selected_nodes[1];
	
	if(node.srcNode(selection.selectedNode(1), 0) == selection.selectedNode(0)){//troca se ele nao ler certo a selecao [0] e [1]
		nodeASSET = selection.selectedNode(1);
		nodePEG = selection.selectedNode(0);
	}
	
	nodes_sel["peg"] = nodePEG;
	nodes_sel["asset"] = nodeASSET;
	
	if(assetType == "CH" && node.type(nodeASSET) == "GROUP"){//se for um CHAR e grupo
		nodes_sel["rigFull"] = getFullRigGroup(nodeASSET);
	} else {
		nodes_sel["rigFull"] = null;				
	}	
	nodes_sel["asset_name"] = projectDATA.entity.name;
	return nodes_sel;

	////funcao extra///
	function getFullRigGroup(rigGroup){//acha o grupo do rigfull dentro do grupo externo do rig
		var subs = node.subNodes(rigGroup).filter(function(x) {return node.isGroup(x)});
		var regex_peg = /DESLOC|PATH/;
		if(subs.length == 1 && regex_peg.test(node.getName(node.srcNode(subs[0], 0)))){
			return subs[0];
		} else {
			for(var i=0; i< subs.length; i++){
				if(regex_rig_full.test(node.getName(subs[i]))){
					return subs[i];	
				}
			}
		}		
		return false;
	}
}
exports.getSelection = getSelection;


function checkASSET(asset_sel, asset_name, node_list){//funcao para verificar se o ASSET esta pronto para gerar TPL
	var tipo = node.type(asset_sel.asset);
	var numFrames = frame.numberOf();

	if(tipo == "READ"){//se for um prop simples (somente um drawing)
		var colunaD = node.linkedColumn(asset_sel.asset,"DRAWING.ELEMENT");
		var drawingsIn = column.getDrawingTimings(colunaD);
		if(drawingsIn.indexOf("Zzero") == -1){
			if(!BD2_AskQuestion("Falta criar o 'Zzero' para este ASSET!\nDeseja continuar?")){
				return false;
			}
		}
		if(numFrames  < drawingsIn.length -1){
			MessageBox.information("Deixe este arquivo da seguinte forma antes de continuar:\n -Todos Drawings Expostos na Timeline (exeto o 'Zzero');\n - Somente os Drawings q serao usados na Library (Use o BD_CleanLibrary para apagar os nao usados);\n -A duracao dos frames acabando junto com os drawings expostos na Timeline;\nOBS: Se vc esta fazendo uma atualizacao de vistas novas para um prop existente, mantenha todos os drawings expostos na timeline, incluindo as poses novas e antigas!");
			return false;
		}
	} else if(tipo == "GROUP" && asset_name.substring(0, 2) == "CH"){//se for um RIG de personagem
		if(!reviewRIG(node_list)){
			return false;
		}
	}

	if(node.getTextAttr(asset_sel.peg, 1,"PIVOT.X") == 0 && node.getTextAttr(asset_sel.peg, 1,"PIVOT.Y") == 0){// check pivot da PEG
		if(!BD2_AskQuestion("O Pivot da peg STAGE parece errado!\nDeseja continuar?!")){
			return false;
		}
	}
	return true;
}
exports.checkASSET = checkASSET;


function reviewRIG(node_list){//verifica os drawings com nome no padrao, se contem os nodes FULL, se contem grupos com -G no nome
	var counter_number = 0;
	var counter_empty = 0;
	var counter_Zzero = 0;

	var regex_sujeira = /(-G)$/;
	var regex_FULL = /FULL/;
	var isNamesOk = true;
	var isFullOK = false;
	var drawing_list = [];

	for(var i=0; i<node_list.length; i++){
		drawing_list = [];
		
		node.setShowTimelineThumbnails(node_list[i], false);//desliga o show thumbnail do node na timeline

		if(regex_sujeira.test(node_list[i]) && node.type(node_list[i]) == "GROUP"){
			Print("[SAVEASSET]Node com sujeira no nome: " + node_list[i]);
			isNamesOk = false;
		}

		if(regex_FULL.test(node_list[i])){
			isFullOK = true;
		}
	
		if(node.type(node_list[i]) != "READ"){
			continue;
		}

		var coluna = node.linkedColumn(node_list[i], "DRAWING.ELEMENT");

		if(!checkExposicao(coluna)){
			Print("node: " + node_list[i]);
			counter_empty++;
		}
	
		var timmings = column.getDrawingTimings(coluna);

		if(timmings.indexOf("Zzero") == -1){
			counter_Zzero++;
		}

		for(var j =0; j<timmings.length; j++){//pega os que tem nome q comeca com numero
			if(!isNaN(timmings[j][0])){
				drawing_list.push(timmings[j]);
			}
		}

		if(drawing_list.length > 0){
			Print("[SAVEASSET]o node contem drawings com nome fora do padrao: " + node_list[i] + " ===> drawings: " + drawing_list);
			counter_number++;
		}

	}
	
	if(!isFullOK){
		if(!BD2_AskQuestion("Este RIG nao contem os nodes FULL que deveria!!\nDeseja continhar mesmo assim??")){
			return false;
		}
	}

	if(counter_number > 0){
		if(!BD2_AskQuestion("Este RIG contem "  + counter_number + " nodes com desenhos fora do padrao de nome!\nDeseja continhar??")){
			return false;
		}
	}
	
	if(counter_empty > 0){
		MessageBox.warning("Este RIG contem "  + counter_empty + " nodes com exposicao vazia! Use o script 'EmptyToZzero' na timeline para resolver isso! Ou acerte o tamanho da timeline, deixe somente as poses necessarias expostas na timeline!", 0, 0);
	}

	if(counter_Zzero > 0){
		Print("Este RIG contem "  + counter_Zzero + " nodes sem o Zzero criado! Acerte isso antes de gerar o TPL!");
	}
	
	if(!isNamesOk){
		if(!BD2_AskQuestion("Este RIG contem grupos com nome sujo ('-G') no final!\nDeseja continhar mesmo assim??")){
			return false;
		}
	}

	return true;


	function checkExposicao(drawing_colun){//check se o drawing contem exposicao vazia
		var allFrames = frame.numberOf();
		for(var i=1; i<=allFrames; i++){
			var exp = column.getEntry(drawing_colun, 1, i);
			if(exp == ""){
				Print("[NODE COM EXP VAZIA] : " + column.getDisplayName(drawing_colun) + " no frame : " + i);
				return false;
			}
		}
		return true;
	}
}


function checkPallets(pltList){/*roda o resultado do script checkNodesPallet;
	[0] - nodeArray;
	[1] - drawArray;
	[2] - colorArray - subArray cores usadas por draw;
	[3] - PaletteAttay - subArray Palettas usadas por draw;
	*/
	var readNodes = pltList[0];
	var drawList = pltList[1];
	var corList = pltList[2];
	var nodesPalett = pltList[3];
	var usedPal = [];

	for(var i=0; i<nodesPalett.length; i++){
		for(var y=0; y<nodesPalett[i].length; y++){
			if(usedPal.indexOf(nodesPalett[i][y]) != -1){
				continue;	
			}
			usedPal.push(nodesPalett[i][y]);
		}
	}

	if(usedPal.length > 1){
		var mensagem = "Este ASSET utiliza mais de uma Palette: \n";
		for(item in usedPal){
			mensagem += (" -" + usedPal[item] + "\n");
		}
		mensagem += "Deseja criar o TPL mesmo assim?\n";
		if(!BD2_AskQuestion(mensagem)){
			return false;
		}
	}
	return true;
}	
exports.checkPallets = checkPallets;
