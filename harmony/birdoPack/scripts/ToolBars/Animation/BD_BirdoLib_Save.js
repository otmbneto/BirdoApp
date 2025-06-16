include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
-------------------------------------------------------------------------------
Name:		BD_BirdoLib_Save.js

Description: este script salva os bancos na birdolibrary

Usage:		usa o utils da birdolibrary assim como o utils geral

Author:		Leonardo Bazilio Bentolila

Created:	feb, 2022 (adaptado junho 2022)
            
Copyright:   @leobazao
 
-------------------------------------------------------------------------------
*/
//TODO: 
//    mudar messagebox para portugues
//    fazer a funcao para editar as main tags (fazer um lock somente para este arquivo?) - DONE
//    conferir se a funcao de add tab nova de tag e tags, esta verificando se o item criado ja existe - DONE


var script_version = "v.1.8";//update script version here


function BD_BirdoLib_Save(){
	//inicia o birdoApp
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var selected = selection.selectedNodes();
	if(selected.length != 1){
		MessageBox.warning("Wrong selection! Select the Rig Group in the timeline with the disired Pose, or Anim frames to send it to the Library!",0 ,0);
		return;
	}
	
	var sel_node = selected[0];
	var utils = require(projectDATA["paths"]["birdoPackage"] + "utils/BirdoLibraryUtils.js");
	var library_root = projectDATA.getLibPath();
	
	//gets user data 
	var user_data = utils.getUserData(projectDATA, library_root);
	if(!user_data){
		MessageBox.warning("Error to create userdata object!",0,0);
		Print("fail to get user data... canceling");
		return;
	}
	
	var rig_data = get_selection_data(sel_node, library_root, projectDATA);
	if(!rig_data){
		Print("Invalid selection! Canceling...");
		return;
	}
	
	if(!utils.validateTimelineSelection(sel_node)){
		Print("Invalid selection... canceling!");
		return;
	}
	
	var tags_data = utils.get_main_tag_list(library_root);
	if(!tags_data){
		Print("Fail to get tags information!");
		return;
	}
	
	//save scene before continuing
	if(!BD2_AskQuestion("A cena precisa ser salva antes de continuar. Deseja salvar?")){
		Print("canceled..");
		return;
	}
	scene.saveAll();
	
	//ui file
	var uipath = projectDATA.paths.birdoPackage + "ui/BD_BirdoLibSave.ui";
	
	var d = new createInrterface(projectDATA, uipath, rig_data, tags_data, user_data, utils, library_root);
	d.ui.show();
	
	//EXTRA FUNCTIONS
	function get_selection_data(sel_node, root_path, proj_data){//check if selections is valid and return rig data
		
		var regex_rig = proj_data.get_rig_regex();
		var regex_version = proj_data.pattern.version;
		var lib_type = selection.isSelectionRange() ? "ANIM" : "POSE";
		
		//check node type
		if(!node.isGroup(sel_node)){
			MessageBox.warning("Invalid node selection! Rig node must be Groups!",0,0);
			return false;
		}
		
		//check node name
		if(!regex_rig.test(node.getName(sel_node))){
			MessageBox.warning("This node selected is not a Group Rig node! Select the first group outside Rig struture with the 'name-v00' format name!",0,0);
			return false;
		}
		
		//fix harmony bad treatment to numFramesSelected function forcing the current frame selection
		if(lib_type == "POSE"){
			selection.setSelectionFrameRange(frame.current(), 1);
		}
		
		var rig_data = {};
		rig_data["lib_name"] = get_rig_name(sel_node);
		rig_data["version"] = regex_version.exec(node.getName(sel_node))[0];
		rig_data["rig_node"] = sel_node;
		rig_data["lib_type"] = lib_type;
		rig_data["lib_path"] = root_path + [rig_data["lib_name"], rig_data["version"]].join("/") + "/";
		rig_data["lib_exists"] = BD1_FileExists(rig_data["lib_path"]);
		rig_data["lib_json"] = rig_data["lib_path"] + "_library.json";
		rig_data["rig_version_json"] = rig_data["lib_path"] + "_rig_version.json";
		rig_data["rig_match"] = null;
		rig_data["is_full_rig"] = check_is_full_rig(sel_node);
		
		//indica se o nodegroup tem mais de uma saida e necessita criacao especial dos thumbs pelo script
		rig_data["needs_special_thumbs"] = hasMultipleOutputs(sel_node);
		
		//rig node list (relative path);
		var selected_rig_node_list = BD2_ListNodesInGroup(sel_node, "", false).filter(function(item){
				var arr = item.split("/");
				return arr[arr.length-1][0] != "=";
			});
		rig_data["node_list"] = selected_rig_node_list;
	
		//if library for this rig exists, gets rig version info
		if(rig_data["lib_exists"]){
			var version_lib_data = BD1_ReadJSONFile(rig_data["rig_version_json"]);
			
			if(!version_lib_data){
				MessageBox.warning("Fail to read the rig version json file!", 0, 0);
				Print("Error reding json file: " + rig_data["rig_version_json"]);
				return false;
			}
			
			//gets the match version information 
			rig_data["rig_match"] =	utils.check_rig_version_match(selected_rig_node_list, version_lib_data["node_list"]);
		}	

		return rig_data;
		//checks if its a complete RIG or partial one!
		function check_is_full_rig(rig_group){
			var nextNode = node.parentNode(rig_group);	
			while(nextNode != ""){
				if(regex_rig.test(node.getName(nextNode)) && node.isGroup(nextNode)){
					Print("It's NOT a full rig!");	
					return false;
				}	
				nextNode = node.parentNode(nextNode);	
			}
			Print("It's a full rig!");	
			return true;
		}
		function get_rig_name(rig_group){//return Rig Lib Name from rig group (project prefix.Name);
			return node.getName(rig_group).split(".")[1].split("-")[0];
		}
		function hasMultipleOutputs(groupNode){//checa se o grupo tem mais de uma saida de imagem 
			var outPorts = node.numberOfOutputPorts(groupNode);
			var outputModule = node.getGroupOutputModule(groupNode, "", 0,0,0);
			var outPutCounts = 0;
			for(var i=0; i<outPorts; i++){
				if(!BD2_isTransformationNode(node.srcNode(outputModule, i))){
					outPutCounts++;
				}
			}
			return outPutCounts > 1;
		}
	}
}

