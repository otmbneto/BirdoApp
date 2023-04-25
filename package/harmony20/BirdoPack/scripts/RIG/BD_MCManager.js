/* 
-------------------------------------------------------------------------------
Name:		BD_MCManager.js

Description: Este script e uma interface para gerenciar as opcoes de Master Controllers dos RIGs da Birdo;

Usage:		Usar selecao do rig completo (grupo) para iniciar;

Author:		Leonardo Bazilio Bentolila

Created:	abril, 2023
            
Copyright:   @leobazao
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_MCManager(){
	
	//inicia o birdoApp
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var utils = require(projectDATA["paths"]["birdoPackage"] + "utils/master_controllers_utils.js");
	
	var rig_data = utils.get_rig_selection();
	if(!rig_data){
		Print("[MC_MANAGER] FAIL to get rig data information!");
		return;
	}
	
	if(rig_data.mcs.master.length > 2){//evita que selecione nodes de mcs invalidos de masters!
		MessageBox.warning("Algo estranho! Há mais de 2 Mc considerados Master! Verifique o nome dos mcs Masters do Rig!",0,0);
		return;
	}

	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_BirdoMCManager.ui";

	var d = new createInrterface(ui_path, rig_data, utils);
	d.ui.show();	
		
}


function createInrterface(uifile, rig_data, utils){//cria objeto da interface

	this.ui = UiLoader.load(uifile);

	//main tab widget
	var main_tab_widget = this.ui.tabWidget;
	var masterPage = main_tab_widget.widget(0);
	var extrasPage = main_tab_widget.widget(1);

	//update rig info
	this.ui.groupInfo.labelRigName.text = rig_data.rig_name;
	this.ui.groupInfo.labelRigVersion.text = rig_data.script_folder_name;
	this.ui.groupInfo.labelMCMasterCount.text = rig_data.mcs.master.length;
	this.ui.groupInfo.labelMCExtraCount.text = rig_data.mcs.extras.length;	
	
	//update masters buttons state
	masterPage.groupMaster.pushActionMaster.text = rig_data.mcs.master.length == 0 ? "Create" : "Update";
	masterPage.groupMaster2.pushActionMaster2.text = rig_data.mcs.extras.length == 2 ? "Update" : "Create";
	masterPage.pushMCcheckbox.text = rig_data.mcs.checkbox == null ? "Create MC_Checkbox" : "Update MC_Checkbox";

	//update status masters
	masterPage.groupMaster.labelMasterStatus.text = "Create Selection...";
	masterPage.groupMaster2.labelMaster2Status.text = "";

	//update comp destiny if available
	var cb_comp = rig_data.mcs.checkbox ? rig_data.mcs.checkbox.comp : null;
	if(rig_data.mcs.master.length == 2){
		var valid_comps = Boolean(cb_comp) ? rig_data.mcs.master[0].comp == rig_data.mcs.master[1].comp == cb_comp : rig_data.mcs.master[0].comp == rig_data.mcs.master[1].comp;	
	} else if(rig_data.mcs.master.length == 1 && Boolean(cb_comp)){
		var valid_comps = rig_data.mcs.master[0].comp == cb_comp;
	} else {
		var valid_comps = " - * - ";
	}
	masterPage.labelCompMaster.text = valid_comps ==  " - * - " ? valid_comps : Boolean(valid_comps) ? rig_data.mcs.master[0].comp : "Different comps for Masters MCs...";

	//cria keys para o objeto da interface
	this.master_data = {
		node: (rig_data.mcs.master.length > 0 ? rig_data.mcs.master[0]["node"] : null),
		comp: (rig_data.mcs.master.length > 0 ? rig_data.mcs.master[0]["comp"] : null),
		selection: null
	};
	this.master2_data = {
		node: (rig_data.mcs.master.length == 2 ? rig_data.mcs.master[1]["node"] : null),
		comp: (rig_data.mcs.master.length == 2 ? rig_data.mcs.master[1]["comp"] : null),
		selection: null
	};
	this.checkbox_mc = {
		node: (rig_data.mcs.checkbox == null ? null : rig_data.mcs.master[1]["node"]),
		comp: (rig_data.mcs.checkbox == null ? null : rig_data.mcs.master[1]["comp"])
	};
	this.extras_data = null;//criar funcao pra gerar lista de widgets dos extras no utils!
	
	//current selection
	this.current_selection = null;
	
	
	//CALLBACKS
	this.updateFramesSelection = function(){//atualiza as widgets do grupo frames com selecao valida
		masterPage.groupFrames.labelStart.text = Boolean(this.current_selection) ? this.current_selection.start_frame : " -- ";
		masterPage.groupFrames.labelStop.text = Boolean(this.current_selection) ? this.current_selection.end_frame : " -- ";
		var valid_current_frame = frame.current() <= this.current_selection.end_frame && frame.current() >= this.current_selection.start_frame;
		masterPage.groupFrames.labelCurrentFrame.text = Boolean(this.current_selection) && valid_current_frame ? frame.current() : " -- ";
		if(!this.current_selection){
			masterPage.groupFrames.labelFront.text = " - - ";
			masterPage.groupFrames.labelBack.text = " - - ";
			masterPage.groupFrames.pushUpdateTurn.enabled = false;
		}
		//update do titulo do groupbox dos frames
		masterPage.groupFrames.title = Boolean(this.current_selection) && valid_current_frame ? "Edit Turn: " + this.current_selection.name : "Select MC to Edit...";
		
		//if current frame is invalida
		if(!valid_current_frame){
			MessageBox.warning("ATENCAO! Seu cursor esta fora da selecao da timeline do treixo escolhido para criar o MC!",0,0);
			Print("Cursor fora da selecao!");
			masterPage.groupFrames.enabled = false;
			this.current_selection.status.text = "invalid selection!";
			this.current_selection = null;
			return;
		}
		
		//lida com enable dos botoes de prev e next
		masterPage.groupFrames.pushPrev.enabled = frame.current() > this.current_selection.start_frame;
		masterPage.groupFrames.pushNext.enabled = frame.current() < this.current_selection.end_frame;
		
		//desabilita ou habilita o groupFrames
		masterPage.groupFrames.enabled = Boolean(this.current_selection);
	}
	
	this.selectMaster = function(){//callback do botao selecionar timeline do mc master
		//reseta current selection
		this.current_selection = null;
		
		this.master_data.selection = utils.get_selection_data(rig_data);
		this.current_selection = this.master_data.selection;
		if(!this.master_data.selection){
			Print("Selecao invalida!");
			masterPage.groupMaster.labelMasterStatus.text = "Invalid Selection!";
			return;
		}
		//update current selection name and status widget to be updated outside this function
		this.current_selection["name"] = masterPage.groupMaster.labelMasterName.text;
		this.current_selection["status"] = masterPage.groupMaster.labelMasterName;
		this.current_selection["action_button"] = masterPage.groupMaster.pushActionMaster;

		
		//seta combo widget 		
		masterPage.groupMaster.comboTurnType.enabled = Boolean(this.master_data.selection) && this.master_data.selection.is_master;
		masterPage.groupMaster.comboTurnType.clear();
	
		//checa se selecao e da master peg
		if(!this.master_data.selection.is_master){
			MessageBox.warning("Selecione a master peg do rig para criar um Master CM!",0,0);
			this.current_selection = null;
			masterPage.groupMaster.comboTurnType.enabled = false;
		} else {
			masterPage.groupMaster.comboTurnType.addItems(["Fliped", "Full Turn"]);
		}
		
		//update dos frmaes widgets 
		this.updateFramesSelection();
		masterPage.groupMaster.labelMasterStatus.text = "Selection Valid! Edit Turn...";
	}
	this.prevFrame = function(){//callback do pushPrev button
		var pFrame = frame.current() - 1;
		frame.setCurrent(pFrame);
		Print("current frame: " + pFrame);
		this.updateFramesSelection();
	}
	
	this.nextFrame = function(){//callback do pushNext button
		var nFrame = frame.current() + 1;
		frame.setCurrent(nFrame);
		Print("current frame: " + nFrame);
		this.updateFramesSelection();
	}
	
	this.setFront = function(){//escolhe pose de frente
		masterPage.groupFrames.labelFront.text = frame.current();
		Print("set Front pose: " + frame.current());
		//enable update TURN button
		masterPage.groupFrames.pushUpdateTurn.enabled = masterPage.groupFrames.labelBack.text != " - - ";
	}
	
	this.setBack = function(){//escolhe pose de costas
		masterPage.groupFrames.labelBack.text = frame.current();
		Print("set Back pose: " + frame.current());
		//enable update TURN button
		masterPage.groupFrames.pushUpdateTurn.enabled = masterPage.groupFrames.labelFront.text != " - - ";
	}
	
	this.updateTurn = function(){//callback do butao de update do turn
		
		
	}
	
	//Connections
	masterPage.groupMaster.pushSelectTL.clicked.connect(this, this.selectMaster);
	masterPage.groupFrames.pushPrev.clicked.connect(this, this.prevFrame);
	masterPage.groupFrames.pushNext.clicked.connect(this, this.nextFrame);
	masterPage.groupFrames.pushSetFront.clicked.connect(this, this.setFront);
	masterPage.groupFrames.pushSetBack.clicked.connect(this, this.setBack);
	masterPage.groupFrames.pushUpdateTurn.clicked.connect(this, this.updateTurn);


	/*
	this.ui.groupFilter.addTagButton.clicked.connect(this, this.addTagItem);
	this.ui.groupFilter.removeTagButton.clicked.connect(this, this.removeTagItem);
	this.ui.cancelButton.clicked.connect(this, this.close);
	this.ui.applyButton.clicked.connect(this, this.applyButton);
	this.ui.tabWidget["currentChanged(int)"].connect(this, this.updateTab);
	this.ui.groupFilter.comboType["currentIndexChanged(QString)"].connect(this, this.updateItemsWithFilter);
	this.ui.groupFilter.comboStatus["currentIndexChanged(QString)"].connect(this, this.updateItemsWithFilter);
	this.ui.groupAdvanced.spinStart["valueChanged(int)"].connect(this, this.updateSpinStart);
	this.ui.groupAdvanced.spinEnd["valueChanged(int)"].connect(this, this.updateSpinEnd);
	*/
//////////////#################################

	function Print(msg){		
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}	

}