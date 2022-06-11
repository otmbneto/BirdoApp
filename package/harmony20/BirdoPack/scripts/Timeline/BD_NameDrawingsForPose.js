include("BD_2-ScriptLIB_Geral.js");

/*v1.4 ==> Update - funcao toda do rename (deform tmb) esta no BD2
-------------------------------------------------------------------------------
Name:		BD_NameDrawingsForPose.js

Description:	Este Script renomeia todos os drawings do RIG e conserta possíveis exposições vazias;

Usage:		Selecione a MASTER do RIG e escolha o nome para a pose;

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2019._______Update(Setembro, 2020);
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/


function BD_NameDrawingsForPose(){

	
	var currentFrame = frame.current()
	var prefix = null;
	var counter = 0;
	var poseTextList = ["Front_'A'", "3Q1_'B'", "Profile1_'C'", "3QB1_'D'", "Back_'E'", "3QB2_'F'", "Profile2_'G'", "3Q2_'H'"];
	
	d = new Dialog;
	d.title = "Rename Drawings:";

	var l1 = new Label();
	l1.text = "Que Pose é essa?";
	d.add(l1);

	var group = new GroupBox;		
	var poses = new Array();

	for(var i=0; i<8; i++){
		poses[i] = new RadioButton;
		group.add(poses[i]);
	}
	
	d.addSpace(1);
	d.add(group);

	var checkIndex = currentFrame - 1;
	if(checkIndex < 8){
		poses[checkIndex].checked = true;
	}

	for(var i=0; i<8; i++){
		poses[i].text = poseTextList[i];
	}

	
	var rc = d.exec();
	if(!rc){ 
		return;
	}

	// Define Prefix//
	for(var i=0; i< poses.length; i++){
		var text = poses[i].text;
		if(poses[i].checked){
			prefix = text[text.length -2];
		}
	}

	//Changes the Drawings Names//
	scene.beginUndoRedoAccum("Name Drawings For Pose");

	var counter = BD2_RenameDrawingsWithNumber(prefix, false);
	
	scene.endUndoRedoAccum();
	
	if(counter != 0){
		MessageBox.information("Pronto! " + counter + " drawings foram Renomeadas com o prefixo " + prefix);
	} else {
		MessageBox.information("Nenhuma camada precisou ser mudada!");
	}

}


