include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* V4.0 - BirdoAPP - agora com function sort pra ordenar os intens em ordem alfabetica na interface
Name:		ImportAssets.js

Description:	Este Script acessa a library de assets e importa os tpls direto pra cena

Usage:		selecione na lista de assets os assets a serem importados adicionando eles pra lista certa

Author:		Leonardo Bazilio Bentolila

Created:	Novembro, 2020; (update janeiro 2022)
            
Copyright:   leobazao_@Birdo, ottoni
 
-------------------------------------------------------------------------------
*/

//TODO: - 
//      >>addicionar BG como opcao nos assets
//         - add path do fechamento de bg da cena no json path do projeto
//         - fazer funcao pra pegar esse caminho nesse script (se for cena, se for bg retorna null);
//         - Criar Add BG no file_tree - [OK]
//         - listar itens de bg no file_tree e no list_widget;
//         - modificar o script update_BirdoASSET.py para retornar no json output as infos de path do BG fechamento (receber um argumento a mais com path do bg da cena)
//         - criar js com funcao pra dar um require no script de importar o bg (fazer toda acao de bg por la.. so recebe o caminho o psd)
//            >> fazer funcao check fechamento pra ver se tem pasta vazia ou nome fora do padrao;
//            >> refazer aquele import do psd de uma forma mais eficaz pro nosso script. 
//            >> retornar se foi sucesso ou nao
//      >> Criar banco de animacao (fazer action template? tem q mexer no save tpl tmb) 


function ImportAssets(){

	//////////////////////////////////  INICIACAO  ///////////////////////////////////////////
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}

	var lib_path = projectDATA.getTBLIB("server") + "BirdoASSET/";
	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_BirdoASSETS.ui";
	var logo_path = projectDATA.birdoApp + "app/icons/logo_" + projectDATA.prefix + ".png";
	
	//UPDATE LOCAL BirdoASSETS if nextcloud/
	if(projectDATA.server.type == "nextcloud"){
		lib_path = projectDATA.getTBLIB("local") + "BirdoASSETS/";
		var update_ba = update_birdoAsset_local(projectDATA);
		
		if(!update_ba){
			MessageBox.warning("Falha ao atualizar o BirdoASSETs local! Avise a Direcao Tecnica!", 0, 0);
			return;
		}
		if(!update_ba["update"]){
			MessageBox.warning(update_ba["status"], 0, 0);
			return;
		}
		print(update_ba);
	}
	
	try{
		generateUI(projectDATA, ui_path, lib_path, logo_path);
	}
	catch(e){
		MessageLog.trace(e + "at line" + e.lineNumber);
	}

	///////FUNCOES EXTRAS MAIN////////////
	function update_birdoAsset_local(projData){
		
		var pythonPath = BD2_FormatPathOS(projData.birdoApp + "venv/Scripts/python");
		var pyFile = BD2_FormatPathOS(projData.birdoApp + "app/utils/" + projData.server.type + "_update_birdoASSET.py");
		var tempfolder = specialFolders.temp + "/BirdoApp/" + projData.server.type + "/BirdoASSET/";

		if(!BD1_DirExist(tempfolder)){
			BD1_createDirectoryREDE(tempfolder);
		}
		
		var jsonFile = tempfolder + "info" + new Date().getTime() + ".json";
		
		var project_index = projData.id;

		var commands = [];
		commands.push(pythonPath);
		commands.push(pyFile);
		commands.push(project_index);
		commands.push(jsonFile);
		
		var ret = Process.execute(commands);
		Print("########Commands python file: ");
		Print(BD2_RenameAll(commands.toString(), ",", " "));
		
		if(ret != 0){
			Print("[GETASSETSDATA][ERROR] Fail to run python script!");
			return false;
		}
		
		if(BD1_FileExists(jsonFile)){
			return BD1_ReadJSONFile(jsonFile);
		} else {
			Print("Falha ao pegar informacoes dos assets do Projeto!");
			return false;
		}
	}

}

/////////////////FUNCAO DA INTERFACE////////////////////////

