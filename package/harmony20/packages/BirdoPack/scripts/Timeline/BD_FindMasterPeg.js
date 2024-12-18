/*
-------------------------------------------------------------------------------
Name:		BD_FindMasterPeg.js

Description:	Este script é usado para achar a master PEG do RIG na timeline. 

Usage:		Selecione uma peça do RIG e aperte, a seleção mudara par a MASTER e centralizar na Timeline;

Author:		Leonardo Bazilio Bentolila

Created:	Outubro, 2018 _________Update marco, 2022.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
last update: 
- inclui as utils, 
- fiz funcao recursiva para casos de grupos com mais de um imput

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_FindMasterPeg(){
	
	var regex_match = /MASTER/; //regex with name match for jump node
	
	var nodeSel = selection.selectedNode(0);
	
	if(nodeSel == ""){
		MessageLog.trace("[FINDMASTERPEG] Select a node...");
		return;
	}
	
	var destinyNode = findNode(nodeSel);
	
	if(!destinyNode){
		MessageBox.warning("No Master Peg was found!", 0, 0);
		Print("[FINDMASTERPEG] End of navigation! No MasterPeg was found!");
		return;
	} else {
		selection.clearSelection();
		selection.addNodeToSelection(destinyNode);
		Action.perform("onActionCenterOnSelection()");
	}
	
	//recursive function
	function findNode(initialNode){
		var nextNode = initialNode;
		while(nextNode != ""){
			if(node.type(nextNode) == "MULTIPORT_IN"){
				nextNode = node.parentNode(nextNode);
				continue;
			}

			if(is_jump_node(nextNode)){
				Print("[FINDMASTERPEG] MASTER PEG found: " + nextNode);
				return nextNode;
			}else{
				var ports_number = node.numberOfInputPorts(nextNode);
				if(ports_number > 1){
					for(var i=0; i<ports_number; i++){
						var match_node = findNode(node.srcNode(nextNode, i));
						if(match_node != null){
							return match_node;
						} 
					}
					nextNode = node.srcNode(nextNode, 0);
				} else {
					nextNode = node.srcNode(nextNode, 0);
				}
			}
		}
		return null;
	}
	
	function is_jump_node(nodePath){//checks if node is a jump node
		var nextNodeName = node.getName(nodePath);
		return regex_match.test(nextNodeName) && node.type(nodePath) == "PEG" && nodePath != nodeSel;
	}
}
