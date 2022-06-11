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
	var types_to_ignore = ["MULTIPORT_IN", "MULTIPORT_OUT", "COMPOSITE", "WRITE", "GROUP", "TransformationSwitch", "CUTTER", "KinematicOutputModule", "TbdColorSelector", "LAYER_SELECTOR", "COLOR_CARD"];	

	//define o nome do Membro selecionado e do Rig///
	var limb_path = node.parentNode(initial_sel);
	var limb_name = node.getName(limb_path);

	if(!initial_sel){
		MessageBox.warning("Selection invalid! Please select one node!", 0, 0);
		return;
	}
	
	var other_limb = get_other_limb(limb_path, limb_name);
	
	if(!other_limb){
		Print("can`t find other limb!");
		return;
	}
	
	var limb1_node_list = BD2_ListNodesInGroup(limb_path, "", true).filter(function(x){ return types_to_ignore.indexOf(node.type(x)) == -1;});
	var limb2_node_list = BD2_ListNodesInGroup(other_limb, "", true).filter(function(x){ return types_to_ignore.indexOf(node.type(x)) == -1;});
	
	scene.beginUndoRedoAccum("Mirror " + String(initial_sel.split("/")[1]) + ": " + limb_name);


	//loop entre os membros pra copiar a pose entre os membros//
	for(var i = 0; i<limb1_node_list.length; i++){
		var n1 = limb1_node_list[i];
		var n2 = limb1_node_list[i].replace(limb_path, other_limb);
		if(node.getName(n2) == ""){
			n2 = find_match(n1, limb2_node_list);
			if(!n2){
				Print("---Match not found: " + n1);
				node_erros++;
				continue;
			}else{
				Print("***Node found via find_match func:\n - origim: " + n1 + ";\n - destiny: " + n2 + "\n************");
			}
		}
		BD2_copyAtributes(n1, n2);
	};
	
	if(node_erros != 0){
		MessageBox.warning("Pose copiada com ERROS! Este Rig nao esta no padrao com nomenclaturas de nodes nos membros espelhados!\n-[" + node_erros + "] nodes nao foram copiados! Mais info no MessageLog!",0,0);
		Print("Erros:" + node_erros);
	}
	
	Print("Feito! Copia do membro : " + node.getName(limb_path) + " para o membro : " + node.getName(other_limb));
	scene.endUndoRedoAccum();

	///////////////////funcoes secundarias////////////////////////////////
	function get_other_limb(original_limb, limb_name){//funcao que retorna o caminho do membro oposto do selecionado
	
		var nextNode = node.srcNode(original_limb, 0);
		
		while (nextNode != ""){
			var links = node.numberOfOutputLinks(nextNode, 0);

			if(node.type(nextNode) == "PEG" && links == 2){
				for(var i=0; i<links; i++){
					var nodeLinked = node.dstNode(nextNode, 0, i);
					if(nodeLinked == original_limb){
						continue;
					}
					if(is_socket(nodeLinked)){
						nodeLinked = node.dstNode(nodeLinked, 0, 0);
					}
					if(node.getName(nodeLinked).slice(0, 3) == limb_name.slice(0, 3) && nodeLinked != original_limb && node.isGroup(nodeLinked)){
						return nodeLinked;
					}
				}
				
			}
			nextNode = node.srcNode(nextNode, 0);
		}
		MessageBox.information("Falha ao encontra o membro oposto!");
		return false;
		//EXTRA FUNCTION
		function is_socket(nodeP){//checka se o node e um socket
			var socket_regex = /^(Socket)/;
			return (socket_regex.test(node.getName(nodeP)) && node.type(nodeP) == "READ") || node.type(nodeP) == "StaticConstraint";
		};
	};
	
	function find_match(node_path, other_list){//find a match for the node_path in the other limb node list
		var parentName = node.getName(node.parentNode(node_path));
		var match_list = other_list.filter(function(item){
			var same_type = node.type(node_path) == node.type(item);
			var same_depth =  parentName == node.getName(node.parentNode(item)) || is_match_name(parentName, node.getName(node.parentNode(item)));
			var same_element_id = node.getElementId(node_path) == node.getElementId(item);
			var name_match = node.getName(node_path) == node.getName(item) || is_match_name(node.type(node_path), node.type(item));
			return same_type && same_depth && same_element_id && name_match;
		});
		return match_list.length == 1 ? match_list[0] : false;
	}

	function is_match_name(strA, strB){//compare two names to check if is similar or equal
		var regex_def = /^(Deformation|Def|DEF)/;//garante q o nome nao tem Deformation names
		var order = [strA.replace(regex_def, ""), strB.replace(regex_def, "")].sort(function (a,b){ return b.length - a.length;});
		var diff = order[0].split(order[1]).join('');
		if(order[0] == order[1]){
			return true;
		}
		if(order[0].length == order[1].length && order[0].length > 1){
			return order[0].slice(0, order[0].length-2) == order[1].slice(0, order[1].length-2);
		}
		return order[0].replace(diff, "") == order[1] && diff.length < 4; 
	}

}