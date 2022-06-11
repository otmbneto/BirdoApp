/*
-------------------------------------------------------------------------------
Name:		BD_NodesCounter.js

Description:	Este Script conta quantos nodes existem no RIG;

Usage:		Selecione o grupo do RIG e veja  o BOXINFO com os detalhes;

Author:		Leonardo Bazilio Bentolila

Created:	Dezembro, 2018. (update seetmbro,2019 = lista por todos os tipos);
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
*/
function BD_NodesCounter(){

if(node.isGroup(selection.selectedNode(0))==false){
    MessageBox.information("Não é um Grupo Selecionado! Seleciona certo aê, consagrado!!"); return;
  }


var n = selection.selectedNode(0);

var listaTotal = total(n);

var label = listaTipos(listaTotal);

MessageBox.information(label);
return;



function total(Group){
	
	var listToFill = [];
	
	listaRecursivamente(node.subNodes(Group));
	
	function listaRecursivamente(a){
		for(var i = 0;i<a.length;i=i+1){
		listToFill.push(a[i]);
			if(node.type(a[i]) == "GROUP"){
			listaRecursivamente(node.subNodes(a[i]));
			}
		}
	}

	return listToFill;
}


function listaTipos(lista){
var text = "TOTAL: " + lista.length + "\n";
var listaTipos = [];
var arrayTodos = [];
	for(var i=0; i< lista.length; i++){
	var tipo = node.type(lista[i]);
		if(listaTipos.indexOf(tipo) == -1){
		listaTipos.push(tipo);
		}
	arrayTodos.push(tipo);
	}

var finalText = changeText(listaTipos, arrayTodos, text);

function changeText(lista1, lista2, texto){

	for(var i = 0; i<lista1.length;i++){
	var item = lista1[i];
	var count = 0;
		for(var y=0; y<lista2.length; y++){
			if(lista2[y] == item){
			count++;
			}
		}
	texto += "\n" + item + ": " + count;
		}
return texto;
}

return finalText;
}
}