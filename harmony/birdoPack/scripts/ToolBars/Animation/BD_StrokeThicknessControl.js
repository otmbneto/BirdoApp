include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_StrokeThicknessControl.js

Description:	Script para editar os pontos de thickness das linhas do drawing 

Usage:		Selecione um stroke do drawing com alguma ferramenta de desenho, e use a interface em tempo real

Author:		Leonardo Bazilio Bentolila

Created:	dezembro, 2022
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
	TODO: 
		[ ] - fazer uma opcao de lock entre o min e max (testar esquema do shift pressed);
			[ ] - fazer os slides mudarem os valores dos pontos q ja existem (min e max) proporcionalmente quando no lock
		
*/

function BD_StrokeThicknessControl(){	
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	//ui file path
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_StrokeManager.ui";
	var ui_util = require(projectDATA.paths.birdoPackage + "utils/ui_utils.js");
	
	try{
		show_interface(pathUI, ui_util);
	} catch(e){
		Print(e);
	}
}

function show_interface(ui_path, ui_util){//se a ui ja existe, mostra ela, se não cria
	var wlist = QApplication.allWidgets();
	var ui = ui_path;
	for(var i=0; i<wlist.length; i++){
		if(wlist[i].windowTitle == "BD_StrokeManager"){
			ui = wlist[i];
			if(ui.visible){
				Print("Widget is already opened!");
				ui.close();
			} else {
				Print("Showing existing interface...");
			}
			break;
		}
	}

	var d = new CreateInterface(ui, ui_util);
	d.ui.show();
}

