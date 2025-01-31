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

	if(selection.selectedNode(0) == ""){
		MessageBox.information("Selecione a MASTER do RIG minimizada na Timeline!!!");
		return;
	}
	
	scene.beginUndoRedoAccum("Empty To Zzero");

	var firstFrame = Timeline.firstFrameSel;
	var endFrame = firstFrame + Timeline.numFrameSel - 1;
	var numSelLayers = Timeline.numLayerSel;
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
			scene.cancelUndoRedoAccum();
			return;
		}
	
		if(!Timeline.selIsColumn(i)){
			continue;
		}
		var nomeC = Timeline.selToColumn(i);
		if(column.type(nomeC) != "DRAWING"){
			continue;				
		}
		
		var colName = column.getDisplayName(nomeC);
		var a = firstFrame;
		while(a<=endFrame){

			var draw = column.getEntry(nomeC, 1, a);
			if(draw == ""){
				if(BD2_addZzero(nomeC, a)){
					Print(" -- camada " + colName + " alterada de vazio para Zzero no frame: " + a); 	
				}
				counter++;
			}
			
			progressDlg.setLabelText("Analizando...\n" + colName);
			a++;
		}
	}
	
	progressDlg.close();	
	scene.endUndoRedoAccum();

	if(counter != 0){
		var msg = "Pronto! " + counter + " camadas foram trocadas para 'Zzero'!\nVeja o Log para mais detalhes!";
		MessageBox.information(msg);
		Print(msg);
	} else {
		MessageBox.information("Nenhuma camada precisou ser mudada!");
		Print("[EMPTYTOZZERO] Nenhuma camada precisou ser mudada!");
	}

}