include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
Name:		4-Importar_Assets.js

Description:	Este Script acessa a library de assets e importa os tpls direto pra cena

Usage:		selecione na lista de assets os assets a serem importados adicionando eles pra lista certa

Author:		Leonardo Bazilio Bentolila

Created:	Novembro, 2020; (update março 2025)
            
Copyright:   leobazao_@Birdo, ottoni
 
-------------------------------------------------------------------------------
*/


function ImportarAssets(){

	//////////////////////////////////  INICIACAO  ///////////////////////////////////////////
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}

	var lib_path = projectDATA.getTBLIB("server") + "BirdoASSET/";
	
	//utils
	var utils_script = projectDATA["paths"]["birdoPackage"] + "utils/ImportAssets.js";
	var utils = require(utils_script);
	
	try{
		var d = new createInterface(projectDATA, lib_path, utils);
		d.ui.show();
	}
	catch(e){
		Print(e);
	}
}

/////////////////FUNCAO DA INTERFACE////////////////////////
function createInterface(projectDATA, base_folder, utils){
	
	//init ui
	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_BirdoASSETS.ui";
	this.ui = UiLoader.load(ui_path);
	
	//variaveis da interface
	this.library_root = base_folder;
	this.base_cache = projectDATA.createTempFolder("birdoAsset", true);
	this.selected_item = -1;
	this.thumb_list = [];
	this.asset_obj = {};
	this.output_import = {"import": true, "status": "Import Asssets Log:\n"};
	this.roots = BD1_ListFolders(this.library_root);
	
	//## ADICIONA LOGO #####//
	var logo = projectDATA.icon;
	var pix_logo = new QPixmap(logo);
	this.ui.logoProj.setPixmap(pix_logo);
	this.ui.logoProj.text = null;
	
	//## CRIA OS INTENS DA LIBRARY NA TREE WIDGET #####//
	this.ui.file_tree.columnCount = 1;
	this.ui.file_tree.headerVisible = false;
	for(var i=0; i < this.roots.length; i++){
		var leaf = new QTreeWidgetItem(this.ui.file_tree, [this.roots[i]]);
		null_item = new QTreeWidgetItem(leaf,["null"]);
	}
		
	////CALL BACK FUNCTIONS////
	this.onClearCache = function(){
		utils.clear_cache(this);
	}

	this.onClick = function(){
		this.selected_item = -1;
		var nodes = this.ui.file_tree.selectedItems();
		if(nodes.length == 0){
			return;
		}
		
		this.ui.progress_bar.value = 0;
		this.ui.list_widget.clear();
		var node = nodes[0];

		var sel_node = node;
		var path = node.text(0) + "/";

		while(node.parent()){
			node = node.parent();
			path = node.text(0) + "/" + path;
		}
		var asset_path = this.library_root + path;

		var current_files = null;
		//only if is leaf(have too check)
		if(sel_node.childCount() != 0){
			return;
		}
		current_files = utils.list_assets(projectDATA, asset_path);
		
		var new_item = null;
		var current_text;
		var current_zip_path;
		Print("asset_path: 	" + asset_path);
		
		this.ui.progress_bar.setRange(0, current_files.length);
		
		for(var i=0; i < current_files.length; i++){
			this.ui.progress_bar.value = (i);
			
			current_text = current_files[i]["item_name"];
			
			var main_name = file_basename(asset_path);
			//Checa se da match no imput text do search
			if(current_files[i]["item_name"].toLowerCase().indexOf(this.ui.search_text.text.toLowerCase()) != -1){
				this.asset_obj[current_files[i]["item_name"]] = {
					"main_name": main_name, 
					"zip": current_files[i]["zip_file"], 
					"rig_name": current_files[i]["rig_group_name"], 
					"tpl_name": current_files[i]["tpl_name"]
				};

				Print("Item is:" + current_text);
				new_item = new QListWidgetItem();
				new_item.setText(current_text);
				this.ui.list_widget.insertItem(i,new_item);
			}
		}
				
		this.ui.progress_bar.value = 0;
		this.ui.progress_bar.format = new_item ? "" : "Nenhum item para este asset!";
	}
	
	this.onItemExpand = function(item){
		utils.expand_tree_item(this, item);
	}

	this.onItemCollapse = function(item){
        var removed_children = item.takeChildren();
        var null_item = new QTreeWidgetItem(item,["null"]);
	}

	this.onItemClick = function(item){
		this.ui.groupPreview.screen_label.clear();
		this.ui.groupPreview.screen_label.text = "Loading thumbnails...";
		this.selected_item = item;
		
		try{
			utils.download_item(this, item);
		}catch(e){
			Print(e + "at line" + e.lineNumber);
		}
	}
	
	this.updateFrame = function(){
		if(this.ui.groupPreview.screen_label.pixmap != null){
			this.ui.groupPreview.screen_label.pixmap = this.thumb_list[this.ui.groupPreview.thumbnail_slider.value %  this.thumb_list.length];
		}
	}
	
	this.onClose = function(){
		Print("import ASSET interface closed!");
		this.ui.close();
	}

	this.onTextChange = function(text){
		if(Boolean(text)){
			this.ui.clearSearchButton.show();
		} else {
			this.ui.clearSearchButton.hide();
		}
		this.onClick();
	}
	
	this.onClearSearch = function(){
		this.ui.search_text.clear();
		this.onClick();
	}

	this.onAddDoubleClick = function(item){
		var match = this.ui.selected_items_list.findItems(item.text(),0);
		if(match.length > 0){
			return;
		}
		var row = this.ui.selected_items_list.count;
		var new_item = new QListWidgetItem();
		new_item.setText(item.text());
		this.ui.selected_items_list.insertItem(row,new_item);
	}

	this.onAddItem = function(){
		var curritem = this.ui.list_widget.currentItem();
		this.onAddDoubleClick(curritem);
	}

	this.onRmvDoubleClick = function(item){
		var row = this.ui.selected_items_list.currentRow;
		this.ui.selected_items_list.takeItem(row);
	}

	this.onRemoveItem = function(){
		var curritem = this.ui.selected_items_list.currentItem();
		this.onRmvDoubleClick(curritem);
	}

	this.importTemplates = function(){
		var item = null;
		var count = this.ui.selected_items_list.count;
		if(count == 0){
			MessageBox.information("Escolha itens para adicionar na 'Import List'.\nPara adicionar, de um duplo clique no item da lista do meio!");
			return;
		}
		this.ui.progress_bar.value = 0;
		
		scene.beginUndoRedoAccum("Import Assets...");
		for(var i = 0; i < count; i++){
			try{
				item = this.ui.selected_items_list.item(i);
				utils.importTemplate(this, item);
				this.ui.progress_bar.value = ((i+1)/count)*100;
			}
			catch(e){
				scene.cancelUndoRedoAccum();
				Print(e);
			}
		}
		scene.endUndoRedoAccum();
		this.ui.close();
		if(!this.output_import["import"]){
			MessageBox.warning(this.output_import["status"],0,0);
		} else {
			MessageBox.information(this.output_import["status"]);
		}
	}	
	
	//connect widget to callbacks
    this.ui.file_tree.itemExpanded.connect(this, this.onItemExpand);
    this.ui.file_tree.itemCollapsed.connect(this, this.onItemCollapse);
	this.ui.file_tree.clicked.connect(this, this.onClick);
	this.ui.groupPreview.thumbnail_slider.valueChanged.connect(this, this.updateFrame);
	this.ui.clearCacheButtton.clicked.connect(this, this.onClearCache);
	this.ui.search_text.textChanged.connect(this, this.onTextChange);
	this.ui.clearSearchButton.clicked.connect(this, this.onClearSearch);
	this.ui.list_widget.itemClicked.connect(this, this.onItemClick);
	this.ui.selected_items_list.itemClicked.connect(this, this.onItemClick);
	this.ui.list_widget.itemDoubleClicked.connect(this, this.onAddDoubleClick);
	this.ui.selected_items_list.itemDoubleClicked.connect(this, this.onRmvDoubleClick);
	this.ui.import_button.clicked.connect(this, this.importTemplates);
	this.ui.addButton.clicked.connect(this, this.onAddItem);
	this.ui.removeBtn.clicked.connect(this, this.onRemoveItem);
	this.ui.cancel_button.clicked.connect(this, this.onClose);

	///helper functions//////////////////
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
	function file_basename(filepath){//retorna o nome do arquivo (sem extencao)
		var file = new File(filepath);
		return file.baseName;
	}
}
exports.ImportarAssets = ImportarAssets;
