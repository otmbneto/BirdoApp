include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
	utils do ImportAssets (birdoAssets);
*/

//limpa o cache
function clear_cache(self){
	Print("Freeing cache!");
	if(!BD1_RemoveDirs(self.base_cache)){
		Print("[BIRDOAPP] Falha ao limpar o cache! Algo deu errado com o acesso a pasta temporaria!");
		return;
	} else {
	Print("Cache esvaziado com sucesso!");
		return;
	}
}
exports.clear_cache = clear_cache;

//funcao pra quando item do widget tree e selecionado e expandido
function expand_tree_item(self, item){
	Print("item expand : " + item.text(0));
	var path = item.text(0) + "/"
	var i = 0;
	
	var node = item;
	while(node.parent()){
		node = node.parent();
		path = node.text(0) + "/" + path;
		i+=1;
	}
	var children_path = self.library_root + path;
	var null_child = item.takeChild(0);       
	var children = null; 
	children = BD1_ListFolders(children_path);
	for(i=0; i < children.length; i++){
		childItem = new QTreeWidgetItem(item, [children[i]]);
	}
}
exports.expand_tree_item = expand_tree_item;

//lista todos zips de tpl dos subassets na versao mais recentes
function list_assets(projectDATA, asset_path){
	//gets the name of the main asset if CHAR to get rig group name
	var final_files = [];
	var test_files = []; //lista com os itens sem versao pra testar se ja esta listado
	var versions = BD1_ListFolders(asset_path).reverse();
	for(var i=0; i<versions.length; i++){
		var verPath = asset_path + versions[i] + "/";
		var subAssets = BD1_ListFolders(verPath);
		for(var j=0; j<subAssets.length; j++){
			var item_obj = {};
			var sub_asset_path = verPath + subAssets[j];
			var itemJson = sub_asset_path + "/DATA/saveTPL.JSON";
			var asset_data = BD1_ReadJSONFile(itemJson);
			if(!asset_data){
				continue;
			}
			var zip = BD1_ListFiles(sub_asset_path, "*.zip")[0];
			if(!zip){
				continue;
			}
			var zip_fullpath = sub_asset_path + "/" + zip;
			
			item_obj["zip_file"] = zip_fullpath;
			item_obj["version"] = versions[i];
			var asset_name = subAssets[j].replace(/[a-zA-Z]+\d+_/, "");
			item_obj["rig_group_name"] = projectDATA.prefix + "." + asset_name + "-" + versions[i];
			item_obj["item_name"] = subAssets[j];
			item_obj["tpl_name"] = subAssets[j] + ".tpl";
			if(test_files.indexOf(subAssets[j]) == -1){
				final_files.push(item_obj);
			}
			test_files.push(subAssets[j]);
		}
	}
	return final_files.sort(sortObjects);
	function sortObjects(a, b){//funcao para organizar objetos em ordem alfabetica!!!
		if(a.item_name < b.item_name){ 
			return -1;
		}
		if(a.item_name > b.item_name){
			return 1;
		}
		return 0;
	};
}
exports.list_assets = list_assets;

