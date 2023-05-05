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

//version
var version = "v.1.0";

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
		MessageBox.warning("Algo estranho! Tem mais de 2 Mc considerados Master! Verifique o nome dos mcs Masters do Rig!",0,0);
		return;
	}

	var ui_path = projectDATA.paths.birdoPackage + "ui/BD_BirdoMCManager.ui";

	var d = new createInrterface(ui_path, rig_data, utils, projectDATA);
	d.ui.show();	
		
}


function createInrterface(uifile, rig_data, utils, projectDATA){//cria objeto da interface

	this.ui = UiLoader.load(uifile);

	//main tab widget
	var main_tab_widget = this.ui.tabWidget;
	var masterPage = main_tab_widget.widget(0);
	var extrasPage = main_tab_widget.widget(1);

	//hide extras tab
	main_tab_widget.setTabEnabled(1, false);

	//update rig info
	this.ui.groupInfo.labelRigName.text = rig_data.rig_name;
	this.ui.groupInfo.labelRigVersion.text = rig_data.script_folder_name;
	this.ui.groupInfo.labelMCMasterCount.text = rig_data.mcs.master.length;
	this.ui.groupInfo.labelMCExtraCount.text = rig_data.mcs.extras.length;	
	
	//update version
	this.ui.labelVersion.text = version;
	
	//keys
	this.font = "Cooper Black" //projectDATA.project_font; FIXM-ME
	this.rig_name = rig_data.rig_name
	//current selected MC
	this.current_selection = null;
	//script files paths
	this.scripts = utils.get_script_files(projectDATA);
	//script folder name
	this.script_folder_name = rig_data.script_folder_name;
	//master turn widgets info
	this.master_turn = null;
	//all nodes list
	this.all_nodes = rig_data.node_list;
	//rig group 
	this.rig_group = rig_data.rig_group;
	//turn node
	this.turn_node = rig_data.turn_node;
	
	//update master 2 check state
	masterPage.groupMaster2.checked = rig_data.mcs.master.length == 2;
	
	//update masters buttons state
	masterPage.groupMaster.pushActionMaster.text = rig_data.mcs.master.length == 0 ? "Create" : "Update";
	masterPage.groupMaster2.pushActionMaster2.text = rig_data.mcs.master.length == 2 ? "Update" : "Create";
	masterPage.pushMCcheckbox.text = Boolean(rig_data.mcs.checkbox) ? "Update MC_Checkbox" : "Create MC_Checkbox";
	masterPage.pushMCcheckbox.enabled = rig_data.mcs.master.length > 0;
	
	//update status masters
	masterPage.groupMaster.labelMasterStatus.text = "Create Selection...";
	masterPage.groupMaster2.labelMaster2Status.text = "";

	//validate comps destinys 
	var cb_comp = rig_data.mcs.checkbox ? rig_data.mcs.checkbox.comp : null;
	if(rig_data.mcs.master.length == 2){
		this.master_comp = rig_data.mcs.master[0].comp;
		var valid_comps = Boolean(cb_comp) ? rig_data.mcs.master[0].comp == rig_data.mcs.master[1].comp == cb_comp : rig_data.mcs.master[0].comp == rig_data.mcs.master[1].comp;	
	} else if(rig_data.mcs.master.length == 1 && Boolean(cb_comp)){
		this.master_comp = rig_data.mcs.master[0].comp;
		var valid_comps = rig_data.mcs.master[0].comp == cb_comp;
	} else {
		this.master_comp = " - * - ";
		var valid_comps = true;
	}
	masterPage.labelCompMaster.text = valid_comps ? this.master_comp : "Different comps for Masters MCs!!!";

	//main MC objects list (MASTER: index 0 = Master 1 e index 1 = Master 2)
	this.mc_data = {
		MASTER: [
			{
				node: (rig_data.mcs.master.length > 0 ? rig_data.mcs.master[0]["node"] : null),
				peg: (rig_data.mcs.master.length > 0 ? rig_data.mcs.master[0]["peg"] : null),
				comp: (rig_data.mcs.master.length > 0 ? rig_data.mcs.master[0]["comp"] : null),
				group_node: rig_data.rig_group,
				turn_types: ["Fliped", "Full Turn"],
				turn_data: null,
				selection: null,
				slider: {
					horizontal: true,
					color1: null,
					color2: null
				},
				widgets: {
					color1: masterPage.groupMaster.pushMasterCor1,
					color2: masterPage.groupMaster.pushMasterCor2,
					name: masterPage.groupMaster.labelMasterName,
					states: [masterPage.groupMaster.labelMasterStFile],
					turn_type: masterPage.groupMaster.comboTurnType,
					action: masterPage.groupMaster.pushActionMaster,
					select: masterPage.groupMaster.pushSelectTL,
					status: masterPage.groupMaster.labelMasterStatus
				}
			},
			{
				node: (rig_data.mcs.master.length == 2 ? rig_data.mcs.master[1]["node"] : null),
				peg: (rig_data.mcs.master.length == 2 ? rig_data.mcs.master[1]["peg"] : null),
				comp: (rig_data.mcs.master.length == 2 ? rig_data.mcs.master[1]["comp"] : null),
				group_node: rig_data.rig_group,
				turn_types: ["Fliped", "Full Turn"],
				turn_data: null,
				selection: null,
				slider: {
					horizontal: true,
					color1: null,
					color2: null
				},
				widgets: {
					color1: masterPage.groupMaster2.pushMaster2Cor1,
					color2: masterPage.groupMaster2.pushMaster2Cor2,
					name: masterPage.groupMaster2.labelMaster2Name,
					states: [masterPage.groupMaster2.labelMaster2StFile],
					turn_type: masterPage.groupMaster2.comboTurnType2,
					action: masterPage.groupMaster2.pushActionMaster2,
					select: masterPage.groupMaster2.pushSelectTL2,
					status: masterPage.groupMaster2.labelMaster2Status
				}
			}
		],
		CHECKBOX: {
			node: (rig_data.mcs.checkbox == null ? null : rig_data.mcs.checkbox["node"]),
			comp: (rig_data.mcs.checkbox == null ? null : rig_data.mcs.checkbox["comp"])
		},
		EXTRAS: []//criar funcao pra gerar lista de widgets dos extras no utils!
	};
	
	//set MC callbacks
	for(mc_type in this.mc_data){
		if(mc_type == "CHECKBOX"){
			continue;
		}
		for(var i=0; i<this.mc_data[mc_type].length; i++){
			utils.createMCObjectCallbacks(this, this.mc_data[mc_type][i], mc_type, i)
		}
	}
	
	// // CALLBACKS // // 
	this.getCurrentSelection = function(){//retorna current selection object
		return Boolean(this.current_selection) ? this.mc_data[this.current_selection.type][this.current_selection.index].selection : null;
	}
	
	this.getCurrent_mc = function(){//retorna objeto do current MC
		return Boolean(this.current_selection) ? this.mc_data[this.current_selection.type][this.current_selection.index] : null;
	}
	
	this.updateFramesSelection = function(){//atualiza as widgets do grupo frames com selecao valida(somente MASTER)

		var curr_selection = this.getCurrentSelection();
		var curr_mc = this.getCurrent_mc();
		var valid_selection = Boolean(curr_selection) ? frame.current() <= parseInt(curr_selection.end_frame) && frame.current() >= parseInt(curr_selection.start_frame) : false;
		//updated widgets labels

		if(!valid_selection){
			masterPage.groupFrames.labelFront.text = " - - ";
			masterPage.groupFrames.labelBack.text = " - - ";
		}
		masterPage.groupFrames.labelCurrentFrame.text = valid_selection ? frame.current() : " -- ";
		masterPage.groupFrames.labelStart.text = valid_selection ? curr_selection.start_frame : " -- ";
		masterPage.groupFrames.labelStop.text = valid_selection ? curr_selection.end_frame : " -- ";
		//masterPage.groupFrames.pushUpdateTurn.enabled = valid_selection;
		
		//update do titulo do groupbox dos frames
		masterPage.groupFrames.title = valid_selection ? "Edit Turn: " + this.current_selection.type + " - " + this.current_selection.index : "Select MC to Edit...";
		
		//if current frame is invalid
		if(Boolean(curr_selection) && !valid_selection){
			MessageBox.warning("ATENCAO! Seu cursor esta fora da selecao da timeline do treixo escolhido para criar o MC!",0,0);
			Print("Cursor fora da selecao!");
			masterPage.groupFrames.enabled = false;
			this.current_selection = null;
		} else if(valid_selection){
			//lida com enable dos botoes de prev e next
			masterPage.groupFrames.pushPrev.enabled = frame.current() > curr_selection.start_frame;
			masterPage.groupFrames.pushNext.enabled = frame.current() < curr_selection.end_frame;
		}		
		//desabilita ou habilita o groupFrames
		masterPage.groupFrames.enabled = valid_selection;
		
	}
		
	this.enable_mc_widgets = function(mc_data, enable){//(dis)enables the mc object's  widgets (exepc action button)
		if("group_combo" in mc_data.widgets){
			mc_data["widgets"]["group_combo"].enabled = enable;
		}
		mc_data["widgets"]["color1"].enabled = enable;
		mc_data["widgets"]["color2"].enabled = enable;
	}
		
	this.select_mc = function(mc_type, index){//seleciona o MC
		//reseta current selection
		this.current_selection = null;
		
		//current mc data object
		var mc_data = this.mc_data[mc_type][index];
		
		var selectionData = utils.get_selection_data(rig_data);
		//update selection
		mc_data["selection"] = selectionData;
		
		if(!selectionData){
			Print("Selecao invalida!");
			mc_data["widgets"]["status"].text = "Invalid Selection!";
			return;
		}
		//checa se selecao e da master peg para a master 0
		if(!selectionData.is_master && (mc_type == "MASTER" && index == 0)){
			MessageBox.warning("Selecione a master peg do rig para criar um Master CM!",0,0);
			this.enable_mc_widgets(mc_data, false);
			//update selection
			mc_data["selection"] = null;
			return;
		}
		
		//updates current selection value
		this.current_selection = {
			type: mc_type,
			index: index
		};
		
		//edit extras
		if(mc_type == "EXTRAS"){
			mc_data["selection"]
			var turn_widgets = this.master_turn;
			var poses = Object.keys(turn_widgets).filter(function(item){ return turn_widgets[item].cb.checked});
			if(!mc_data["turn_data"]){
				mc_data["turn_data"] = {};
			}
			poses.forEach(function(pose){
				mc_data["turn_data"][pose] = selectionData;
			});
			mc_data["widgets"]["status"].text = "selected poses: " + poses;
			Print("Selected timeline for poses: " + poses);
		} else {// if MASTER
			mc_data["widgets"]["status"].text = "Valid Selection! Edit Turn!";
			//update dos frmaes widgets 
			this.updateFramesSelection();
			Print("Selection set to : " + mc_type + " index : " + index);
		}
		this.enable_mc_widgets(mc_data, true);
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
	
	this.updateTurn = function(){//callback do butao de update do turn (somente MASTER);
		var curr_selection = this.getCurrentSelection();
		var curr_mc = this.getCurrent_mc();
		var startFrame = curr_selection.start_frame;
		var endFrame = curr_selection.end_frame;
		var front = parseInt(masterPage.groupFrames.labelFront.text);
		var back = parseInt(masterPage.groupFrames.labelBack.text);
		var fliped = curr_mc.widgets.turn_type.currentText == "Fliped";
		var turn_data = utils.createTurn(startFrame, endFrame, front, back, fliped);
		if(!turn_data){
			Print("Invalid turn formation!");
			masterPage.groupFrames.labelFront.text = " - - ";
			masterPage.groupFrames.labelBack.text = " - - ";
		}
		//update current selection with turn data
		curr_mc["turn_data"] = turn_data;
		
		//altera o node turn com as definicoes 
		var valid_colors = Boolean(curr_mc["slider"]["color1"]) && Boolean(curr_mc["slider"]["color2"]);
		if(!utils.modify_turn_node(turn_data, rig_data.turn_node)){
			MessageBox.warning("Algo deu errado ao setar o node turn!",0,0);
			curr_mc.widgets.action.enabled = false;
			curr_mc.widgets.status.text = "ERRO ao settar o node TURN!";
		} else {
			curr_mc.widgets.action.enabled = valid_colors;
		}
		//update selection
		this.current_selection = null;
		this.updateFramesSelection();
		
		if(!valid_colors){//add escolha cores no status caso ainda nao tenha cores escolhidas!
			curr_mc.widgets.status.text = "- Escolha as cores!";
		}	
		
		Print("Turn edit finished!");
	}
	
	this.updateTab = function(){//atualiza a tab (se for a EXTRAS atualiza o mc selecionado)
		var curr_index = this.ui.tabWidget.currentIndex;
		Print("Tab changed to : " + curr_index);
		this.current_selection = null;
		if(curr_index == 0){
			//is master tab
			this.updateFramesSelection();
		} else {
			//update extras widgets
			if(this.mc_data.EXTRAS.length > 0){
				for(var i=0; i<this.mc_data.EXTRAS.length; i++){
					var item = this.mc_data.EXTRAS[i];
					if(item.widgets.radio.checked){	
						this.current_selection = {
							type: "EXTRAS",
							index: i
						};
						//update name widget
						item.widgets.name.text = item.mc_name;
						//reseta as widgets de states
						item.widgets.states.forEach(function(labelState){
							labelState.text = "null";
						});
						break;
					}
				}
			}	
		}
	}	
	
	this.addExtra = function(){//callback do botao de add novo extra MC
		var extra_name = Input.getText("Name: ", "", "Create Extra MC");
		if(!extra_name){
			Print("Add extra mc: canceled!");
			return;
		} else {
			extra_name = "mc_" + extra_name.replace(/^(mc|Mc|MC)_?/, "");	
		}
		
		var index = this.mc_data.EXTRAS.length;
		var mc_extra = utils.createExtraObject(this, extrasPage, extra_name, index);
		this.mc_data.EXTRAS.push(mc_extra);
		//mark new radio as checked
		this.mc_data.EXTRAS[index].widgets.radio.setChecked(true);
		
		Print("Extra added: " + index);
	}
	
	this.updateComboTurnType = function(){//callback do combo de turn type na aba EXTRAS
		var is_advanced = extrasPage.comboType.currentText == "Advanced";
		for(pose in this.master_turn){
			var item = this.master_turn[pose];
			item.cb.setChecked(false);
			if(is_advanced){
				item.cb.autoExclusive = true;
			} else {
				item.cb.autoExclusive = false;				
			}
		}
		var curr_mc = this.getCurrent_mc();
		if(!curr_mc){
			Print("No mc selected!");
		} else {
			curr_mc["selection"] = null;
		}
		Print("advanced mode for mc extra creation is : " + is_advanced);
	}
	
	//Connections
	masterPage.groupFrames.pushPrev.clicked.connect(this, this.prevFrame);
	masterPage.groupFrames.pushNext.clicked.connect(this, this.nextFrame);
	masterPage.groupFrames.pushSetFront.clicked.connect(this, this.setFront);
	masterPage.groupFrames.pushSetBack.clicked.connect(this, this.setBack);
	masterPage.groupFrames.pushUpdateTurn.clicked.connect(this, this.updateTurn);
	extrasPage.groupExtrasList.pushAddExtra.clicked.connect(this, this.addExtra);
	extrasPage.comboType["currentIndexChanged(QString)"].connect(this, this.updateComboTurnType);

	//quando muda a tab
	this.ui.tabWidget["currentChanged(int)"].connect(this, this.updateTab);


	/*
	this.ui.groupFilter.addTagButton.clicked.connect(this, this.addTagItem);
	this.ui.groupFilter.removeTagButton.clicked.connect(this, this.removeTagItem);
	this.ui.cancelButton.clicked.connect(this, this.close);
	this.ui.applyButton.clicked.connect(this, this.applyButton);
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