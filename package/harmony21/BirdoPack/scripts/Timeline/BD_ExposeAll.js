/*
-------------------------------------------------------------------------------
Name:		BD_ExposeAll.js

Description:	Este script expoe na timeline todos os drawings da library da camada selecionada. 

Usage:		Pressione Shift para expor todos os drawings, normal para expor baseado na exposição do Current Frame;

Author:		Leonardo Bazilio Bentolila

Created:	Dezembro, 2018 _____ upDate (julho, 2021).
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
function BD_ExposeAll(){

	var colum = Timeline.selToColumn(0);
	var type = column.type(colum);
		
	if(type != "DRAWING"){
		MessageBox.information("Selecione um Drawing!!!");
		return;
	}
	
	scene.beginUndoRedoAccum("Expose Drawings To Timeline");

	var curFrame = frame.current();
	var timmings = column.getDrawingTimings(colum);
	var currExposure = column.getEntry(colum, 1, curFrame);

	if(KeyModifiers.IsShiftPressed()){
		var drawingList =  listDrawings("");
	} else {
		if(currExposure == ""){
			MessageBox.information("Mude a exposicao do drawing neste frame!");
			scene.cancelUndoRedoAccum();
			return;
		}
		var drawingList =  listDrawings(currExposure[0]);
	}

	for(var i=0; i<drawingList.length; i++){//Expoe os drawings escolhidos
		var nextFrame = curFrame + i;
		column.setEntry(colum, 1, nextFrame, drawingList[i]);
	}

	scene.endUndoRedoAccum();
//////////////FUNCOES EXTRAS///////////////////////////////////////////
	function listDrawings(filtro){
		column.setEntry(colum, 1, curFrame, "");
		var listFinal= [];
		for(var i=0; i<timmings.length; i++){
			Action.perform("onActionSelectedElementSwapToNextDrawing()", "timelineView");
			var nextExposure = column.getEntry(colum, 1, curFrame);
			if(filtro == ""){
				listFinal.push(nextExposure);
				continue;
			}
			if(nextExposure[0] == filtro){
				listFinal.push(nextExposure);
			}
		}
		return listFinal;
	}
}