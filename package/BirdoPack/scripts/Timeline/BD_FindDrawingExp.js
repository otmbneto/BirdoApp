"use strict";
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*
-------------------------------------------------------------------------------
Name:		BD_FindDrawingExp.js

Description:	Este script permite selecionar um drawing para procurar na Timeline se ele está exposto. 

Usage:		Escolha o drawing e pressione Find para achar a proxima exposição dele na timeline;

Author:		Leonardo Bazilio Bentolila

Created:	Outubro, 2019 _________Update julho, 2021.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/


function BD_FindDrawingExp(){
	
	var nodeSel = selection.selectedNode(0);

	if(nodeSel == ""){
		MessageBox.information("Seleciona um Node aê, consagrado!!");
		return;
	}

	if(node.type(nodeSel) != "READ"){
		MessageBox.information("Este script somente funciona para drawings! Selecione um!");
		return;
	}
	
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_FindDrawingsExposure.ui";

	var d = new loadInterface(nodeSel, pathUI);
	d.ui.show();

}


function loadInterface(nod, pathUI){
	
	this.ui = UiLoader.load(pathUI);

	var dColumn = node.linkedColumn(nod,"DRAWING.ELEMENT");
	var drawList = column.getDrawingTimings(dColumn);
	var tbList = listaThumbnails(nod);

	var pix = new QPixmap;
	if(fileExists(tbList[0])){
		pix.load(tbList[0]);
		this.ui.thumbNail.pixmap = pix;
		this.ui.thumbNail.text = null;
	} else {
		this.ui.thumbNail.pixmap = null;
		this.ui.thumbNail.text = "NO PREVIEW\nIMAGE";
	}

	this.ui.sliderDrawing.minimum = 0;
	this.ui.sliderDrawing.maximum = drawList.length - 1;
	this.ui.sliderDrawing.value = 0;

	this.ui.drawName.setText(drawList[0]);
	this.ui.nodeName.setText(node.getName(nod));

	///CALLBACK FUNCTIONS
	this.update = function(index){
		var png = tbList[index];
		if(!fileExists(png)){
			this.ui.thumbNail.pixmap = null;
			this.ui.thumbNail.text = "NO PREVIEW\nIMAGE";
			this.ui.drawName.setText(drawList[index]);
			return;
		}
		pix.load(png);
		this.ui.thumbNail.pixmap = pix;
		this.ui.drawName.setText(drawList[index]);
	}

	this.sliderChanged = function(){	
		this.value = this.ui.sliderDrawing.value;
		this.update(this.value);
	}
	
	
	this.textChanged = function(){
		this.digitado = this.ui.drawName.text;
		this.ind = drawList.indexOf(this.digitado);
		if(this.ind == -1){
			pix.load(rootBirdo + "/image/findDrawExp_THUMB_PH.png");//FIXME: Caminho Imagem NULL!
			this.ui.thumbNail.pixmap = pix;
			this.ui.drawName.setText("NULL"); 
			return;
		} else {
			this.ui.sliderDrawing.value = this.ind;
			pix.load(tbList[this.ind]);
			this.ui.thumbNail.pixmap = pix;
			this.ui.drawName.setText(drawList[this.ind]); 
		}
	}

	this.findOperation = function(){
		this.find = this.ui.drawName.text;
		MessageLog.trace(this.find);
		this.col = node.linkedColumn(nod,"DRAWING.ELEMENT");
		this.end = frame.numberOf();
		this.curFrame = (frame.current() + 1);
		
		for(var i= this.curFrame;i<this.end;i++){
			this.nextDra = column.getEntry(this.col,1,i);
			if(this.nextDra == this.find){
				frame.setCurrent(i);
				findCurrentFrame();
				return;
			}
		}
		MessageBox.information("Fim da Timeline! Não tem mais esse drawing exposto!");
	}

	this.closeOperation = function(){
		this.ui.close();
	}
	
	/////Connections///
	this.ui.sliderDrawing.valueChanged.connect(this, this.sliderChanged);
	this.ui.drawName.editingFinished.connect(this, this.textChanged);
	this.ui.findButton.clicked.connect(this, this.findOperation);
	this.ui.closeButton.clicked.connect(this, this.closeOperation);
	
////////////////////// funcoes complementares//////////////////////////////
	function findCurrentFrame(){
		var curFrame = frame.current();
		Action.perform("onActionMainPlayFw()" );
		Action.perform("onActionMainStopPlaying()");
		frame.setCurrent(curFrame);
	}

	function listaThumbnails(n){
		var col = node.linkedColumn(n,"DRAWING.ELEMENT");
		var timings = column.getDrawingTimings(col);
		var id = node.getElementId(n);
		var prefix = element.physicalName(id);
		var tbnFolder = element.completeFolder(id) + "/.thumbnails/";
		var newList = [];

		for(var i=0;i<timings.length;i++){
			var name = tbnFolder + "." + prefix + "-" + timings[i] + ".tvg.png";
			newList.push(name);
		}
		return newList;
	}
	
	function fileExists(filePath){
		var f = new File(filePath);
		return f.exists;
	}
	
}