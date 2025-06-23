include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*
	preference StyleSheet for favorite buttons items
*/
var styles = {
	"fav_button": {
		"on": "QPushButton{\n	border-bottom: 4px solid yellow;\n}\nQPushButton:disabled{\n	border-bottom: 4px solid lightyellow;\n}",
		"off": ""
	},
	"tab_edit": {
		"on": "QTabWidget::pane {\n	border-color: rgb(51, 255, 187);\n}",
		"off": ""
	}
}
exports.styles = styles;

/*
	TODO: 
		[ ] - fazer funcionar o createThumbnails pra funcao edit (forçar gerar sempre com o specialThumbs??);
*/


//#########FOLDERS#############//
/*
creates temp folder for the library
*/
function getTempFolder(){
	var tempFolder = BD1_normalize_path(specialFolders.temp + "/BirdoApp/_birdoLibrary/");
	if(!BD1_DirExist(tempFolder)){
		Print("creating temp folder for BirdoLibrary!");
		if(!BD1_createDirectoryREDE(tempFolder)){
			Print("fail to create temp folder for library!");
			return false;
		}
	}
	return tempFolder;
}
exports.getTempFolder = getTempFolder;


//#########CHECK_SELECTION##########
/*
	Script para validar a selecao na timeline do rig antes de ser salvo checando:
	 - se tem exposição vazia;
	 - se tem drawings com numero no nome (em vez de A1, X1..);
	 - se tem drawings duplicados com deformation chain 
*/
function validateTimelineSelection(rig_group_node){
	Print(">>VALIDATE TIMELINE SELECTION start...");
	var firstFrame = Timeline.firstFrameSel;
	var endFrame = firstFrame + Timeline.numFrameSel - 1;
	var readNodes = BD2_ListNodesInGroup(rig_group_node, ["READ"], true);
	var layersData = {
		"counter_empty" : 0,
		"counter_inv_names": 0,
		"counter_deform": [],
		"layers": {}
	};
	
	var progressDlg = new QProgressDialog();
	progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.modal = true;
	progressDlg.setRange(0, (readNodes.length - 1));
	progressDlg.setLabelText("Validating selection... ");
	progressDlg.open();

	for(var i=0; i<readNodes.length; i++){
		progressDlg.setValue(i);
		if(progressDlg.wasCanceled){
			MessageBox.information("Cancelado!");
			progressDlg.close();
			return false;
		}
		
		var node_name = node.getName(readNodes[i]);
		var coluna = node.linkedColumn(readNodes[i], "DRAWING.ELEMENT");
		progressDlg.setLabelText("Validating selection...\n -layer: " + node_name);
		
		if(layersData.layers.hasOwnProperty(coluna)){//testa se ja tem info dessa camada no objeto
			continue;
		}
		
		var framesList = [];
		var drawList = [];
		var a = firstFrame;
		while(a <= endFrame){
			var draw = column.getEntry(coluna, 1, a);
			if(draw == ""){//empty exposure check
				Print(" -- layer with empty exposure found: " + node_name + " at frame: " + a);
				layersData["counter_empty"]++;
				framesList.push(a);
			}else if(/\d/.test(draw[0]) && drawList.indexOf(draw) == -1){//invalid drawing name
				Print(" -- layer with invalid drawing name found: " + node_name + " drawing name: " + draw);
				layersData["counter_inv_names"]++;
				drawList.push(draw);
			}
			if(!checkDeformationChain(readNodes[i], draw, a) && layersData["counter_deform"].indexOf(readNodes[i]) == -1){
				layersData["counter_deform"].push(readNodes[i]);
				Print("-- Node has invalid drawing in deformation chain: " + readNodes[i]);
			}
			a++;
		}
		if(framesList.length == 0 && drawList.length == 0){
			continue;
		}
		layersData["layers"][coluna] = {
			"name": node_name,
			"empty_frames": framesList,
			"invalid_drawings": drawList
		};
	}
	progressDlg.hide();
	
	//check result
	if(layersData.counter_empty == 0 && layersData.counter_inv_names == 0){
		Print("Layers selection is valid!");
		return true;
	}
	
	if(layersData.counter_deform.length > 0){
		MessageBox.warning("Foram encontrado(s) " + layersData.counter_deform.length + " node(s) com drawings que usam o deformation chain.\nPossivelmente a pose não irá funcionar ao ser aplicada.", MessageBox.Ok);
	}
	
	var msg = "Foram encontrados inconsistencias na seleção na timeline:\n - Exposições vazias: " + 
		layersData.counter_empty + ";\n - Drawings com nomes incorretos: " + layersData.counter_inv_names + 
		";\n Deseja acertar essas inconsistências?";
	if(!BD2_AskQuestion(msg)){
		return false;
	}
	progressDlg.close();
	
	Print(layersData);
	return fixLayers(layersData);
	
	//extra functions
	function checkDeformationChain(nodeP, draw, frame){//checa se o node tem  drawing q nao está no deformation chain
		if(draw == "Zzero"){
			return true;
		}
		var up_node = node.srcNode(nodeP, 0);
		var switchTranformation = up_node + "/Transformation-Switch";
		if(node.isGroup(up_node) && node.getName(switchTranformation) != ""){
			var def_drawings = node.getTextAttr(switchTranformation, frame, "TransformationNames").split(";");
			return def_drawings.indexOf(draw) != -1 && draw != "Zzero";
		}
		return true;
	}
	
	function fixEmptyLayer(layerColun, frame){//fix individual empty layer in frame
		var zzero = "Zzero";//nome do Zzero
		return column.setEntry(layerColun, 1, frame, zzero);		
	}
	
	function fixInvalidNameLayer(layerName, layerColun, draw){//fix individual invalid name layers in frame
		for(var i=0; i<10; i++){
			var new_name = "x_" + Math.floor(Math.random() * 10000);
			if(column.renameDrawing(layerColun, draw, new_name)){
				Print("A camada " + layerName + " teve o desenho : " + draw + " renomeado para : " + new_name);
				return true;
			}
		}
		return false;
	}
	
	function fixLayers(layersData){//fix all layers with erros
		Print(">>START FIX LAYERS...");
		var layer_counter = layersData.counter_empty + layersData.counter_inv_names;
		for(layer in layersData.layers){
			var layerName = layersData.layers[layer].name;
			Print(" -- fix layer: " + layerName);

			for(var i=0; i<layersData.layers[layer].empty_frames.length; i++){
				var fr = layersData.layers[layer].empty_frames[i];
				if(!fixEmptyLayer(layer, fr)){
					var mensagem = "ERROR acertando exposicao vazia da camada: " + layer + " in frame: "+ fr;
					MessageBox.warning(mensagem,0,0);
					Print(mensagem);
					return false;
				}
				Print(" - changed empty layer to Zzero!");
			}
			for(var i=0; i<layersData.layers[layer].invalid_drawings.length; i++){
				var drawing = layersData.layers[layer].invalid_drawings[i];
				if(!fixInvalidNameLayer(layerName, layer, drawing)){
					var mensagem = "ERROR renomeando o drawing: " + drawing + " da camada: " + layerName;
					MessageBox.warning(mensagem,0,0);
					Print(mensagem);
					return false;
				}
			}
		}
		MessageBox.information("Erros corrigidos:\n - " + layer_counter + " camada(s) corrigidas.");
		return true;
	}
}
exports.validateTimelineSelection = validateTimelineSelection;


