"use strict";
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
  
/*
-------------------------------------------------------------------------------
Name:		BD_RenameTimelineOrder.js

Description:	Este Script organiza a NodeView baseado no nosso padrao, a partir da Composite selecionada;

Usage:		Seleciona composite para orgaznizar todos nodes conectados nela

Author:		Leonardo Bazilio Bentolila

Created:	Novembro, 2019.____________UPDATE (Julho, 2021);
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/


function BD_RenameTimelineOrder(){
	
	if(!checkSelection()){
		return;
	}
	
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_RenameOrder.ui";
	var ui_util = require(projectDATA.paths.birdoPackage + "utils/ui_utils.js");

	var d = new loadInterface(pathUI, ui_util);
	d.ui.show();

////////////////funcoes extras main///////////////////////////////////////
	function checkSelection(){

		if(selection.selectedNodes().length > 1){
			MessageBox.warning("Selecione apenas uma camada na Timeline para este script!",0,0);
			return false;
		}
		
		var coluna = Timeline.selToColumn(0);
		var numFrameSel = Timeline.numFrameSel;
		var firstFrame = Timeline.firstFrameSel;
		var selecList = [];
		var duplicList = [];
		
		for(var i=0; i<numFrameSel; i++){
			var fr = firstFrame + i;
			var draw = column.getEntry(coluna,1,fr);
			var index = selecList.indexOf(draw);
			if(index != -1){
				duplicList.push("\n- " + draw + " : nos frames : " + (firstFrame + index) + " , " + fr + ";");
			}
			selecList.push(draw);
		}
		
		if(duplicList.length != 0){
			MessageBox.information("A seleção contém desenhos com mais de uma exposição! Para este script funcionar, deixe somente desenhos NAO repetidos na selecao da timeline!\nMude a exposicao destes drawings: " + duplicList);
			return false;
		} else {
			return true;
		}
	}
	
}


function loadInterface(uiPath, ui_util){
	
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	this.ui.setMaximumSize(292, 274);//fix windows size


	var line = "A" + (Timeline.numFrameSel);
	this.ui.groupSelection.line_Last.setText(line);
	this.ui.groupSelection.line_First.setText("A1");

	///CALLBACK FUNCTIONSs
	this.changeLabel = function(){
		var lastFrame = Timeline.numFrameSel - 1;
		var prefix = this.ui.groupDrawName.linePrefix.text;
		var sufix = this.ui.groupDrawName.spinBox.text;

		if(!this.ui.groupDrawName.checkPrefix.checked){
			prefix = "";
		}

		if(this.ui.radioFrNumber.checked){
			sufix = (Timeline.firstFrameSel);
		}

		var lineFrst = prefix + sufix;
		var lineLast = prefix + (parseFloat(sufix) + lastFrame);

		this.ui.groupSelection.line_First.setText(lineFrst);
		this.ui.groupSelection.line_Last.setText(lineLast);
	}

	this.changeCheckPrefix = function(){
		this.ui.groupDrawName.linePrefix.enabled = this.ui.groupDrawName.checkPrefix.checked;
		this.changeLabel();
	}
	
	this.changeRadio = function(){
		this.ui.groupDrawName.spinBox.enabled = this.ui.radioChoose.checked;
		this.changeLabel();
	}


	this.okOperation = function(){			
		var pre = this.ui.groupDrawName.linePrefix.text;
		var suf = this.ui.groupDrawName.spinBox.text;
		
		if(!this.ui.groupDrawName.checkPrefix.checked){
			pre = "";
		}
		
		if(this.ui.radioFrNumber.checked){
			suf = Timeline.firstFrameSel;
		}
		
		renameOrder(pre, suf);
		
		this.ui.close();
	}
	
	this.cancelOperation = function(){
		this.ui.close();
	}
	

	this.ui.groupDrawName.checkPrefix.toggled.connect(this,this.changeCheckPrefix);
	this.ui.radioFrNumber.toggled.connect(this,this.changeRadio);
	this.ui.radioChoose.toggled.connect(this,this.changeRadio);
	this.ui.groupDrawName.linePrefix.textChanged.connect(this,this.changeLabel);
	this.ui.cancelButton.clicked.connect(this,this.cancelOperation);
	this.ui.okButton.clicked.connect(this,this.okOperation);
	
	//connect spin signal
	eval(ui_util.get_connect_string("this.ui.groupDrawName.spinBox", "spin", "this.changeLabel"));


	///////////////////////funcao extra//////////////////////////
	function renameOrder(prefix, sufix){
		scene.beginUndoRedoAccum("Renomeia na Ordem");
		var coluna = Timeline.selToColumn(0);
		var numFrameSel = Timeline.numFrameSel;
		var firstFrame = Timeline.firstFrameSel;

		for(var i=0;i<numFrameSel;i++){
			var newName = prefix + (parseFloat(sufix) + i);
			renameTemp(newName);
			var frame = firstFrame + i;
			var oldName = column.getEntry(coluna,1,frame);
			if(column.renameDrawing(coluna, oldName, newName)){
			MessageLog.trace("[RENAMETIMELINEORDER] Drawing remoeado: " + newName);
			} else {
			MessageLog.trace("[RENAMETIMELINEORDER][ERROR] Nao foi possivel renomear o drawing: " + oldName);
			}
		}
	
		scene.endUndoRedoAccum();
		//FUNCOES EXTRA RENAMEORDER
		function renameTemp(name){
			var nod = selection.selectedNode(0);
			var elementID = node.getElementId(nod);
			var tempName = name + "_";
			var exists = Drawing.isExists(elementID, name);
			if(Drawing.isExists(elementID, tempName)){
				tempName = tempName + "_";
			}
			if(exists){
				column.renameDrawing(coluna, name, tempName)
				MessageLog.trace("[RENAMETIMELINEORDER] O drawing " +  name + " virou " + tempName);
				return;
			} 
			return;
		}
	}
}


