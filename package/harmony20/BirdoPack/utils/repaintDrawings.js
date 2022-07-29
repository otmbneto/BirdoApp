include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		repaintDrawings.js

Description:	util do repaint drawings. Faz toda acao de repaint no node selecionado.

Usage:		usar como util no script principal BD_RepaintDrawing.js

Author:		Leonardo Bazilio Bentolila

Created:	julho, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function repaintDrawings(nodeSel, lineColor, fillColor, self){
	
	scene.beginUndoRedoAccum("Birdo Repaint Line and Shapes");
	
	Print(" - Repainting node: " + node.getName(nodeSel));
	
	var frames_obj = get_exposure_data(nodeSel, self.getApplyOption());
	
	if(!frames_obj){
		Print("-- frames object functioun failed! Canceling..");
		scene.cancelUndoRedoAccum();
		return false;
	}
	
	var art_list = self.getLayers();
	
	if(art_list.length == 0){
		MessageBox.warning("Nenhuma art layer selecionada!",0,0);
		Print("Marque pelo menos uma art layer!");
		scene.cancelUndoRedoAccum();
		return false;
	}
	
	self.ui.progressBar.maximum = Object.keys(frames_obj).length - 1;
	var counter = 0;
	
	for(item in frames_obj){
		Print(" --- drawing: " + item);
		self.ui.progressBar.format = "drawing - " + item;
		
		if(item == "backup"){
			redoTempExp(nodeSel, frames_obj[item]);
			continue;
		}
		
		var config = {
			drawing: {node: nodeSel, frame: frames_obj[item]["first_frame"]}
		};
		var data = Drawing.query.getData(config);
		repaintDrawing(data, art_list, config);
		self.updateProgressBar();
		counter++;
	}
	
	scene.endUndoRedoAccum();
	self.ui.progressBar.format = "Drawings repintados: " + counter;		

	MessageBox.information("FEITO! " + counter + " drawings foram repintados!");
	Print("Drawings repintados: " + counter);
	return true;

	//EXTRA//
	function get_exposure_data(selNode, apply_to){//retorna lista com objetos com info das exposicoes
		var exposure_data = {};
		var coluna = node.linkedColumn(selNode, "DRAWING.ELEMENT");
		
		if(apply_to == "Current frame"){
			var entryD = column.getEntry(coluna, 1, frame.current());
			if(!entryD){
				MessageBox.warning("Nenhum drawing exposto no frame atual!",0,0);
				return false;
			}
			exposure_data[entryD] = {"first_frame": frame.current()};
		}
		
		if(apply_to == "Timeline Exposed"){
			for(var i=1; i<=frame.numberOf(); i++){
				var entryD = column.getEntry(coluna, 1, i);
				if(!entryD){
					continue;
				}
				if(!(entryD in exposure_data)){
						exposure_data[entryD] = {"first_frame": i};
				}
			}
		}
		
		if(apply_to == "All Drawigs"){
			var fr = frame.numberOf() + 1;
			var drawingList = column.getDrawingTimings(coluna);	
			var exposureBackup = {};
			for(var i=0; i<drawingList.length; i++){
				exposureBackup[fr] = column.getEntry(coluna, 1, fr);
				fr++;
			}
			var fr = frame.numberOf() + 1;
			for(var i=0; i<drawingList.length; i++){
				column.setEntry(coluna, 1, fr, drawingList[i]);
				exposure_data[drawingList[i]] = {"first_frame": fr};
				fr++;
			}
			exposure_data["backup"] = exposureBackup;
		}
		return exposure_data;
	}
	
	function redoTempExp(selNode, backupObj){//refaz as exposicoes temporarias depois do fim da cena
		var redoCounter = 0;
		var coluna = node.linkedColumn(selNode, "DRAWING.ELEMENT");
		for(frame in backupObj){
			column.setEntry(coluna, 1, frame, backupObj[frame]);
			redoCounter++;
		}
		Print("Temp exp redo: " + redoCounter);
	}
	
	function repaintDrawing(data, art_list, config){//do the action in one shape type
		var repaint_counter = 0;
		data.arts.forEach(function(x){
			
			if(art_list.indexOf(x.art) == -1){
				Print(" ---- Ignoring art layer: " + x.artName);
				return;
			}
			
			var configObj = {
				drawing : config.drawing,
				art: x.art,
				label: "none",
				layers: []
			};
			
			//create layers obj
			for(var i=0; i<x.layers.length; i++){
				var layerObj = {
							layer: i
							};
				if("contours" in x.layers[i]){
					layerObj["contours"] = fillColor ? updateColorInList(x.layers[i]["contours"], fillColor.id, "fill") : x.layers[i]["contours"];
				}
				if("strokes" in x.layers[i]){
					var strokes = Drawing.query.getStrokes({drawing: config.drawing, art: x.art}).layers[i].strokes;
					layerObj["strokes"] = lineColor ? updateColorInList(strokes, lineColor.id, "line") : strokes;
				}
				configObj["layers"].push(layerObj);
			}
			
			//modify layers
			DrawingTools.modifyLayers(configObj);
			repaint_counter++;
		});
		
		Print(" ---- layers repintadas: " + repaint_counter);
		
		////extra functions/////
		function updateColorInList(objectList, newcolor, type){//atualiza a cor em cada objeto da lista (serve pra countors e strokes list)
			var finalList = objectList;
			var colorKey = type == "line" ? "pencilColorId" : "colorId";
			for(var i=0; i<finalList.length; i++){
				finalList[i][colorKey] = newcolor;
			}
			return finalList;
		}
	}
		
}

exports.repaintDrawings = repaintDrawings;