//#########STATUS#############//
function changeStatus(item_name, status_name, lib_json){
	//make copy of
	if(!BD1_CopyFile(lib_json, (lib_json + "~"))){
		MessageBox.warning("Erro criando arquivo de backup da lib!",0,0);
		Print("Fail to create backup lib json file!");
		return false;
	}
	
	var lib_data = BD1_ReadJSONFile(lib_json);
	
	//updates the value
	lib_data["library"][item_name]["status"] = status_name;
	
	return BD1_WriteJsonFile(lib_data, lib_json);
}
exports.changeStatus = changeStatus;


//#########FAVORITES#############//
/*
	loog inside json favorite preferences of user and return new data object for the library with favorite tags included
	if lib first run, cretae json file with initia favorite values
*/
function getUserFavoriteFlags(lib_data){
	var update_json = false;
	var output_data = lib_data;
	var local_temp_folder = getTempFolder() + "local_data/";
	if(!BD1_DirExist(local_temp_folder)){
		Print("creating temp folder LOCAL DATA for BirdoLibrary!");
		if(!BD1_createDirectoryREDE(local_temp_folder)){
			Print("Fail to create local data temp folder!");
			return false;
		}
	}
	var json_favorites = local_temp_folder + "_favorite_flags.json";
	var json_fav_data;
	if(BD1_FileExists(json_favorites)){
		json_fav_data = BD1_ReadJSONFile(json_favorites);
		for(item in output_data["library"]){
			var itemID = output_data["library"][item]["id"];
			if(itemID in json_fav_data){
				output_data["library"][item]["favorite"] = json_fav_data[itemID];
			} else {
				output_data["library"][item]["favorite"] = false;
				json_fav_data[itemID] = false;
				update_json = true;
			}
		}
	} else {//create first 
		update_json = true;
		json_fav_data = {};
		for(item in output_data["library"]){
			var itemID = output_data["library"][item]["id"];
			output_data["library"][item]["favorite"] = false;
			json_fav_data[itemID] = false;
		}
	}
	if(update_json){
		BD1_WriteJsonFile(json_fav_data, json_favorites);
		Print("User favorite preferences json saved!");
	}
	return output_data;
}
exports.getUserFavoriteFlags = getUserFavoriteFlags;


/*
	update json local data favorite with new id item value;
*/
function updateFavoriteFlagJson(itemId, newValue){
	var local_temp_folder = getTempFolder() + "local_data/";
	var json_favorites = local_temp_folder + "_favorite_flags.json";
	var json_fav_data = BD1_ReadJSONFile(json_favorites);
	
	if(!json_fav_data){
		MessageBox.warning("Erro lendo arquivo com fav tags!",0,0);
		return false;
	}
	
	json_fav_data[itemId] = newValue;
	return BD1_WriteJsonFile(json_fav_data, json_favorites);
}
exports.updateFavoriteFlagJson = updateFavoriteFlagJson;


