include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		BD_CopyPegPivot.js

Description:	Use este script para copiar o pivot de uma peg para outras;

Usage:		Selecione o node de peg para copiar pressionando shift e depois aperte o botao (sem shift) com as pegs de destino selecionadas;

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2023 (março, 2025. update mensagem para portugues!);
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
//TODO: fazer key no paste object com o caminho da cena (se for diferente, avisar q nao reconhece)

function BD_CopyPegPivot(){
		
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	Print("TESTE " + projectDATA["paths"]["birdoPackage"] + "utils/fadeOutMessage.js");
	var utils = require(projectDATA["paths"]["birdoPackage"] + "utils/fadeOutMessage.js");

	var sel_nodes = selection.selectedNodes().filter(function(item){ return node.type(item) == "PEG"});
	if(sel_nodes.length == 0){
		MessageBox.warning("Selecione nodes PEG!",0,0);	
		Print("Node selection empty!");
		return;	
	}
	
	//if shift COPY MODE
	if(KeyModifiers.IsShiftPressed()){
		if(sel_nodes.length > 1){
			MessageBox.warning("Selecione apenas um Node para copiar!",0,0);
			Print("Select only one node to copy pivot!");
			return;		
		}
		var pegdata = {
			peg_path: sel_nodes[0],
			scene_pah: scene.currentProjectPath(),
			P_X: node.getTextAttr(sel_nodes[0], 1, "PIVOT.X"),
			P_Y: node.getTextAttr(sel_nodes[0], 1, "PIVOT.Y"),
		};
		preferences.setString("COPYPIVOTPEG", JSON.stringify(pegdata));
		Print("Pivot peg COPIED: ");
		Print(pegdata);
		utils.fadeOutMessage(projectDATA, "Pivot Copiado...");

	} else {
		//paste pivots
		scene.beginUndoRedoAccum("Copy Peg Pivot");
		var pivotPref = preferences.getString("COPYPIVOTPEG", "");
		if(!pivotPref){
			MessageBox.warning("Nenhuma informação de pivot copiada! Crie uma copia de pivot pressionando 'Shift' e selecionar a peg com o pivot a ser copiado",0,0);
			scene.cancelUndoRedoAccum();
			return;	
		}
		var pivotData = JSON.parse(pivotPref);
		if(pivotData.scene_pah != scene.currentProjectPath()){
			MessageBox.warning("Nenhum pivot copiado na cena! Pressione shift e selecione a PEG de orgigem para copiar a info do pivot!",0,0);
			scene.cancelUndoRedoAccum();
			return;
		}
		
		sel_nodes.forEach(function(item){
			applyPivot(item, pivotData)
		});
		
		Print("Pivot Data: ");
		Print(pivotData);
		utils.fadeOutMessage(projectDATA, "Copiado pivot para" + sel_nodes.length + " peg(s)");
		scene.endUndoRedoAccum();
	}
	
	//extra functions
	function applyPivot(peg, pivotData){
		node.setTextAttr(peg, "PIVOT.X", 1, pivotData.P_X);
		node.setTextAttr(peg, "PIVOT.Y", 1, pivotData.P_Y);	
		Print("Appyed pivot to peg	: " + peg);
	}	
}