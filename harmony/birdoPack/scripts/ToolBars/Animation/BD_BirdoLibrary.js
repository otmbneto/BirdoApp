/* 
-------------------------------------------------------------------------------
Name:		BD_BirdoLibrary.js

Description: This script is the main script of the BD_BirdoLibrary with the interface and the main functions

Usage:		Uses the utils.js funtion library to help with functions.

Author:		Leonardo Bazilio Bentolila

Created:	feb, 2022
            
Copyright:   @leobazao
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

//update script version here
var lib_version = "v.2.0";


function BD_BirdoLibrary(){
	
	//inicia o birdoApp
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
		
	var initial_node = selection.selectedNode(0);
	
	if(initial_node == ""){
		MessageBox.warning("Selecione um node do Rig para ter acesso a library desse Rig!",0,0);
		return;
	}
	var utils = require(projectDATA["paths"]["birdoPackage"] + "utils/BirdoLibraryUtils.js");
	var ui_util = require(projectDATA.paths.birdoPackage + "utils/ui_utils.js");

	var library_root = projectDATA.getLibPath();
	
	//gets user data 
	var user_data = utils.getUserData(projectDATA, library_root);
	if(!user_data){
		MessageBox.warning("Erro criando userdata!",0,0);
		Print("fail to get user data... canceling");
		return;
	}
	
	
	if(!BD1_DirExist(library_root)){
		MessageBox.information("Este computador está sem acesso a library do projeto!");
		return;		
	}
	
	var rig_data = get_rig_data(library_root, initial_node, utils, projectDATA);
	
	if(!rig_data){
		Print("[BIRDO_LIBRARY] FAIL to get rig data information!");
		return;
	}

	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_BirdoLib.ui";

	var d = new createInrterface(ui_path, rig_data, user_data, utils, ui_util);
	d.ui.show();
	
	//Main function helper funtions
	function get_rig_data(library_root, selected_node, utils, projDATA){//return object with selected rig information for the library

		var rig_data = {};
		var rig_group_regex = projDATA.get_rig_regex();
		var index_regex = /(_\d+)$/; //numero de nodes duplicados na nodeview '_1, 2, 3 ...'
		var version_regex = projDATA.pattern.version;
		var name_split = selected_node.split("/");
		if(!rig_group_regex.test(selected_node)){
			MessageBox.warning("Não é um Rig válido!",0,0);
			return false;
		}
		
		//mudanca: agora define o nome do rig por um regex, e nao pelo index do caminho como tava antes!
		var char_name = first_match_in_array(projDATA.pattern.asset, name_split);
		if(!char_name){
			MessageBox.warning("Este Rig não é um Rig válido de library!",0,0);
			Print("cant find rig char name!");
			return false;
		}
		
		var rig_node_name = first_match_in_array(rig_group_regex, name_split);
		
		if(!rig_node_name){
			MessageBox.warning("Seleção de Rig inválida!",0,0);
			return false;
		}
		
		var rig_node = "Top/" + char_name + "/" + rig_node_name;

		char_name = char_name.replace(index_regex, "");//limpa index

	
		rig_data["char_name"] = char_name;
		rig_data["libs"] = [];
		
		//add main rig to index 0 of lib list
		var main_rig_lib = createRigLibData(rig_node);
		if(main_rig_lib){
			Print("--Main Rig Lib Found!");
			rig_data["libs"].push(main_rig_lib);
		}
		
		//search for extra lib rig groups in the rig
		var node_list_full = BD2_ListNodesInGroup(rig_node, "", true);
		var has_extra_lib = false;
		
		//create object nodes list
		for(var i=0; i<node_list_full.length; i++){
			
			if(!is_rig_group(node_list_full[i]) || node_list_full[i] == rig_node){
				continue;
			}
			
			Print("Rig group found inside the rig: " + node.getName(node_list_full[i]));
			var group_rig_data = createRigLibData(node_list_full[i]);
			
			if(group_rig_data){				
				if(!check_redundance(group_rig_data)){
					continue;
				}
				rig_data["libs"].push(group_rig_data);
				has_extra_lib = true;
				Print("--lib added:");
			}
		}
		
		//checks if exists library for the found lib groups in the Rig
		if(!has_extra_lib && !main_rig_lib){
			MessageBox.information("Nenhuma Library encontrada para o Rig selecionado!");
			Print("No library for the character: " + rig_data["char_name"]);
			return false;
		} else if(has_extra_lib && !main_rig_lib){
			Print("Only extra shared lib found for this rig!");
		}
		
		//check libraries lock:
		for(var i=0; i<rig_data["libs"].length; i++){
			var item = rig_data["libs"][i];
			Print("Checking lib lock: " + item["lib_path"]);
			if(!utils.check_library_lock(item["lib_path"])){
				Print("library " + item.name + " is locked... wait and try again later!");
				return false;
			}
		}
		
		return rig_data;

		//EXTRAS FUNCTINOS
		function first_match_in_array(regex, list){//retorna o primeiro item com match numa array (regex com padrao)
			return list.filter(function(x){ return regex.test(x);})[0];
		}
		
		function check_redundance(lib_item){//check if this lib item is already in the lib list (add the extra group to the found object)
			for(item in rig_data["libs"]){
				if(rig_data["libs"][item]["name"] == lib_item["name"]){
					Print("--this lib has cloned groups in the Rig: " + lib_item["name"]);
					rig_data["libs"][item]["root_node"].push(lib_item["root_node"]);
					return false;
				}
			}
			return true;
		}
		
		function createRigLibData(rig_node){//create object with rig group nodes information
			var lib_data = {};
			//callback filter to remove ignore tag nodes (=)
			var filter_ignore_nodes = function(item){
				return BD1_fileBasename(item)[0] != "=";
			};
			lib_data["name"] = get_rig_name(rig_node);
			lib_data["version"] = version_regex.exec(node.getName(rig_node))[0];
			lib_data["root_node"] = [rig_node];//uses array in the cases that more than one node in the rig share the same library 
			var selected_rig_node_list = BD2_ListNodesInGroup(rig_node, "", false).filter(filter_ignore_nodes);
			lib_data["version_match"] = null;
			
			//checks if library exists
			var lib_path = library_root + lib_data["name"] + "/" + lib_data["version"] + "/";
			if(BD1_DirExist(lib_path)){
				lib_data["lib_path"] = lib_path;
				var version_json = lib_path + "_rig_version.json";
				var version_lib_data = BD1_ReadJSONFile(version_json);
				if(!version_lib_data){
					MessageBox.warning("Falha para ler as informações de versão do Rig!", 0, 0);
					Print("[BIRDOAPP] Error reding json file: " + rig_data["rig_version_json"]);
					return false;
				}
				//gets the match version information 
				lib_data["rig_match"] =	utils.check_rig_version_match(selected_rig_node_list, version_lib_data["node_list"]);
				
				var lib_json = lib_path + "_library.json";
				if(BD1_FileExists(lib_json)){
					var data_with_pixmaps = create_thumbs_pixmaps(lib_path, BD1_ReadJSONFile(lib_json));//update with thumbs pixmap
					lib_data["lib_json"] = lib_json;
					lib_data["data"] = utils.getUserFavoriteFlags(data_with_pixmaps);//update favorite flags information
				} else {
					Print("--lib version json for main rig Library does not exist! This lib is not working!");
					return null;
				}
				Print(" --lib found: " + lib_data["name"]);
			} else {
				Print("--No library exists for this character main Rig!");
				return null;
			}
			return lib_data;
		}
		
		function get_rig_name(rig_group){//return Rig Lib Name from rig group (project prefix.Name);
			return node.getName(rig_group).split(".")[1].split("-")[0];
		}
		
		function is_rig_group(node_path){//verify if is rig lib group
			return node.isGroup(node_path) && rig_group_regex.test(node.getName(node_path));
		}	
		
		function create_thumbs_pixmaps(lib_root, lib_data){
			var library_itens = lib_data;
			for(item in library_itens["library"]){
				Print("--Creating thumbnails: " + item);
				var thumbs_path = lib_root + library_itens["library"][item]["path_thumbs"];
				library_itens["library"][item]["icon_thumbs"] = [];
				var png_list = BD1_ListFiles(thumbs_path, "*.png");
				png_list.forEach(function(x){ 
						var icon = new QIcon(thumbs_path + x);
						library_itens["library"][item]["icon_thumbs"].push(icon);
				});
			}
			return library_itens;
		}
	}
}

//interface function
function createInrterface(uifile, library_rig_data, user_data, utils, ui_util){

	this.ui = UiLoader.load(uifile); 
	var items_counter = 0;//counter of the total items found in all tabs
	var playback_thumbs = [];
	var frame_counter = 0;
	var selected_items = null;
	var first_run_change_tab = true;//hold the first filter run to show message about clear selected items
	var first_run_rigth_modify = true;//first run of rigth to modify
	var currentItemMenu = null;//holde the current rightClick item
	
	//object with library information
	var main_data = library_rig_data;
	
	//tags object
	var main_tag_list = [];
	
	
	//CALLBACK FUNCTIONS
	this.updateTab = function(){//clean filters and items check state and update info widgets
	
		//before all, clear selected items
		this.clearSelected();
		
		var current_tab_index = this.ui.tabWidget.currentIndex;
		var current_library = main_data["libs"][current_tab_index];
		var current_items = current_library["data"]["library"];

		//reset every item button to unchecked and enabled
		for(item in current_items){
			var item_button = current_items[item]["button"];
			if(current_items[item]["deleted"]){
				Print("This item was deleted: " + item);
				item_button.hide();
				continue;
			}
			item_button.checked = false;
			item_button.enabled = true;
		}
		
		//reset filters and tags
		this.ui.groupFilter.enabled = true;
		this.ui.groupFilter.comboType.currentIndex = 0;
		//reset tags
		for(var i = 0; i < main_tag_list.length; i++){
			this.removeTagItem();
		}

		//disable advanced widgets and apply button
		this.ui.groupAdvanced.enabled = false;
		this.ui.applyButton.enabled = false;
		
		//update rig info labels and combo
		this.ui.labelRigName.text = current_library.name;
		this.ui.labelRigVersion.text = current_library.version;
		this.ui.comboNode.clear();
		this.ui.comboNode.addItems(current_library.root_node);
		Print("Tab selected: " + current_tab_index);
	}
	
	this.updateButtons = function(current_item, current_checked, multi_checks){//check button callback
		var current_tab_index = this.ui.tabWidget.currentIndex;
		var current_items = main_data["libs"][current_tab_index]["data"]["library"];
		var selection_type = null;
		
		//define if already has selected items
		var has_selection = false;
		if(selected_items != null){
			 has_selection = selected_items.length > 1;
		}
		//reset selected list to empty array 
		selected_items = [];
		
		for(item in current_items){
			var item_button = current_items[item]["button"];
			if(item_button.checked){
				selected_items.push(current_items[item]);
			}
			
			if(item == current_item){
				continue;
			}
			
			if(multi_checks){
				var curr_type = current_items[item]["type"];
				if(curr_type == "POSE"){
					continue;
				} else if(curr_type == "ANIM" && !current_checked && has_selection){
					item_button.enabled = false;
					continue;
				}
			}
			item_button.enabled = !current_checked;
		}

		//update selected_items var
		if(selected_items.length == 0){
			selected_items = null;
			//use progressBar as a label
			this.ui.progressBar.format = "No item selected!";
	
		} else {
			selection_type = selected_items[0].type;
			//use progressBar as a label
			this.ui.progressBar.format = selected_items.length + " item(s) selected!";
		}
		
		//invert enable of widgets 
		this.ui.applyButton.enabled = selected_items != null;
		this.ui.groupAdvanced.enabled = selected_items != null;
		
		//sets widgets for anim
		this.ui.groupAdvanced.startLabel.enabled = (selected_items != null && selection_type == "ANIM");
		this.ui.groupAdvanced.spinStart.enabled = (selected_items != null && selection_type == "ANIM");
		this.ui.groupAdvanced.spinEnd.enabled = (selected_items != null && selection_type == "ANIM");
		this.ui.groupAdvanced.endLabel.enabled = (selected_items != null && selection_type == "ANIM");
		
		//sets start and end frame
		if(selection_type == "ANIM"){
			var number_frames = selected_items[0]["icon_thumbs"].length;
			this.ui.groupAdvanced.spinEnd.value = number_frames;
			this.ui.groupAdvanced.spinEnd.maximum = number_frames;

			this.ui.groupAdvanced.spinStart.value = 1;
			this.ui.groupAdvanced.spinStart.maximum = number_frames - 1;
		} else {
			this.ui.groupAdvanced.spinEnd.value = 1;
			this.ui.groupAdvanced.spinStart.value = 1;
		}
	}
	
	this.createMenu = function(){
		//output menu data
		var menu_data = {"main_menu": null, "actions": {}};
			
		//Main menu
		var btt_menu = new QMenu();//FIXME: teste sem parent! vamos ver se rola

		//item selection
		var selectAction = btt_menu.addAction("Select");
		selectAction.checkable = true;
		selectAction.triggered.connect(this, function(){
			Print("Menu: item select!");
			//current item menu 
			var itemRigthClicked = main_data["libs"][this.ui.tabWidget.currentIndex]["data"]["library"][currentItemMenu];
			itemRigthClicked["button"].checked = selectAction.checked;
			itemRigthClicked["button"].clicked();
		});

		menu_data["actions"]["select"] = selectAction;

		//Favorite action
		var setFavorite = btt_menu.addAction("Favorite");
		setFavorite.checkable = true;
		setFavorite.triggered.connect(this, function(){
			//current item menu 
			var itemRigthClicked = main_data["libs"][this.ui.tabWidget.currentIndex]["data"]["library"][currentItemMenu];
			itemRigthClicked["button"].styleSheet = setFavorite.checked ? utils.styles.fav_button.on : utils.styles.fav_button.off;
			main_data["libs"][this.ui.tabWidget.currentIndex]["data"]["library"][currentItemMenu]["favorite"] = setFavorite.checked;//apdate main object
			Print("item: " + currentItemMenu + " favorite flag changed to: " + setFavorite.checked);
			var update_json = utils.updateFavoriteFlagJson(itemRigthClicked["id"], setFavorite.checked);
			Print("Update local data favorite json: " + update_json);
		});
		menu_data["actions"]["setFavorite"] = setFavorite;

		//add separator
		btt_menu.addSeparator();
		
		//create subMenu status
		var change_status_act_list = [];
		var status_name_list = user_data["status_list"];//List of Status Items!!!
		var sub_menu_change_status = new QMenu("Change Status", btt_menu);
		var that = this;//gambs to get this value inside callback for status actions
		
		//add functions using status list
		status_name_list.forEach(function(item, index){
			var sub_action = sub_menu_change_status.addAction(item);
			sub_action.checkable = true;
			sub_action.triggered.connect(this, function(){
				Print("change status to: " + item);
				main_data["libs"][that.ui.tabWidget.currentIndex]["data"]["library"][currentItemMenu]["status"] = item;
				var json_lib = main_data["libs"][that.ui.tabWidget.currentIndex]["lib_json"];
				if(!utils.changeStatus(currentItemMenu, item, json_lib)){
					MessageBox.warning("Erro atualizando status json file!!",0,0);
					Print("Fail to update status!");
				} else {
					Print("Status updated!");
				}
			});
			change_status_act_list.push(sub_action);
		});
		var sub_menu_action = btt_menu.insertMenu("subMenu", sub_menu_change_status);

		sub_menu_action.hovered.connect(this, function(){//update actions state before show
			Print("open status menu..");
			//current item menu 
			var itemRigthClicked = main_data["libs"][this.ui.tabWidget.currentIndex]["data"]["library"][currentItemMenu];
			var curr_status = itemRigthClicked["status"];
			change_status_act_list.forEach(function(item, index){
				var is_item = curr_status == status_name_list[index];
				item.enabled = !is_item;
				item.checked = is_item;
			});
		});
		menu_data["menu_status"] = sub_menu_change_status;

		//add edit action
		var editItem = btt_menu.addAction("Edit Item");
		editItem.checkable = false;
		editItem.triggered.connect(this, function(){
			Print("editing item...");
			var itemRigthClicked = main_data["libs"][this.ui.tabWidget.currentIndex]["data"]["library"][currentItemMenu];
			var lib_path = main_data["libs"][this.ui.tabWidget.currentIndex]["lib_path"];
			this.ui.enabled = false;
			if(utils.edit_item(this, lib_path, itemRigthClicked, user_data)){
				Print("item edit completed!");
				MessageBox.information("Edição completa! Para atualizar a interface com a nova edição, reinicie o script!");
			} else {
				Print("edit failed!");
			}
			this.ui.enabled = true;
		});
		menu_data["actions"]["edit"] = editItem;
		
		//add delete action
		var deleteItem = btt_menu.addAction("Delete Item");
		deleteItem.checkable = false;
		deleteItem.triggered.connect(this, function(){
			Print("Deleting item : " + currentItemMenu);
			if(!utils.delete_item(main_data["libs"][this.ui.tabWidget.currentIndex]["lib_path"], currentItemMenu)){
				MessageBox.warning("Erro deletando item: " + currentItemMenu, 0, 0);
				return;
			} else {
				main_data["libs"][this.ui.tabWidget.currentIndex]["data"]["library"][currentItemMenu]["deleted"] = true;
				this.updateTab();
			}
		});
		menu_data["actions"]["delete"] = deleteItem;
		
		Print("end MENU create");
		//update output data 
		menu_data["main_menu"] = btt_menu;
		return menu_data;
	}

	this.showMenu = function(){//function to setup and show the menu with current item options
		Print("Menu show.. updating menus options");
		var current_tab_index = this.ui.tabWidget.currentIndex;
		var itemRigthClicked = main_data["libs"][current_tab_index]["data"]["library"][currentItemMenu];
		buttons_menu["actions"]["select"].checked = itemRigthClicked["button"].checked;
		buttons_menu["actions"]["setFavorite"].checked = itemRigthClicked["favorite"];
		buttons_menu["menu_status"].enabled = can_edit;
		buttons_menu["actions"]["edit"].enabled = can_edit;
		buttons_menu["actions"]["delete"].enabled = can_edit;
		buttons_menu["main_menu"].popup(QCursor.pos());		
	}
	
	this.createItem = function(self, tab_widget, item_name, item_data){//create buttons for each lib item (add to the main buttons list)
		var parent_lay_grid = tab_widget.layout();
		var itemButton = new QPushButton();
		itemButton.setParent(tab_widget);
		itemButton.mouseTracking = true;
		var itemIndex = parseFloat(item_name) - 1;
		var g = getItemGeometry(itemIndex);
		parent_lay_grid.addWidget(itemButton, g.row, g.col, Qt.AlignTop);

		itemButton.setMinimumSize(168, 126);
		itemButton.setMaximumSize(200, 150);
		itemButton.margin = 3;
		itemButton.icon = item_data["icon_thumbs"][0];
		itemButton.iconSize = new QSize(160, 120);
		itemButton.toolTip = "Name: " + item_name + "\nType: " + item_data["type"] + "\nStatus: " + item_data["status"];
		itemButton.checkable = true;
		//itemButton.sizePolicy.setWidthForHeight(true);
		//itemButton.sizePolicy.setHeightForWidth(true);

		//check favorite flag to set stylesheet 
		itemButton.styleSheet = item_data["favorite"] ? utils.styles.fav_button.on : utils.styles.fav_button.off;

		//timmer for playback
		var button_timer = new QTimer();
		button_timer.interval = 1000/24;	
		
		//callback click item button
		var clickItem = function(){
			Print("Item Cliked: " + item_name);
			self.updateButtons(item_name, itemButton.checked, (item_data["type"] == "POSE"));
		}
		
		//callback enter mouse event
		var play_animation = function(){
			if(item_data["type"] == "ANIM"){
				Print("playing thumbs..");
				frame_counter = 0
				button_timer.start();
			}
		}
		//callback leave mouse event
		var stop_animation = function(){
			if(item_data["type"] == "ANIM"){
				Print("stoping Playback..");
				button_timer.stop();
			}
		}
		
		//callback for right click on the button
		var right_click = function(){
			Print("Teste Right Click!");
			currentItemMenu = item_name;
			self.showMenu();
		}
		
		var timmer_play = function(){
			var index = frame_counter % item_data["icon_thumbs"].length;
			itemButton.icon = item_data["icon_thumbs"][index];
			frame_counter++;
		}

		itemButton.enterEvent = play_animation;
		itemButton.leaveEvent = stop_animation;
		
		button_timer.timeout.connect(timmer_play);
		itemButton.clicked.connect(clickItem);
		
		//button menu contextPolicy (create signal for right mouse click
		itemButton.contextMenuPolicy = Qt.CustomContextMenu;
		itemButton.customContextMenuRequested.connect(right_click);
				
		return itemButton;
	}	
	
	this.createTab = function(self, tab_index, lib_data){//creates individual tab for library index
		var lib_name = lib_data["name"];
		//widget to add the buttons
		var items_widget = new QWidget();
		items_widget.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding);
		var widget_grid = new QGridLayout();
		items_widget.setLayout(widget_grid);
		
		//main tab widget
		var main_tab_widget = this.ui.tabWidget;
		
		//add new widget if index is not 0
		if(tab_index == 0){
			main_tab_widget.setTabText(tab_index, lib_name);	
		} else {
			var new_tab_widget = new QWidget();
			main_tab_widget.addTab(new_tab_widget, lib_name);
		}
		
		//set the scroll widget
		var tab_page_widget = main_tab_widget.widget(tab_index);
		var scrollArea = new QScrollArea();
		scrollArea.setParent(tab_page_widget);
		var scroll_grid = new QGridLayout();
		scrollArea.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding);
		scrollArea.setLayout(scroll_grid);
		scrollArea.widgetResizable = true;
		
		//set the tab layout
		var tab_layout = new QGridLayout(tab_page_widget);
		tab_page_widget.setLayout(tab_layout);
		
		//CREATES BUTTONS FOR EACH ITEN OF THE LIBRARY
		var library = lib_data["data"]["library"];
		//prepare progressBar maximum value with all items to create
		this.ui.progressBar.setMaximum(Object.keys(library).length);

		for(item in library){
			Print("Lib >> " + lib_name + " >> item >> " + item); 
			var item_btt = this.createItem(this, items_widget, item, library[item]);
			main_data["libs"][tab_index]["data"]["library"][item]["button"] = item_btt;
			main_data["libs"][tab_index]["data"]["library"][item]["deleted"] = false;
			this.updateProgressBar();
			items_counter++;
		}
		
		//reset progressBar
		this.ui.progressBar.value = 0;
		
		scrollArea.setWidget(items_widget);
		tab_layout.addWidget(scrollArea, 0, 0, Qt.AlignJustify | Qt.AlignTop);
		
		//add check box Right to Modify library
		var rigth_modify_checkB = new QCheckBox("Right to Modify");
		tab_layout.addWidget(rigth_modify_checkB, 1, 0, Qt.AlignBottom);
		
		//connect toogled to checkbox to change style (frescura)
		rigth_modify_checkB.toggled.connect(function(){
			
			var current_lib = main_data["libs"][self.ui.tabWidget.currentIndex];
			//deal with the lock
			if(rigth_modify_checkB.checked){
				if(!utils.getRigthsToModifyLib(current_lib["lib_path"], user_data)){
					Print("Can't lock lib: " + current_lib["lib_path"]);
					return;
				}
			} else {
				if(!utils.releaseRigthToModifyLib(current_lib["lib_path"], user_data)){
					Print("Fail to unlock the lib: " + current_lib["lib_path"]);
					return;
				}
			}
			
			if(first_run_rigth_modify){
				MessageBox.warning("Marque este checkbox para travar esta library! Até ser desmarcado, ninguém vai poder editar ou acessar esta library.", 0, 0);
			}
			
			main_tab_widget.styleSheet = rigth_modify_checkB.checked ? utils.styles.tab_edit.on : utils.styles.tab_edit.off;
			can_edit = user_data.permission == "can_edit" && rigth_modify_checkB.checked;
			
			first_run_rigth_modify = false;
		});
		
		//updates main object with buttons widget area
		main_data["libs"][tab_index]["buttons_widget"] = items_widget;
		main_data["libs"][tab_index]["checkBox_RM"] = rigth_modify_checkB;
	}

	this.addTagItem = function(){//callback of the toolButton to add new tag combo
		var tag_index = main_tag_list.length;
		var tagWidget = this.ui.groupFilter.scrollTags.widget();
		var tagGridLayout = tagWidget.layout();
		var tag_combo = new QComboBox(tagWidget);
		tag_combo.insertPolicy = QComboBox.NoInsert;
		tag_combo.editable = true;

		//var completer = new QCompleter();
		//completer.caseSensitivity = Qt.CaseInsensitive;
		//tag_combo.setCompleter(completer);

		//add itens in new combo tag
		var tag_object = main_data["libs"][this.ui.tabWidget.currentIndex]["data"]["tag_lists"];
		for(tag in tag_object){
			if(tag_combo.count == 0){
				tag_combo.addItem("");
			}
			tag_combo.addItems(tag_object[tag]);
			tag_combo.insertSeparator(tag_combo.count);
		}

		tagGridLayout.addWidget(tag_combo, tag_index, 0, Qt.AlignTop);
		main_tag_list.push(tag_combo);

		//update label tag
		this.ui.groupFilter.labelTags.text = main_tag_list.length + " Tag(s)";
			
		//connect combo signal
		eval(ui_util.get_connect_string("tag_combo", "combo", "this.updateItemsWithFilter"));

		Print("Tag added! New list length: " + main_tag_list.length);
	}
	
	this.removeTagItem = function(){//remove last tag item created
		var lastTAgWidget = main_tag_list.pop();
		lastTAgWidget.setParent(null);
		
		//update label tag
		this.ui.groupFilter.labelTags.text = main_tag_list.length + " Tag(s)";
		this.updateItemsWithFilter();
		Print("removed tag item!");	
	}

	this.updateProgressBar = function(){//update progressBar value (needs to set max number before!
		var curr_val = this.ui.progressBar.value;
		this.ui.progressBar.value = curr_val + 1;
	}
	
	this.updateItemsWithFilter = function(){//updates items in current tab with filters 
		var current_tab_index = this.ui.tabWidget.currentIndex;
		var current_items = main_data["libs"][current_tab_index]["data"]["library"];
		var filtered_items = [];
		var tags_used = [];
		var parent_widget = main_data["libs"][current_tab_index]["buttons_widget"];
		var parent_lay_grid = parent_widget.layout();
		
		//clear buttons widget from tab and add items to filtered_list
		this.clearSelected();
		for(item in current_items){
			current_items[item]["button"].checked = false;
			current_items[item]["button"].setParent(null);
			filtered_items.push(current_items[item]);
		}
		Print("teste current items: " + filtered_items.length);
		//gets all valid tags in combo tags widgets
		for(tag in main_tag_list){
			if(main_tag_list[tag].currentIndex == 0){
				continue;
			}
			tags_used.push(main_tag_list[tag].currentText);
		}		

		//combo filters value
		var curr_type = this.ui.groupFilter.comboType.currentText;
		var curr_status = this.ui.groupFilter.comboStatus.currentText;//current combo filter option selected

		//filter function to filter by type
		var filter_type = function(item){
			return item["type"] == curr_type || curr_type == "All";
		}

		//filter function to filter by status
		var filter_status = function(item){
			return item["status"] == curr_status || curr_status == "All";
		}
		
		//filter function to filter by tags
		var filter_tags = function(item){
			var match_counter = 0;
			var item_tags = item["tags"];
			for(tag_type in item_tags){
				item_tags[tag_type].forEach(function(x){
					if(tags_used.indexOf(x) != -1){
						match_counter++;
					}
				});
			}
			Print(match_counter);
			return match_counter == tags_used.length;
		}

		//run filter functions in order
		filtered_items = filtered_items.filter(filter_type);
		filtered_items = filtered_items.filter(filter_status);
		
		if(tags_used.length > 0){
			filtered_items = filtered_items.filter(filter_tags);
		}
		
		//add filtered items buttons
		filtered_items.forEach(function(x){
			x["button"].setParent(parent_widget);
			var g = getItemGeometry(filtered_items.indexOf(x));
			parent_lay_grid.addWidget(x["button"], g.row, g.col, Qt.AlignTop);
		});
		
		//update progressBar text with filter information
		this.ui.progressBar.format = "Filtered " + filtered_items.length + " item(s)!";
		Print("filter update ended!");
	}
	
	this.updateSpinStart = function(){//updates spinStart value into selected icon button
		//updates spin end
		this.ui.groupAdvanced.spinEnd.minimum = this.ui.groupAdvanced.spinStart.value + 1;

	
		var start_icon = selected_items[0]["icon_thumbs"][this.ui.groupAdvanced.spinStart.value];
		var selected_button = selected_items[0]["button"];
		//sets the icon
		selected_button.icon = start_icon;		
	}
	
	this.updateSpinEnd = function(){//updates spinEnd value into selected icon button
		//update maximum of start spin
		this.ui.groupAdvanced.spinStart.maximum = this.ui.groupAdvanced.spinEnd.value - 1;
		
		var end_icon = selected_items[0]["icon_thumbs"][this.ui.groupAdvanced.spinEnd.value];
		var selected_button = selected_items[0]["button"];
		//sets the icon
		selected_button.icon = end_icon;	
	}
	
	this.clearSelected = function(){//clear the selected items
		if(first_run_change_tab && selected_items){
			MessageBox.warning("Itens e tags selecionados se perderão se trocar de aba!", 0, 0);
			first_run_change_tab = false;
		}
		selected_items = null;
		Print("selection reset to null");
	}
	
	this.close = function(){
		//if still have lock file, delete it!
		var current_lib = main_data["libs"][this.ui.tabWidget.currentIndex];
		if(utils.releaseRigthToModifyLib(current_lib["lib_path"], user_data)){
			Print("the lock file was still in the library and was deleted!");
		} else {
			Print("No lock file in the current library!");
		}

		Print("close ui...");
		this.ui.close();
	}

	this.applyButton = function(){
		Print("apply Button.. ");

		var root_path = main_data["libs"][this.ui.tabWidget.currentIndex].lib_path;

		var startframe = this.ui.groupAdvanced.spinStart.value;
		var endframe = this.ui.groupAdvanced.spinEnd.value;
		var duration = {
			"start": startframe,
			"numFrames": endframe - (startframe - 1)
		};
		var rig_group = main_data["libs"][this.ui.tabWidget.currentIndex].root_node[this.ui.comboNode.currentIndex];

		if(!selected_items){
			MessageBox.information("Nenhum item selecionado!");
			Print("No item selected!");
			return;
		}
		var paste_drawings = this.ui.groupAdvanced.radioKeyDraw.checked || this.ui.groupAdvanced.radioDraw.checked;
		var paste_keys = this.ui.groupAdvanced.radioKeyDraw.checked || this.ui.groupAdvanced.radioKey.checked;

		var options = {
			"insertFrame": frame.current(),
			"duration": duration,	
			"paste_drawings": paste_drawings ? "ADD_OR_REMOVE_EXPOSURE" : "DO_NOTHING",
			"use_drawings": paste_drawings,
			"paste_keys": paste_keys
		};
		Print(options);	
		var applyTpl = utils.apply_selected_template(this, user_data, root_path, selected_items, rig_group, options);
		
		if(!applyTpl){
			MessageBox.warning("Falha ao aplicar o tpl!",0,0);
		} else {
			MessageBox.information("Lib aplicada! :D");
		}
		this.ui.close();
	}
	
	//Update version
	this.ui.header.versionLabel.text = lib_version;
	
	//add initial combos filter
	var status_list = ["All"];
	this.ui.groupFilter.comboType.addItems(["All", "POSE", "ANIM"]);
	this.ui.groupFilter.comboStatus.addItems(status_list.concat(user_data["status_list"]));
	
	//CREATE TABS
	var librarys = main_data["libs"];
	for(var i=0; i<librarys.length; i++){
		this.createTab(this, i, librarys[i]);
	}
	//create text in progressBar with library information:
	this.ui.progressBar.format = this.ui.tabWidget.count + " librarys with " + items_counter + " item(s) found!";
	
	//sets the 0 index tab 
	this.updateTab();

	this.ui.activateWindow();

	//create menu for items
	var buttons_menu = this.createMenu();
	
	//permission
	var can_edit = user_data.permission == "can_edit" && main_data["libs"][this.ui.tabWidget.currentIndex]["checkBox_RM"].checked;
	
	
	//Connections
	this.ui.groupFilter.addTagButton.clicked.connect(this, this.addTagItem);
	this.ui.groupFilter.removeTagButton.clicked.connect(this, this.removeTagItem);
	this.ui.cancelButton.clicked.connect(this, this.close);
	this.ui.applyButton.clicked.connect(this, this.applyButton);
	
	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.groupFilter.comboType", "combo", "this.updateItemsWithFilter"));

	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.groupFilter.comboStatus", "combo", "this.updateItemsWithFilter"));

	//connect tab signal
	eval(ui_util.get_connect_string("this.ui.tabWidget", "tab", "this.updateTab"));

	//connect spin signal
	eval(ui_util.get_connect_string("this.ui.groupAdvanced.spinStart", "spin", "this.updateSpinStart"));

	//connect spin signal
	eval(ui_util.get_connect_string("this.ui.groupAdvanced.spinEnd", "spin", "this.updateSpinEnd"));

//////////////#################################
	function Print(msg){		
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
	
	function getItemGeometry(index){//retorna a posicao do item na ui
		var columns = 3;//numero de colunas por linha
		//object with values
		var geometry = {"x": 20, "y": 20, "w": 160, "h": 120};
		var distance = 10;
		var col_number = index % columns;
		var row_number = parseInt(index/columns);
		geometry["x"] = geometry.x + (col_number*(geometry.w + distance));
		geometry["y"] = geometry.y + (row_number*(geometry.h + distance));
		geometry["col"] = col_number;
		geometry["row"] = row_number;
		return geometry;
	}		

}