function CreateInterface(pathUI, ui_util){
	
	//create ui
	this.ui = typeof pathUI == "string" ? UiLoader.load(pathUI) : pathUI;
	
	//set window
	this.ui.activateWindow();
	var ui_geom = getUIGeometry();
	if(!ui_geom){
		Print("widget vai ficar no meio")
	} else {
		this.ui.setGeometry(ui_geom.x(), ui_geom.y(), ui_geom.width(), ui_geom.height());
	}

	//drawing variables
	this.selection_data = null;
	this.drawing_data = null;
	this.thickness_list = null;
	this.alternate_order = ["max", "min"];//ordem da lista de pontos no modo alternate
	this.mode = "Points";

	//callbacks
	this.onToggleMode = function(){
		var text = this.ui.radioRandom.checked ? "Refresh" : "Invert";
		this.ui.pushRefresh.text = text;
		Print("toogled radios..");
	}
	
	this.updateSelection = function(){//atualiza a selecao de layers (retorna false se nao encontrar nada)
		var settings = Tools.getToolSettings();
		if(!settings.currentDrawing){
			MessageBox.warning("Nenhuma selecao de drawing!",0,0);
			Print("No selection!");
			this.selection_data = null;
			this.drawing_data = null;
			this.thickness_list = null;
			this.ui.pushReset.enabled = false;
			return false;
		}	
		var config = {
			drawing: settings.currentDrawing,
			art: settings.activeArt
		};
		var seletionData = Drawing.selection.get(config);
		if(!seletionData || seletionData.selectedStrokes.length == 0){
			MessageBox.warning("No Stroke Layer selected!",0,0);
			this.selection_data = null;
			this.drawing_data = null;
			this.thickness_list = null;
			this.ui.pushReset.enabled = false;
			return false;
		}
		var data = Drawing.query.getData(config);
		this.selection_data = seletionData;
		this.drawing_data = data;
		var points = this.ui.groupPoints.sliderPoints.value;
		var options = {
			random : this.ui.radioRandom.checked,
			order : this.alternate_order,
			points_mode : this.mode,
			spacing : points,
			drawing_data : this.drawing_data,
			selection : this.selection_data,
			fin_tips : this.ui.checkTips.checked
		};
		this.thickness_list = create_thickness_data(points, this.ui.groupLineT.sliderMin.value, this.ui.groupLineT.sliderMax.value, options);
		
		Print("Selection updated!");
		this.ui.pushReset.enabled = true;
		return true;
	}
	
	this.resetStrokes = function(){//reseta as strokes (limpando os pontos de thickness, e dando um merge nas strokes da mesma layer
		//OBS:: NAO RODAR O RESELECT LAYERS DEPOIS DE RODAR ESSA FUNCAO!
		
		if(!this.updateSelection()){
			Print("cancel reset stroke");
			return;
		}
		
		scene.beginUndoRedoAccum("Reset stoke thickness");
		//selected art object
		var selArt = this.selection_data.art;
		var selDrawing = this.selection_data.drawing;
		var sel_layers = this.selection_data.selectedLayers;
		var art_obj = this.drawing_data.arts.filter(function(item){ return item.art == selArt})[0];
		
		//remove layer
		var del_config = {
			label : ("Delete layer "),
			drawing  : selDrawing,
			art : selArt,
			layers : this.selection_data.selectedLayers
		};
		DrawingTools.deleteLayers(del_config);
		
		//modify layers strokes
		var modifiedLayers = [];
		art_obj.layers.forEach(function(layerobj, index){
			//se a layer nao estiver na selecao, ignora
			if(sel_layers.indexOf(index) == -1){
				Print("Ignoring layer that is not selected: " + index);
				return;
			}
			
			var modLayer = layerobj;
			var new_strokes = [];
			var merged_paths = [];
			
			if(!layerobj.hasOwnProperty("strokes")){
				Print("ignoring layer with no strokes!");
				modifiedLayers.push(modLayer);
				return;
			}
			for(var i=0; i<layerobj.strokes.length; i++){
				var newStrokeObj = layerobj.strokes[i];
				
				if(!newStrokeObj.hasOwnProperty("thickness")){
					Print("invisible line found.. should not exist anymore!");
					modifiedLayers.push(modLayer);
					continue;
				}
				var path = newStrokeObj.path;
				newStrokeObj["pencilColorId"] = newStrokeObj["colorId"];

				//se ultimo ponto for igual a ultima stroke path
				if(JSON.stringify(merged_paths[merged_paths.length -1]) == JSON.stringify(path[0])){
					path.shift();
					merged_paths = merged_paths.concat(path);
					new_strokes[new_strokes.length -1].path = merged_paths;
				} else {
					new_strokes.push(newStrokeObj);
					merged_paths = layerobj.strokes[i].path;
				}
			};
			modLayer["strokes"] = new_strokes;
			modLayer["thicknessPaths"] = [];
			modifiedLayers.push(modLayer);
		});

		var modifyCommand = {
			label : "Reset Thickness and merge strokes",
			drawing : selDrawing,
			art : selArt,
			layers : modifiedLayers
		};
		var sucess = DrawingTools.createLayers(modifyCommand);//create new layers
		scene.endUndoRedoAccum();

		if(!sucess){
			Print("Error reseting strokes");
			return false;
		}
		Print("Reseted strokes");
		return true;		
	}
	
	this.changePointsMode = function(){//callback do mode button
		this.mode = this.ui.pushMode.checked ? "Length" : "Points"; 
		//slides min/max update
		this.ui.groupPoints.sliderPoints.maximum = this.mode == "Points" ? 30 : 150;
		this.ui.groupPoints.sliderPoints.minimum = this.mode == "Points" ? 2 : 30;
		//spin min/max update
		this.ui.groupPoints.spinPoints.maximum = this.mode == "Points" ? 30 : 150;
		this.ui.groupPoints.spinPoints.minimum = this.mode == "Points" ? 2 : 30;
		
		this.ui.groupPoints.sliderPoints.value = this.mode == "Points" ? 2 : 80;
		this.ui.groupPoints.labelPoints.text = this.mode;
		Print("Teste MODE: " + this.mode);
	}
	
	this.reSelectLayers = function(){//add layers to selection 
		Drawing.selection.set({
			drawing  : this.selection_data.drawing,
			art : this.selection_data.art,
			selectedStrokes:  this.selection_data.selectedStrokes
		});
		this.updateSelection();
	}
	
	this.updateLabelValues = function(){//atualiza o valor do slider nos labels (roda assim q muda os sliders)
		this.ui.groupPoints.spinPoints.value = this.ui.groupPoints.sliderPoints.value;
		this.ui.groupLineT.spinMax.value = this.ui.groupLineT.sliderMax.value;
		this.ui.groupLineT.spinMin.value = this.ui.groupLineT.sliderMin.value;
		//muda o max do min
		this.ui.groupLineT.sliderMin.maximum = this.ui.groupLineT.sliderMax.value;
		this.ui.groupLineT.spinMin.maximum = this.ui.groupLineT.sliderMax.value;
	}
	
	this.updateStrokes = function(){//testa a selecao e roda o comando para modificar o drawing (roda quando SOLTA os sliders)
		
		if(!this.updateSelection()){
			Print("invalid selection!");
			return;
		}
		
		scene.beginUndoRedoAccum("Stroke Thickness Control");

		if(modifyLayer(this.drawing_data, this.selection_data, this.thickness_list)){
			Print("Strokes modified:\n");
		} else {
			Print("Fail to modify drawing strokes:\n");
		}
		Print(this.selection_data);
		this.reSelectLayers();
		
		scene.endUndoRedoAccum();
	}	
	
	this.onRefresh = function(){
		if(this.ui.radioAlternate.checked){	
			this.alternate_order.reverse();
		}
		this.updateStrokes();
	}
	
	//update values:
	this.updateSelection();
	
	//connections
	this.ui.radioRandom.toggled.connect(this, this.onToggleMode);
	this.ui.radioAlternate.toggled.connect(this, this.onToggleMode);

	this.ui.pushRefresh.clicked.connect(this, this.onRefresh);
	this.ui.pushReset.clicked.connect(this, this.resetStrokes);
	this.ui.pushMode.clicked.connect(this, this.changePointsMode);

	this.ui.groupPoints.sliderPoints.valueChanged.connect(this, this.updateLabelValues);
	this.ui.groupLineT.sliderMax.valueChanged.connect(this, this.updateLabelValues);
	this.ui.groupLineT.sliderMin.valueChanged.connect(this, this.updateLabelValues);

	this.ui.groupPoints.sliderPoints.sliderReleased.connect(this, this.updateStrokes);
	this.ui.groupLineT.sliderMax.sliderReleased.connect(this, this.updateStrokes);
	this.ui.groupLineT.sliderMin.sliderReleased.connect(this, this.updateStrokes);

	//connect spin signal
	eval(ui_util.get_connect_string("this.ui.groupPoints.spinPoints", "spin", "this.updateLabelValues"));
	//connect spin signal
	eval(ui_util.get_connect_string("this.ui.groupLineT.spinMax", "spin", "this.updateLabelValues"));
	//connect spin signal
	eval(ui_util.get_connect_string("this.ui.groupLineT.spinMin", "spin", "this.updateLabelValues"));
	
	//update labels
	this.updateLabelValues();
	
	//extra functions
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
	
	function getUIGeometry(){//retorna a geometry pra criar a ui
		var camera_views = view.viewList().filter(function(item){ return view.type(item) == "Camera"});
		var pos = camera_views.length == 0 ? null : view.viewPosition(camera_views[0]);
		return Boolean(pos) ? new QRect(pos.x() + 5, pos.y() - 25, 284, 337) : null;
	}
	
	function createTList(points){//retorna lista de porcentagens de insercoes de thickness (em valores float)
		var t_list = [];
		var t = 0;
		for(var i=0; i<points; i++){
			if(i == points-1){
				t_list.push(1);
				break;
			}
			t_list.push(t);
			t += 1/(points-1);
		}
		return t_list;
	}
	
	function randomNumber(min, max){//retorna numero (float) aleatorio entre min e max
		return Math.random() * (max - min) + min;
	}
	
	function create_thickness_data(points_value, minThick, maxThick, options){//retorna thicknessPaths list para cada layer selecionada
		var order = options.order[0] == "max" ? [maxThick, minThick] : [minThick, maxThick];//define a ordem se for alternate
		var points_data = {};
		
		options.selection.selectedLayers.forEach(function(layerIndex){ 
			var art_obj = options.drawing_data.arts.filter(function(item){ return item.art == options.selection.art})[0];//selected art obj
			var layer_data = art_obj.layers[layerIndex];
			
			var t_lists = [createTList(points_value)];
			if(options.points_mode == "Length"){
				t_lists = [];
				var point_by_length = get_points_by_length(layer_data, points_value);
				t_lists = point_by_length.map(function(points){
					return createTList(points);
				});
			}
			var thicknesspaths = [];
			t_lists.forEach(function(t_list, index){
				var thick_data = {
					"minThickness": minThick,
					"maxThickness": maxThick
				}

				//lista com valores percetuais pra alterar as pontas
				var points_reduced_number = Math.floor(t_list.length/2) > 2 ? 2 : 1;
				var tips_reduce_values = t_list.map(function(item, index){
					var value = index == 0 ? 0.3 : index == 1 &&  points_reduced_number == 2 ? 0.6 : 1;
					if(index == t_list.length -2 && points_reduced_number == 2){
						value = 0.6
					} else if (index == t_list.length -1){ 
						value = 0.3;
					}
					return value;
				});
				
				thick_data["keys"] = t_list.map(function(t, index){
					var thick_value = options.random ? randomNumber(minThick, maxThick) : order[index%2];
					if(options.fin_tips && t_list.length > 3){
						thick_value = thick_value * tips_reduce_values[index];
					}
					return createPointObject(t, thick_value);
				});
				thicknesspaths.push(thick_data);
			});
			points_data[layerIndex] = thicknesspaths;
		});
		return points_data;
		
		function createPointObject(t_num, thick){//creates thickness point to be added
			var point = {
				t : t_num,
				leftThickness : thick,
				rightThickness : thick,
				leftFromCtrlThickness : thick,
				rightFromCtrlThickness : thick,
				leftToCtrlThickness : thick,
				rightToCtrlThickness : thick,
				leftFromCtrlParam : 1/3,
				rightFromCtrlParam : 1/3,
				leftToCtrlParam : 1/3,
				rightToCtrlParam : 1/3
			};
			if(t_num == 0){
				point["leftFromCtrlParam"] = 0;
				point["rightFromCtrlParam"] = 0;
			} else if(t_num == 1){
				point["leftToCtrlParam"] = 0;
				point["rightToCtrlParam"] = 0;
			}
			return point;
		}
	}
	
	function get_points_by_length(layer_data, spacing){
		//@layer_data => obejto da layer;
		//@spacing => espaçamento entre os pontos
		//retorna lista com o numero numero de pontos para inseir na layer
		if(!layer_data.hasOwnProperty("thicknessPaths") || !layer_data.hasOwnProperty("strokes")){	
			return [2]; //retorna numero minimo em caso de nao ter thickness path (nao sera usado mesmo)
		}
		var stroke_List = layer_data.strokes;
		var points_list = [];
		stroke_List.forEach(function(stroke, index){
			if(!stroke.hasOwnProperty("thickness")){
				Print("stroke with no thickness!");
				return;
			}
			var stroke_path = stroke.path;
			var start_point = new QPointF(stroke_path[0].x, stroke_path[0].y);
			var painterPath = new QPainterPath(start_point);
			var plist = [];
			for(var i=1; i<stroke_path.length; i++){
				var point = new QPointF(stroke_path[i].x, stroke_path[i].y);
				if(stroke_path[i].hasOwnProperty("onCurve")){
					plist = [point];
					addCurveToPath(painterPath, plist);
					continue;
				}
				plist.push(point);
			}
			var number_points = Math.floor(painterPath.length()/spacing);
			if(number_points < 2){
				number_points = 2;
			}
			points_list.push(number_points);
		});
		return points_list;
		
		function addCurveToPath(painter_path, point_list){
			if (point_list.length == 1){
				painter_path.lineTo(point_list[0]);
			} else if (point_list.length == 2){
				painter_path.quadTo(point_list[0], point_list[1]);
			} else if (point_list.length == 3){
				painter_path.cubicTo(point_list[0], point_list[1], point_list[2]);
			} else {
				Print("wrong number of points...");
			}
		}
	}
	
	function modifyLayer(drawingData, selectionData, thicknessList){//modifica os strokes com o valor de thickpath escolhido
		//selected art object
		var art_obj = drawingData.arts.filter(function(art_item){ return art_item.art == selectionData.art})[0];
		
		var sel_layers_list = [];
		selectionData.selectedLayers.forEach(function(layer_index){ 
			var layer_obj = art_obj.layers[layer_index];
			if(!layer_obj.hasOwnProperty("strokes")){
				return;
			}
			layer_obj.strokes.forEach(function(element, index){
				element["pencilColorId"] = element["colorId"];
				if(!element.hasOwnProperty("thickness")){
					return;
				}
				element["thickness"]["minThickness"] = thicknessList[layer_index][0].minThickness;
				element["thickness"]["maxThickness"] = thicknessList[layer_index][0].maxThickness;
				element["thickness"]["thicknessPath"] = index;
			});
			
			layer_obj["thicknessPaths"] = thicknessList[layer_index];
			layer_obj["layer"] = layer_index;
			sel_layers_list.push(layer_obj);
		});

		var modifyCommand = {
			label : "create new thickness",
			drawing  : selectionData.drawing,
			art : selectionData.art,
			layers : sel_layers_list
		};
		return DrawingTools.modifyLayers(modifyCommand);
	}
}