include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
[0] - nodeArray;
[1] - drawArray;
[2] - colorArray - subArray cores usadas por draw;
[3] - PaletteAttay - subArray Palettas usadas por draw;
-------------------------------------------------------------------------------
Name:		checkNodesPallet.js

Description:	Este Script Checa se Ha mais de uma palette usada na Selecao;

Usage:		Usar como BAT e para include em alguns scripts

Author:		Leonardo Bazilio Bentolila

Created:	Abril, 2020. (update Julho, 2021)
            
Copyright:  leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
function checkNodesPallet(nodes){
	
	var nodesREADs = [];
	var drawingsInNode = [];
	var usedColors = [];
	var usedPalettes = [];
	var finalArray = [];

	var progressDlg; 
	progressDlg = new QProgressDialog();
	progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.modal = true;
	progressDlg.open();
	progressDlg.setRange(0, (nodes.length-1));

	for(var i=0; i<nodes.length; i++){
		var pltArray = new Array();
		var drawArray = new Array();
		var colorInDraArray = new Array();
		progressDlg.setValue(i);
		if(progressDlg.wasCanceled){
			MessageBox.information("Checar Palettas RIG Cancelado!");
			return false;
		}
			if(node.type(nodes[i]) != "READ"){
			continue;
		}
		nodesREADs.push(nodes[i]);
		var coluna = node.linkedColumn(nodes[i],"DRAWING.ELEMENT");
		var ElementId = column.getElementIdOfDrawing(coluna);
		if(element.physicalName(ElementId) == ""){
			continue;
		}
		var elementPaletteList = PaletteObjectManager.getPaletteListByElementId(ElementId);
		for(var y=0; y<Drawing.numberOf(ElementId); y++){
			var corArray = new Array();
			var drawingId = Drawing.name(ElementId, y);
			drawArray.push(drawingId);
			progressDlg.setLabelText("Checando " + nodes[i] + " - " + drawingId);
			var colorArray = DrawingTools.getDrawingUsedColors({elementId : ElementId, exposure : drawingId});
			for(var colorIndex = 0; colorIndex < colorArray.length; colorIndex++){
				var palettID = elementPaletteList.findPaletteOfColor(colorArray[colorIndex]);
				corArray.push(palettID.getColorById(colorArray[colorIndex]).name);
				var paletName = palettID.getName();
				if(pltArray.indexOf(paletName) == -1 && palettID.isValid()){
					pltArray.push(paletName);
				}
			}
			colorInDraArray.push(corArray);
		}
		drawingsInNode.push(drawArray);
		usedColors.push(colorInDraArray);
		usedPalettes.push(pltArray);
	}
	
	progressDlg.hide();
	
	finalArray.push(nodesREADs);
	finalArray.push(drawingsInNode);
	finalArray.push(usedColors);
	finalArray.push(usedPalettes);
	
	return finalArray;
	
}

exports.checkNodesPallet = checkNodesPallet;