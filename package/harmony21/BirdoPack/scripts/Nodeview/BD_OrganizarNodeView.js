  /*formatado para  birdoAPP
-------------------------------------------------------------------------------
Name:		BD_OrganizarNodeView.js

Description:	Este Script organiza a NodeView baseado no nosso padrao, a partir da Composite selecionada;

Usage:		Seleciona composite para orgaznizar todos nodes conectados nela

Author:		Leonardo Bazilio Bentolila

Created:	Junho, 2019.____________UPDATE (Marco, 2020);
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_OrganizarNodeView(){
	
	var n = selection.selectedNode(0);

	if(node.type(n)!= "COMPOSITE"){ // checa se o node selecionado é uma composite//
		MessageBox.information("Selecione uma Composite para organizar os Nodes Conectados nela!!"); 
		return;
	}

	scene.beginUndoRedoAccum("Organize NodeView");

	var space = 30; // Define o espaço entre os nodes//
	var nodesCon = node.numberOfInputPorts(n);
	var startCoordX = defineCoordXPrimeiroNode(n, space);
	var startCoordY = node.coordY(n);
	var firstLevelList = [];

	//organiza pra cima os nodes a partir da comp selecionada//
	for(var i=0;i<nodesCon;i++){

		var n1 = node.srcNode(n,i);

		if(checkFirstLevel(n1)){
			firstLevelList.push(n1);
			n1 = node.srcNode(n1,0);
		}

		if(node.type(n1) != "MULTIPORT_IN" && n1 != "" ){ //evita possiveis erros//
			var n1Size = node.width(n1);
			startCoordX = startCoordX - (n1Size + space);
			node.setCoord(n1, startCoordX, (startCoordY - 250));
			sobeHierarquia(n1);
		}
	}

	for(var y=0; y<firstLevelList.length; y++){
		orgFirstLevel(firstLevelList[y]);
		MessageLog.trace(firstLevelList[y]);
	}

	scene.endUndoRedoAccum();

	//funcoes complementares////////////////////////////////////////
	function checkFirstLevel(noDE){//define se o node é um first Level//
		var cima = node.srcNode(noDE,0);
		var baixo = node.dstNode(noDE,0,0);
		var firstLevel = false;

		if(node.type(cima) == "READ" || node.type(cima) == "GROUP" && pai.indexOf("Def") !=-1){ // checa parent deform//
			firstLevel = true;
		}
		if(node.type(baixo) == "COMPOSITE" && firstLevel == true){
			return true;
		} else {
			return false;
		}
	}

	function defineCoordXPrimeiroNode(Comp, espaco){
		//define posicao do primeiro node a direita baseado no numero de nodes conectado na comp, com espaço entre eles como parametro//
		var xPosComp = node.coordX(Comp);
		var coord = 0;
		var ports = node.numberOfInputPorts(Comp);

		for(var i=0; i<ports; i++){
			var nC = node.srcNode(Comp,i);
			var nodeSize = node.width(nC);
			coord = coord + espaco + nodeSize;
		}

		var mid = Math.floor(coord / 2);		
		var posFINAL = xPosComp + mid + node.width(node.srcNode(Comp,0));

		return posFINAL;
	}

	function sobeHierarquia(initialNode){//organiza os nodes subindo a hierarquia até parar//
		var nextNode = node.srcNode(initialNode,0); // só pega o node conectado na porta 0//

		if(nextNode =="" || node.type(nextNode) =="MULTIPORT_IN"){
			return;
		}

		var initialNodeSize = node.width(initialNode);
		var coordX = node.coordX(initialNode);
		var coordY = node.coordY(initialNode);
		var newX;
		var nextNodePort = node.srcNodeInfo(initialNode,0).port;
		var nodesLinked =  node.numberOfOutputLinks(nextNode, nextNodePort);
		
		var nextNodeSize = node.width(nextNode);
		if(nodesLinked ==1){
			newX = coordX - ((nextNodeSize - initialNodeSize) / 2);
			node.setCoord(nextNode, newX, (coordY - 50));
		}
		if(nodesLinked >1){
			newX = getMidXCoord(nextNode, nextNodePort, nodesLinked);
			node.setCoord(nextNode, newX, (coordY - 100));
		}
		sobeHierarquia(nextNode);
   
 		function getMidXCoord(nodePai, porta, links){// define o meio entre os nodes conectados//
			var list = [];
			for(var i = 0; i< links; i++){
				var x1 = node.coordX(node.dstNode(nodePai, porta, i));
				list.push(x1);
			}
			list.sort();
			var middle = list[0] + ((list[list.length -1] - list[0]) / 2);
			return middle;
		}
	}

	function orgFirstLevel(Nod){ //organiza os nodes conectados no primeiro level de nodes//
		var pai = node.srcNode(Nod,0);
		var filho = node.dstNode(Nod,0,0);
		var nCimaX = node.coordX(pai);
		var nCimaY = node.coordY(pai);
		node.setCoord(Nod, nCimaX, (nCimaY + 95));
		var numPorts = node.numberOfInputPorts(Nod);

		if(numPorts > 1){
			for(var i = 1; i < numPorts; i++){
				var nMeio = node.srcNode(Nod,i);	
				if(nMeio != "" && node.type(nMeio) != "READ"){
					orgMeio(nMeio, nCimaX, nCimaY);
				}
			}
		}

		function orgMeio(nodeMeio, xFilho, y){// organiza os nodes conectados entre os principais e firstLevel//
			var listX = [];
			var xPai = node.coordX(node.srcNode(nodeMeio,0));
			listX.push(xPai);
			listX.push(xFilho);
			listX.sort();

			var middle = listX[0] + ((listX[listX.length -1] - listX[0]) / 2);
			node.setCoord(nodeMeio, middle, (y + 45));
		}

	}

}