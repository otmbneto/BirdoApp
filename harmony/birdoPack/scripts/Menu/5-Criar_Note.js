include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* 
Name:		5-Criar_Note.js

Description:	Este Script cria um novo node para criar notes e organiza no grupo de _NOTES;

Usage:		Acesse pelo menu do birdoapp, e aperte no menu para criar o node.

Author:		Leonardo Bazilio Bentolila

Created:	Novembro, 2020; (update agosto 2025)
            
Copyright:   @leobazao, @camelo
 
-------------------------------------------------------------------------------
*/

function CriarNote(){
	
	var projectDATA = BD2_ProjectInfo();
	if(projectDATA.user_type != "ANIM_LEAD" && projectDATA.user_type != "DT"){
		MessageBox.information("Apenas para supervisores.");
		return;
	}

	scene.beginUndoRedoAccum("Add Note");
	var _notes = "Top/_NOTES";

	if(node.getName(_notes)==""){
		MessageBox.information("Essa cena não tem um espaço dedicado para receber notes.");
		return;
	}

	var composite = _notes + "/Composite";
	var tempNotesList = node.subNodes(_notes);
	var listNumbers = tempNotesList.filter(function(i){return node.type(i) == "READ";});
	var nodeName = getNextNoteNAME(listNumbers);
	var note_node = BD2_addNode("READ", _notes, nodeName, {x:0, y:0, z:0}); 

	var saida = _notes + "/Multi-Port-In";
	var addPort;
	if(node.numberOfOutputPorts(saida) == 0){
		addPort = true;
	} else {
		addPort = false;
	}
	
	node.link(saida, 0, note_node, 0, addPort, true);
	node.link(note_node, 0, composite,0); 

	organizaNotes(composite);

	selection.clearSelection();
	selection.addNodeToSelection(note_node);
	Action.perform("onActionChooseBrushTool()");
	node.setAsGlobalDisplay("Top/SETUP/_PREVIEW");
	preferences.setBool("DRAWING_LIGHTTABLE_ENABLE_SHADE_FRAME_VIEW", false);

	scene.endUndoRedoAccum();
	
	MessageBox.information("O node " + nodeName + " foi criado!\nBrush tool foi selecionada para começar a criar o Note!");

/////////////////////////////////////////////FUNCOES EXTRAS////////////////////////////////////////////////////
	function getNextNoteNAME(numeros){//pega o nome para o proximo NOTE
		var d = new Date();
		var year = "" + d.getFullYear();
		var month = d.getMonth() + 1 + "";
		if(month.length == 1){month = "0" + month;}
		var day = "" + d.getDate();
		if(day.length == 1){day = "0" + day;}
		var hours = "" + d.getHours();
		if(hours.length == 1){hours = "0" + hours;}
		var mins = "" + d.getMinutes();
		if(mins.length == 1){mins = "0" + mins;}
		var secs = "" + d.getSeconds();
		if(secs.length == 1){secs = "0" + secs;}
		var stamp = year + month + day;
		stamp = "nt_" + stamp + "_" + hours + "h" + mins + "m" + secs + "s";
		numeros.sort();
		if(numeros.length > 0){
			var last = numeros.pop();
			last = last.split("/").pop();
			if(last == stamp){
				stamp = stamp + "_";
			}
		}
		return stamp 
	}	

	function organizaNotes(comp){
		var space = 30; // Define o espaço entre os nodes//
		var nodesCon = node.numberOfInputPorts(comp);
		var startCoordX = defineCoordXPrimeiroNode(comp);
		var startCoordY = node.coordY(comp);
		//organiza pra cima os nodes a partir da comp selecionada//
		for(var i=0;i<nodesCon;i++){
			var n1 = node.srcNode(comp,i);
			if(node.type(n1)!="MULTIPORT_IN" && n1!=" " ){ //evita possiveis erros//
				var n1Size = node.width(n1);
				startCoordX = startCoordX - (n1Size + space);
				node.setCoord(n1, startCoordX, (startCoordY - 150));
			}
		}
		
		//define posicao do primeiro node a direita baseado no numero de nodes conectado na comp, com espaço entre eles como parametro//
		function defineCoordXPrimeiroNode(Comp){
			var xPosComp = node.coordX(Comp);
			var coord = 0;
			var ports = node.numberOfInputPorts(Comp);
			for(var i=0; i<ports; i++){
				var nC = node.srcNode(Comp,i);
				var nodeSize = node.width(nC);
				coord = coord + nodeSize;
			}
			var mid = Math.floor(coord / 2);		
			var posFINAL = xPosComp + mid + node.width(node.srcNode(Comp,0));
			return posFINAL;
		}
	}
}
exports.CriarNote = CriarNote;
