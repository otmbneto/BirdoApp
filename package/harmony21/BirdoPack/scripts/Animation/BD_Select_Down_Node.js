/*NAO CONTEM ICONE! PARA USO SOMENTE COMO SHORTCUT
-------------------------------------------------------------------------------
Name:		BD_Select_Down_Node.js

Description:	Este script serve para selecionar o node ABAIXO da selecao na hierarquia ignorando grupos e efeitos

Usage:		Serve como substituto do orignial Select Choild Node Skipping Effects do toon boom.

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2022
            
Copyright:   leobazao_@Birdo (adaptado da ideia do script do Stoliar);
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_Select_Down_Node(){
	
	//SELECT CHILD	
	Action.perform("onActionNaviSelectChild()");

	var nodeSelected = selection.selectedNode(0);

	if(nodeSelected == "" || node.type(nodeSelected) == "COMPOSITE"){
		Print("[BD_SELECTUPNODE] End of navigation!!");
		return;
	}

	if(node.isGroup(nodeSelected)){//pula grupos
		Action.perform("onActionNaviSelectChild()");
	}	
	
}