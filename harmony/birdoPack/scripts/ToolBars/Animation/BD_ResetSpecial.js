/*adptado BirdoAPP - v2.0 - (MELHORAS NO JEITO Q FAZ O RESET (ADD TUDO DE UMA VEZ E RODA O Action em tudo selectionado)
v2.1 - melhora no jeito q define se o grupo e um Deform group (checa conteudo padrao de def e nome do grupo com prefix Def)
-------------------------------------------------------------------------------
Name:		BD_ResetSpecial.js

Description:	Este Script é uma opção para resetar as peças de forma mais rapida!

Usage:		Selecione um drawings, e aperte normal para resetar o drawing (se for o caso), seu peg e seus possíveis Defformers; Aperte com Shift e resete o grupo deste drawing inteiro!

Author:		Leonardo Bazilio Bentolila

Created:	Março, 2019 - update Formatacao janeiro, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_ResetSpecial(){

	var nodes_sel = selection.selectedNodes();
	
	var types_to_reset = ["PEG", "GROUP", "READ"];
	var nodes_to_reset = [];

	//checa se a seleção inicial está correta. Só funciona se selecionar um desenho!//
	if(nodes_sel.length == 0){
		MessageBox.information("renhum node selecionado!");
		return;
	}

	//DEfine grupo de nodes a resetar
	if(nodes_sel.length == 1){
		if(node.type(nodes_sel[0]) == "READ"){//se selecao for de um NODE READ, seleciona o deform em cima dele caso exista, e a peg em cima dele
			var nextNode = node.srcNode(nodes_sel[0],0);
			if(node.isGroup(nextNode) && is_def_group(nextNode)){
				nodes_to_reset.push(nextNode);
				nodes_to_reset.push(node.srcNode(nextNode,0));
				var mcnode = findMCDef(nextNode);
				if(mcnode){
					nodes_to_reset.push(mcnode);
				}
			}
			if(is_anim_node(nodes_sel[0])){
				nodes_to_reset.push(nodes_sel[0]);
			}else if(node.type(nextNode) == "PEG"){
				nodes_to_reset.push(nextNode);
			}
			
		} else if(node.type(nodes_sel[0]) == "PEG"){//se selecao e uma PEG
			nodes_to_reset.push(nodes_sel[0]);
		} else if(node.isGroup(nodes_sel[0])){//se selecao e um grupo
			if(is_def_group(nodes_sel[0])){
				nodes_to_reset.push(nodes_sel[0]);
			} else {
				nodes_to_reset = BD2_ListNodesInGroup(nodes_sel[0], types_to_reset, true);
			}
		}
		
		if(KeyModifiers.IsShiftPressed()){
			var parentGroup = node.parentNode(nodes_sel[0]);
			nodes_to_reset = BD2_ListNodesInGroup(parentGroup, types_to_reset, true);
		}
	} else {
		var filtered_list = nodes_sel.filter(function(x){return (node.type(x) == "READ" &&  is_anim_node(x)) || node.type(x) == "PEG"});
		nodes_to_reset = filtered_list;
	}
	
	if(nodes_to_reset.length > 100){
		if(!avisoResetRig()){
			return;
		}
	}

	scene.beginUndoRedoAccum("Reset Special: " + node.getName(nodes_sel[0]));
	Print("reseting [" + nodes_to_reset.length + "] nodes!");
	//SET THE SELECTION
	selection.clearSelection();
	selection.addNodesToSelection(nodes_to_reset);
	
	//DO THE ACTIONS
	Action.perform("onActionCopyRestingPositionToCurrentPosition()","miniPegModuleResponder");
	Action.perform("onActionResetAll()");
	
	selection.clearSelection();
	selection.addNodesToSelection(nodes_sel);

	scene.endUndoRedoAccum();

///////////////////////////////FUNCOES EXTRAS///////////////////////////////////
	function is_anim_node(thisnode){//checa se e um node READ q tem animimation habilitada
		return node.type(thisnode)=="READ" && node.getTextAttr(thisnode,0,"CAN_ANIMATE")== "Y";
    }
	
	function is_def_group(thisnode){//checa se e um node GROUP de Def
		var subs = node.subNodes(thisnode).filter(function(x){
						return node.type(x) == "TransformationSwitch" || node.type(x) == "CurveModule";
						});
		return subs.length != 0 || node.getName(thisnode).slice(0, 3) == "Def";
    }

	function avisoResetRig(){//Inicia um dialog com opção de continuar ou cancelar///
		var ask = MessageBox.warning("Deseja resetar o RIG inteiro? Pode ficar bem bizarro,\nmas qualquer coisa so Desfazer tmb...", 3, 4);
		return ask != 4;
	}

	function findMCDef(next_node){
		for(var i=0; i<node.numberOfOutputLinks(next_node, 0); i++){
			var downNode = node.dstNodeInfo(next_node, 0, i);
			if(/^mcDef/.test(node.getName(downNode.node)) && node.isGroup(downNode.node)){
				return downNode.node;
			}
		}
		return false;
	}	
}