//baixa o item da rede para o local temp
function download_item(self, item){ 

	var filepath = BD1_fileParentFolder(self.asset_obj[item.text()]["zip"]);
	var local_cache = self.base_cache + self.asset_obj[item.text()]["main_name"] + "/" + item.text() + "/";
	var thumbs_path = filepath + "/THUMBS/";

	// se o cache ja existe nao precisa puxar de novo
	if(!BD1_DirExist(local_cache)){
		if(!BD1_createDirectoryREDE(local_cache)){
			Print("falha ao criar pasta local dos thumbnails...");
			self.ui.groupPreview.screen_label.text = "No thumbnails available!";
			return;
		}
		var cache_zip = thumbs_path + "thumbs.zip";
		if(!BD1_FileExists(cache_zip) && !BD2_ZipFilesInFolder(thumbs_path, "thumbs", thumbs_path)){
			Print("[BIRDOAPP] falha ao criar thumbnails...");
			self.ui.groupPreview.screen_label.text = "No thumbnails available!";
			return;
		}

		if(!BD1_CopyFile(cache_zip, local_cache + "thumbs.zip")){
			Print("[BIRDOAPP] falha ao copiar thumbnails para o cache!");
			self.ui.groupPreview.screen_label.text = "No thumbnails available!";
			return;
		}
		//removeFile(cache_zip);
		if(!BD1_UnzipFile(local_cache + "thumbs.zip", local_cache)){
			Print("[BIRDOAPP] Erro: Nao foi possivel extrair os thumbnails!");
			self.ui.groupPreview.screen_label.text = "No thumbnails available!";
			return;
		}
		BD1_RemoveFile(local_cache + "thumbs.zip");
	}

	var pngs = BD1_ListFiles(local_cache, "*.png");
	if(pngs.length == 0){
		Print("Erro: Nao foram encontrados os thumbnails extraidos!");
		self.ui.groupPreview.screen_label.text = "No thumbnails available!";
		return;
	}

	self.ui.groupPreview.thumbnail_slider.maximum = pngs.length;
	self.thumb_list = []; // TODO salvar thumbnails localmente.
	var pixmap = null;

	for(var t=0; t < pngs.length; t++){
		pixmap = new QPixmap(local_cache + pngs[t]);
		self.thumb_list.push(pixmap);
	}
	
	//update pixmap in widget
	self.ui.groupPreview.screen_label.setPixmap(self.thumb_list[0]);
}
exports.download_item = download_item;


function importTemplate(self, selected_item){
	var zip = self.asset_obj[selected_item.text()]["zip"];
	var tplname = self.asset_obj[selected_item.text()]["tpl_name"];
	var tpl_cache = self.base_cache + selected_item.text() + "/";
	var temp_zip = tpl_cache + selected_item.text() + ".zip";
	//limpa o cache do asset antes de criar novo cache
	if(BD1_DirExist(tpl_cache)){
		BD1_RemoveDirs(tpl_cache);
	}
	BD1_createDirectoryREDE(tpl_cache);
	
	if(!BD1_CopyFile(zip, temp_zip)){
		self.output_import["import"] = false;
		self.output_import["status"] += (" - " + tplname + " : fail to copy cache zip!\n");
		MessageBox.warning("Erro: " + tplname + " Erro ao copiar template para o cache!", 0, 0);
		return;
	}
	
	if(!BD1_UnzipFile(temp_zip, tpl_cache)){
		self.output_import["import"] = false;
		self.output_import["status"] += (" - " + tplname + " : fail to unzip cache!\n");
		Print("Unable to unzip: " + tplname);
		return;
	}

	var decompressed_tpl = tpl_cache + tplname;
	if(!BD1_DirExist(tpl_cache)){
		self.output_import["import"] = false;
		self.output_import["status"] += (" - " + tplname + " : fail to find unzip tpl in cache!\n");
		Print("Error! cant find unziped tpl: " + decompressed_tpl);
		return;
	}
	
	copyPaste.setPasteSpecialCreateNewColumn(true);
	copyPaste.usePasteSpecial(true);
	copyPaste.setExtendScene(false);
	copyPaste.setPasteSpecialColorPaletteOption("COPY_PALETTE_AND_UPDATE_COLOURS");

	var success = copyPaste.pasteTemplateIntoScene(decompressed_tpl, "", 1);
	if(!success){
		self.output_import["import"] = false;
		self.output_import["status"] += (" - " + tplname + " : fail to import tpl into scene!\n");
		Print("fail to import tpl into scene: " + decompressed_tpl);
		return false;
	} else {
		self.output_import["status"] += (" - " + tplname + " : Importado com sucesso!!!\n");
	}
}
exports.importTemplate = importTemplate;
