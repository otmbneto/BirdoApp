/*
-------------------------------------------------------------------------------
Name:		BD_FULLAnimation.js

Description:	Este script é usado para posar um membro todo em uma unica peca chamda FULL, que quase todo grupo no rig tem. 

Usage:		Selecione uma peça do RIG e aperte, se houver FULL nesse grupo, ele ira jogar todos os drawings para Zzero e selecionar o node FULL pra voce so desenhar;

Author:		Leonardo Bazilio Bentolila

Created:	Outubro, 2018 _________Update junho, 2022.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_FULLAnimation(){
	
	
	//inicia o birdoApp
	var proj_data = BD2_ProjectInfo();
	if(!proj_data){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	scene.beginUndoRedoAccum("Birdoapp Full Animation");
	
	try{
		var inNode = selection.selectedNode(0);
		var rig_regex = proj_data.get_rig_regex();
		var rig = BD2_substringRegex(inNode, rig_regex);
		var rigVerssion = BD2_substringRegex(inNode, proj_data.pattern.asset);

		if(!rigVerssion && !rig){
			Print("Nao e possivel encontrar o grupo do rig e da versao! O check de main group nao vai rolar..");
		}

		var nodeGroup = node.parentNode(inNode);
		if(nodeGroup == rig){
			MessageBox.information("Este node selecionado esta fora do grupo Principal do RIG!\nSelecione uma Peca dentro do RIG!");
			return;
		}
		
		if(nodeGroup == rigVerssion){
			if(!BD2_AskQuestion("A peca selecionada esta no GRUPO principal e ira Jogar TODO o RIG para MasterFULL!\Deseja Prosseguir??")){
				return;
			}
		}

		if(nodeGroup == node.root() || node.getName(inNode) == ""){
			MessageBox.information("Selecione uma peca dentro do RIG no membro que voce quer transformar em FULL!");
			return;
		}

		selection.clearSelection();
		var toZzero = true;
		
		if(KeyModifiers.IsShiftPressed()){
			toZzero = false;
		}

		changeToFULL(nodeGroup)
	} catch(e){
		Print(e);
	}
	
	scene.endUndoRedoAccum();

	/////////////////////////////////////////FUNCOES  EXTRAS///////////////////////////////////////
	function changeToFULL(membroGrupo){
		
		var full = getFull(membroGrupo);
		if(!full){
			MessageBox.warning("O Membro selecionado Nao possui FULL!\Deseja Usar o FULL Master??",0,0);
			return false;
		}
		changeGroupToZzero(membroGrupo, full);

		selection.addNodeToSelection(full);
		Action.perform("onActionChoosePencilTool()");
		
		MessageBox.information("Node FULL selecionado neste frame!");
		
		//HELPER functions
		function getFull(grupo){//acha o full na lista
			var sub = node.subNodes(grupo);
				for(var i=0; i<sub.length; i++){
					if(node.type(sub[i]) == "READ" && sub[i].indexOf("FULL") != -1){
						return sub[i];
					}
				}
			return false;
		}
		
		function changeGroupToZzero(grupo, fullNode){//muda todo o GRUPO para Zzero, e o FULL pro Desenho novo
			var reads = BD2_ListNodesInGroup(grupo, ["READ"], true);
			var counter = 0;
			for(var i=0; i<reads.length; i++){
				if(reads[i] == fullNode){
					var fullC = node.linkedColumn(reads[i],"DRAWING.ELEMENT");
					var fullDrawing = "FULL_" + Math.floor(Math.random() * new Date().getTime()).toString().slice(-4);
					column.setEntry(fullC, 1, frame.current(), fullDrawing);
					if(!toZzero){//retorna caso nao precise mudar pro zzero
						return;
					}
					continue;
				}
				if(toZzero){
					var d = node.linkedColumn(reads[i],"DRAWING.ELEMENT");
					column.setEntry(d, 1, frame.current(), "Zzero");
					counter++;
				}
			}
			Print("Nodes trocados para Zzero: " + counter);
		}
	}
}
