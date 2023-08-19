/*
-------------------------------------------------------------------------------
Name:		BD_FindAndReplace.js

Description:	Este script renomeia nodes selecionados, e sub grupos caso tenha um grupo selecionado

Usage:		Use os campos Find and Replace para renomear nomes, use os filtros de nodes  para avancado;

Author:		Leonardo Bazilio Bentolila

Created:	Dezembro, 2018 _____ upDate (marco, 2021).
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_FindAndReplace(){

	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[FIND&REPLACE] [ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	var sel_nodes = selection.selectedNodes();
	
	if(sel_nodes.length == 0){
		MessageBox.warning("Select at least one node!",0,0);
		return;
	}
	
	var nodes_sel = BD2_ListNodesInSelection(sel_nodes, "");

	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_FindAndReplaceNodes.ui";

	//initiate ui
	var d = new CreateInterface(ui_path, nodes_sel);
	d.ui.show();
}

function CreateInterface(uiPath, nodes_sel){

	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	
	//global vars
	this.filterList = [];
	var ltypes = [];
	nodes_sel.forEach(function(item){
		var tipo = node.type(item);
		if(ltypes.indexOf(tipo) == -1){
			ltypes.push(tipo);
		}
	});
	this.selected_types = ltypes;
	
	//call backs
	this.validateImput = function(){
		var linef = this.ui.lineFind.text;
		var lineR = this.ui.lineReplace.text;
		Print(linef != lineR);
		var valid = linef != "" && linef != lineR;
		this.ui.pushOk.enabled = valid;
		Print("[FIND&REPLACE] Valid input: " + valid);
	}
	
	this.addFilter = function(){
		var layout = this.ui.groupTypes.layout();
		var index = layout.count();
		var newCombo = new QComboBox(this.ui);
		newCombo.addItems(this.selected_types);
		layout.addWidget(newCombo, index, Qt.AlignJustify | Qt.AlignTop);
		this.filterList.push(newCombo);
	}
	
	this.removeFilter = function(){
		var layout = this.ui.groupTypes.layout();
		var lastItem = this.filterList[this.filterList.length-1];
		layout.removeWidget(lastItem);
		this.filterList.pop();	
		lastItem.close();
	}
	
	this.onOk = function(){
		scene.beginUndoRedoAccum("Find And Replace")
		Print(this.filterList.length + " filters widgets...");
		var _find = this.ui.lineFind.text;
		var _replace = this.ui.lineReplace.text;
		Print("[FIND&REPLACE] Find: " + _find);
		Print("[FIND&REPLACE] Replace: " + _replace);
		var filters = [];
		var counter = 0;
		var counter_err = 0;
		for(var i=0; i<this.filterList.length; i++){
			var fil = this.filterList[i].currentText;
			if(filters.indexOf(fil) == -1){
				filters.push(fil);
			}
		}
		
		if(filters.length !=0){
			Print("[FIND&REPLACE] Types Filters listed:");
			Print(filters);
			var final_nodes = nodes_sel.filter(function(item){
				return filters.indexOf(node.type(item)) != -1;			
			});
		} else {
			Print("[FIND&REPLACE] No types filters!");
			var final_nodes = nodes_sel;
		}
		//sort to get last node as higer hieranchi groups
		final_nodes.sort(function(a, b){
		  return b.length - a.length;
		});

		final_nodes.forEach(function(x){
			var node_name = node.getName(x);
			if(node_name.indexOf(_find) != -1){
				var new_name = node_name.replace(_find, _replace);				
				if(rename_node(x, new_name)){
					counter++;
				} else {
					counter_err++;	
				}
			}
		});
		scene.endUndoRedoAccum();
		this.ui.close();
		Print(counter + " node(s) renomeados!\n" + counter_err + " erro(s)!");
		MessageBox.information(counter + " node(s) renomeados!\n" + counter_err + " erro(s)!");
	}
	
	this.onClose = function(){
		Print("[FIND&REPLACE] close ui...");
		this.ui.close();
	}
	
	//##########CONNECTIONS###########//
	this.ui.pushCancel.clicked.connect(this, this.onClose);
	this.ui.lineFind.editingFinished.connect(this, this.validateImput);
	this.ui.lineReplace.editingFinished.connect(this, this.validateImput);
	this.ui.pushAdd.clicked.connect(this, this.addFilter);
	this.ui.pushRemove.clicked.connect(this, this.removeFilter);
	this.ui.pushOk.clicked.connect(this, this.onOk);

	//extra functions
	function Print(msg){		
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
	
	function rename_node(node_path, new_name){
		if(node.getName(node_path) == new_name){
			Print("[FIND&REPLACE] Nao e necessario renomear o node pois o nome ja esta correto!");
			return node_path;
		} else {
			var renamed_fullname = node.parentNode(node_path) + "/" + new_name;
		}
		if(node.type(node_path) == "READ"){
			var columnId = node.linkedColumn(node_path, "DRAWING.ELEMENT");
			var elementKey = column.getElementIdOfDrawing(columnId);
			if(node.rename(node_path, new_name)){
				column.rename(columnId, new_name);
				element.renameById(elementKey, new_name);
				Print("[FIND&REPLACE] Node: '" + node_path + "'  renomeado para: " + new_name);
				return renamed_fullname;
			} else {
				MessageLog.trace("Falha ao renomear o node: '" + node_path + "' para o nome: " + new_name);
				return false;
			}
		} else {
			if(node.rename(node_path, new_name)){
				Print("[FIND&REPLACE] Node: '" + node_path + "'  renomeado para: " + new_name);
				return renamed_fullname;
			} else {
				Print("[FIND&REPLACE] Falha ao renomear o node: '" + node_path + "' para o nome: " + new_name);
				return false;
			}
		}
	}
}