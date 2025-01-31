include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* v1
-------------------------------------------------------------------------------
Name:		BD_FixProjectColors.js

Description: Este script adiciona um color-override com a palet de fix de cores do projeto (somente para visualizacao no display _FINAL);

Usage:		Usado pela comp para mudar a visualizacao da comp com os fixes de cores do projeto

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_FixProjectColors(){
	
	scene.beginUndoRedoAccum("Fix Project Colors");

	
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		MessageBox.warning("[ERROR] Fail to get BirdoProject paths and data... canceling!",0,0);
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	
	var display_final = "Top/SETUP/_FINAL";
	
	//checa se existe um Display _FINAL
	if(node.getName(display_final) == ""){
		MessageBox.warning("Display _FINAL nao encontrado nesta cena! Avise a DT!",0,0);
		Print("Display _FINAL nao encontrado nesta cena! Avise a DT!");
		return;
	}
	
	//muda o display atual para o _FINAL
	var display_change = node.setAsGlobalDisplay(display_final);
	Print("Display set to _FINAL: " + display_change);
	
	var color_fix = BD2_add_proj_CO_correction(projectDATA, display_final);
	
	if(!color_fix){
		MessageBox.information("A cor do projeto nao foi corrigida!");
		Print("Fail to add project color fix!");
		return;	
	} else {
		MessageBox.information("Feito! Agora voce esta vendo as cores corrigidas do projeto!\nAtencao: Somente corrige no display _FINAL! Nos scripts de render, sera aplicado a saida de cada WriteNode essa correcao!");
		Print("Color fix added to the project: " + color_fix);
	}
	
	scene.endUndoRedoAccum();

}