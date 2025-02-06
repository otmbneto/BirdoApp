include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		pre_publish.js

Description:	este script roda as funcoes de POST publish para o projeto (adicionar funcoes de acoes apos o publish aqui!

Usage:		Roda DEPOIS do publish

Author:		Leonardo Bazilio Bentolila

Created:	fevereiro, 2025;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function pos_publish(projectDATA, publish_data){
	
	//rodar funcoes com o acum undo nesse bloco
	scene.beginUndoRedoAccum("BIRDOAPP acoes pos publish");

	//adicione as modificações de publish do projeto aqui
	Print("Sem modificações configuradas para o post-publish do projeto!");
	
	scene.endUndoRedoAccum();

}

exports.pos_publish = pos_publish;