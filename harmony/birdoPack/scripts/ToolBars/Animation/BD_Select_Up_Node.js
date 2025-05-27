/*NAO CONTEM ICONE! PARA USO SOMENTE COMO SHORTCUT
-------------------------------------------------------------------------------
Name:		BD_Select_Up_Node.js

Description:	Este script serve para selecionar o proximo node na hierarquia ignorando grupos, efeitos e mostra o deform quando disponivel

Usage:		Serve como substituto do orignial Select Parent Node Skipping Effects do toon boom.

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2022
            
Copyright:   leobazao_@Birdo (adaptado da ideia do script do Stoliar);
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_Select_Up_Node(){
	
	//INITIAL VARS
	var nodeSelected = selection.selectedNode(0);
	var nextNode = node.srcNode(nodeSelected,0);

	//hide deformers and mcdeformers
	Action.perform("onActionHideDeformer(QString)","miniPegModuleResponder", nodeSelected);
	Action.perform("onActionHideAllControls()");

	if(nodeSelected == ""){
		Print("[BD_SELECTUPNODE] No NODE selections found!");
		return;
	}

	if(nextNode == ""){
		Print("[BD_SELECTUPNODE] End of navigation!!");
		return;
	}
	
	if(node.type(nextNode) == "MULTIPORT_IN"){//pula grupos
		var nextNode = node.parentNode(nextNode);
	}
	if(node.isGroup(nextNode)){
		nextNode = node.srcNode(nextNode, 0);
	}
	
	//show deformers
	showDeformation(nodeSelected, nextNode);
	
	selection.clearSelection();
	selection.addNodeToSelection(nextNode);
	Print("[BIRDOAPP] node UP selected: " + nextNode);

	//EXTRA FUNCTIONS
	function showDeformation(init_node, next_node){
		for(var i=0; i<node.numberOfOutputLinks(next_node, 0); i++){
			var downNode = node.dstNodeInfo(next_node, 0, i);
			if(/^mcDef/.test(node.getName(downNode.node)) && node.isGroup(downNode.node)){
				var mcnode = downNode.node + "/mc_DeformerOnDeformer";
				Print("mcDeform found: " + mcnode);
				node.showControls(mcnode, true);
				return true;
			}
		}
		if(node.type(init_node) == "READ"){
			Action.perform("onActionShowSelectedDeformers()","miniPegModuleResponder");
		}
	}
}