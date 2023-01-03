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
		[X] - aumentar o valor maximo dos pontos;
		[X] - melhorar o esquema de selecao:
			[-] - deixar o ultimo desenho como selecionado ate trocar de selecao (testar pra ver oq acontece quando nao existe mais a layer ou o node);
			[X] - OU adicionar as layers a selecao no fim do modify pra nao perder a selecao;
		[-] - add enable logic para o button reverse;
		[X] - melhorar texto dos radios;
		[X] - fazer logica dos radios (dentro da funcao de criar pontos);

		[ ] - fazer esquema pra alternar o tipo de definicao do ponto para ponto e espacamento (automatico ou checkbox pra mudar o modo)
		[ ] - criar botao de reset pontos (deixando somente 2 pontos com o valor maximo)
		[ ] - separar o callback dos slides de linha diferente do ponto;
		[ ] - fazer uma opcao de lock entre o min e max;
		[ ] - fazer os slides mudarem os valores dos pontos q ja existem (min e max) proporcionalmente quando no lock
		
		[ ] - descobrir pq ele esta criando um item de thicknessPath para cada stroke da layer mesmo eu mandando somente um
		
		[ ] - fazer slider individual pra porcentagem SEM criar novos pontos, mudando proporcionalmente as thicks existentes
		
		POR ULTIMO:
		[ ] - fazer funcao pra achar um ui do script ja criada ou criar uma do zero caso nao ache;

*/

function BD_StrokeThicknessControl(){
	
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	//ui file path
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_StrokeManager.ui";

	var d = new CreateInterface(pathUI);
	d.ui.show();

}

