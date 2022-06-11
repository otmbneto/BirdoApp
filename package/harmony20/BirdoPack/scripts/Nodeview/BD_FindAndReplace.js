/*
-------------------------------------------------------------------------------
Name:		BD_FindAndReplace.js

Description:	Este script renomeia nodes selecionados, e sub grupos caso tenha um grupo selecionado

Usage:		Use os campos Find and Replace para renomear nomes, use os filtros de nodes  para avancado;

Author:		Leonardo Bazilio Bentolila

Created:	Dezembro, 2018 _____ upDate (marco, 2021).
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_FindAndReplace(){
	
	scene.beginUndoRedoAccum("Find And Replace")

	d = new Dialog;
	d.title = "Find and Replace";

	var group = new GroupBox;

	var findLE = new LineEdit;
	var replaceLE = new LineEdit;
		
	findLE.label = "Find:";
	replaceLE.label = "Replace:";

	group.add(findLE );
	d.addSpace(1);
	group.add( replaceLE);
	d.add(group);

	var group2 = new GroupBox;
	var PEGs = new CheckBox;
	var DRAWINGs = new CheckBox;
	var GROUPs = new CheckBox;
	var l1 = new Label();
	
	var checkList = [PEGs, DRAWINGs, GROUPs];
	
	l1.text = "Renomear Somente Os Tipos:";
	d.addSpace(1);
	d.add(l1);

	group2.add(PEGs);
	group2.add(DRAWINGs);
	group2.add(GROUPs);
	
	d.add(group2);

	PEGs.checked = false;
	DRAWINGs.checked = false;
	GROUPs.checked = false;

	PEGs.text = "Pegs Nodes";
	DRAWINGs.text = "Drawings Nodes";
	GROUPs.text = "Groups Nodes";

	var rc = d.exec();

	if(!rc){
		Print("cancelado..");
		return;
	}

	var _find = findLE.text;
	var _replace = replaceLE.text;

	var typeList = ["PEG", "READ", "GROUP"];

	//define type list by checked widgets
	for(var i=0; i < checkList.length; i++){
		if(checkList[i].checked){
			typeList.splice(i,1);
		}
	}

	var nodes = BD2_ListNodesInSelection(selection.selectedNodes(), typeList);
	var counter = 0;

	//rename listed nodes
	for(var i=0; i<nodes.length; i++){
		var nodeName = node.getName(nodes[i]);
		var newNodeName = nodeName.replace(_find, _replace);
		var columnId = node.linkedColumn(nodes[i],"DRAWING.ELEMENT");
		var elementKey = column.getElementIdOfDrawing(columnId);
		var newColumnName = newNodeName;

		if(node.rename(nodes[i], newNodeName)){
			column.rename(columnId, newColumnName);
			element.renameById(elementKey, newNodeName);
			Print("Este node mudou de Nome: " + nodes[i]);
			counter++;
		}
	}
	Print(counter + " node(s) nodes foram renomeados!");
	MessageBox.information("Feito! " + counter + " node(s) mudaram de nome! Mais detalhes no MessageLog!");
	
	scene.endUndoRedoAccum();

}