//#########EDIT#############//
function delete_item(version_path, item){
	var deleted_folder = version_path + ".deleted/";
	var item_path = version_path + item;
	var version_json = version_path + "_library.json";
	var copy_deleted_name = null;
	//make sure .deleted folder exists
	if(!BD1_DirExist(deleted_folder)){
		if(!BD1_createDirectoryREDE(deleted_folder)){
			Print("Fail to crete .deleted dir for item: " + deleted_folder);
			return false;
		}
		copy_deleted_name = item;
	} else {
		copy_deleted_name = get_deleted_copy_name();
	}	
	
	if(!BD1_ZipFile(item_path, copy_deleted_name, deleted_folder)){
		Print("error creating zip bakcup file in .deleted folder before deleting the item folder!");
		return false;
	} else {
		Print("deleting item folder: " + item_path);
		if(!BD1_RemoveDirs(item_path)){
			Print("fail to remove item folder...");
			return false;
		}
	}
	
	//updates the library.json file
	var version_data = BD1_ReadJSONFile(version_json);
	delete version_data["library"][item];
	if(!BD1_WriteJsonFile(version_data, version_json)){
		Print("fail to update the deleted item in the version json file!");
		return false;
	}
	Print("the item '" + item + "' was deleted from the library!");
	return true;
	//extra function 
	function get_deleted_copy_name(){
		var list_files = BD1_ListFiles(deleted_folder, "*.zip").filter(function(x){ return x.replace(/_\d\.zip$/, "") == item});
		return item + "_" + (list_files.length + 1);
	}
}
exports.delete_item = delete_item;


