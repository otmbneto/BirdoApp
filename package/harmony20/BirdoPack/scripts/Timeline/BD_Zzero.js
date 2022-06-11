/*adaptado para BirdoAPP
-------------------------------------------------------------------------------
Name:		BD_Zzero.js

Description:	Este script muda os drawings selecionados para Zzero, caso nao exista na Library, ele cria;

Usage:		Use em apenas um desenho selecionado, ou em uma master peg para pegar todos drawings;

Author:		adaptado leo (autor desconhecido);

Created:	update janeiro 2022;
            
Copyright:   Desconhecido;
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_Zzero(){
	scene.beginUndoRedoAccum("Apply Zzero");

	if(selection.selectedNode(0) == ""){
		MessageBox.warning("Selecione um drawing!!!",0,0);
		return;
	}

	var firstFrame = Timeline.firstFrameSel;
	var endFrame = firstFrame + Timeline.numFrameSel - 1;
	var numSelLayers = Timeline.numLayerSel;
	var drawingName = "Zzero";

	for(var i=0; i<numSelLayers; i++){
		
		var a = firstFrame;
		
		if(Timeline.selIsColumn(i)){
			var nomeC = Timeline.selToColumn(i);
		}
		
		if(column.type(nomeC) != "DRAWING"){
			continue;
		}

		fixeCaseSensitivity(nomeC);

		while(a<=endFrame){
			column.setEntry(nomeC, 1, a, drawingName);
			a++;
		}
	}
	scene.endUndoRedoAccum();

	////////FUNCOES EXTRAS/////////////////////////
	function fixeCaseSensitivity(coluna){
		var timmings = column.getDrawingTimings(coluna);
		for(var i=0; i<timmings.length; i++){
			if(timmings[i].toString().toLowerCase() == drawingName.toLowerCase()){
				if(timmings[i] != drawingName){
					column.renameDrawing(coluna, timmings[i], drawingName);
					Print("Conflito Case Sensitivity na camada: " + column.getDisplayName(coluna) + " ==> atualizado para: " + drawingName);
				}
			}	
		}
	}
}