//interface function
function createInrterface(projectDATA, uifile, rig_data, tags_data, user_data, utils, library_root){

	this.ui = UiLoader.load(uifile);
	var is_first_run = true;//hold the first filter run to show message about clear selected items
	var tag_list_edit = false;
		
	//tags checkbox widgets list with all tag items
	var main_tags = {};
	
	
	//##########CALLBACK FUNCTIONS##########
	this.onAddTag = function(){
		var current_tab_text = this.ui.tabWidget.tabText(this.ui.tabWidget.currentIndex);
		var curr_type = main_tags[current_tab_text];
		var new_tag_imput = Input.getText("Choose New Tag Name", null, "Add New tag", this);
		if(!new_tag_imput){
			Print("imput new tag canceled!");
			return;
		}
		
		if(!validate_new_name(new_tag_imput)){
			return;	
		}
		
		if(new_tag_imput in main_tags[current_tab_text]["cb"]){
			MessageBox.warning("Tag already in list!",0,0);
			return;
		}
		
		var pos = getItemRowCol(Object.keys(curr_type["cb"]).length);
		var new_checkbox = new QCheckBox(new_tag_imput);
		new_checkbox.setParent(curr_type["parent_widget"]);
		curr_type["parent_grid"].addWidget(new_checkbox, pos.row, pos.col, Qt.AlignLeft);
		
		//update the main object
		main_tags[current_tab_text]["cb"][new_tag_imput] = new_checkbox;
		tag_list_edit = true;
		this.ui.checkBSaveTags.enabled = (user_data["permission"] == "can_edit") && tag_list_edit;
		Print("new tag added to tag type " + current_tab_text + ": " + new_tag_imput);
	}
	
	this.onAddTypeTag = function(){
		var tab_index = this.ui.tabWidget.count;
		var new_type_imput = Input.getText("Choose New Tag Type", null, "Add New Type Tag", this);
		
		if(!new_type_imput){
			Print("imput new type canceled!");
			return;
		}
		
		//normalize chosen name 
		var normalized = new_type_imput.toLowerCase();
		if(!validate_new_name(normalized)){
			return;	
		}
		
		if(normalized in main_tags){
			MessageBox.warning("Tag Type already in use!",0,0);
			return;
		}
		
		//choose first tag for new tag type
		var new_tag_imput = Input.getText("Choose Frist Tag for Type", null, "Add New tag", this);
		if(!new_tag_imput){
			Print("imput new type tag canceled!");
			return;
		}
		
		if(!validate_new_name(new_tag_imput)){
			return;	
		}
		
		this.createTab(normalized, tab_index, [new_tag_imput]);
		
		tag_list_edit = true;
		this.ui.checkBSaveTags.enabled = (user_data["permission"] == "can_edit") && tag_list_edit;

		Print("new tag type :" + normalized + " added and tag : " + new_tag_imput);
	}
	
	this.onSave = function(){
		Print("Saving template...");
		if(this.ui.checkBSaveTags.checked && tag_list_edit){
			Print("Updating the tag json...");	
			//get tags list data
			var tags_data = {};
			for(tag_type in main_tags){
				tags_data[tag_type] = [];
				for(tag in main_tags[tag_type]["cb"]){
					tags_data[tag_type].push(tag);
				}
			}
			utils.update_json_tag(library_root, tags_data);
		}
		
		if(!selection_is_still_valid()){
			MessageBox.warning("Error! You deselected the Rig node! Canceling...", 0, 0);
			this.ui.close();
			return;
		}
		var item_status = this.ui.comboStatus.currentText;
		var selected_tags = this.getSelectedTags();
		var description_text = this.ui.groupDecription.textEdit.plainText; 
		var save_tpl = utils.saveTpl(this, projectDATA, item_status, user_data, rig_data, selected_tags, description_text);
		
		if(!save_tpl){
			Print("error saving template!");
		} else {
			MessageBox.information("Item template successfully saved!");
		}	
		
		this.ui.close();
	}
	
	this.onClose = function(){
		Print("close ui...");
		this.ui.close();
	}
	
	//##########EXTRA CALLBACK FUNCTIONS##########
	this.updateProgressBar = function(){//update progressBar value (needs to set max number before!
		var curr_val = this.ui.progressBar.value;
		this.ui.progressBar.value = curr_val + 1;
	}
	
	this.createTab = function(tab_name, tab_index, tags_list){//creates individual tab for tags type
		var items_widget = new QWidget();
		items_widget.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding);
		var widget_grid = new QGridLayout(items_widget);
		items_widget.setLayout(widget_grid);
		var main_tab_widget = this.ui.tabWidget;
		
		//add new widget if index is not 0
		if(tab_index == 0){
			main_tab_widget.setTabText(tab_index, tab_name);	
		} else {
			var new_tab_widget = new QWidget();
			main_tab_widget.addTab(new_tab_widget, tab_name);
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
		var tab_layout = new QBoxLayout(Qt.TopToBottom, tab_page_widget);
		tab_page_widget.setLayout(tab_layout);
		
		//prepare progressBar maximum value with all items to create
		this.ui.progressBar.setMaximum(tags_list.length);
		
		//update main tags object
		main_tags[tab_name] = {"parent_widget": items_widget, "parent_grid": widget_grid,"cb": {}};
		
		for(var i=0; i<tags_list.length; i++){
			Print("Tag Type>> " + tab_name + " >> tag >> " + tags_list[i]);
			var item_cb = new QCheckBox(tags_list[i]);
			item_cb.setParent(items_widget);
			var pos = getItemRowCol(i);
			widget_grid.addWidget(item_cb, pos.row, pos.col, Qt.AlignTop);
			main_tags[tab_name]["cb"][tags_list[i]] = item_cb;
			this.updateProgressBar();
		}

		scrollArea.setWidget(items_widget);
		tab_layout.addWidget(scrollArea, 0, Qt.AlignJustify | Qt.AlignTop);
		
		//reset progressBar
		this.ui.progressBar.value = 0;	
	}
	
	this.getSelectedTags = function(){//return object with selected tags
		var selected_tags = {};	
		for(tag_type in main_tags){
			selected_tags[tag_type] = [];
			for(tag in main_tags[tag_type]["cb"]){
				if(main_tags[tag_type]["cb"][tag].checked){
					selected_tags[tag_type].push(tag);	
				}
			}
		}
		return selected_tags;	
	}	
	
	//##########SET WIDGET###########//
	//set script version
	this.ui.labelScriptVersion.text = script_version;
	
	//update enable permissions for create tags type
	this.ui.pushAddTagType.enabled = user_data["permission"] == "can_edit";
	this.ui.pushAddTag.enabled = user_data["permission"] == "can_edit";

	
	//update status combobox
	this.ui.comboStatus.addItems(user_data["status_list"]);
	this.ui.comboStatus.enabled = user_data["permission"] == "can_edit";
	
	//update rig selection information
	this.ui.groupInfo.labelType.text = rig_data["lib_type"];
	this.ui.groupInfo.labelRigName.text = rig_data["lib_name"];
	this.ui.groupInfo.labelVersion.text = rig_data["version"];
	
	//label to show if rig selection is match
	if(!rig_data["rig_match"]){
		this.ui.groupInfo.labelMatch.text = "--*--";
	} else {
		if(rig_data["rig_match"]["exact_match"]){
			this.ui.groupInfo.labelMatch.text = "Version match exactly with library";
		} else {
			this.ui.groupInfo.labelMatch.text = rig_data["rig_match"]["name_match"] ? "Nodes Names match with library!" : "Rig DON'T match with library!";
		}
	}
	
	//initial information on the progressBar label
	this.ui.progressBar.format = rig_data["lib_exists"] ? "Rig Library exists!" : "Will Create first Lib for this Rig!"; 
	
	//create checkBox items
	var index = 0;
	for(item in tags_data){
		this.createTab(item, index, tags_data[item]);
		Print("-- Tab tags created for type: " + item);
		index++;
	}
	
	//force show windows with focus
	this.ui.activateWindow();
	
	//##########CONNECTIONS###########//
	this.ui.pushAddTagType.clicked.connect(this, this.onAddTypeTag);
	this.ui.pushAddTag.clicked.connect(this, this.onAddTag);
	this.ui.buttonCancel.clicked.connect(this, this.onClose);
	this.ui.buttonSave.clicked.connect(this, this.onSave);
	
	//##########HELPER FUNCTIONS INTERFACE###########//
	function Print(msg){		
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
	
	function getItemRowCol(index){//retorna a posicao do item na ui
		var columns = 2;//columns per line
		//object with values
		var pos = {};
		var col_number = index % columns;
		var row_number = parseInt(index/columns);
		pos["col"] = col_number;
		pos["row"] = row_number;
		return pos;
	}
	
	function validate_new_name(name){//checks if choosen name is valid
		var regex = /\s|\n|\r|\W/;//regex with invalid characters
		var is_nam_valid = regex.test(name) ? true : false;
		if(is_nam_valid){
			MessageBox.warning("Invalid Tag Type name! Don't use space or invalid characters!",0,0);
			return false;
		} else {
			Print("Name is valid: " + name);
			return true;
		}
	}
	
	function selection_is_still_valid(){//checks if the user acidentely unselected the rig group
		return rig_data["rig_node"] == selection.selectedNode(0);
	}
}