function CreateInterface(pathUI){
	this.ui = UiLoader.load(pathUI);
	//set window
	this.ui.activateWindow();
	this.ui.setWindowFlags(Qt.FramelessWindowHint | Qt.TransparentMode);
	var ui_geom = getUIGeometry();
	this.ui.setGeometry(ui_geom.x(), ui_geom.y(), ui_geom.width(), ui_geom.height());
	
	//drawing variables
	this.selection_data = null;
	this.drawing_data = null;
	this.t_list = null;
	this.points_list = null;
	this.alternate_order = ["max", "min"];//ordem da lista de pontos no modo alternate

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
			this.t_list = null;
			this.points_list = null;
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
			this.t_list = null;
			this.points_list = null;
			return false;
		}
		var data = Drawing.query.getData(config);
		this.selection_data = seletionData;
		this.drawing_data = data;
		var points = this.ui.groupPoints.sliderPoints.value;
		this.t_list = createTList(points);
		var options = {
			random : this.ui.radioRandom.checked,
			order : this.alternate_order
		};
		this.points_list = createPoinstList(this.t_list, this.ui.groupLineT.sliderMin.value, this.ui.groupLineT.sliderMax.value, options);
		
		Print("Selection updated!");
		return true;
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
		//thicknesspath object
		var thicknessObject = {
			"minThickness": this.ui.groupLineT.sliderMin.value,
			"maxThickness": this.ui.groupLineT.sliderMax.value,
			"keys": this.points_list
		}
		if(modifyLayer(this.drawing_data, this.selection_data, thicknessObject)){
			Print("Strokes modified:\n");
		} else {
			Print("Fail to modify drawing strokes:\n");
		}
		Print(this.selection_data);
		//add layers to selection 
		Drawing.selection.set({
			drawing  : this.selection_data.drawing,
			art : this.selection_data.art,
			selectedStrokes:  this.selection_data.selectedStrokes
		});
	}	
	
	this.onRefresh = function(){
		if(this.ui.radioAlternate.checked){	
			this.alternate_order.reverse();
		}
		this.updateStrokes();
	}
	
	this.onClose = function(){//close ui
		Print("Closed!");
		this.ui.close();
	}

	//update values:
	this.updateSelection();
	
	//connections
	this.ui.radioRandom.toggled.connect(this, this.onToggleMode);
	this.ui.radioAlternate.toggled.connect(this, this.onToggleMode);

	this.ui.pushRefresh.clicked.connect(this, this.onRefresh);

	this.ui.groupPoints.sliderPoints.valueChanged.connect(this, this.updateLabelValues);
	this.ui.groupLineT.sliderMax.valueChanged.connect(this, this.updateLabelValues);
	this.ui.groupLineT.sliderMin.valueChanged.connect(this, this.updateLabelValues);

	this.ui.groupPoints.sliderPoints.sliderReleased.connect(this, this.updateStrokes);
	this.ui.groupLineT.sliderMax.sliderReleased.connect(this, this.updateStrokes);
	this.ui.groupLineT.sliderMin.sliderReleased.connect(this, this.updateStrokes);
	
	this.ui.groupPoints.spinPoints["valueChanged(int)"].connect(this, this.updateLabelValues);
	this.ui.groupLineT.spinMax["valueChanged(int)"].connect(this, this.updateLabelValues);
	this.ui.groupLineT.spinMin["valueChanged(int)"].connect(this, this.updateLabelValues);
	
	this.ui.pushClose.clicked.connect(this, this.onClose);

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
		var camera_view = view.viewList().filter(function(x){return view.type(x) == "Camera"})[0];
		var pos = view.viewPosition(camera_view);
		return new QRect(pos.x() + 5, pos.y() - 25, 290, 310);
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
	
	function createPoinstList(t_list, minThick, maxThick, options){//retorna thicknessPath keys list
		var order = options.order[0] == "max" ? [maxThick, minThick] : [minThick, maxThick];
		return t_list.map(function(item, index){
			var thick_value = options.random ? randomNumber(minThick, maxThick) : order[index%2];
			return createPointObject(item, thick_value);
		});
		
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
	
	function getStrokesLengthList(strokeDataList, thickCount){
		/*
		@strokeDataList => lista de strokes da layer;
		@thickCount => length da lista de thicknessPath da layer;
		retorna objeto com um QPainterPath criada para cada stroke q tenha um thicknesspath 
		(unifica os casos de layers com substrokes divididas em varias, mas que dividem mesmo path de thickness)*/
		var strokes_object = {};
		for(var i=0; i<thickCount; i++){
			strokes_object[i] = null;
		}
		
		strokeDataList.forEach(function(item, index){
			if(!item.hasOwnProperty("thickness")){
				Print("stroke with no thickness!");
				return;
			}
			var tPathIndex = item.thickness.thicknessPath;
			var stroke_path = item.path;
			var start_point = new QPointF(scene.toOGLX(stroke_path[0].x), scene.toOGLY(stroke_path[0].y));
			if(!strokes_object[tPathIndex]){
				strokes_object[tPathIndex] = new QPainterPath(start_point);
			}
			var point_list = [];
			for(var i=1; i<stroke_path.length; i++){
				var point = new QPointF(scene.toOGLX(stroke_path[i].x), scene.toOGLY(stroke_path[i].y));
				if(stroke_path[i].hasOwnProperty("onCurve")){
					point_list = [point];
					addCurveToPath(strokes_object[tPathIndex], point_list);
					continue;
				}
				point_list.push(point);
			}
		});
		return strokes_object;
		
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

	
	function modifyLayer(drawingData, selectionData, thickObj){//modifica os strokes com o valor de thickpath escolhido
		scene.beginUndoRedoAccum("Stroke Thickness Control");
		var art_obj = drawingData.arts.filter(function(item){ return item.art == selectionData.art})[0];
		
		var sel_layers_list = [];
		selectionData.selectedLayers.forEach(function(item){ 
			var layer_obj = art_obj.layers[item];
			if(!layer_obj.hasOwnProperty("strokes")){
				return;
			}
			layer_obj.strokes.forEach(function(element, index){
				element["strokeIndex"] = index;
				element["pencilColorId"] = element["colorId"];
				if(!element.hasOwnProperty("thickness")){
					return;	
				}
				element["thickness"]["minThickness"] = thickObj.minThickness;
				element["thickness"]["maxThickness"] = thickObj.maxThickness;
				element["thickness"]["thicknessPath"] = 0;
			});
			
			var newThicknesPaths = [thickObj];
			layer_obj["thicknessPaths"] = newThicknesPaths;
			layer_obj["layer"] = item;
			sel_layers_list.push(layer_obj);
		});

		var modifyCommand = {
			label : "test edit thickness",
			drawing  : selectionData.drawing,
			art : selectionData.art,
			layers : sel_layers_list
		};
		
		scene.endUndoRedoAccum();
		return DrawingTools.modifyLayers(modifyCommand); 
	}
}