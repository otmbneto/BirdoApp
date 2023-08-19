include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_RepaintDrawing.js

Description:	Este script repinta os drawings do node selecionado

Usage:		escolher as cores na interface, e ser feliz

Author:		Leonardo Bazilio Bentolila

Created:	julho, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_RepaintDrawing(){

	var nodeSel = selection.selectedNode(0);
	
	if(!nodeSel){
		MessageBox.warning("Selecione um node!",0,0);
		Print("Select valid node...");
		return false;
	}
	
	if(node.type(nodeSel) != "READ"){
		MessageBox.warning("Selecione um Node DRAWING!",0,0);
		return;
	}
	
	var paletteList = PaletteObjectManager.getScenePaletteList();

	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var repaint_script = projectDATA["paths"]["birdoPackage"] + "utils/repaintDrawings.js";
		
	if(!BD1_FileExists(repaint_script)){
		Print("Fail to find repaintDrawings.js script!");
		MessageBox.warning("Fail to find utils repaintDrawings.js script!",0,0);
		return false;
	}

	var d = new CreateInterface(projectDATA, paletteList, repaint_script, nodeSel);
	d.ui.show();
	
	
	//extra functions
	function get_timeline_exposure_data(selNode){
		var coluna = node.linkedColumn(selNode, "DRAWING.ELEMENT");
		for(var i=0; i<frame.numberOf(); i++){
			Print(coluna.getEntry(i));
		}	
			
	}
}

function CreateInterface(projectDATA, paletteList, util_js, selectedNode){
	
	var uiPath = projectDATA.paths.birdoPackage + "ui/BD_RepaintDrawing.ui";
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	
	//fix windows size
	this.ui.setFixedSize(383, 459);	
	
	//self variables 
	this.lineColor = null;
	this.shapeColor = null;
	this.frameStyleTemplate = this.ui.framePreview.styleSheet.replace("lightgray", "{FILL}").replace("darkgray", "{LINE}");
	this.checkList = [this.ui.groupAdvanced.radioCurrent, this.ui.groupAdvanced.radioTimeline, this.ui.groupAdvanced.radioAll];
		
	//CALLBACKS
	this.onCheckLine = function(){
		this.ui.selectButtonLine.enabled = this.ui.checkLines.checked;	
		Print("Use repaint LINE color!");
		this.lineColor = null;
		this.ui.label_line_color.text = "{none}";
		this.updateUi();
	}
	
	this.onCheckShape = function(){
		this.ui.selectButtonShape.enabled = this.ui.checkShape.checked;	
		Print("Use repaint LINE color!");
		this.shapeColor = null;
		this.ui.label_shape_color.text = "{none}";
		this.updateUi();
	}
	
	this.onSelectLine = function(){//selects line color
		var currPalette = paletteList.getPaletteById(PaletteManager.getCurrentPaletteId());
		this.lineColor =  currPalette.getColorById(PaletteManager.getCurrentColorId());
		if(!this.lineColor.isValid){
			MessageBox.warning("Invalid Line color selection!",0,0);
			Print("Invalid color selected: ")
			Print(this.lineColor);
			this.lineColor = null;
			return;
		}
		this.ui.label_line_color.text = this.lineColor.name + " <=> " + currPalette.getName();
		Print("Line color selected: " + this.lineColor.name);
		this.updateUi();
	}
	
	this.onSelectShape = function(){//selects shape color
		var currPalette = paletteList.getPaletteById(PaletteManager.getCurrentPaletteId());
		this.shapeColor =  currPalette.getColorById(PaletteManager.getCurrentColorId());
		if(!this.shapeColor.isValid){
			MessageBox.warning("Invalid Shape color selection!",0,0);
			Print("Invalid color selected: ")
			Print(this.shapeColor);
			this.shapeColor = null;
			return;
		}
		this.ui.label_shape_color.text = this.shapeColor.name + " <=> " + currPalette.getName();
		Print("Shape color selected: " + this.shapeColor.name);
		this.updateUi();
	}
	
	this.updateUi = function(){
		//update button apply state
		this.ui.pushRepaint.enabled = this.lineColor || this.shapeColor;			
		//update frame template colors style
		var rgbLine = this.lineColor ? rgbString(this.lineColor) : "darkgray";
		var rgbShape = this.shapeColor ? rgbString(this.shapeColor) : "lightgray";
		var styleS = this.frameStyleTemplate.replace("{LINE}", rgbLine).replace("{FILL}", rgbShape);
		this.ui.framePreview.styleSheet = styleS;
	}
	
	this.getApplyOption = function(){
		for(var i=0; i<this.checkList.length; i++){	
			if(this.checkList[i].checked){
				return this.checkList[i].text;
			}
		}	
	}	
	
	this.getLayers = function(){//retorna lista de layers art para aplycar
		var layers = [];	
		if(this.ui.groupArts.checkUnderlay.checked){
			layers.push(0);
		}
		if(this.ui.groupArts.checkColourArt.checked){
			layers.push(1);
		}
		if(this.ui.groupArts.checkLineArt.checked){
			layers.push(2);
		}
		if(this.ui.groupArts.checkOverlay.checked){
			layers.push(3);
		}
		return layers;
	}
	
	this.updateProgressBar = function(){
		var val = this.ui.progressBar.value;
		if(val == this.ui.progressBar.maximum){
			this.ui.progressBar.value = 0;
			return;
		}
		this.ui.progressBar.value = val + 1;	
	}
	
	this.onRepaint = function(){
		var repaint = require(util_js).repaintDrawings(selectedNode, this.lineColor, this.shapeColor, this);
		if(!repaint){
			Print("Fail to repaint drawings!");
		} else {
			Print("Feito!");
			this.ui.close();
		}
	}
	
	this.onClose = function(){
		Print("ui closed..");
		this.ui.close();
	}	
		
	//CONNECTIONS
	this.ui.checkLines.toggled.connect(this, this.onCheckLine);
	this.ui.checkShape.toggled.connect(this, this.onCheckShape);

	this.ui.selectButtonLine.clicked.connect(this, this.onSelectLine);
	this.ui.selectButtonShape.clicked.connect(this, this.onSelectShape);

	this.ui.pushRepaint.clicked.connect(this, this.onRepaint);
	this.ui.pushCancel.clicked.connect(this, this.onClose);
	
	////Funcoes extras da interface/////
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
	
	function rgbString(color){//retorna o rgb em formato de string: rgb(255,255,255)
		return "rgb(" + color.colorData.r + "," + color.colorData.g + "," + color.colorData.b + ")";
	}
}