/*
-------------------------------------------------------------------------------
Name:		BD_FindDrawingExp.js

Description:	Este script permite selecionar um drawing para procurar na Timeline se ele está exposto. 

Usage:		Escolha o drawing e pressione Find para achar a proxima exposição dele na timeline;

Author:		Leonardo Bazilio Bentolila

Created:	Outubro, 2019 _________Update Marco, 2021.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_FindDrawingWithColour(){
	
	var projectDATA = BD2_ProjectInfo();
	
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var duplicate_check_list = [];
	var readList = node.getNodes(["READ"]); 
	var nodCores = [];
	var curr_color_id = PaletteManager.getCurrentColorId();
	var curr_color_name = PaletteManager.getCurrentColorName();

	if(!curr_color_id){
		MessageBox.warning("No color selected!");
		return;
	}

	var colorObj = {
				"name": curr_color_name,
				"colorId": curr_color_id,
				"css_values": "color: " + BD2_GetColorValues(curr_color_id, true)
	};
		
	Print("[FIND DRAWING WITH COLOR] Searching nodes that use the color: " + curr_color_name);
	
	var progressDlg;
	progressDlg = new QProgressDialog();
	//progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.open();
	progressDlg.setRange(0, readList.length-1);
		
	readList.forEach(function(item, index){ 
			progressDlg.setValue(index);
			progressDlg.setLabelText("Checking node: " + node.getName(item));
			var itemNode = getNodeInfo(item, curr_color_id);	
			if(itemNode){
				Print("--node match with color: " + itemNode.node);
				nodCores.push(itemNode);
			}
	});

	progressDlg.hide();
	
	if(nodCores.length == 0){
		MessageBox.information("Nenhum node encontrado usando esta cor: " + curr_color_name);
		Print("no node match for color: " + curr_color_name);
		return;
	}

	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_FindDrawingWithColour.ui";
	var d = new loadInterface(nodCores, colorObj, ui_path);
	d.ui.show();

	//EXTRA FUNCTIONS
	function getNodeInfo(nodePath, colorId){//funcao que descobre se o node contem a cor e retorna objeto com informacoes de drawings
		var id = node.getElementId(nodePath);
		if(id <= 0){
			Print("invalid node : " + nodePath);
			return false;
		}
		
		var nodeObj = {"node": nodePath, "drawings": []};
		var thumbnailsFolder = element.completeFolder(id) + "/.thumbnails/";
		
		if(duplicate_check_list.indexOf(id) != -1){
			return false;
		}
		for(var i=0; i<Drawing.numberOf(id); i++){
			var drawName = Drawing.name(id, i);		
			var drawfile = Drawing.filename(id, drawName);
			var key = {"filename": drawfile};	
			var cores = DrawingTools.getDrawingUsedColors(key);
			var drawObj = {
				"name": drawName,
				"filename": drawfile,
				"thumbnail": thumbnailsFolder + "." + element.physicalName(id) + drawName + ".tvg.png",
			};
			drawObj["thumb_exists"] = BD1_FileExists(drawObj["thumbnail"]);
			
			//checks if drawing uses the color
			if(cores.indexOf(colorId) != -1){
				//make sure the thumbnails folder exist
				if(!BD1_DirExist(thumbnailsFolder)){
					if(!BD1_createDirectoryREDE(thumbnailsFolder)){
						drawObj["thumbnail"] = null;
						Print("fail to create thumbnails folder!");
					}
				}
				nodeObj["drawings"].push(drawObj);
			}
		}
		
		if(nodeObj.drawings.length > 0){
			duplicate_check_list.push(id);
			return nodeObj;
		} else {
			return false;
		}
	}

}

///////////////////Load UI////////////////////////////////////
function loadInterface(nodeMatch_list, colorData, pathUI){	
	this.ui = UiLoader.load(pathUI);
	this.node_list = nodeMatch_list;
	this.ui.activateWindow();
	//this.ui.setWindowFlags(Qt.WindowStaysOnTopHint);
	
	//update number of nodes label
	this.ui.groupNode.labelNumber.setText(format_index(this.node_list.length));
	//sets the initial index to 0
	this.ui.groupNode.labelIndex.setText(format_index(0));
	//sets the color name line
	this.ui.groupNode.colorLabel.setText(colorData.name);
	this.ui.groupNode.colorLabel.setStyleSheet("QLabel {\n " + colorData.css_values + "\n}");
	
	//sets the initial node name
	this.ui.groupNode.labelNode.setText(node.getName(this.node_list[0].node));

	//CALLBACKS
	this.updateCurrentNode = function(){//updates current item node selected
		var curr_index = parseInt(this.ui.groupNode.labelIndex.text);
		var curr_node_data = this.node_list[curr_index];
		var has_missing_thumbs = false;
		
		curr_node_data.drawings.forEach(function(x){ 
			if(!x.thumb_exists || !x.thumbnail){
				has_missing_thumbs = true;
			}
		});

		//enable create thumbs buttton if exist thums to create;
		this.ui.groupDrawing.buttCreateThumb.enabled = has_missing_thumbs;
		
		this.ui.groupNode.labelNode.setText(node.getName(curr_node_data.node));
		this.ui.groupDrawing.sliderDrawing.maximum = curr_node_data.drawings.length;
		this.ui.groupDrawing.sliderDrawing.value = 0;
		this.updateSlider();
	}
	
	this.updateSlider = function(){//callback do slider para atualizar os drawings
		var curr_index = parseInt(this.ui.groupNode.labelIndex.text);
		var curr_node_data = this.node_list[curr_index];
		var draw = curr_node_data["drawings"][this.ui.groupDrawing.sliderDrawing.value];
		var thumb = draw["thumbnail"];
		
		//update label drawing name
		this.ui.groupDrawing.labelDraw.text = draw.name;
		
		if(!thumb || !draw["thumb_exists"]){
			this.ui.groupDrawing.labelThumbs.clear()			
			this.ui.groupDrawing.labelThumbs.text = "Missing\nthumbnail";
		} else {
			this.ui.groupDrawing.labelThumbs.text = null;
			var pix = new QPixmap(thumb);
			this.ui.groupDrawing.labelThumbs.setPixmap(pix);
		}
		Print("--slider update: " + this.ui.groupDrawing.sliderDrawing.value);
	}
	
	this.findNext = function(){//callback for next button
		var curr_index = parseInt(this.ui.groupNode.labelIndex.text);
		var next_index = (curr_index == this.node_list.length - 1) ? 0 : curr_index + 1;
		this.ui.groupNode.labelIndex.setText(format_index(next_index));
		this.updateCurrentNode();
	}

	this.findPrev = function(){//callback for prev button
		var curr_index = parseInt(this.ui.groupNode.labelIndex.text);
		var prev_index = (curr_index == 0) ? this.node_list.length - 1 : curr_index - 1;
		this.ui.groupNode.labelIndex.setText(format_index(prev_index));
		this.updateCurrentNode();
	}
	
	this.onEditButton = function(){
		var ask = MessageBox.warning("Deseja mudar a exposicao do drawing escolhido no frame atual?\nDe preferencia escolha um frame sem exposicao nenhuma para facilitar a edicao!", 4, 3) == 3;
		if(!ask){
			Print("Edit Cancelado!");
		}
		scene.beginUndoRedoAccum("FIND DRAWING WITH COLOR - Edit Drawing");
		var curr_index = parseInt(this.ui.groupNode.labelIndex.text);
		var node_object = this.node_list[curr_index];
		var drawing_data = node_object["drawings"][this.ui.groupDrawing.sliderDrawing.value];
		
		//select node
		selection.clearSelection();
		selection.addNodeToSelection(node_object.node);
		
		//change drawing at the current frame
		var col = node.linkedColumn(node_object.node,"DRAWING.ELEMENT");
		column.setEntry(col, 1, frame.current(), drawing_data["name"]);

		//center node selection on timeline
		Action.perform("onActionCenterOnSelection()", "timelineView");
		//change to select tool;
		Action.perform("onActionChooseSelectTool()", "cameraView");
		Print("--editing drawing: " + drawing_data["name"] + " from node: " + node_object["node"]);
		scene.endUndoRedoAccum();
	}
	
	this.createThumbnails = function(){//create thumbnails for current selected Node
		var curr_index = parseInt(this.ui.groupNode.labelIndex.text);
		var curr_node_data = this.node_list[curr_index];
		var max = curr_node_data["drawings"].length -1;

		//clean the progressBar
		this.ui.progressBar.show();
		this.ui.progressBar.value = 0;
		this.ui.progressBar.setMaximum(max);
	
		for(var i=0; i<curr_node_data["drawings"].length; i++){
			var item = curr_node_data["drawings"][i];
			this.ui.progressBar.value = i;
			this.ui.progressBar.format = "Generating [" + i + "/" + max + "]";

			var tvg_file = item["filename"];
			var thumb = item["thumbnail"];

			if(!thumb){
				Print("--no thumbnail to create!");
				continue;
			}
			if(!item["thumb_exists"]){
				//if update "thumb_exists" flag for this item
				this.node_list[curr_index]["drawings"][i]["thumb_exists"] = convertTVGtoPNGThumbnail(tvg_file, thumb);
			}
		}	
		this.updateSlider();
		this.ui.progressBar.hide();
		Print("thumbnails created!");
	}
	
	this.onClose = function(){
		Print("closing ui..");
		this.ui.close();
	}
	
	//hide progress bar
	this.ui.progressBar.hide();
	
	//connections
	this.ui.groupNode.buttonPrev.clicked.connect(this,this.findPrev);
	this.ui.groupNode.buttonNext.clicked.connect(this,this.findNext);
	this.ui.buttonEdit.clicked.connect(this, this.onEditButton);
	this.ui.groupDrawing.buttCreateThumb.clicked.connect(this, this.createThumbnails);
	this.ui.groupDrawing.sliderDrawing.valueChanged.connect(this, this.updateSlider);
	this.ui.buttonClose.clicked.connect(this, this.onClose);
	
	this.updateCurrentNode();

	//extra functions
	function Print(msg){//copy of print function inside ui class
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}

	function format_index(number){//format inedx number to 00 format
		return ("00" + number).slice(-2);
	}
		
	function convertTVGtoPNGThumbnail(imputTvgImage, outputPng){
		var utransform = specialFolders.bin + "/utransform.exe";
		var format = "PNG4";
		var process = new Process2(utransform, "-outformat", format, "-outfile", outputPng, "-align", "AUTO_ALIGN", "-resolution", 96, 96, imputTvgImage);
		var ret = process.launch();

		if(ret != 0){
			Print("Error converting tvg into png: " + imputTvgImage);
			return false;
		} else {
			Print("PNG converted: " + outputPng);
			return true;
		}
	}
}

