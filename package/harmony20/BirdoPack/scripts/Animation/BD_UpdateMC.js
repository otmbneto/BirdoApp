/*
-------------------------------------------------------------------------------
Name:			BD_UpdateMC.js

Description:	Este Script para mostrar ou esconder os MC dos rigs na cena (atualiza os nomes de grupos quando faz isso)

Usage:			Show/hide todos MC da cena 

Author:			Leonardo Bazilio Bentolila

Created:		Agosto, 2022
            
Copyright:   	leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_UpdateMC(){
	
	scene.beginUndoRedoAccum("Update MC");

	//lista todos MC da cena
	var mc_list = node.getNodes(["MasterController"]).filter(function(x){
		return node.getName(x) == "mc_Function";
	});
	
	if(mc_list.length == 0){
		Print("No MC found in the scene!");
		return;
	}
	
	for(var i=0; i<mc_list.length; i++){
		var control_mode = node.getTextAttr(mc_list[i], 1, "SHOW_CONTROLS_MODE");
		var new_mode = control_mode == "Always" ? "Normal" : "Always";
		node.setTextAttr(mc_list[i], "SHOW_CONTROLS_MODE", 1, new_mode);
		Print("Node: " + mc_list[i] + " changed to : " + new_mode);
		
		//search for palce holder node
		var ph = findMCPlaceHolder(mc_list[i]);
		
		if(ph){
			var enabled = new_mode == "Always";
			node.setEnable(ph, enabled);
		}
		
		if(new_mode == "Normal"){
			Action.perform("onActionHideAllControls()");
		}
	}
	
	scene.endUndoRedoAccum();

	//extra
	function findMCPlaceHolder(mc_node){
		var nextNode = node.srcNode(mc_node,0);
		var phnode = null;
		while(nextNode != ""){
			if(node.type(nextNode) == "READ" && node.getName(nextNode) == "CB_MC"){
				return nextNode;
			}
			nextNode = node.srcNode(nextNode,0);
		}
		return phnode;
	}
}