/*
-------------------------------------------------------------------------------
Name:		BD_CompareGroups.js

Description:	Este script compara dois grupos na nodeview e mostra um relatorio

Usage:		para ser usado quando precisar comparar dois grupos se sao iguais ou contem alteracoes

Author:		leobazao

Created:	junho 2022
            
Copyright:   @birdo leobazao 2022
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_CompareGroups(){
	
	//inicia o birdoApp
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
		
	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_CompareGroups.ui";
	var ui_util = require(projectDATA.paths.birdoPackage + "utils/ui_utils.js");
	var nv_utils = require(projectDATA["paths"]["birdoPackage"] + "utils/nodeview_utils.js");

	var d = new createInrterface(ui_path, nv_utils, ui_util);
	d.ui.show();
	
}


function createInrterface(uifile, nv_utils, ui_util){

	this.ui = UiLoader.load(uifile); 
	
	//class variables
	this.compareObject = null;
	this.typeList = [""];
	
	//BRUSHES FOR ITENS COLORS
	var redBrush = new QBrush(new QColor(255,150,10,255));
	var greenBrush = new QBrush(new QColor(100,245,120,255));

	//update comobo filter
	this.ui.groupBox.comboFilter.addItems(["All", "Matches", "Difference"]);

	//CALLBACK FUNCTIONS 
	this.selectGroupA = function(){
		Print("Selecting node A...");
		var group = selection.selectedNode(0);
		if(!group || !node.isGroup(group)){
			MessageBox.warning("Select one group node!",0,0);
			return;
		}
		if(this.ui.labelB.text == group){
			MessageBox.warning("Select a different group!!",0,0);
			return;
		}
		this.ui.listWidgetA.clear();
		this.enableWidgetsA(false);
		
		if(!this.ui.labelB.text){
			this.ui.progressBar.format = "select group B!";
		} else {
			this.ui.progressBar.format = "groups selected!!!!";
		}
		this.ui.labelA.text = group;
		Print("Group node A selected: " + group);
	}	
	
	this.selectGroupB = function(){
		Print("Selecting node B...");
		var group = selection.selectedNode(0);

		if(!group || !node.isGroup(group)){
			MessageBox.warning("Select one group node!",0,0);
			return;
		}
		if(this.ui.labelA.text == group){
			MessageBox.warning("Select a different group!!",0,0);
			return;
		}
		this.ui.listWidgetB.clear();
		this.enableWidgetsB(false);

		if(!this.ui.labelA.text){
			this.ui.progressBar.format = "select group A!";
		} else {
			this.ui.progressBar.format = "groups selected!!!!";
		}
		this.ui.labelB.text = group;
		Print("Group node B selected: " + group);
	}
	
	this.enableWidgetsA = function(enable){//habilita/desabilita os widgets do node A
		this.ui.listWidgetA.enabled = enable;
		this.ui.buttonFindA.enabled = enable;
		this.ui.labelInfoA.enabled = enable;
		this.ui.pushCopyCoordA.enabled = enable;
		this.ui.pushCopyCoordB.enabled = enable;
	}
	
	this.enableWidgetsB = function(enable){//habilita/desabilita os widgets do node B
		this.ui.listWidgetB.enabled = enable;
		this.ui.buttonFindB.enabled = enable;
		this.ui.labelInfoB.enabled = enable;	
	}
	
	this.onFindNodeA = function(){
		var selectedItem = this.ui.listWidgetA.currentItem().text();
		var node_path = this.ui.labelA.text + "/" + selectedItem;
		Print("Find node: " + node_path);
		selection.clearSelection();
		selection.addNodeToSelection(node_path);
		Action.perform("onActionCenterOnSelection()", "Node View");
	}
	
	this.onFindNodeB = function(){
		var selectedItem = this.ui.listWidgetB.currentItem().text();
		var node_path = this.ui.labelB.text + "/" + selectedItem;
		Print("Find node: " + node_path);
		selection.clearSelection();
		selection.addNodeToSelection(node_path);
		Action.perform("onActionCenterOnSelection()", "Node View");
	}
	
	this.onCheckFilters = function(){//callback do checkbox de filter (habilita os filters)
		Print("Use filters: " + this.ui.groupBox.checkFilters.checked);
		this.ui.groupBox.comboType.enabled = this.ui.groupBox.checkFilters.checked;
		this.ui.groupBox.comboFilter.enabled = this.ui.groupBox.checkFilters.checked;
		this.updateFilters();
	}
	
	this.onCompare = function(){
		//checks selections
		var groupA = this.ui.labelA.text;
		var groupB = this.ui.labelB.text;
		if(!groupA || !groupB){
			MessageBox.warning("Choose group A and B to compare!",0,0);
			return;
		}
		
		//limpa os list widget antes de comparar
		this.ui.listWidgetA.clear();
		this.ui.listWidgetB.clear();
		
		if(!this.compareObject){//se nao existir ainda o objeto de compare
			this.compareObject = createCompareObject(this, groupA, groupB);
			this.ui.compareButton.text = "CLEAR";
			
			//enable widgets
			this.enableWidgetsA(true);
			this.enableWidgetsB(true);
			this.ui.groupBox.enabled = true;
			this.ui.selectButA.enabled = false;//para nao poder mudar o node selecionado
			this.ui.selectButB.enabled = false;//para nao poder mudar o node selecionado

			Print(this.compareObject);
			
			//updates lists 
			updateGorupSide(this, this.compareObject.groupA, this.ui.listWidgetA, this.ui.labelInfoA);
			updateGorupSide(this, this.compareObject.groupB, this.ui.listWidgetB, this.ui.labelInfoB);
				
			//resets progressBar
			this.ui.progressBar.value = 0;
			
			//update combo types
			this.ui.groupBox.comboType.clear();
			this.ui.groupBox.comboType.addItems(this.typeList);
			
			//update the progressBar label
			if(JSON.stringify(this.compareObject.groupA.nodeList) == JSON.stringify(this.compareObject.groupB.nodeList)){
				Print("Its a full match!");
				this.ui.progressBar.format = "it's a full match! Groups are identicals!";
				this.ui.progressBar.styleSheet = "QProgressBar {\ncolor: rgb(50,255,50);\n}";
				this.ui.pushCopyCoordA.enabled = true;
				this.ui.pushCopyCoordB.enabled = true;
			} else {
				this.ui.progressBar.format = "Groups are different! Check Info for details...";
				this.ui.progressBar.styleSheet = "QProgressBar {\ncolor: rgb(240, 50, 50);\n}";
				this.ui.pushCopyCoordA.enabled = false;
				this.ui.pushCopyCoordB.enabled = false;
			}
			
		} else {//se ja existe ele funciona como clear button
			this.enableWidgetsA(false);
			this.ui.labelA.text = "";
			this.ui.selectButA.enabled = true;
			this.enableWidgetsB(false);
			this.ui.labelB.text = "";
			this.ui.selectButB.enabled = true;
			this.ui.groupBox.enabled = false;
			this.ui.compareButton.text = "COMPARE";
			this.compareObject = null;
			this.typeList = [""];
			this.ui.progressBar.format = "select 2 group nodes to compare...";
			this.ui.progressBar.styleSheet = null;
			this.ui.labelInfoA.text = "Info:";
			this.ui.labelInfoB.text = "Info:";
		}
		
	}
	
	this.updateFilters = function(){
		//filter listA
		var itemListA = this.compareObject.groupA.itemsList;
		var itemListB = this.compareObject.groupB.itemsList;
		
		filterListWidget(this, itemListA, this.ui.listWidgetA);
		filterListWidget(this, itemListB, this.ui.listWidgetB);	
	}
	
	this.onClose = function(){
		Print("close ui...");
		this.ui.close();
	}
	
	this.updateProgressBar = function(){//update progressBar value (needs to set max number before!
		var curr_val = this.ui.progressBar.value;
		this.ui.progressBar.value = curr_val + 1;
		this.ui.progressBar.format = "[" + this.ui.progressBar.value + " of " + this.ui.progressBar.maximum + "]";
	}
	
	this.onCopyCoordA = function(){
		scene.beginUndoRedoAccum("Copy Coordinates from group B");
		try{
			nv_utils.copyGroupsNodeviewCoords(this.ui.labelB.text, this.ui.labelA.text);
		}catch(e){
			Print(e);
		}
		scene.endUndoRedoAccum();
	}
	
	this.onCopyCoordB = function(){
		scene.beginUndoRedoAccum("Copy Coordinates from group A");
		try{
			nv_utils.copyGroupsNodeviewCoords(this.ui.labelA.text, this.ui.labelB.text);
		}catch(e){
			Print(e);
		}
		scene.endUndoRedoAccum();		
	}
	
	this.ui.activateWindow();
	this.ui.raise();
	
	//Connections
	this.ui.selectButA.clicked.connect(this, this.selectGroupA);
	this.ui.selectButB.clicked.connect(this, this.selectGroupB);
	this.ui.compareButton.clicked.connect(this, this.onCompare);
	this.ui.closeButton.clicked.connect(this, this.onClose);
	this.ui.groupBox.checkFilters.toggled.connect(this, this.onCheckFilters);
	this.ui.buttonFindA.clicked.connect(this, this.onFindNodeA);
	this.ui.buttonFindB.clicked.connect(this, this.onFindNodeB);
	this.ui.pushCopyCoordA.clicked.connect(this, this.onCopyCoordA);
	this.ui.pushCopyCoordB.clicked.connect(this, this.onCopyCoordB);
	
	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.groupBox.comboType", "combo", "this.updateFilters"));
	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.groupBox.comboFilter", "combo", "this.updateFilters"));
	
//////////////################################# EXTRA FUNCTIONS
	function Print(msg){		
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
	
	function filterListWidget(self, itemList, listWidget){//filtra a lista baseado na lsita de objetos do lado
		for(var i=0; i<itemList.length; i++){
			var filterType = self.ui.groupBox.comboType.currentIndex == 0 || itemList[i]["type"] == self.ui.groupBox.comboType.currentText;
			var filterMatch = self.ui.groupBox.comboFilter.currentIndex == 0 || (self.ui.groupBox.comboFilter.currentIndex == 1 && itemList[i]["match"]) || (self.ui.groupBox.comboFilter.currentIndex == 2 && !itemList[i]["match"]);
			var show_item = filterType && filterMatch;
			if(!self.ui.groupBox.checkFilters.checked){
				show_item = true;
			}
			listWidget.item(i).setHidden(!show_item);
		}	
	}

	function updateGorupSide(self, groupObj, listWidget, infoWidget){//atualiza a listWidget do grupo 
		var matches_counter = 0;
		var extra_counter = 0;
		var totalNodes = groupObj["itemsList"].length;
		var i = 0;
		//update list widget
		groupObj["itemsList"].forEach(function(x){
			self.updateProgressBar();
			var foreground = x.match ? greenBrush : redBrush;
			var new_item = new QListWidgetItem();
			new_item.setText(x.relative_path);
			new_item.setForeground(foreground);
			listWidget.insertItem(i, new_item);
			if(self.typeList.indexOf(x.type) == -1){
				self.typeList.push(x.type);
			}
			if(x.match){
				matches_counter++;
			} else {
				extra_counter++;
			}
			i++;
		});
		
		//updates info label
		var msg = "Info:\nTotal Nodes: " + totalNodes + ";\nMatches: " + matches_counter + ";\nDifference: " + extra_counter + ";";
		infoWidget.text = msg;
	}
	
	function createCompareObject(self, groupNodeA, groupNodeB){//cretates the node list into list widget
		var obj = {groupA : {}, groupB: {}};
		obj.groupA["node"] = groupNodeA;
		obj.groupA["nodeList"] = listNodes(groupNodeA, "", false).sort();

		obj.groupB["node"] = groupNodeB;
		obj.groupB["nodeList"] = listNodes(groupNodeB, "", false).sort();
		
		//updates progressBar value
		self.ui.progressBar.setMaximum(obj.groupA["nodeList"].length * 4);
		
		obj.groupA["itemsList"] = creteItemList(obj.groupA, obj.groupB);
		obj.groupB["itemsList"] = creteItemList(obj.groupB, obj.groupA);
		
		return obj;
		
		function creteItemList(group1, group2){//cria lista com objetos com info de cada item para ser gerado
			var itemList = [];
			for(var i=0; i<group1["nodeList"].length; i++){
				self.updateProgressBar();
				var item = {};
				item["full_path"] = group1.node + "/" + group1["nodeList"][i];
				item["relative_path"] = group1["nodeList"][i];
				item["type"] = node.type(item["full_path"]);
				item["match"] = group2["nodeList"].indexOf(group1["nodeList"][i]) != -1;
				itemList.push(item);
			}
			return itemList;
		}	
	}
		
	function listNodes(firstGroup, typeList, fullpath){//lista todos nodes dentro do grupo com filtros
		var useTypeFilter = true;

		if(typeList == ""){
			useTypeFilter = false;
		}

		if(node.type(firstGroup) != "GROUP"){//se nao for um grupo no parametro, retorna ele num array	
			if(typeList.indexOf(node.type(firstGroup)) == -1){
				Print("[LISTNODESINGROUP]: Node nao valido! Retornando lista vazia!");
				return [];
			} else {
				return [firstGroup];
			}
		}

		var finalList = [];

		var subNodes = node.subNodes(firstGroup);
		listaRecursiva(subNodes);

		function listaRecursiva(nodeList){
			for(var i=0; i<nodeList.length; i++){
				var tipo = node.type(nodeList[i]);
			
				if(fullpath){//verifica se quer o caminho inteiro
					var item = nodeList[i];
				} else {
					var item = nodeList[i].replace(firstGroup + "/", "");
				}
				
				if(!useTypeFilter){
					finalList.push(item);
				} 
				else if(typeList.indexOf(tipo) != -1){
					finalList.push(item);
				}
				if(tipo == "GROUP"){
					listaRecursiva(node.subNodes(nodeList[i]));
				}
			}	
		}
		return finalList;
	}
	
}