include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*versao adaptada para BirdoAPP
-------------------------------------------------------------------------------
Name:		BD_AddWriteNode.js

Description:	Este Script adiciona um Write Node para separar camadas no export da comp;

Usage:		selecione um node para conectar o write e esoclha o nome no Imput;

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/


function BD_AddWriteNode(){
	
	scene.beginUndoRedoAccum("Add Write Node");

	var sel = selection.selectedNode(0);
	var selName = node.getName(sel);
	var currScene = scene.currentScene();

	var projData = BD2_ProjectInfo();

	if(!projData){
		MessageBox.information("Erro ao pegar info do projeto!");
		return;
	}

	if(!checkUserType(projData)){
		return;
	}

	if(selName== ""){
		MessageBox.information("Seleione um node!!");
		return;
	}

	var renderPath = projData.getRenderComp(currScene);

	if(!renderPath){
		MessageBox.warning("Este computador nao reconhece o caminho de render na rede! Avise a DT!",0,0);
		return;
	}

	////cria a pasta de render na rede caso ainda nao exista
	if(!BD1_DirExist(renderPath)){
		Print("Foi preciso criar a pasta da cena na rede");
		BD1_createDirectoryREDE(renderPath);
	}
	
	renderPath += currScene;//render path Final write

	//escolhe o nome do node e da saida
	var writeName = Input.getText("Escolha o Nome do Write", selName, "Separar Para Export");

	if(!writeName){
		Print("Add WriteNode Canceled...");
		return;
	}

	writeName = writeName.toUpperCase();

	if(writeName.indexOf("WRITE") != -1){
		writeName = writeName.replace("WRITE", "");
	}

	writeName = writeName.replace( /^_/, "");//tira o '_'  no inicio		
	renderPath = renderPath + "_" + writeName;

	var writeNew = BD2_AddNodeUnder(sel, "Write_" + writeName,  "WRITE", true);

	var setAtt = BD2_changeWriteNodeAtt(projData, writeNew, renderPath, "COMP");

	
	Print("Write Node : " +  writeNew + " adicionado com sucesso ao node : " + sel + "\nSet att: ");
	Print("render path: " + renderPath);
	Print(setAtt);
	scene.endUndoRedoAccum();
	
	
	//////////EXTRA FUNCTIONS////////
	
	function checkUserType(projData){//checa se o usuario pode usar este script
		
		if(projData.user_type != "DT" && projData.user_type != "COMP"){
			MessageBox.warning("Este script funciona somente para COMP!",0,0);
			return false;
		} else {
			Print("UserType check ok!");
			return true;
		}	
	
	}	
	
}