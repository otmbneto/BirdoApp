/*
-------------------------------------------------------------------------------
Name:		BD_NodesCounter.js

Description:	Este Script conta quantos nodes existem no RIG;

Usage:		Selecione o grupo do RIG e veja  o BOXINFO com os detalhes;

Author:		Leonardo Bazilio Bentolila

Created:	Dezembro, 2018. (update novembro,2022 = nova interface mostrando lista por tipo);
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_NodesCounter(){

	var groupNode = selection.selectedNode(0);
	if(!node.isGroup(groupNode) || !groupNode){
		MessageBox.information("Não é um Grupo Selecionado! Seleciona certo aê, consagrado!!"); 
		return;
	}
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var nodeList = BD2_ListNodesInGroup(groupNode, "", true);
	var mainObj = {
		"group_node": groupNode,
		"total": 0,
		"types": {}
	};
	
	nodeList.forEach(function(item, index){
		var nodeType = node.type(item);
		if(nodeType in mainObj.types){
			mainObj["types"][nodeType].push(item.replace(groupNode + "/", ""));
		} else {
			mainObj["types"][nodeType] = [item.replace(groupNode + "/", "")];
		}
		mainObj["total"]++;
	});
	Print(mainObj);
	
	var uiPath = projectDATA.paths.birdoPackage + "ui/BD_NodesCounter.ui";
	var d = new InitiateUI(uiPath, mainObj);
	d.ui.show();
}

function InitiateUI(uiPath, nodes_data){
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	//this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
	this.ui.setFixedSize(387, 211);

	//set widgets
	this.ui.labelGroupNode.text = nodes_data.group_node;
	this.ui.labelTotal.text = nodes_data.total;
	this.ui.groupBox.treeWidget.hide();
	
	//update listTree
	for(item in nodes_data.types){
		var tree = new QTreeWidgetItem(this.ui.groupBox.treeWidget, [item, nodes_data.types[item].length]);
		nodes_data.types[item].forEach(function(x){
			var leaf = new QTreeWidgetItem(tree, [x]);
		});
	};
	
	//callbacks
	this.onCheckGB = function(){
		this.ui.groupBox.treeWidget.setHidden(this.ui.groupBox.checked);
		MessageLog.trace("Toogled groupBox check...");
		if(!this.ui.groupBox.checked){
			this.ui.setFixedSize(387, 211);
			this.ui.groupBox.treeWidget.hide();
		} else {
			this.ui.setFixedSize(387, 386);
			this.ui.groupBox.treeWidget.show();
		}
	}

	this.onClose = function(){
		MessageLog.trace("Closed!");
		this.ui.close();
	}
	//connections
	this.ui.buttonClose.clicked.connect(this, this.onClose);
	this.ui.groupBox.clicked.connect(this, this.onCheckGB);
}