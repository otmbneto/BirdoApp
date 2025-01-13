/*
-------------------------------------------------------------------------------
Name:		BD_SmartTiming.js

Description:	Este Script escolhe um drawing para ser substituido a exposicao por outro drawing na timeline inteira!

Usage:		Selecione o drawing A para ser trocado pelo drawing B

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2020. (update Set 2021)
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_SmartTiming(){
	
	var module = selection.selectedNode(0);

	if(module==""){
		MessageBox.information("Nenhum node selecionado!");
		return;
	}

	if(selection.numberOfNodesSelected() > 1){
		MessageBox.information("Selecione apenas um Node!!"); 
		return;
	}

	if(node.type(module) != "READ"){
		MessageBox.information("Isto Não é um node possível!\nSelecione um Drawing!!"); 
		return;
	}

	var projData = BD2_ProjectInfo();
	
	if(!projData){
		return;
	}

	var timings = BD2_getTimingsOfSelected(module);//pega a library de timing na ordem certa

	var d = new interfaceSmartTiming(projData, module, timings);
	d.ui.show();


}

//////////INTERFACE/////////////////
function interfaceSmartTiming(projData, nodesel, drawingList){

	this.ui = UiLoader.load(projData.paths.birdoPackage + "ui/BD_SmartTiming.ui"); ///FIXME UI PATH
	this.ui.setMaximumSize(357, 331);//fix windows size
	this.ui.activateWindow();

	//SELECITION
	this.nodesel = nodesel;


	//Cria Combos
	this.ui.group.comboA.addItems(drawingList);
	this.ui.group.comboA.setCurrentIndex(0);
	this.ui.group.comboB.addItems(drawingList);
	this.ui.group.comboB.setCurrentIndex(0);
	
	//CALL BACK FUNCIONS
	this.okOperation = function(){
		
		scene.beginUndoRedoAccum("Smart Timing");
		this.timingA = this.ui.group.comboA.currentText;
		this.timingB = this.ui.group.comboB.currentText;

		if(this.timingA == this.timingB){
			MessageBox.information("Escolha dois drawings diferentes para troca acontecer!");
			return;
		}
			
		this.del = changeEposureInAllTimeline(this.nodesel, this.timingA, this.timingB);
		
		if(this.del == 0){
			MessageLog.trace("nenhuma exposicao alterada na timeline!");
		}
		
		if(this.del == "fail"){
			MessageBox.information("Falha ao mudar a exposicao!");
			scene.cancelUndoRedoAccum();
			return;
		}

		this.msg = "Pronto! " + this.del + " desenhos foram trocados na timeline da cena!\nMais info no MessageLog!"

		if(this.ui.checkDel.checked){
			if(removeTimingFromLibrary(this.nodesel, this.timingA)){
				this.msg += "\nO Desenho " + this.drawA + " foi removido da library do node!";
				MessageLog.trace("Drawing " + this.timingA + " removed from de the library!");
			} else {
				MessageLog.trace("Falha ao deletar o drawing " + this.timingA + " da library!");
			}
		}
		scene.endUndoRedoAccum();
		MessageBox.information(this.msg);
		this.ui.close();
	}

	this.cancelOperation = function(){
		MessageLog.trace("SmartTiming Canceled!!!");
		this.ui.close();
	}

	///connection//
	this.ui.cancelButton.clicked.connect(this,this.cancelOperation);
	this.ui.okButton.clicked.connect(this,this.okOperation);

////////////////////////FUNCOES EXTRAS///////////////////
	function changeEposureInAllTimeline(nodesel, drawA, drawB){
		
		var col = node.linkedColumn(nodesel, "DRAWING.ELEMENT");
		var end = frame.numberOf();
		var counter = 0;

		var progressDlg = new QProgressDialog();
		progressDlg.modal = true;
		progressDlg.open();
		progressDlg.setRange(0, end);
		
		for(var i= 1; i<end; i++){
			if(progressDlg.wasCanceled){
				MessageBox.information("Cancelado!");
				return "fail";
			}
			progressDlg.setValue(i);
			var nextDra = column.getEntry(col, 1, i);
			progressDlg.setLabelText("Analizando frame: " + i + "\nDrawing: " + nextDra);
			if(nextDra == drawA){
				MessageLog.trace("drawing " + drawA + " changed at frame " + i);
				column.setEntry(col, 1, i, drawB);
				counter++;
			}
		}
		progressDlg.hide();
		return counter;
	}

	function removeTimingFromLibrary(nodesel, draw){
		var col = node.linkedColumn(nodesel, "DRAWING.ELEMENT");
		var fist_exposure = column.getEntry(col, 1, 1);
		column.setEntry(col, 1, 1, draw);
		var del = column.deleteDrawingAt(col, 1);
		column.setEntry(col, 1, 1, fist_exposure);
		return del;
	}	

}