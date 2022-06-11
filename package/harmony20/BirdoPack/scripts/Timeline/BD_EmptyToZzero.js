include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*
-------------------------------------------------------------------------------
Name:		BD_EmptyToZzero.js

Description:	Este Script troca todas as posicoes vazias de drawings, para Zzero;

Usage:		Selecione a MASTER do RIG, e selecione a area que pretende afetar na timeline;

Author:		Leonardo Bazilio Bentolila

Created:	Março, 2020; (update julho 21)
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
function BD_EmptyToZzero(){
	scene.beginUndoRedoAccum("Empty To Zzero");

	if(selection.selectedNode(0) == ""){
		MessageBox.information("Selecione a MASTER do RIG minimizada na Timeline!!!");
		return;
	}

	var firstFrame = Timeline.firstFrameSel;
	var endFrame = firstFrame + Timeline.numFrameSel - 1;
	var numSelLayers = Timeline.numLayerSel;
	var drawingName = "Zzero";//nome do Zzero
	var counter = 0;
	
	var progressDlg = new QProgressDialog();
	progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.modal = true;
	progressDlg.open();
	progressDlg.setRange(0, (numSelLayers - 1));

	progressDlg.setLabelText("Analizando... ");

	for(var i=0; i<numSelLayers; i++){
		
		progressDlg.setValue(i);
		
		if(progressDlg.wasCanceled){
			MessageBox.information("Cancelado!");
			return;
		}
	
		if(Timeline.selIsColumn(i)){
			var nomeC = Timeline.selToColumn(i);
		}

		var a = firstFrame;

		while(a<=endFrame){
			
			var tipo = column.type(nomeC);
			var draw = column.getEntry(nomeC, 1, a);
			var colName = column.getDisplayName(nomeC);
			
			if(tipo == "DRAWING" && draw == ""){
				Print("[EMPTYTOZZERO]" + colName + " virou " + drawingName + " no frame: " + a);
				column.setEntry(nomeC, 1, a, drawingName);
				counter++;
			}
			
			progressDlg.setLabelText("Analizando...\n" + colName);
			a++;
			
		}
	}
	
	progressDlg.hide();
	
	scene.endUndoRedoAccum();

	if(counter != 0){
		MessageBox.information("Pronto! " + counter + " camadas foram corrigidas para '" + drawingName + "'!\nVeja o Log para mais detalhes!");
		Print("[EMPTYTOZZERO] Pronto! " + counter + " camadas foram corrigidas para '" + drawingName + "'!\nVeja o Log para mais detalhes!");
	} else {
		MessageBox.information("Nenhuma camada precisou ser mudada!");
		Print("[EMPTYTOZZERO] Nenhuma camada precisou ser mudada!");
	}

}