function edit_item(self, lib_path, item_data, user_data){
	var item_tpl = lib_path + item_data["path_tpl"];
	var item_zip_name = BD1_fileBasename(item_tpl).replace(".zip", "");
	var item_thumbs = lib_path + item_data["path_thumbs"];
	var item_data_json = lib_path + item_data["path_data"] + "libINFO.json";

	Print("Edit start..");
	//sets the progressBar max
	self.ui.progressBar.setMaximum(10);
	
	//creates temp folder
	self.updateProgressBar();
	self.ui.progressBar.format = "criando temp folder...";
	var temp_folder = getTempFolder();
	if(!temp_folder){
		MessageBox.warning("Erro criando temp folder!!",0,0);
		return false;
	}
	temp_folder = temp_folder + "_edit_item/";
	if(BD1_DirExist(temp_folder)){
		if(!BD1_RemoveDirs(temp_folder)){
			MessageBox.warning("Erro deletando os arquivos temporários!",0,0);
			return false;
		}
	}
	if(!BD1_createDirectoryREDE(temp_folder)){
		MessageBox.warning("Erro criando o temp folder!!",0,0);
		return false;
	}
	Print("edit: temp folder creted.");

	//unzip tpl
	self.updateProgressBar();
	self.ui.progressBar.format = "descompactando temp tpl...";
	if(!BD1_UnzipFile(item_tpl, temp_folder)){
		MessageBox.warning("Erro descompactando arquivo no temp folder!",0,0);
		return false;
	}
	var temp_tpl = temp_folder + BD1_fileBasename(item_tpl).replace(".zip", ".tpl");
	Print("edit: temp tpl unziped...");

	//open tpl file
	self.updateProgressBar();
	self.ui.progressBar.format = "arbrindo tpl...";
	
	//make sleep for 1 sec before continue...
	BD1_sleep(1);
	
	if(!BD1_FileExists(temp_tpl)){
		MessageBox.warning("Erro! Não foi possível encontrar o arquivo tpl no temp folder!",0,0);
		Print("Error! Can`t find the tpl temp unziped file!");	
		return false;
	}
	if(!open_template_file(temp_tpl)){
		MessageBox.information("Erro ao abrir template para edição!!");
		self.ui.progressBar.format = "edit cancelada...";
		return false;
	}
	
	//update tpl thumbnails
	self.updateProgressBar();
	self.ui.progressBar.format = "gerando thumbnails...";
	//run script to generate thumbnails
	if(!BD2_createThumbnails(temp_tpl)){
		MessageBox.warning("Falha ao gerar thumbnails para o template!",0,0);
		Print("[BIRDOAPP] Falha ao gerar thumbnails para o template!");
		return false;
	}
	self.updateProgressBar();
	self.ui.progressBar.format = "compactando thumbnails";
	//create zip for the created thumbnails
	var thumb_folder = temp_tpl + "/.thumbnails";
	var zip_thumbs_temp = BD2_ZipFilesInFolder(thumb_folder, "thumbs", temp_folder);
	if(!zip_thumbs_temp){
		self.ui.progressBar.format = "error compactando thumbs...";
		return false;
	}
	//clean item thumbs folder
	if(!BD1_RemoveDirs(item_thumbs)){
		MessageBox.warning("Falha ao limpar pasta de thumbnails!!",0,0);
		return false;
	}
	if(!BD1_createDirectoryREDE(item_thumbs)){
		MessageBox.warning("Erro ao criar thumbnail folder!",0,0);
		return false;
	}
	var item_thumbs_zip = item_thumbs + "thumbs.zip";
	if(!BD1_CopyFile(zip_thumbs_temp, item_thumbs_zip)){
		MessageBox.warning("Erro copiando thumbnails para o folder do item!",0,0);
		return false;
	}
	self.updateProgressBar();
	self.ui.progressBar.format = "descompactando thumbs no server...";
	//unzip thumb files in server
	if(!BD1_UnzipFile(zip_thumbs_temp, item_thumbs)){
		Print("error unziping thumbs in server!");
		return false;
	}

	//create backup from old item
	self.updateProgressBar();
	self.ui.progressBar.format = "copiando backup file...";
	var backup_zip = get_deleted_copy_name();
	if(!backup_zip){
		Print("fail to create backup copy");
		return false;
	}
	if(!BD1_CopyFile(item_tpl, backup_zip)){
		MessageBox.warning("Falha ao criar backup file!", 0, 0);
		return false;
	}
	if(!BD1_RemoveFile(item_tpl)){
		MessageBox.warning("Erro deletando item temporario de tpl!!",0,0);
		return false;
	}
	
	//create new item modified zip
	self.updateProgressBar();
	self.ui.progressBar.format = "compactando tpl editado...";
	if(!BD1_ZipFile(temp_tpl, item_zip_name, BD1_dirname(item_tpl))){
		MessageBox.warning("Erro criando zip do tpl!",0,0);
		return false;
	}
	
	//edit data json file
	self.updateProgressBar();
	self.ui.progressBar.format = "salvando metadados do edit...";
	var old_data = BD1_ReadJSONFile(item_data_json);
	if("edit" in old_data){
		old_data["edit"].push({"user": user_data["name"], "time": new Date()});
	} else {
		old_data["edit"] = [{"user": user_data["name"], "time": new Date()}];
	}
	if(!BD1_WriteJsonFile(old_data, item_data_json)){
		MessageBox.warning("Falha ao criar item metadata json!",0,0);
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "Edit comcluido!";
	return true;
	
	///FUNCTION EXTRAS
	function open_template_file(tpl_path){//open tpl file and check if it was modified
		var tpl_xstage = tpl_path + "/scene.xstage";
		var initial_date = BD1_get_last_modified(tpl_xstage);
		var tpl_data = BD1_dirname(tpl_path) + "/_tpl_data.json";
		var harmony = about.getApplicationPath();
		var start = Process2(harmony, tpl_xstage);
		var ret = start.launch();
		if(ret != 0){
			Print("Fail to start progressBirdo progress!");
			return false; 
		} 
		Print("Template scene openned!");
		var final_date = BD1_get_last_modified(tpl_xstage);
		return initial_date.getTime() != final_date.getTime();
	}
	
	function get_deleted_copy_name(){//returns the name of the backup zip to create
		var item_name = BD1_fileBasename(item_tpl).replace(".zip", "");
		var deleted_folder = BD1_dirname(item_tpl) + "/.deleted/";
		if(!BD1_DirExist(deleted_folder)){//cretates .deleted folder for backup
			if(!BD1_createDirectoryREDE(deleted_folder)){
				MessageBox.warning("Erro criando backup folder!",0,0);
				return false;
			}
		}
		var list_files = BD1_ListFiles(deleted_folder, "*.zip").filter(function(x){ return x.replace(/_\d\.zip$/, "") == item_name});
		return deleted_folder + item_name + "_" + (list_files.length + 1) + ".zip";
	}
}
exports.edit_item = edit_item;

//#########PERMISSIONS#############//
/*
	get user permissions ande name for the BirdoLibrary
*/
function getUserData(projectDATA, libRoot){
	var user_data = {"name": projectDATA.user_name, "role": projectDATA.user_type, "permission": null};
	
	//permission file json
	var config_folder = libRoot + "_config/";
	var permission_file = config_folder + "_permissions.json";
	
	if(!BD1_FileExists(permission_file)){
		MessageBox.warning("ERRO! Não foi possível encontrar os arquivos de configuração da BirdoLib!",0,0);
		return false;
	}
	var permission_data = BD1_ReadJSONFile(permission_file);
	
	if(!permission_data){
		MessageBox.warning("Arquivo de configuração de permissões inválido!!",0,0);
		return false;
	}
	
	user_data["permission"] = permission_data["can_edit"].indexOf(user_data.role) != -1 ? "can_edit" : "read_only";
	user_data["status_list"] = permission_data["status_list"];
	return user_data;
}
exports.getUserData = getUserData;


//#########TAGS#############//
/*
	get tag main tags list
*/
function get_main_tag_list(lib_root){
	//tag file json
	var config_folder = lib_root + "/_config/";
	var tags_file = config_folder + "_tags.json"; 	
	
	if(!BD1_FileExists(tags_file)){
		MessageBox.warning("ERRO! Não foi encontrado o tag file de configuração!",0,0);
		return false;
	}
	var tags_data = BD1_ReadJSONFile(tags_file);
	
	if(!tags_data){
		MessageBox.warning("Falha ao acessar o arquivo de tags da configuração!",0,0);
		return false;
	}
	return tags_data;
}
exports.get_main_tag_list = get_main_tag_list;


function update_json_tag(lib_root, tags_data){

	var config_folder = lib_root + "/_config/";
	var tags_file = config_folder + "_tags.json"; 	
	var tag_lock = config_folder + "_lock.json";
	
	if(!BD1_FileExists(tags_file)){
		MessageBox.warning("Erro! Não foi possível encontrar o arquivo e tags!",0,0);
		return false;
	}	
		
	if(BD1_FileExists(tag_lock)){
		var lock_data = BD1_ReadJSONFile(tag_lock);
		MessageBox.warning("O arquivo de tags está em uso pelo usuário: " + lock_data["user"] + "!", 0, 0);
		Print("tag json file is locked by user: " + lock_data["user"]);
		return false;
	} else {
		//make backup copy for tags json file
		if(!BD1_CopyFile(tags_file, (tags_file + "~"))){
			MessageBox.warning("Falha ao criar arquivo de backup das tags!",0,0);
			Print("Fail to create backup tags_file file!");
			return false;
		}	
		var lock_data = {"user": user_data["name"]};
		if(!BD1_WriteJsonFile(lock_data, tag_lock)){
			MessageBox.warning("Erro gerando lock file!", 0, 0);
			return false;
		}
		Print("Lock for tag files created!");
	}
	
	if(!BD1_WriteJsonFile(tags_data, tags_file)){
		MessageBox.warning("Erro criando o tag file!",0 ,0);
		BD1_RemoveFile(tag_lock);
		return false;
	}
	
	BD1_RemoveFile(tag_lock);
	Print("lock file removed!");
}	
exports.update_json_tag = update_json_tag;


//#########RIG VERSION TEST#############//
/*
	compare rig node list versions and return object with information
*/
function check_rig_version_match(sel_rig_nodes, lib_rig_nodes){
	var output = {
		"exact_match": sel_rig_nodes.length == lib_rig_nodes.length, 
		"name_match": true,
		"extra_nodes": 0,
		"extra_list": []
		};

	for(var i=0; i<sel_rig_nodes.length; i++){
		if(lib_rig_nodes.indexOf(sel_rig_nodes[i]) == -1){
			Print("Rig Check : " + sel_rig_nodes[i] + "\n  -- node is not a match for existing version library!");
			output["exact_match"] = false;
			output["name_match"] = false;
			output["extra_nodes"]++;
			output["extra_list"].push(sel_rig_nodes[i]);
		}
	}
	Print("Check rig version found : " + output["extra_nodes"] + " items misssing from rig selected node and existing library!");
	return output;
}
exports.check_rig_version_match = check_rig_version_match;


//###########LOCK FUNTIONS################//
/*
	gets rigth to modify lib folder, creating a lock file
*/
function getRigthsToModifyLib(lib_path, user_data){
	var lock_file = lib_path + "_lock.json";
	var lock_data = {"user": user_data["name"], "time": new Date()};
	if(BD1_FileExists(lock_file)){
		lock_data = BD1_ReadJSONFile(lock_file);
		if(lock_data["user"] == user_data["name"]){
			Print("Library is already locked by this user...");
		} else {
			MessageBox.warning("Esta library está travada pelo usuário: " + lock_data["user"] + "\nEspere e tente novamente depois...",0,0);
			Print(lock_data);
			return false;
		}
	} else {
		if(!BD1_WriteJsonFile(lock_data, lock_file)){
			MessageBox.warning("Erro criando o lock file!",0,0);
			return false;
		}
	}
	return true;
}
exports.getRigthsToModifyLib = getRigthsToModifyLib;

/*
	release rigths to modify lib folder, deleting the lock file
*/
function releaseRigthToModifyLib(lib_path, user_data){
	var lock_file = lib_path + "_lock.json";
	if(!BD1_FileExists(lock_file)){
		Print("The lock file is already deleted!");
		return true;//returns true because it means that the lock doesnt exists anymore!
	} else {
		var lock_data = BD1_ReadJSONFile(lock_file);
	
		//ensure it's YOUR lock file
		if(user_data["name"] != lock_data["user"]){
			MessageBox.warning("Algo deu errado. O folder já está em uso pelo usuário: " + lock_data["user"] + "\nConverse com a supervisão!",0,0);
			return false;
		}
	}
	return BD1_RemoveFile(lock_file);	
}
exports.releaseRigthToModifyLib = releaseRigthToModifyLib;

/*
	checks if the library is locked by some user
*/
function check_library_lock(lib_path){
	var lock_file = lib_path + "_lock.json";
	if(BD1_FileExists(lock_file)){
		var lock_data = BD1_ReadJSONFile(lock_file);
		MessageBox.warning("Esta library: " + lib_path + "\nestá em uso pelo usuário: " + lock_data["user"] + "\nTente novamente mais tarde!",0,0);
		Print(lock_data);
		return false;
	} else {
		return true;
	}
}
exports.check_library_lock = check_library_lock;

//############TPL####################//
/*
	peform action sequence to save the selected Rig Lib to the library
*/
function saveTpl(self, projectDATA, item_status, user_data, rig_data, selected_tags, description_text){
	
	var lib_path = rig_data["lib_path"];
	
	if(!rig_data["lib_exists"]){
		if(!BD2_AskQuestion("This is the FIRST entry for this Rig in the Library!\nDo you wanna save it? Make sure this is the rigth version of the rig!")){
			Print("Canceled by the user..");
			return false;
		}
		Print("creating main rig lib folder...");
		if(!BD1_createDirectoryREDE(lib_path)){
			MessageBox.warning("Erro criando folder principal do asset!",0,0);
			return false;
		}
		if(!create_rig_version(lib_path, rig_data)){
			MessageBox.warning("Erro criando o arquivo de info do asset!",0,0);
			return false;
		}
		BD1_sleep(2);
	}	
	
	//sets the progressBar max
	self.ui.progressBar.setMaximum(11);
	self.ui.progressBar.format = "salvando tpl...";

	//gets rigth to modify library
	if(!getRigthsToModifyLib(lib_path, user_data)){
		Print("Fail to get rigths to modify library!");
		return false;
	}
	
	var temp_folder = getTempFolder() + "_saveTPL/";
	if(BD1_DirExist(temp_folder)){//force clean before action...
		BD1_RemoveDirs(temp_folder);
	}
	BD1_createDirectoryREDE(temp_folder);

	//item name to be saved...
	var item_name = get_next_item_name(lib_path);
		
	self.updateProgressBar();
	self.ui.progressBar.format = "criando tpl...";
	//save temporary template
	var temp_tpl = save_template(temp_folder, item_name);
	
	if(!temp_tpl){
		Print("error saving temporary template at: " + temp_folder);
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "limpando temp tpl...";
	//run the compile script to clean the saved tpl
	var cleanTPL_script = projectDATA.birdoApp + "batch/BAT_BL_CleanTPL.js";
	if(!BD2_CompileScript(temp_tpl + "/scene.xstage", cleanTPL_script)){
		self.ui.progressBar.format = "Falha ao compilar script!";
		MessageBox.warning("Erro rodando o script para limpar o tpl!",0,0);
		Print("fail to clean temporary template!");
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "gerando thumbnails...";
	//run script to generate thumbnails
	if(!createThumbnails(temp_tpl, projectDATA, rig_data["needs_special_thumbs"])){
		MessageBox.warning("Falha ao criar thumbnails para o template!", 0, 0);
		Print("ERROR! fail to create thumbs!");
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "zipando thumbnails";
	//create zip for the created thumbnails
	var thumb_folder = temp_tpl + "/.thumbnails";
	var zip_thumbs_temp = BD2_ZipFilesInFolder(thumb_folder, "thumbs", temp_folder);
	if(!zip_thumbs_temp){
		self.ui.progressBar.format = "erro compactando thumbs...";
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "zipando tpl...";
	//create temp zip for tpl
	var temp_tpl_zip = BD1_ZipFile(temp_tpl, item_name, temp_folder);
	if(!temp_tpl_zip){
		Print("Fail to compact template file!");
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "criando folders...";
	//create item folders
	if(!createItemFolderScheeme(lib_path, item_name)){
		MessageBox.warning("Erro criando o folder da library!!",0,0);
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "enviando template para o server...";
	//copying template file
	if(!BD1_CopyFile(temp_tpl_zip, (lib_path + item_name + "/" + item_name + ".zip"))){
		MessageBox.warning("Erro copiando o arquivo tpl!",0,0);
		Print("[BIRDOAPP] Erro copiando o arquivo para o server!!");
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "enviando thumbs para o server...";
	//copying thumbs files
	var thumbs_path = lib_path + item_name + "/THUMBS/";
	if(!BD1_CopyFile(zip_thumbs_temp, (thumbs_path + "thumbs.zip"))){
		MessageBox.warning("Erro copiando os arquivos de thumbnails!", 0, 0);
		Print("Error copying tpl zip file to server!");
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "descompactando thumbs no server...";
	//unzipin thumb files in server
	if(!BD1_UnzipFile(zip_thumbs_temp, thumbs_path)){
		Print("error unziping thumbs in server!");
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "cirando arquivo com metadata...";
	//create json DATA items in library
	var json_tags = lib_path + item_name + "/DATA/template_tags.json";
	if(!BD1_WriteJsonFile(selected_tags, json_tags)){
		Print("Error creating tag json file!");
		return false;
	}

	//saves item library metadata 
	if(!saveItemMetadata(user_data, lib_path + item_name, description_text)){
		MessageBox.warning("Erro criando item metadata!",0,0);
		Print("Fail to create item metadata!");
		return false;
	}
	
	//update library json file
	if(!updates_library_json(item_status, item_name, rig_data, selected_tags)){
		Print("error updating library json!");
		return false;
	}
	
	//relase lock library
	if(!releaseRigthToModifyLib(lib_path, user_data)){
		Print("Error releasing Lock file!");
		return false;
	}
	
	self.updateProgressBar();
	self.ui.progressBar.format = "Item: " + item_name + " salvo n library!";	
	
	return true;
	
	///////////////////////helper functions/////////////////////
	function createThumbnails(tplPath, projData, specialThumbs){//gera os thumbnails
		if(specialThumbs){
			Print("Special thumbnails render needed...");
			var tplFullStage = tplPath + "/scene.xstage";
			var batScriptRenderThumbs = projData.birdoApp + "batch/BAT_ExportThumbsEspecial.js";
			return BD2_CompileScript(tplFullStage, batScriptRenderThumbs, true);	
		}	
		
		return BD2_createThumbnails(temp_tpl);
	}
	
	function createItemFolderScheeme(lib_version_path, item_name){//create item folder scheeme
		var folders = ["DATA", "THUMBS"];
		var item_path = lib_version_path + item_name + "/";
		folders.forEach(function(x){ 
			var toCreate = item_path + x;
			BD1_createDirectoryREDE(toCreate);
		});
		return BD1_FileExists(item_path);
	}

	function get_next_item_name(lib_path){//returns the next item name to save
		var items_list = BD1_ListFolders(lib_path);
		var regex_item = /^\d{4}$/;
		var filtered_list = items_list.filter(function(x){ return regex_item.test(x)});
		var last_item_number = 1;
		for(var i=0; i<filtered_list.length; i++){
			var item_number = parseFloat(filtered_list[i]);
			if(item_number != last_item_number){
				Print("[GET_NEXT_ITEM_NAME] Missing item number >> " + last_item_number);
				break;
			}
			last_item_number++;
		}
		return ("0000" + last_item_number).slice(-4);
	}

	function saveItemMetadata(user_data, item_lib_path, description_text){//creates library item metadata into file
		var metadata = new TplMetadata(user_data, description_text);
		var info_json = item_lib_path + "/DATA/libINFO.json";

		return BD1_WriteJsonFile(metadata, info_json);
		
		//constructor to build library item metadata
		function TplMetadata(user_data, description_text){
			this.user = user_data["name"];
			this.original_file = scene.currentProjectPath(); 
			this.scene_version = scene.currentVersionName();
			this.source_frame = Timeline.firstFrameSel;
			this.date = new Date(); 
			this.toon_boom_version = about.getVersionInfoStr();
			this.description = description_text;
		}
	}

	function save_template(tpl_path, tpl_name){
		copyPaste.useCreateTemplateSpecial(false, false, true, false);//avoid scanning for additional files.
		var tpl = copyPaste.createTemplateFromSelection(tpl_name, tpl_path);
		if(!tpl){
			MessageBox.warning("Erro salvando o tpl temporário!",0,0);
			return false;
		}
		var tplFullpath = tpl_path + tpl;
		//limpa o folder de scripts
		BD1_RemoveDirs(tplFullpath + "/scripts");
		return tplFullpath;
	}
	
	function create_rig_version(lib_path, rig_data){//if is first item, create rig version json
		var rig_version_data = {
			"is_full_rig": rig_data["is_full_rig"],
			"node_list": rig_data["node_list"]
		};
		return BD1_WriteJsonFile(rig_version_data, rig_data["rig_version_json"]);
	}
	
	function updates_library_json(item_status, item_name, rig_data, tags_data){//updates the json file for the rig library
		var lib_json = rig_data["lib_json"];
		
		if(rig_data["lib_exists"]){
			var lib_curr_data = BD1_ReadJSONFile(lib_json);
			if(!lib_curr_data){
				MessageBox.warning("Erro ao ler as informações da library!", 0, 0);
				return false;
			}
			
			lib_curr_data["library"][item_name] = new ItemData();
			lib_curr_data["tag_lists"] = update_tag_list(lib_curr_data["tag_lists"], tags_data);
			
			//make copy of
			if(!BD1_CopyFile(lib_json, (lib_json + "~"))){
				MessageBox.warning("Falha ao criar o arquivo de backup!!",0,0);
				Print("[BIRDOAPP] Falha ao criar o arquivo de backup!!");
				return false;
			}
			
		} else {
			var lib_curr_data = {
				"library": {},
				"tag_lists": tags_data
			}
			lib_curr_data["library"][item_name] = new ItemData();
				
		}
		
		if(!BD1_WriteJsonFile(lib_curr_data, lib_json)){
			MessageBox.warning("Erro atualizando a lib data!",0,0);
			return false;
		} else {
			return true;
		}
		
		//updates item tag list
		function update_tag_list(old_tags, new_tags){
			for(item in new_tags){
				if(item in old_tags){
					for(var i=0; i<new_tags[item].length; i++){ 
						if(old_tags[item].indexOf(new_tags[item][i]) == -1){
							Print("--updated tag list with : " + new_tags[item][i]);
							old_tags[item].push(new_tags[item][i]);	
						}
					}
				} else {
					Print("--updated old tags with new type list!");
					old_tags[item] = new_tags[item];
				}
			}
			return old_tags;
		}
		//constructor object item data
		function ItemData(){
			this.id = rig_data["lib_name"] + rig_data["version"] + item_name;
			this.type = rig_data["lib_type"];
			this.status = item_status;
			this.path_data = item_name + "/DATA/";
			this.path_thumbs = item_name + "/THUMBS/";
			this.path_tpl = item_name + "/" + item_name + ".zip"; 
			this.tags = tags_data;
		}
	}
}
exports.saveTpl = saveTpl;


/*
	apply the selected template
 */
function apply_selected_template(self, user_data, lib_path, item_list, rig_group, options){
		
	scene.beginUndoRedoAccum("Apply template BirdoLibrary");

	//sets the progressBar max
	var max = item_list.length * 3;
	self.ui.progressBar.setMaximum(max);
	
	
	//gets rigth to modify library
	if(!getRigthsToModifyLib(lib_path, user_data)){
		Print("Fail to get rigths to modify library!");
		return false;
	}
	
	//prepare temp folder	
	var temp_folder = getTempFolder() + "_applyTPL/";
	if(BD1_DirExist(temp_folder)){//force clean before action...
		BD1_RemoveDirs(temp_folder);
	}
	BD1_createDirectoryREDE(temp_folder);

	var apply_counter = 0;
	var count_error = 0;
	
	for(var i=0; i<item_list.length; i++){
		
		var template_zip = lib_path + item_list[i].path_tpl;
		Print("applying... " + template_zip);
		
		self.updateProgressBar();
		self.ui.progressBar.format = "baixando item...";
		//downloading lib zip
		var temp_zip = temp_folder + "_temp.zip";
		if(!BD1_CopyFile(template_zip, temp_zip)){
			MessageBox.warning("Erro copiando temp zip file!",0,0);
			Print("Fail copy from : " + template_zip + " to " + temp_zip);
			return false;
		}
			
		self.updateProgressBar();
		self.ui.progressBar.format = "descompactando item...";
		//unpacking item
		if(!BD1_UnzipFile(temp_zip, temp_folder)){
			Print("Unzip file failed... canceling..");
			return false;
		}
		
		self.updateProgressBar();
		self.ui.progressBar.format = "aplicando template...";
		//apply template
		var tplName = BD1_fileBasename(template_zip).replace(".zip", ".tpl");
		var temp_template = temp_folder + tplName;
		Print([temp_template, rig_group, options.insertFrame, options.duration, options.paste_mode, options.paste_drawings, options.paste_keys]);
		if(!applyTemplate(temp_template, rig_group, options.insertFrame, options.duration, options.paste_drawings, options.paste_keys, options.use_drawings)){
			Print("Fail to apply template in rig!");
			count_error++;
		} else {
			apply_counter++;
			options.insertFrame++;
		}
	}
	
	//relase lock library
	if(!releaseRigthToModifyLib(lib_path, user_data)){
		Print("Error releasing Lock file!");
		return false;
	}
	
	
	Print(apply_counter + " Templates applyed with succsess, and " + count_error + " with error!");
	self.ui.progressBar.format = "(" + apply_counter + ") itens aplicados!!";
	
	scene.endUndoRedoAccum();

	return true;		
		
	//apply the template with selected options
	function applyTemplate(template, rig_group, insertFrame, duration, paste_drawings, paste_key, use_drawings){
		copyPaste.usePasteSpecial(true);
		
		//keyframes options
		copyPaste.setPasteSpecialAddRemoveAngleKeyFrame(paste_key);
		copyPaste.setPasteSpecialAddRemoveMotionKeyFrame(paste_key);
		copyPaste.setPasteSpecialAddRemoveScalingKeyFrame(paste_key);
		copyPaste.setPasteSpecialAddRemoveSkewKeyFrame(paste_key);
		copyPaste.setPasteSpecialAddRemoveVelocityKeyFrame(paste_key);
		copyPaste.setPasteSpecialForcesKeyFrameAtBegAndEnd(paste_key);

		copyPaste.setNumFramesSrc(duration.numFrames);
		copyPaste.setPasteSpecialDrawingAction(paste_drawings);
		copyPaste.setPasteSpecialDrawingFileMode("ONLY_CREATE_IF_DOES_NOT_EXIST");
		copyPaste.setPasteSpecialDrawingAutomaticExtendExposure(use_drawings, use_drawings);
		copyPaste.setPasteSpecialMatchNodeName(true);
		copyPaste.setPasteSpecialReplaceExpressionColumns(false);
		copyPaste.setPasteSpecialCopyScanFiles(false);
		var backupPasteLocalValue = copyPaste.getCurrentPasteOptions().fullTransfer;
		
		copyPaste.setPasteSpecialFullTransfer(false);
		copyPaste.useCreateTemplateSpecial(false, false, true, false);  // avoid scanning folders for additional files.

		// make sure that we do not paste any palettes (as requested).
		copyPaste.setPasteSpecialColorPaletteOption( "REUSE_PALETTES" );
		copyPaste.setPasteSpecialColorPaletteOption( "DO_NOTHING" );

		var pasteOptions = copyPaste.getCurrentPasteOptions();
		pasteOptions.startDeleteFrame = insertFrame;
		pasteOptions.actionTemplateMode = true;
		//pasteOptions.writeMode = paste_key ? "OVERWRITE" : "DO_NOTHING";

		var dragObject = copyPaste.copyFromTemplate(template, duration.start, duration.numFrames, copyPaste.getCurrentCreateOptions());

		copyPaste.usePasteSpecial(true);
		var apply = copyPaste.paste(dragObject, [rig_group], insertFrame, duration.numFrames, pasteOptions);

		//backup fullTransfer
		copyPaste.setPasteSpecialFullTransfer(backupPasteLocalValue);
		return apply;
	}
}
exports.apply_selected_template = apply_selected_template;

