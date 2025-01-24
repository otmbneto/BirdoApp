/*V2.0 ==> fix de scopo q tava com problema! Arrumei a funcao que muda o 3DPath
-------------------------------------------------------------------------------
Name:		BD_3DPathToSeparate.js

Description:	Este Script muda uma selecao de PEGs ou desenho de 3Dpath para separete sem perder os Keyframes (funciona dentro de grupos).

Usage:		Selecione nodes ( PEG or Drawing, ou grupos), que o script varre procurando por 3Dpath para mudar 

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2019.___UPDATE Maio, 2020;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_3DPathToSeparate(){

	var n = selection.numberOfNodesSelected();
	if(n == 0){
		MessageBox.information("Selecione pelo menos uma PEG!"); 
		return;
	}
	
	var counter = 0;
	var nodeList = get_pegs_and_reads_in_selection(n);

	if(nodeList.length == 0){
		MessageBox.information("Nenhuma PEG ou DRAWING na selecao!");
		return;
	}
	
	scene.beginUndoRedoAccum("3DPath To Separate");
	
	Print(nodeList);
	
	var progressDlg = new QProgressDialog();
	progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.modal = true;
	progressDlg.open();
	progressDlg.setRange(0, (nodeList.length - 1));

	progressDlg.setLabelText("Analizando... ");
		
		
	for(var i=0; i<nodeList.length; i++){
	
		progressDlg.setValue(i);
		progressDlg.setLabelText("Analizando...\n" + node.getName(nodeList[i]));

		if(progressDlg.wasCanceled){
			MessageBox.information("Cancelado!");
			return;
		}
		
		if(changeTo3DPath(nodeList[i])){
			counter++;
		}
	}
	
	progressDlg.hide();
	
	if(counter>0){
		MessageBox.information("PRONTO! " + counter + " nodes foram alterados de 3DPath para SEPARATE!\nVeja o MessageLog para mais detalhes!");
	} else {
		MessageBox.information("PRONTO! Nada pra fazer aqui!!");
	}

scene.endUndoRedoAccum();

/////////////////////FUNCOES EXTRAS/////////////////////////////////	
	function get_pegs_and_reads_in_selection(nodesSelected){//Lista todas PEGs e READs selecionados (procura dentro de grupos)
		var listToFill = [];
		for(var i=0; i<nodesSelected; i++){
			var selNode = selection.selectedNode(i);
			if(node.type(selNode) == "PEG" || node.type(selNode) == "READ"){	
				listToFill.push(selNode);
				} else if(node.type(selNode) == "GROUP"){
					var subNodes = BD2_ListNodesInGroup(selNode, ["PEG", "READ"], true);
					listToFill = listToFill.concat(subNodes);
				}
		}
		return listToFill;
	}

	function changeTo3DPath(module){//muda a PEG ou READ de 3DPath para SEPARETE
	
		var numFrames = frame.numberOf();
		if(node.getTextAttr(module,1,"POSITION.SEPARATE") == "On"){
			Print("---> Node already is separate: " + module);
			return false;
		}
		
		node.setTextAttr(module,"POSITION.SEPARATE",0, true);
		
		for(var i=0; i<=numFrames; i++){
			
			var TDPColumn = node.linkedColumn(module,"POSITION.3DPATH");
			var isKey = column.isKeyFrame(TDPColumn,1,i);
			
			if(isKey){		
				var TDxi = node.getTextAttr(module,i,"POSITION.3DPATH.X");
				var TDyi = node.getTextAttr(module,i,"POSITION.3DPATH.Y");
				var TDzi = node.getTextAttr(module,i,"POSITION.3DPATH.Z");
				createBezierPosition(module);
				column.setKeyFrame(node.linkedColumn(module,"POSITION.X"),i)
				column.setKeyFrame(node.linkedColumn(module,"POSITION.Y"),i)
				column.setKeyFrame(node.linkedColumn(module,"POSITION.Z"),i)
				node.setTextAttr(module,"POSITION.X",i,TDxi);
				node.setTextAttr(module,"POSITION.Y",i,TDyi);	
				node.setTextAttr(module,"POSITION.Z",i,TDzi);
			}
			
		}
		MessageLog.trace("O node: " + module + " foi mudado para SEPARATE!");
		return true;
	}

	function createBezierPosition(nod){//cria bezier para as colunas SEPARETE (so funciona se criar antes)
		var posX = node.getName(nod)+": Pos_x";
		var typeName = column.type(posX);
		if(typeName == ""){
			column.add(posX,"BEZIER")
			node.linkAttr(nod, "POSITION.X", posX);
		}
		var posY = node.getName(nod)+": Pos_y";
		var typeName = column.type(posY);
		if(typeName == ""){
			column.add(posY,"BEZIER")
			node.linkAttr(nod, "POSITION.Y", posY);
		}
		var posZ = node.getName(nod)+": Pos_z";
		var tipo = column.type(posZ);
		if(tipo == ""){
			column.add(posZ,"BEZIER")
			node.linkAttr(nod, "POSITION.Z", posZ);
		}
	}

}
