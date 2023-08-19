/* V3.0  - adaptado para o BirdoApp
-------------------------------------------------------------------------------
Name:		BD_Mirror.js

Description:	Este script copia a pose do membro do node selecionado e cola no membro oposto, funcina somente para pernas e braços. 

Usage:		selecine uma peca qualquer de um membro do rig, e se for um membro valido para espelhar, vai copiar a pose para o oposto.

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2019. -- update janeiro 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_Mirror(){

	//Initial vars
	var node_erros = 0;
	var initial_sel = selection.selectedNode(0);
	var types_to_ignore = ["StaticConstraint", "MULTIPORT_IN", "MULTIPORT_OUT", "COMPOSITE", "WRITE", "GROUP", "TransformationSwitch", "CUTTER", "KinematicOutputModule", "TbdColorSelector", "LAYER_SELECTOR", "COLOR_CARD"];	

	if(!initial_sel){
		MessageBox.warning("Selection invalid! Please select one node!", 0, 0);
		return;
	}
	
	//define o nome do Membro selecionado e do Rig///
	
	var limbs = get_limbs(initial_sel);
	
	if(!limbs){
		MessageBox.information("Nao e um node valido para copiar!");
		Print("can`t find other limb!");
		return;
	}
	
	var limb_path = limbs.limbA;
	var limb_name = node.getName(limb_path);

	var other_limb = limbs.limbB;
		
	var limb1_node_list = BD2_ListNodesInGroup(limb_path, "", false).filter(function(x){ return types_to_ignore.indexOf(node.type(limb_path + "/" + x)) == -1;});

	
	scene.beginUndoRedoAccum("Mirror " + String(initial_sel.split("/")[1]) + ": " + limb_name);

	//loop entre os membros pra copiar a pose entre os membros//
	for(var i = 0; i<limb1_node_list.length; i++){
		var n1 = limb_path + "/" + limb1_node_list[i];
		var n2 = other_limb + "/" + limb1_node_list[i];
		
		if(node.getName(n2) == ""){
			Print("Node not found: " + n2);
			node_erros++;
			continue;
		}
		BD2_copyAtributes(n1, n2, true);
	};
	
	if(node_erros != 0){
		MessageBox.warning("Pose copiada com ERROS! Este Rig nao esta no padrao com nomenclaturas de nodes nos membros espelhados!\n-[" + node_erros + "] nodes nao foram copiados! Mais info no MessageLog!",0,0);
		Print("Erros:" + node_erros);
	}
	
	Print("Feito! Copia do membro : " + node.getName(limb_path) + " para o membro : " + node.getName(other_limb) + "\n -- erros: " + node_erros);
	scene.endUndoRedoAccum();

	///////////////////funcoes secundarias////////////////////////////////
	function get_limbs(nodePath){
		
		var parentGroup = node.parentNode(nodePath);
		var limbs = {"limbA": parentGroup, "limbB": null};

		while(parentGroup != node.root()){
			var nextNodeInfo = node.srcNodeInfo(parentGroup, 0);
			if(!nextNodeInfo){
				Print("End of navigation..");
				return false;
			}
			
			if(node.type(nextNodeInfo.node) == "StaticConstraint"){
				nextNodeInfo = node.srcNodeInfo(nextNodeInfo.node, 0);
			}
			
			if(node.numberOfOutputLinks(nextNodeInfo.node, nextNodeInfo.port) == 2){
				var link = nextNodeInfo.link == 0 ? 1 : 0;
				var simblingNode = node.dstNode	(nextNodeInfo.node, nextNodeInfo.port, link);
				if(node.type(simblingNode) == "StaticConstraint"){
					simblingNode = node.dstNode(simblingNode, 0, 0);
				}
				if(node.isGroup(simblingNode)){
					limbs["limbA"] = parentGroup;
					limbs["limbB"] = simblingNode;
					return limbs;
				}
			}
		
			parentGroup = node.parentNode(parentGroup);
		}
		return false;
	}
	
}