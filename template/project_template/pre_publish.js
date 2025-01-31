include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		pre_publish.js

Description:	este script roda as funcoes de pre publish para o projeto (adicionar funcoes para mudar cena antes do envio aqui!

Usage:		Roda antes de comecar o publish (depois dos avisos iniciais) 

Author:		Leonardo Bazilio Bentolila

Created:	maio, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function pre_publish(projectDATA){
	
	//rodar funcoes com o acum undo nesse bloco
	scene.beginUndoRedoAccum("pre publish modifications");

	//adicione as modificações de publish do projeto aqui
	Print("Sem modificações configuradas para o pre-render do projeto!");
	
	scene.endUndoRedoAccum();

}

exports.pre_publish = pre_publish;