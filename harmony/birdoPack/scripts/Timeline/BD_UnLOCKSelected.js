include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_UnLOCKSelected.js

Description:	Este script desloca as camadas selecionadas

Usage:		Selecionar a camada minimizada para deslocar todas camadas abaixo

Author:		Leonardo Bazilio Bentolila

Created:	Junho, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_UnLOCKSelected(){
	
	scene.beginUndoRedoAccum("BD_UnLOCKSelected");

	var numSelLayers = Timeline.numLayerSel;
	var counter = 0;
	for(var i=0; i<numSelLayers; i++){
		
		if(Timeline.layerIsNode(i)){
			var nodeP = Timeline.layerToNode(i);
			Print("Set nod unlock: " + nodeP);
			Print(" >>>> : " + node.setLocked(nodeP, false));
			counter++;
		}	

	}
	scene.endUndoRedoAccum();

	var msg = counter + " layers unlocked!";
	Print(msg);
	MessageBox.information(msg);
}