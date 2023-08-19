include("BD_2-ScriptLIB_Geral.js");
/* v1.3 nova versao com toda funcao de renomear no BD2
-------------------------------------------------------------------------------
Name:		BD_RenameNumbersToX.js

Description:	Este Script renomeia todos os desenhos sem nome na pose, para o proximo X disponivel;

Usage:		Selecione a MASTER do RIG e aperte;

Author:		Leonardo Bazilio Bentolila

Created:	Junho, 2020; ----- -Update setembro, 2020;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_RenameNumbersToX(){
	var prefix = "X";//mudar o prefixo aqui caso queria salvar algum outro tipo de nome para o drawing

	if(selection.selectedNode(0) == ""){
		MessageBox.information("Selecione a MASTER do RIG minimizada na Timeline!!!");
		return;
	}

	var random = getNumberDialog();
		
	if(random == "canceled"){
		MessageLog.trace("canceled...");
		return;
	}
	
	scene.beginUndoRedoAccum("Rename Numbers Drawings to 'X'");

	var counter = BD2_RenameDrawingsWithNumber(prefix, random);
	
	scene.endUndoRedoAccum();

	if(counter != 0){
		MessageBox.information("Pronto! " + counter + " drawings foram Renomeadas com o prefixo " + prefix);
	} else {
		MessageBox.information("Nenhuma camada precisou ser mudada!");
	}

/////////////////////////Funcao EXTRA//////////////////////////////////////
	function getNumberDialog(){//dialog retorna se e numero normal ou random 

		var d = new Dialog;
		d.title = "Rename Numbers With Prefix";

		var l1 = new Label();
		l1.text = "Choose Type:";
		d.add(l1);

		var group = new GroupBox;		

		var next = new RadioButton;
		var random = new RadioButton;
		
		group.add(next);
		group.add(random);
	
		d.addSpace(1);
		d.add(group);

		random.checked = true;
	
		random.text = "prefix + Ramdom Number";
		next.text = "prefix + Next Number";
	
		var rc = d.exec();
		if(!rc){
		 	return "canceled";
		}
			
		return random.checked;

	}
}


