/*
-------------------------------------------------------------------------------
Name:			BD_UpdateMC.js

Description:	Este Script para mostrar ou esconder os MC dos rigs na cena 

Usage:			Show/hide todos MC da cena 

Author:			Leonardo Bazilio Bentolila

Created:		Agosto, 2022 (update para todos projetos em maio de 2023)
            
Copyright:   	leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_UpdateMC(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	
	//start undo...
	scene.beginUndoRedoAccum("Update MC");
		
	var mc_utils = require(projectDATA["paths"]["birdoPackage"] + "utils/master_controllers_utils.js");
	//atualiza os mcs da cena
	var mode = preferences.getBool("MC_STATE", true);
	preferences.setBool("MC_STATE", !mode);
	var scene_mcs = mc_utils.updateSceneMCs(false);
	if(!scene_mcs){
		MessageBox.information("Nao foi encontrado nenhum mc checkbox para tualizar!");
		return;
	}
	
	
	if(BD1_DirExist(projectDATA.getTBLIB("server"))){
		//scene script folder
		var scene_scripts = scene.currentProjectPath() + "/scripts/";
		
		//copy rig state files to update scene files
		var rigs = {};
		for(var i=0; i<scene_mcs.length; i++){
			var rig_data = BD2_getNodeRigData(scene_mcs[i]);
			if(!Boolean(rig_data.version)){
				Print("Mc node " + scene_mcs[i] + " is not inside a rig group!");
				continue;
			}
			if(!(rig_data.rig_name in rigs)){
				rigs[rig_data.rig_name] = mc_utils.findServerMCDataZip(projectDATA, rig_data);
				if(!rigs[rig_data.rig_name]){
					Print("File of rig " + rig_data.rig_name + " does not exist in BirdoASSETS server library!");
					continue;
				}
				var tempZip = projectDATA.systemTempFolder + "/BirdoApp/tempMC" + rig_data.char_name + ".zip";
				if(!BD1_DirExist(BD1_dirname(tempZip))){
					BD1_makeDir(BD1_dirname(tempZip));	
				}
				//copy file to temp
				if(!BD1_CopyFile(rigs[rig_data.rig_name], tempZip)){
					Print("ERROR copying file to temp!");
					continue;
				}
				if(!BD1_UnzipFile(tempZip, scene_scripts)){
					Print("Error unziping temp file!");
					continue;
				}
				//delete temp zip
				BD1_RemoveFile(tempZip);
			}
		}
	} else {
		Print("Servidor não conectado. Não ocorrerá a atualização dos Masters Controllers!");
	}
	
	//set new mode
	mc_utils.updateSceneMCs(!mode);

	Print("Rigs MC files found: ");
	Print(rigs);	
	
	Print("Updated : " + scene_mcs.length + " mcs!");
	Print(scene_mcs);
	scene.endUndoRedoAccum();	
}