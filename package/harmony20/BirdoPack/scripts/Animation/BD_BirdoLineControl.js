/*Adaptado para funcoes novas do Harmony 20!! (nao testado em versoes anteriores, mas nao deve funcionar)
fix do caso de a cena ja ter sido usada com o script de linha antigo (unlink conlum to line att)
-------------------------------------------------------------------------------
Name:		BD_BirdoLineControl.js

Description:	Este script e uma interface de opcoes para controle de espessura de linha de RIGs na cena e usa a opcao de controle
de linha do tb 20 "ZOOM_INDEPENDENT_LINE_ART_THICKNESS" para o valor "Scale Dependent" que muda conforme scala da cena e nodes.

Usage:		Selecione um node de um RIG ou um node DRAWING isolado para controlar as opcoes de linha.

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2022
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

var scrip_version = "v.1.2";
function BD_BirdoLineControl(){
	
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//initial vars
	var initialData = getSelectionData();
	
	if(!initialData){
		Print("[BIRDOLINECONTROL]: canceled..."); 
		return;
	}
	
	initialData["default_linethick"] = getDefaultValueForScene();
	
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_LineControl.ui";

	var d = new defineInterface(pathUI, initialData);
	d.ui.show();
	
	//EXTRA FUNTION MAIN FUNCTION
	function getSelectionData(){//retorna objeto com info da selecao se for valida (considera varios nodes selecionados ao mesmo tempo, um node dentro do rig como o rig inteiro, ou varios dentro do rig como um so rig

		var selectData = {};
		var selected_nodes = selection.selectedNodes();

		if(selected_nodes.length == 0){
			MessageBox.warning("Select at least ONE drawing node or Group!",0,0);
			Print("[BIRDOLINECONTROL]: Error! Selection error! None selected!"); 
			return false;
		}
		selectData["rig_group"] = (node.parentNode(selected_nodes[0]) == node.root()) ? false : "Top/" + selected_nodes[0].split("/")[1];
		selectData["selected_nodes"] = selected_nodes.filter(function(x){ return node.type(x) == "READ"});
		if(selectData["rig_group"]){
			selectData["read_nodes"] = BD2_ListNodesInGroup(selectData["rig_group"], ["READ"], true);
		} else {
			selectData["read_nodes"] = getReadNodes(selected_nodes);
		}
		if(selectData["read_nodes"].length == 0){
			MessageBox.warning("Nenhum Drawing encontrado na selecao de nodes!",0,0);
			Print("[BIRDOLINECONTROL] Nenhum node drawing encontrado na selecao!");
			return false;
		}
		return selectData;

		///extra
		function getReadNodes(selectionNodes){//add read nodes to list
			var nodeList = [];
			for(var i=0; i<selectionNodes.length; i++){
				var reads = BD2_ListNodesInGroup(selectionNodes[i], ["READ"], true);
				reads.forEach(function (x){ nodeList.push(x);});
			}

			return nodeList;
		}
	}
	
	function getDefaultValueForScene(){//retorna um valor de linha default para a cena
		var projResolutionX = scene.defaultResolutionX();
		var multiplier = 720.0 / projResolutionX;
		var fovRad = scene.defaultResolutionFOV() * Math.PI / 180.0;
		var projectAR = scene.defaultResolutionX() / scene.defaultResolutionY();
		var tvgAR = 4.0 / 3.0;
		var nominalScaling = Math.tan(fovRad*0.5) * 2.0 * tvgAR * projectAR / tvgAR;
		multiplier += nominalScaling;
		return multiplier.toFixed(2);
	}
	
}

function defineInterface(pathUI, initialData){

	this.ui = UiLoader.load(pathUI);
	
	//FIX WINDOW SIZE
	this.ui.setMaximumSize(368, 561);//fix windows size
	this.ui.activateWindow();

	//STYLE FOR LABELS NODES
	var styleLabelUnchecked = "QLabel {\n	color: rgb(80, 80, 80);\n	background-color: lightgray;\n	padding-left: 5px;\n	border-radius: 3px;\n	border: null;\n}\n\nQLabel::hover {\n	border: 2px solid #05B8CC;\n    color: white;\n}";	
	var styleLabelChecked = "QLabel {\n	color: rgb(139, 184, 255);\n	background-color: rgb(0, 255, 255);\n	padding-left: 5px;\n	border-radius: 3px;\n	border: null;\n}\n\nQLabel::hover {\n	border: 2px solid #05B8CC;\n    color: rgb(58, 134, 255);\n}";
	
	this.undoLevels = 0;

	//SET INITIAL VALUES
	this.ui.label_version.text = scrip_version;
	this.ui.gb_options.comboScale.addItems(["Scale Dependent","Scale Independent","Scale Independent (Legacy)"]);

	//change Radio Selection
	if(!initialData["rig_group"] || !initialData["selected_nodes"]){//se nao tiver reconhecido um RIG na selecao de nodes
		this.ui.gb_node.radioRig.enabled = false;
		this.ui.gb_node.radioSelection.enabled = false;
		this.ui.gb_node.labelRigGroup.text = ("[" + initialData["read_nodes"].length + "] Read Nodes Listed");
		this.ui.gb_node.label_2.text = "Drawings:";
		this.ui.gb_node.labelRigGroup.setStyle(styleLabelChecked);
		
	} else {
		this.ui.gb_node.labelRigGroup.styleSheet = styleLabelChecked;
		this.ui.gb_node.labelSelection.text = ("[" + initialData["selected_nodes"].length + "] Nodes Selected");
		this.ui.gb_node.labelRigGroup.text = initialData["rig_group"];
	}
	//Initial line value
	this.ui.gb_options.label_Value.text = initialData["default_linethick"];
	this.ui.gb_options.slidesLineValue.value = initialData["default_linethick"] * 10;

	//CALLBACK FUNCTIONS
	this.onCheckEnableLineEdit = function(){//abilita o grupo options com o check enabled
		this.ui.gb_options.enabled = this.ui.checEnable.checked;	
	}
	
	this.onCheckDefformation = function(){//callback do checkDefLine
		this.ui.gb_options.spinSmooth.enabled = this.ui.gb_options.checkDefLine.checked;
		this.ui.gb_options.doubleSpinFix.enabled = this.ui.gb_options.checkDefLine.checked;	
	}
	
	this.onCheckRadioNodes = function(){//callback radio nodes
		if(this.ui.gb_node.radioRig.checked){
			this.ui.gb_node.labelRigGroup.styleSheet = styleLabelChecked; 
			this.ui.gb_node.labelSelection.styleSheet = styleLabelUnchecked;
		} else {
			this.ui.gb_node.labelRigGroup.styleSheet = styleLabelUnchecked;
			this.ui.gb_node.labelSelection.styleSheet = styleLabelChecked;
		}		
	}
	
	this.onRadioLineValue = function(){
		if(this.ui.gb_options.radioDefault.checked){	
			this.ui.gb_options.label_Value.text = initialData["default_linethick"];
			this.ui.gb_options.slidesLineValue.value = initialData["default_linethick"] * 10;
		}
		this.ui.gb_options.slidesLineValue.enabled = !this.ui.gb_options.radioDefault.checked;
	}	
	
	this.onUpdateSlider = function(){
		var slider_value = this.ui.gb_options.slidesLineValue.value * 0.1;
		this.ui.gb_options.label_Value.text = slider_value.toFixed(2);
		this.ui.previewLine.lineWidth = slider_value.toFixed(1);
	}
	
	this.onApply = function(){
		scene.beginUndoRedoAccum("Birdo Line Control");

		applyChangesToNodes(this);		
		
		scene.endUndoRedoAccum();
			
		if(this.ui.checkPreview.checked){
			this.ui.close();
		}	
	}
			
	this.onCancel = function(){
		MessageLog.trace("Canceled...");
		this.ui.close();
	}
	
	//CONNECTIONS
	this.ui.gb_options.slidesLineValue.valueChanged.connect(this, this.onUpdateSlider);

	this.ui.checEnable.toggled.connect(this,this.onCheckEnableLineEdit);

	this.ui.gb_node.radioRig.toggled.connect(this,this.onCheckRadioNodes);
	this.ui.gb_node.radioSelection.toggled.connect(this,this.onCheckRadioNodes);
	
	this.ui.gb_options.checkDefLine.toggled.connect(this,this.onCheckDefformation);

	this.ui.gb_options.radioDefault.toggled.connect(this,this.onRadioLineValue);
	this.ui.gb_options.radioChoose.toggled.connect(this,this.onRadioLineValue);

	this.ui.cancelButton.clicked.connect(this,this.onCancel);
	this.ui.applyButton.clicked.connect(this,this.onApply);
		

	///FUNCOES EXTRAS DA INTERFACE
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
	}
	
	function has_defformation(nodeToCheck){//checks if this node has a defformation affecting the drawings
		var up_node = node.srcNode(nodeToCheck, 0);
		return node.isGroup(up_node) && is_def_group(up_node);
		function is_def_group(groupNode){
			var is_def = false;
			var subs = node.subNodes(groupNode);
			subs.forEach(function (element){
							if(node.type(element) == "TransformationSwitch" || node.type(element) == "CurveModule"){
								 is_def = true;
							}
						});
			return is_def;
		}
	}
	
	function applyChangesToNodes(self){//aplica as mudancas nos nodes selecionados baseado nas selecoes da ui

		var useLineControl = self.ui.checEnable.checked;
		var lineValueLabel = parseFloat(self.ui.gb_options.label_Value.text);
		var rig_read_nodes = self.ui.gb_node.radioRig.checked ? initialData["read_nodes"] : initialData["selected_nodes"];			
		var lineDefformation = self.ui.gb_options.checkDefLine.checked;

		for(var i=0; i<rig_read_nodes.length; i++){
			
			//deslink de qualuqer funcao q esteja linkada no att multLineArtThickness
			node.unlinkAttr(rig_read_nodes[i], "multLineArtThickness");
			
			//define se aplica o valor da linha somente se useLineControl for verdade!
			var value = useLineControl ? lineValueLabel : node.getTextAttr(rig_read_nodes[i], 1, "multLineArtThickness");
			//define se vai precisar acionar opcoes de defformation
			var changeDefformation = (has_defformation(rig_read_nodes[i]) && lineDefformation);
			var smoothVal = changeDefformation ? self.ui.gb_options.spinSmooth.value : parseFloat(node.getTextAttr(rig_read_nodes[i], 1, "PENCIL_LINE_DEFORMATION_SMOOTH"));
			var fixVal = changeDefformation ? self.ui.gb_options.doubleSpinFix.value : parseFloat(node.getTextAttr(rig_read_nodes[i], 1, "PENCIL_LINE_DEFORMATION_FIT_ERROR"));;
			var scale_style = self.ui.gb_options.comboScale.currentText;

			//SET Line control attributes
			node.setTextAttr(rig_read_nodes[i], "ADJUST_PENCIL_THICKNESS", 1, useLineControl);//ativa controle de linha
			node.setTextAttr(rig_read_nodes[i], "ZOOM_INDEPENDENT_LINE_ART_THICKNESS", 1, scale_style);//att obrigatorio (adapta a linha a scale e camera)
			node.setTextAttr(rig_read_nodes[i], "multLineArtThickness", 1, value);
			node.setTextAttr(rig_read_nodes[i], "ADD_LINE_ART_THICKNESS", 1, 0);//fix contant value to 0 to make sense

			//SET Line Deform attributes
			node.setTextAttr(rig_read_nodes[i], "PENCIL_LINE_DEFORMATION_PRESERVE_THICKNESS", 1, changeDefformation);		
			node.setTextAttr(rig_read_nodes[i], "PENCIL_LINE_DEFORMATION_SMOOTH", 1, smoothVal);
			node.setTextAttr(rig_read_nodes[i], "PENCIL_LINE_DEFORMATION_FIT_ERROR", 1, fixVal);
			
			Print("Setting Lince Control Node: " + rig_read_nodes[i]);
		}
		
	}
}