include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*TODO : mudar o checkRig version para a UI (fazer checar a versao do rig e ja sugerir na Ui e bloquear a troca de versao com reconhecer uma versao de rig existente)
	[x] fazer script mais completo no python e receber todas informacoes para buscar sobre o tpl no server (checar se ja existe, usar o MessageBox do python pra perguntar se deseja sobrepor
	[x] arrumar pasta local (temporaria) pra salvar os arquivos (salvar a pasta completa e usar o uploadDir pra subir a estrutura pro server)
	[x] getMainAsset update para pegar da lista de assets gerada antes
	[x] passar a verificacao da versao do rig pro birdoASSET e dentro do python do upload pro server
	
	versao do nextcloud para salvar assets no birdoASSETS
*/	
function saveTPL(self, projectDATA, assetInfo){

	self.ui.progressBar.show();
	Print("Start...");
	var tpl_name = assetInfo.isAnim ? assetInfo.assetName : assetInfo.assetName + "." + assetInfo.version;
	var temp_folder = specialFolders.temp + "/BirdoApp/" + projectDATA.server.type + "/BirdoASSET/";
	var asset_local_path = temp_folder + assetInfo.assetName + "/";
	var tpl_zip = asset_local_path + tpl_name + ".zip";

	if(BD1_DirExist(temp_folder)){//limpa o temp antes de comecar
		try {
			BD1_RemoveDirs(temp_folder);
		} catch (e) {
			Print("[SAVETPL][ERROR] Fail to clean temp folder!");
			MessageBox.warning("[SAVETPL][ERROR] Fail to clean temp folder!",0,0);
			return false;
		}
	}
	
	create_folderSchema(asset_local_path); // cria esquema de pastas no temporario

	self.ui.progressBar.setRange(0, 8);
	self.ui.progressBar.setValue(0);
	self.ui.progressBar.format = "...creating version json";
									
	var rigJson = "NOT_RIG";										
									
	if(projectDATA.entity.asset_type == "CH" && !assetInfo.isAnim){//se e um CHAR, confere na BirdoLib se esta versao esta correta
		rigJson = create_rig_version_json(temp_folder, assetInfo);
		if(!rigJson){
			Print("[ERROR] Falha ao criar o arquivo json da versao!");
			MessageBox.warning("ERRO ao criar o arquivo json da versao! Avise o Leo!", 0, 0);
			return false;
		}
	}


	self.ui.progressBar.format = "...renaming assets...";
	if(!assetInfo.isAnim){
		updateColorNames();//change color names to UPPDERCASE	
		renameNodesAsset(assetInfo, projectDATA.prefix);	
	}
	
	self.ui.progressBar.setValue(1);
	self.ui.progressBar.format = "...Saving TEMPLATE...";
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
	
	var data_rede = asset_local_path + "DATA/";
	self.ui.progressBar.setValue(2);
	self.ui.progressBar.format = "...Saving DATA.json... ";
	save_metadata_to_JSON(projectDATA, assetInfo, data_rede);
		
	var thumbs_rede = asset_local_path + "THUMBS/";
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
	var temp_zip = BD1_ZipFile(tplTempPath, tpl_name, asset_local_path);
	if(!temp_zip){
		MessageBox.information("Falha ao compactar tpl! Operacao cancelada!");
		self.ui.progressBar.format = "!!!ERROR ziping TPL!!!";
		return false;
	}
	
	self.ui.progressBar.setValue(7);
	self.ui.progressBar.format = "...Sending to Server...";
	var upload = upload_to_server(projectDATA, assetInfo, asset_local_path, rigJson, temp_folder);
	
	
	self.ui.progressBar.setValue(8);
	self.ui.progressBar.format = "DONE!!!";
	
	if(!upload){
		MessageBox.warning("Error saving the ASSET!",0,0);
		return false;
	} else {
		if(!upload["upload"]){
			MessageBox.warning("Falha ao Fazer o Upload do asset para BirdoASSETS:\n- " + upload["status"], 0, 0);
		} else {
			var msg_version = upload.asset.isAnim ? " >> Anim Library" : " >> Versao: " + upload.asset["asset_version"];
			MessageBox.information("Asset: " + upload.asset["asset_name"] + msg_version + "\nCriado com sucesso! Agora o Template esta acessivel a todos atraves da ASSET Library!");
			return true;
		}
	}

	//////FUNCOES EXTRAS/////////
//	function getMainASSETFolder(prefixo, assetsList){//retorna o nome da pasta principal do asset na estrutura do BirdoASSETs
//		assetsList.sort(function (a, b) { return a.length - b.length});
//		return prefixo + "_" + assetsList[0];
//	}

	function create_folderSchema(path){//cria estrurua de pastas de cada asset
		BD1_createDirectoryREDE(path + "THUMBS");
		BD1_createDirectoryREDE(path + "DATA");
	}

	function renameNodesAsset(assetInfo, projeto){//renomeia a selecao de nodes para o Asset
		scene.beginUndoRedoAccum("Save tpl.. change ASSSET");
		var pegName = "STAGE_" + assetInfo.assetName + "-P";
		var fullName = projeto + "." + assetInfo.assetName + "-" + assetInfo.version;
		BD2_renameNode(assetInfo.pegNode, pegName);

		if(!assetInfo.fullNode){
			BD2_renameNode(assetInfo.assetNode, assetInfo.prefixo + "_" + assetInfo.assetName + "-" + assetInfo.version);
		} else {
			BD2_renameNode(assetInfo.fullNode, fullName);
			BD2_renameNode(assetInfo.assetNode, assetInfo.prefixo + "_" + assetInfo.assetName);
		}
		scene.endUndoRedoAccum();
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
	
	function create_rig_version_json(temp_folder, asset_obj){//cria o json da versao do rig e retorna o caminho 
		
		var mainNode = asset_obj.fullNode;
		
		if(!asset_obj.fullNode){//se nao houver nodeFull lista o grupo principal
			mainNode = asset_obj.assetNode;
		}

		var this_verion_nodes = BD2_ListNodesInGroup(mainNode, "", false);
		var char_json = temp_folder + "_rigINFO." + asset_obj.version + ".json";

		var rig_verion_info = {
			"nodes" : this_verion_nodes, 
			"banco": {
				"ANIM": "", 
				"POSES": "", 
				"EXPR": get_expression_node(mainNode, this_verion_nodes)
				}
			};
		
		BD1_WriteJsonFile(rig_verion_info, char_json);
		
		return char_json;
		
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
	
	function upload_to_server(projectDATA, assetInfo, local_asset_folder, rigJson, temp_folder){//chama o python para enviar o asset para BirdoASSETS na rede
		var pythonPath = projData.birdoApp + "venv/Scripts/python";
		var pyFile = projectDATA.birdoApp + "app/utils/" + projectDATA.server.type + "_upload_birdoASSET.py";
		var main_asset_path = projectDATA.getTBLIB("server") + "BirdoASSETS/" + assetInfo.typeFullName + "/";

		var outputJsonFile = temp_folder + "upload" + new Date().getTime() + ".json";
		var file_name = assetInfo.isAnim ? assetInfo.assetName : assetInfo.assetData["sg_version_template"];

		var commands = [];
		commands.push(pythonPath);
		commands.push(pyFile);
		commands.push(assetInfo.typeFullName);
		commands.push(main_asset_path);
		commands.push(assetInfo.version);
		commands.push(assetInfo.id);
		commands.push(assetInfo.assetName);
		commands.push(file_name);
		commands.push(local_asset_folder);
		commands.push(projectDATA.id);//projeto index
		commands.push(outputJsonFile);
		commands.push(rigJson);
		commands.push(assetInfo.isAnim);
		commands.push(assetInfo.prefixo);

		Print("command python 2:");
		MessageLog.trace(commands);

		var ret = Process.execute(commands);
		
		if(ret != 0){
			Print("[UPLOADASSET][ERROR] Fail to run python script: " + pyFile);
			return false;
		}
		
		if(BD1_FileExists(outputJsonFile)){
			var output = BD1_ReadJSONFile(outputJsonFile);
			Print(output);
			return output;
		} else {
			Print("[BIRDOASSET_SAVETPL]Fail to run python publish script!");
			return false;
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
		
}

exports.saveTPL = saveTPL;
