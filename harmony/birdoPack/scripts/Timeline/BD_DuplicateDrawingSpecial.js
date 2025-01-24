/*
-------------------------------------------------------------------------------
Name:		BD_DuplicateDrawingSpecial.js

Description:	Este Script serve para substituir o Duplicate drawings do programa! Ele Cria um nome novo baseado no nome atual.! 

Usage:		Duplica drawings com nome especial para não haver comflito no Copy and Paste de poses;

Author:		Leonardo Bazilio Bentolila

Created:	Setembro, 2018._____ upDate (marco, 2020);
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_DuplicateDrawingSpecial(){
	
scene.beginUndoRedoAccum("Duplicate Drawing Special");

var nodeSel = selection.numberOfNodesSelected();

	if(nodeSel > 1){
	MessageBox.information("Selecione apenas um Node!");
	return;
	} else if(nodeSel == 0){
	MessageBox.information("Selecione um Node!");
	return;
	}

var curFrame = frame.current();
var coluna = Timeline.selToColumn(0);
var colunaType = column.type(coluna);

var currExposure = String(column.getEntry(coluna,1,curFrame).split("_")[0]);
var data = new Date().getTime().toString();
var random = Math.floor(Math.random() * data).toString();

var newName = currExposure + "_" + random.slice(random.length-4, random.length);
		
	if(colunaType != "DRAWING"){
	MessageBox.information("Selecione um Drawing!!!");
	return;
	}
var elementId = column.getElementIdOfDrawing(coluna);
var drawingExist= Drawing.isExists(elementId,newName);

	if(drawingExist){
	BD_DuplicateDrawingSpecial();
	}

var duplicate = column.duplicateDrawingAt(coluna, curFrame);

	if(duplicate){
	var currDrawing = column.getEntry(coluna, 1, curFrame);
	column.renameDrawing(coluna, currDrawing, newName);
	} else {
	MessageBox.information("Erro ao duplicar! Tente de novo!!");
	}

	scene.endUndoRedoAccum();
}