function generateUI(projectDATA, ui_path, base_folder, logo){

	var ui = UiLoader.load(ui_path);

	////CALL BACK FUNCTIONS////
	var onClearCache = function(){
		MessageLog.trace("Freeing cache!");
		if(!removeDirectory(base_cache)){
			MessageLog.trace("Falha ao limpar o cache.. avise o Leo!");
			return;
		} else {
		MessageLog.trace("Cache esvaziado com sucesso!");
			return;
		}
	}

	var checkCache = function(){
		var folders = null;
		if(dirExists(base_cache)){
			folders = listdir(base_cache,"*",true);				
			if(folders.length > 10){
				onClearCache();
			}
		}
	}
	
	var insertOnTree = function(tree,tree_children){
        tree.columnCount = 1;
        tree.headerVisible = false;
        tree.clicked.connect(onClick);
        var leaf = null;
		var null_item = null;
		for(var i=0;i < tree_children.length;i++){
			if(!dirExists(base_folder + tree_children[i]) && tree_children[i] != "BG"){
				continue;
			}
            leaf = new QTreeWidgetItem(tree, [tree_children[i]]);
            null_item = new QTreeWidgetItem(leaf,["null"]);
		}
	}
	
	var getFiles = function(path){//lista todos zips de tpl dos subassets na versao mais recentes
		//gets the name of the main asset if CHAR to get rig group name
		var main_asset_name = get_file_name(path).slice(0,2) == "CH" ? get_file_name(path).replace(/CH\d+_/, "") : null;
		var final_files = [];
		var test_files = []; //lista com os itens sem versao pra testar se ja esta listado
		var regex_version = /(\.|_)v\d+(\.zip)?/;// pega o final do nome .v001.zip ou o _v00 do nome do template (shotgun)
		var versions = listdir(path).reverse();
		for(var i=0; i<versions.length; i++){
			var is_anim = versions[i] == "ANIM";
			var verPath = path + versions[i] + "/";
			var subAssets = listdir(verPath, "*", true);
			for(var j=0; j<subAssets.length; j++){
				var item_obj = {};
				var sub_asset_path = verPath + subAssets[j];
				var itemJson = sub_asset_path + "/DATA/saveTPL.JSON";
				var asset_data = readJSONFile(itemJson);
				if(!asset_data){
					continue;
				}
				var zip = listdir(sub_asset_path, "*.zip")[0];
				if(!zip){
					continue;
				}
				
				var zip_fullpath = sub_asset_path + "/" + zip;
				var shortName = asset_data["info"]["sg_version_template"].replace(regex_version, "").replace(/^(\w{2}\d{4}_)/, "");
				
				item_obj["zip_file"] = zip_fullpath;
				item_obj["version"] = versions[i];
				item_obj["rig_group_name"] = projectDATA.prefix + "." + main_asset_name + "-" + versions[i];
				item_obj["item_name"] = subAssets[j];
				item_obj["short_name"] = shortName;
				item_obj["tpl_name"] = is_anim ? subAssets[j].replace(/_\d{3}$/, ".tpl") : subAssets[j] + ".tpl";
				
				if(test_files.indexOf(subAssets[j]) == -1){
					final_files.push(item_obj);
				}
				test_files.push(subAssets[j]);
			}
		}
		function sortObjects(a, b){//funcao para organizar objetos em ordem alfabetica!!!
			if(a.item_name < b.item_name){ 
				return -1;
			}
			if(a.item_name > b.item_name){
				return 1;
			}
			return 0;
		};
		return final_files.sort(sortObjects);
	}

	var onClick = function(){
		selected_item = -1;
		var nodes = ui.file_tree.selectedItems();
		var banco_regex = /((POSE|P|EXPRE|E)\d{3})$/;
		var anim_regex = /^ANIM/;
		var is_banco = ui.typeCombo.currentText == "BANCO";
		var is_anim = ui.typeCombo.currentText == "ANIM";
		
		//enable short name based on anim selection filter
		if(is_anim){
			display_short_name = false;
		}
		ui.nameButton.enabled = !is_anim;
		
		
		if(nodes.length == 0){
			return;
		}
		
		ui.progress_bar.value = 0;
		ui.list_widget.clear();
		var node = nodes[0];

		var sel_node = node;
		var path = node.text(0) + "/";

		while(node.parent()){
			node = node.parent();
			path = node.text(0) + "/" + path;
		}
		var asset_path = base_folder + path;

		var current_files = null;
		//only if is leaf(have too check)
		if(sel_node.childCount() != 0){
			return;
		}
		current_files = getFiles(asset_path);
		
		var new_item = null;
		var current_text;
		var current_zip_path;
		MessageLog.trace("asset_path: 	" + asset_path);
		
		ui.progress_bar.setRange(0, current_files.length);
		
		for(var i=0; i < current_files.length; i++){
			ui.progress_bar.value = (i);
			
			if(display_short_name){
				current_text = current_files[i]["short_name"];
			} else {
				current_text = current_files[i]["item_name"];
			}

			
			if(is_banco){//se e type selecionado for BANCO, continua o loop caso item nao seja BANCO
				if(!banco_regex.test(current_text)){
					continue;
				}
			} else if(is_anim){
				if(!anim_regex.test(current_text)){
					continue;
				}
			}else {//se e type selecionado for RIG, continua o loop caso item nao seja RIG
				if(banco_regex.test(current_text) || anim_regex.test(current_text)){
					continue;
				}
			}
			var main_name = get_file_name(asset_path.slice(0, asset_path.length-1));
			//Checa se da match no imput text do search
			if(current_files[i]["item_name"].toLowerCase().indexOf(ui.search_text.text.toLowerCase()) != -1 || current_files[i]["short_name"].toLowerCase().indexOf(ui.search_text.text.toLowerCase()) != -1){
				asset_obj[current_files[i]["item_name"]] = {"main_name": main_name, "zip": current_files[i]["zip_file"], "rig_name": current_files[i]["rig_group_name"], "tpl_name": current_files[i]["tpl_name"]};
				asset_obj[current_files[i]["short_name"]] = {"main_name": main_name, "zip": current_files[i]["zip_file"], "rig_name": current_files[i]["rig_group_name"], "tpl_name": current_files[i]["tpl_name"]};

				MessageLog.trace("Item is:" + current_text);
				new_item = new QListWidgetItem();
				new_item.setText(current_text);
				ui.list_widget.insertItem(i,new_item);
			}
		}
				
		ui.progress_bar.value = 0;
		ui.progress_bar.format = new_item ? "" : "Nenhum item " + ui.typeCombo.currentText + " para este asset!";
		return;
	}
	

	var onItemExpand = function(item){

		var node = item;
		MessageLog.trace("teste : " + item.text(0));
		if(item.text(0) == "Misc"){
			MessageLog.trace("TESTE MISCELANIA!");
			ui.typeCombo.setCurrentIndex(1);
		}
		var path = item.text(0) + "/"
		var i = 0;
		
		while(node.parent()){
           	node = node.parent();
           	path = node.text(0) + "/" + path;
           	i+=1;
		}
        var children_path = base_folder + path;
        var null_child = item.takeChild(0);       
       	var children = null; 
		if (dirExists(children_path)){
            children = listdir(children_path,"*",true);
		}
        else{
			return;
		}
        for(i=0; i < children.length; i++){
            childItem = new QTreeWidgetItem(item, [children[i]]);
        }
		return;

	}

	var onItemCollapse= function(item){
        var removed_children = item.takeChildren();
        var null_item = new QTreeWidgetItem(item,["null"]);
	}

	//FIMXE :::: DEFINIR SE E UM BANCO ANIM AQUI!!!! PEGAR CAMINHO DO RIG GROUP SE NAO FOR NULL, EH BANCO ANIM!!!
	var onItemClick = function(item){
		checkCache();
		ui.groupPreview.screen_label.clear();
		ui.groupPreview.screen_label.text = "Loading thumbnails...";

		//check if is anim item
		var is_anim = ui.typeCombo.currentText == "ANIM";


		selected_item = item;
		var filepath = getDir(asset_obj[item.text()]["zip"]);
		var local_cache = base_cache + asset_obj[item.text()]["main_name"] + "/" + item.text() + "/";
		var thumbs_path =  filepath + "/THUMBS/";

		try{
			if(dirExists(thumbs_path)){
				// se o cache ja existe nao precisa puxar de novo
				if(!dirExists(local_cache)){
					if(!createDirectory(local_cache)){
						MessageLog.trace("falha ao criar pasta local dos thumbnails...");
						ui.groupPreview.screen_label.text = "No thumbnails available!";
						return;
					}
					var cache_zip = thumbs_path + "thumbs.zip";
				
					if(!fileExists(cache_zip) && !zipFile(thumbs_path + "/*",cache_zip)){//*/
						MessageLog.trace("falha ao criar thumbnails...");
						ui.groupPreview.screen_label.text = "No thumbnails available!";
						return;
					}

					if(!copyFile(cache_zip,local_cache + "thumbs.zip")){
						MessageLog.trace("falha ao copiar thumbnails para o cache!");
						ui.groupPreview.screen_label.text = "No thumbnails available!";
						return;
					}
					//removeFile(cache_zip);
					if(!unzipFile(local_cache + "thumbs.zip",local_cache)){
						MessageLog.trace("Erro: Nao foi possivel extrair os thumbnails!");
						ui.groupPreview.screen_label.text = "No thumbnails available!";
						return;
					}
					removeFile(local_cache + "thumbs.zip");
				}
		
				var dirs = listdir(local_cache,"*.png");
			
				if(dirs.length == 0){
					MessageLog.trace("Erro: Nao foram encontrados os thumbnails extraidos!");
					ui.groupPreview.screen_label.text = "No thumbnails available!";
					return;
				}

				ui.groupPreview.thumbnail_slider.maximum = dirs.length;
				thumb_list = []; // TODO salvar thumbnails localmente.
				var pixmap = null;

				for(var t=0; t < dirs.length; t++){
					pixmap = new QPixmap(local_cache + dirs[t]);
					thumb_list.push(pixmap);
				}
				if(is_anim){
					playPreview();
				} else {
					stopPreview();
					ui.groupPreview.screen_label.setPixmap(thumb_list[0]);
				}
				//checkCache();

			}
		}catch(e){
			MessageLog.trace(e + "at line" + e.lineNumber);
		}
	}
	
	var playPreview = function(){
		frame_counter = 0
		ui.groupPreview.thumbnail_slider.value = 0;
		internal_timer.start();
		MessageLog.trace("preview playing...");
	}

	var stopPreview = function(){
		internal_timer.stop();
		ui.groupPreview.thumbnail_slider.value = 0;
		MessageLog.trace("preview Stoped!");
	}
	
	var timmerPlay = function(){
		var index = frame_counter % thumb_list.length;
		ui.groupPreview.thumbnail_slider.value = index;
		MessageLog.trace("Playing... " + index);
		frame_counter++;
	}

	var updateFrame = function(){
		if(ui.groupPreview.screen_label.pixmap != null){
			ui.groupPreview.screen_label.pixmap = thumb_list[ui.groupPreview.thumbnail_slider.value %  thumb_list.length];
		}
	}
	
	var onClose = function(){
		stopPreview();
		ui.close();
	}

	var onTextChange = function(){
		onClick();
	}

	var onNameDisplay = function(){
		MessageLog.trace("TESTE FUNCIONA QUNADO TROCA PRA ANIM!!!");
		display_short_name = ui.nameButton.checked;
		if(display_short_name){
			ui.nameButton.text = "Short Name";
		} else {
			ui.nameButton.text = "Full Name";
		}
		
		onClick();
	}

	var onAddDoubleClick = function(item){
		var match = ui.selected_items_list.findItems(item.text(),0);
		if(match.length > 0){
			return;
		}
		var row = ui.selected_items_list.count;
		var new_item = new QListWidgetItem();
		new_item.setText(item.text());
		ui.selected_items_list.insertItem(row,new_item);
	}

	var onRmvDoubleClick = function(item){
		var row = ui.selected_items_list.currentRow;
		ui.selected_items_list.takeItem(row);
	}

	var importTemplates = function(){
		stopPreview();
		scene.beginUndoRedoAccum("Import Assets...");
		var item = null;
		var count = ui.selected_items_list.count;
		if(count == 0){
			MessageBox.information("Escolha itens para adicionar na 'Import List'.\nPara adicionar, de um duplo clique no item da lista do meio!");
			return;
		}
		ui.progress_bar.value = 0;
		for(var i = 0; i < count;i++){
			try{
				item =  ui.selected_items_list.item(i);
				importTemplate(item);
				ui.progress_bar.value = ((i+1)/count)*100;
			}
			catch(e){

				MessageLog.trace(e);
			}

		}
		scene.endUndoRedoAccum();
		ui.close();
		if(!output_import["import"]){
			MessageBox.warning(output_import["status"],0,0);
		} else {
			MessageBox.information(output_import["status"]);
		}
	}

	var importTemplate = function(selected_item){
		//what if unclick
		try{
			var zip = asset_obj[selected_item.text()]["zip"];
			var tplname = asset_obj[selected_item.text()]["tpl_name"];
			var tpl_cache = base_cache + selected_item.text() + "/";
			var temp_zip = tpl_cache + selected_item.text() + ".zip";
			//limpa o cache do asset antes de criar novo cache
			if(dirExists(tpl_cache)){
				removeDirectory(tpl_cache);
			}
			createDirectory(tpl_cache);			
			
			if(!copyFile(zip, temp_zip)){
				output_import["import"] = false;
				output_import["status"] += (" - " + tplname + " : fail to copy cache zip!\n");
				MessageBox.warning("Erro: " + tplname + " Erro ao copiar template para o cache!", 0, 0);
				return;
			}
			
			if(!unzipFile(temp_zip, tpl_cache)){
				output_import["import"] = false;
				output_import["status"] += (" - " + tplname + " : fail to unzip cache!\n");
				MessageLog.trace("Unable to unzip: " + tplname);
				return;
			}

			var decompressed_tpl = tpl_cache + tplname;

			if(!dirExists(tpl_cache)){
				output_import["import"] = false;
				output_import["status"] += (" - " + tplname + " : fail to find unzip tpl in cache!\n");
				MessageLog.trace("Error! cant find unziped tpl: " + decompressed_tpl);
				return;
			}
			
			copyPaste.setPasteSpecialCreateNewColumn(true);
			copyPaste.usePasteSpecial(true);
			copyPaste.setExtendScene(false);
			copyPaste.setPasteSpecialColorPaletteOption("COPY_PALETTE_AND_UPDATE_COLOURS");

			var success = copyPaste.pasteTemplateIntoScene(decompressed_tpl, "", 1);
			if(!success){
				output_import["import"] = false;
				output_import["status"] += (" - " + tplname + " : fail to import tpl into scene!\n");
				MessageLog.trace("fail to import tpl into scene: " + decompressed_tpl);
				return false;
			} else {
				output_import["status"] += (" - " + tplname + " : Importado com sucesso!!!\n");
			}

			checkCache();
		}
		catch(e){
			MessageLog.trace(e);
		}
	}

	//////FUNCOES EXTRAS DA INTERFACE///////
	function unzipFile(zip_file, unzip_to){
		var cmd = get7Zip();
		var commandArguments = [cmd,"x",zip_file,"-o" + unzip_to];

		try {
			Process.execute(commandArguments);
		}
		 catch (err){
			MessageLog.trace(err);
			//MessageBox.warning( "Error while unziping File: " + zip_file, 1, 0, 0);
			return false;
		}
		MessageLog.trace("Arquivo descompactado com sucesso! " + zip_file + " no destino: " + unzip_to);
		return true;
	}

	function removeDirectory(path){
		var rmv_dir = new Dir(path);
		if(!rmv_dir.exists){
			MessageLog.trace("Diretorio nao encontrado: " + path);
			return false;
		}
		try{
			rmv_dir.rmdirs();
		}
		catch(e){
			MessageLog.trace(e);
			return false;
		}
		MessageLog.trace("Diretorio removido..." + path);
		return true;
	}


	function removeFile(path){
		var file = new File(path);
		if(!file.exists){
			MessageLog.trace("Arquivo nao encontrado: " + path);
			return false;
		}
		try{
			file.remove();
		}
		catch(e){
			MessageLog.trace(e);
			return false;
		}
		MessageLog.trace("Diretorio removido..." + path);
		return true;
	}

	function fileExists(path){
		var file = new File(path);
		return file.exists;
	}
	//retorna o caminho do EXE do 7Zip usado para manipular arquivos Zip
	function get7Zip() {
		var p;
		if(about.isMacArch() || about.isLinuxArch()){
			p = specialFolders.bin + "/bin_3rdParty/7za";
			if(fileExists(p)){
				return p;
			}
			p = specialFolders.bin + "/../../external/macosx/p7zip/7za";
			if(fileExists(p)){
				return p;
			}
		} else if (about.isWindowsArch()){
			p = specialFolders.bin + "/bin_3rdParty/7z.exe";
			if(fileExists(p)){
				return p;
			}
		}
		MessageBox.information("cannot find 7zip to compress template. aborting");
		return false;	
	}


	//Copia um Arquivo para o caminho dado
	function copyFile(copy_from, paste_to){
			
		var original_file = new PermanentFile(copy_from);
		var new_file = new PermanentFile(paste_to);
		var sucess = original_file.copy(new_file);
		if(!sucess){
			MessageLog.trace("Fail to copy the file: '" + copy_from + "'!");
			return false;
		}	 
		else { 
			MessageLog.trace("File: '" + paste_to + "' Copied!");
			return true;
		}
		
	}

	//Create all the directories in the path
	function createDirectory(path){
		var save_dir = new Dir(path);
		if(!save_dir.exists){
			try{
				save_dir.mkdirs();
			}
			catch(error){ 
				MessageLog.trace( error);
				return false;	
			}
		}
		return true;
	}	

	function zipFile(zip_from,zip_to){
		MessageLog.trace("ZIPANDO!!!!");
		var cmd = get7Zip();
		var cmd_args = [cmd, "a", zip_to,zip_from];
		try{
			Process.execute(cmd_args);
		}
		catch(e){
			MessageLog.trace(cmd_args);
			return false;
		}
		return true;
	}

	function getDir(filepath){
		var file = new File(filepath);
		return file.path;
	}

	function dirExists(dirPath){
		var dir = new Dir(dirPath);
		return dir.exists;
	}

	function get_file_name(filepath){//retorna o nome do arquivo (sem extencao)
		var file = new File(filepath);
		return file.baseName;
	}

	//lista tudo de um dado diretorio( Da pra filtrar por tipo usando *.png, *.jpg,etc...)
	function listdir(path,filter,dir_only){

		filter = typeof filter !== 'undefined' ? filter : "*"; //Default value
		dir_only = typeof dir_only !== 'undefined' ? dir_only : false;

		try{
			var files = new Dir(path);
			var dirs = files.entryList(filter);

			if(filter == "*"){//remove os . e .. da lista do dir
				dirs.splice(dirs.indexOf("."), 1);
				dirs.splice(dirs.indexOf(".."), 1);
			}

			if(dir_only){
				var folders = [];
				for(var i=0;i<dirs.length;i++){
					if(dirExists(files.filePath(dirs[i]))){
						folders.push(dirs[i]);
					}
				}
				return folders;
				
			} else{
				return dirs;
			} 

		}
		catch(e){
			MessageLog.trace(e);
			return [];
		}
	}
	
	function readJSONFile(json_path){//le um arquivo json e retorna seu objeto
		var file = new File(json_path);
		if(!file.exists){
			MessageLog.trace("Convert JSON to Object ERRO: Arquivo dado como parametro nao existe: " + json_path);
			return false;
		}	
		file.open(FileAccess.ReadOnly);
		var json_object = file.read(json_path);
		file.close();
		return JSON.parse(json_object);
	}


//## ADICIONA LOGO #####//
	if(BD1_FileExists(logo)){
		var pix_logo = new QPixmap(logo);
		ui.logoProj.setPixmap(pix_logo);
		ui.logoProj.text = null;
	} else {
		MessageLog.trace("falha ao encontrar logo do projeto..");
	}
 	
////////////////////////////////////

	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}

	//timmer para o play das thumbs
	var internal_timer = new QTimer();
	internal_timer.interval = 1000/24;


	//ADCIONA ITENS AO COMBO TYPE
	ui.typeCombo.addItems(["RIG", "BANCO", "ANIM"]);

	var base_cache = specialFolders.temp + "/birdo_asset_import_cache/";
	var frame_counter = 0;
	var selected_item = -1;
	var thumb_list = [];
	var asset_obj = {};
	var display_short_name = false;
	var output_import = {"import": true, "status": "Import Asssets Log:\n"};
	
	var roots = BD1_ListFolders(base_folder);

    ui.file_tree.itemExpanded.connect(onItemExpand);
    ui.file_tree.itemCollapsed.connect(onItemCollapse);
	
	//add bg to tree
	roots.push("BG");
	
	insertOnTree(ui.file_tree, roots);

	ui.groupPreview.thumbnail_slider.valueChanged.connect(updateFrame);

	ui.clearCacheButtton.clicked.connect(onClearCache);
	
	ui.typeCombo["currentIndexChanged(QString)"].connect(onClick);
	
	internal_timer.timeout.connect(timmerPlay);

	ui.search_text.textChanged.connect(onTextChange);
	ui.list_widget.itemClicked.connect(onItemClick);
	ui.selected_items_list.itemClicked.connect(onItemClick);
	ui.list_widget.itemDoubleClicked.connect(onAddDoubleClick);
	ui.selected_items_list.itemDoubleClicked.connect(onRmvDoubleClick);
	ui.import_button.clicked.connect(importTemplates);
	ui.cancel_button.clicked.connect(onClose);
	ui.nameButton.clicked.connect(onNameDisplay);
	ui.show();

}

exports.ImportAssets = ImportAssets;
