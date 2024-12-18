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

	if(selection.selectedNode(0) == ""){
		MessageBox.warning("Selecione um drawing!!!",0,0);
		return;
	}
	
	scene.beginUndoRedoAccum("Apply Zzero");

	var firstFrame = Timeline.firstFrameSel;
	var endFrame = firstFrame + Timeline.numFrameSel - 1;
	var numSelLayers = Timeline.numLayerSel;

	for(var i=0; i<numSelLayers; i++){
		
		if(!Timeline.selIsColumn(i)){
			continue;
		}
		
		var nomeC = Timeline.selToColumn(i);		
		if(column.type(nomeC) != "DRAWING"){
			continue;
		}
		
		var a = firstFrame;
		while(a<=endFrame){
			if(BD2_addZzero(nomeC, a)){
				Print("-- Changed in frame: " + a);
			} else {
				Print("-- ERROR changing to zzero at frame: " + a);	
			}
			a++;
		}
	}
	scene.endUndoRedoAccum();

}