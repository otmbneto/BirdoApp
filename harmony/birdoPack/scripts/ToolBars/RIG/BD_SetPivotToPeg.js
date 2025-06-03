include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_SetPivotToPeg.js

Description:	Este Script centraliza o pivot da peg em cima do drawing selecionado par ao centro do drawing exposto;

Usage:		Selecione o node do drawing para setar sua o pivot de sua peg para o centro;

Author:		Leonardo Bazilio Bentolila

Created:	Março, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_SetPivotToPeg(){
	
	var nodeSel = selection.selectedNode(0);
	var pegNode = node.srcNode(nodeSel, 0);

	if(!nodeSel || node.type(nodeSel) != "READ"){
		MessageBox.warning("Select a drawing node!",0,0);
		return;
	}
	
	if(node.isGroup(pegNode)){
		pegNode = node.srcNode(pegNode, 0);
	}
	
	if(!pegNode || node.type(pegNode) != "PEG"){
		MessageBox.warning("No peg connected to this node!",0,0);
		return;
	}
	
	if(element.vectorType(node.getElementId(nodeSel)) != 2){
		MessageBox.warning("This script only works for vector drawings node! This is a BITMAP type node.",0,0);
		return;	
	}
	
	scene.beginUndoRedoAccum("BD Set pivot");

	var finalBox = null;
	
	//get arts box values
	for(var i=0; i<4; i++){
	
		var config = {
			drawing: {node: nodeSel, frame: frame.current()},
			art: i
		};
		
		var box = Drawing.query.getBox(config);
		
		if("empty" in box && box.empty){
			Print("empty art: " + i);
			continue;
		}
		
		Print(" -- Drawing box at art: " + i);
		Print(box);
		
		if(finalBox == null){
			finalBox = boxToRect(box);
		} else {
			var rec = boxToRect(box);
			finalBox = finalBox.united(rec);
		}
	}
	
	if(!finalBox){
		MessageBox.warning("Drawing is empty at this frame!",0,0);
		Print("Drawing is empty at this frame!");
		return;
	}
	
	Print("Fild drawing center: ");
	Print({x: finalBox.center().x(), y: finalBox.center().y()});
	
	var scenePos = {
		x: finalBox.center().x()/208.25,
		y: finalBox.center().y()/156.57
	};
	
	Print("Scene OLG drawing center: ");
	Print(scenePos);
	
	//changes pivot value
	Print("set the pivot x: " + node.setTextAttr(pegNode, "PIVOT.X", 1, scenePos.x));
	Print("set the pivot y: " + node.setTextAttr(pegNode, "PIVOT.Y", 1, scenePos.y));

	//set final selection
	selection.clearSelection();
	selection.addNodeToSelection(pegNode);
	
	
	scene.endUndoRedoAccum();

	//extra functions
	function boxToRect(box){//convert box object to QRect
		return new QRect(box.x0, box.y0, (box.x1 - box.x0), (box.y1 - box.y0));
	}
	
}