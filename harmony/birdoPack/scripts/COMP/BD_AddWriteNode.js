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

	var renderPath = projData.getRenderComp();

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
	var input_name = Input.getText("Escolha o Nome do Write", selName, "Separar Para Export");
	
	if(!input_name){
		Print("Add WriteNode Canceled...");
		return;
	}
	
	var writeName = normalizeName(input_name);

	if(!writeName){
		Print("invalid name... canceling!");
		return;
	}
	
	//begin undo
	scene.beginUndoRedoAccum("Add Write Node");

	renderPath = renderPath + "_" + writeName;

	var writeNew = BD2_AddNodeUnder(sel, "Write_" + writeName, "WRITE", true, BD2_GetNextOuputPort(sel));

	var setAtt = BD2_changeWriteNodeAtt(projData, writeNew, renderPath, "COMP");

	//verificacao de projeto
	if(projData.prefix == "AST"){
		if(writeName.indexOf("BG") != -1){
			MessageBox.warning("Este projeto nao exporta as camadas de BG no render de COMP. Confira se o output q acabou de criar nao contem saida de BG, se for o caso, ele saira sem nada!",0,0);
		}	
	}
	
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
	
	function normalizeName(name){//limpa o nome
		var normalized = name.toUpperCase();
		var writeRegex = /WRITE(_?)/;
		var regex_space = /\s/;
		var regex_invalid_char = /\W/;
		normalized = normalized.replace(writeRegex, "");
		while(regex_space.test(normalized)){
			normalized = normalized.replace(regex_space, "_");				
		}
		if(regex_invalid_char.test(normalized)){
			MessageBox.warning("Nome invalido! Contem caracter invalido no nome escolhido! Escolha um novo nome!",0,0);
			return false;				
		}
		return normalized;
	}
}